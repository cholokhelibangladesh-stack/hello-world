
CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS ranking_score double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_videos_live_score
  ON public.videos (ranking_score DESC, created_at DESC)
  WHERE status = 'live' AND COALESCE(flagged, false) = false;

CREATE INDEX IF NOT EXISTS idx_videos_test_pool
  ON public.videos (created_at DESC)
  WHERE status = 'live' AND COALESCE(flagged, false) = false AND view_count < 50;

CREATE INDEX IF NOT EXISTS idx_videos_user_created
  ON public.videos (user_id, created_at DESC)
  WHERE status = 'live';

CREATE OR REPLACE FUNCTION public.refresh_video_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  WITH creator_avg AS (
    SELECT user_id, AVG(base_score) FILTER (WHERE rn <= 5) AS ghost
    FROM (
      SELECT v.user_id, v.id,
             (v.like_count * 3.0
              + v.share_count * 8.0
              + LEAST(v.total_watch_ms::double precision / 1000.0, 100000) * 0.5
              + v.view_count * 0.4) AS base_score,
             ROW_NUMBER() OVER (PARTITION BY v.user_id ORDER BY v.created_at DESC) AS rn
      FROM public.videos v
      WHERE v.status = 'live' AND COALESCE(v.flagged, false) = false
    ) s
    GROUP BY user_id
  )
  UPDATE public.videos v
     SET ranking_score = (
           (v.like_count * 3.0
            + v.share_count * 8.0
            + LEAST(v.total_watch_ms::double precision / 1000.0, 100000) * 0.5
            + v.view_count * 0.4
            + CASE WHEN v.view_count = 0 AND v.like_count = 0 AND v.share_count = 0
                   THEN COALESCE(ca.ghost, 0) ELSE 0 END)
           * exp(- EXTRACT(EPOCH FROM (now() - v.created_at)) / (86400.0 * 7.0))
           * CASE WHEN EXTRACT(EPOCH FROM (now() - v.created_at)) / 3600.0 < 24
                  THEN 1.0 + 4.0 * exp(- EXTRACT(EPOCH FROM (now() - v.created_at)) / 3600.0 / 6.0)
                  ELSE 1.0 END
         ),
         score_updated_at = now()
    FROM creator_avg ca
   WHERE ca.user_id = v.user_id AND v.status = 'live';
END;
$fn$;

DROP FUNCTION IF EXISTS public.get_ranked_feed(integer, integer, text);

CREATE FUNCTION public.get_ranked_feed(
  _limit integer DEFAULT 10,
  _offset integer DEFAULT 0,
  _sport text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, user_id uuid, video_url text, description text,
  position_tags text[], trait_tags text[],
  full_name text, sport text, avatar_url text,
  like_count integer, share_count integer, view_count integer,
  liked_by_me boolean, score double precision, is_test_slot boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  uid uuid := auth.uid();
  urole app_role;
  pref_sport text;
  pref_positions text[] := '{}';
  page_size int := 10;
  page_num int;
  proven_take int := 8;
  test_take int := 2;
  proven_offset int;
  test_offset int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  PERFORM public.enforce_feed_rate_limit(uid, 120);

  SELECT role INTO urole FROM public.user_roles WHERE user_id = uid LIMIT 1;
  IF urole IS NULL THEN
    RAISE EXCEPTION 'no_role' USING ERRCODE = '42501';
  END IF;

  IF urole = 'scout' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.scout_profiles
       WHERE user_id = uid AND verification_status = 'active' AND COALESCE(is_banned, false) = false
    ) THEN
      RAISE EXCEPTION 'scout_not_active' USING ERRCODE = '42501';
    END IF;
    SELECT preferred_sport, COALESCE(preferred_positions, '{}')
      INTO pref_sport, pref_positions
      FROM public.scout_profiles WHERE user_id = uid;
  END IF;

  _limit  := LEAST(GREATEST(COALESCE(_limit, 10), 1), 50);
  _offset := GREATEST(COALESCE(_offset, 0), 0);

  page_num := _offset / page_size;
  proven_offset := page_num * proven_take;
  test_offset := page_num * test_take;

  RETURN QUERY
  WITH proven AS (
    SELECT v.id, v.user_id, v.video_url, v.description, v.position_tags, v.trait_tags,
           v.like_count, v.share_count, v.view_count, v.ranking_score,
           p.full_name AS p_full_name, p.sport AS p_sport, p.avatar_url AS p_avatar,
           false AS is_test,
           row_number() OVER () AS rn
      FROM public.videos v
      JOIN public.profiles p ON p.user_id = v.user_id
     WHERE v.status = 'live'
       AND COALESCE(v.flagged, false) = false
       AND COALESCE(p.is_banned, false) = false
       AND (urole <> 'player' OR v.user_id <> uid)
       AND (_sport IS NULL OR p.sport = _sport)
     ORDER BY v.ranking_score DESC, v.created_at DESC, v.id
     LIMIT proven_take OFFSET proven_offset
  ),
  test AS (
    SELECT v.id, v.user_id, v.video_url, v.description, v.position_tags, v.trait_tags,
           v.like_count, v.share_count, v.view_count, v.ranking_score,
           p.full_name AS p_full_name, p.sport AS p_sport, p.avatar_url AS p_avatar,
           true AS is_test,
           row_number() OVER () AS rn
      FROM public.videos v
      JOIN public.profiles p ON p.user_id = v.user_id
     WHERE v.status = 'live'
       AND COALESCE(v.flagged, false) = false
       AND COALESCE(p.is_banned, false) = false
       AND v.view_count < 50
       AND (urole <> 'player' OR v.user_id <> uid)
       AND (_sport IS NULL OR p.sport = _sport)
       AND NOT EXISTS (SELECT 1 FROM proven pr WHERE pr.id = v.id)
     ORDER BY v.created_at DESC, v.id
     LIMIT test_take OFFSET test_offset
  ),
  merged AS (
    SELECT p.*, (p.rn - 1) AS slot_pos FROM proven p
    UNION ALL
    SELECT t.*, (proven_take + t.rn - 1) AS slot_pos FROM test t
  )
  SELECT
    m.id, m.user_id, m.video_url, m.description, m.position_tags, m.trait_tags,
    m.p_full_name, m.p_sport, m.p_avatar,
    m.like_count, m.share_count, m.view_count,
    EXISTS (SELECT 1 FROM public.video_likes vl WHERE vl.video_id = m.id AND vl.user_id = uid) AS liked_by_me,
    (m.ranking_score
      + CASE WHEN urole = 'scout' AND pref_sport IS NOT NULL AND m.p_sport = pref_sport THEN 50.0 ELSE 0 END
      + CASE WHEN urole = 'scout' AND array_length(pref_positions,1) IS NOT NULL
               AND m.position_tags && pref_positions THEN 20.0 ELSE 0 END
    ) AS score,
    m.is_test AS is_test_slot
  FROM merged m
  ORDER BY m.slot_pos
  LIMIT _limit;
END;
$fn$;

REVOKE ALL ON FUNCTION public.refresh_video_scores() FROM PUBLIC;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh_video_scores_every_5m') THEN
    PERFORM cron.unschedule('refresh_video_scores_every_5m');
  END IF;
  PERFORM cron.schedule(
    'refresh_video_scores_every_5m',
    '*/5 * * * *',
    'SELECT public.refresh_video_scores();'
  );
END
$do$;

SELECT public.refresh_video_scores();
