
-- ─────────────────────────────────────────────────────────────
-- 1. Engagement tables
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.video_likes (
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.video_likes TO authenticated;
GRANT ALL ON public.video_likes TO service_role;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read likes"    ON public.video_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth like own"      ON public.video_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth unlike own"    ON public.video_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.video_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.video_shares TO authenticated;
GRANT ALL ON public.video_shares TO service_role;
ALTER TABLE public.video_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read shares"   ON public.video_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth share own"     ON public.video_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.video_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  watch_ms integer NOT NULL DEFAULT 0 CHECK (watch_ms >= 0 AND watch_ms <= 3600000),
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.video_events TO authenticated;
GRANT ALL ON public.video_events TO service_role;
ALTER TABLE public.video_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth insert own event" ON public.video_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);
CREATE POLICY "owner reads events" ON public.video_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- ─────────────────────────────────────────────────────────────
-- 2. Cached counters on videos
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS view_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_count     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_watch_ms  bigint  NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────
-- 3. Counter-sync triggers
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bump_like() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET like_count = like_count + 1 WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_video_likes_bump
AFTER INSERT OR DELETE ON public.video_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_like();

CREATE OR REPLACE FUNCTION public.bump_share() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.videos SET share_count = share_count + 1 WHERE id = NEW.video_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_video_shares_bump
AFTER INSERT ON public.video_shares
FOR EACH ROW EXECUTE FUNCTION public.bump_share();

CREATE OR REPLACE FUNCTION public.bump_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.videos
     SET view_count     = view_count + 1,
         total_watch_ms = total_watch_ms + COALESCE(NEW.watch_ms, 0)
   WHERE id = NEW.video_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_video_events_bump
AFTER INSERT ON public.video_events
FOR EACH ROW EXECUTE FUNCTION public.bump_event();

-- ─────────────────────────────────────────────────────────────
-- 4. Scout preferences (optional, powers personalization)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.scout_profiles
  ADD COLUMN IF NOT EXISTS preferred_sport     text,
  ADD COLUMN IF NOT EXISTS preferred_positions text[] NOT NULL DEFAULT '{}';

-- ─────────────────────────────────────────────────────────────
-- 5. Rate limiter (ad-hoc, per user per minute)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.feed_rate_limit (
  user_id uuid NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_start)
);
GRANT ALL ON public.feed_rate_limit TO service_role;
ALTER TABLE public.feed_rate_limit ENABLE ROW LEVEL SECURITY;
-- no policies: only accessible via SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION public.enforce_feed_rate_limit(_user uuid, _max integer DEFAULT 120)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  win timestamptz := date_trunc('minute', now());
  cnt integer;
BEGIN
  INSERT INTO public.feed_rate_limit(user_id, window_start, request_count)
  VALUES (_user, win, 1)
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET request_count = public.feed_rate_limit.request_count + 1
  RETURNING request_count INTO cnt;

  IF cnt > _max THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = '42901';
  END IF;

  -- opportunistic cleanup of old windows
  DELETE FROM public.feed_rate_limit
   WHERE user_id = _user AND window_start < now() - interval '10 minutes';
END; $$;

-- ─────────────────────────────────────────────────────────────
-- 6. Indexes for fast feed retrieval
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_videos_status_created ON public.videos(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_user           ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_video     ON public.video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_user      ON public.video_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_shares_video    ON public.video_shares(video_id);
CREATE INDEX IF NOT EXISTS idx_video_events_video    ON public.video_events(video_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user     ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user         ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_sport        ON public.profiles(sport);

-- ─────────────────────────────────────────────────────────────
-- 7. Ranked feed RPC
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_ranked_feed(
  _limit  integer DEFAULT 10,
  _offset integer DEFAULT 0,
  _sport  text    DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  video_url text,
  description text,
  position_tags text[],
  trait_tags text[],
  full_name text,
  sport text,
  avatar_url text,
  like_count integer,
  share_count integer,
  view_count integer,
  liked_by_me boolean,
  score double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  urole app_role;
  pref_sport text;
  pref_positions text[] := '{}';
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
    -- scout must be active
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

  RETURN QUERY
  WITH base AS (
    SELECT v.*, p.full_name, p.sport AS p_sport, p.avatar_url,
           (SELECT count(*) FROM public.achievements a WHERE a.user_id = v.user_id) AS ach_count
      FROM public.videos v
      JOIN public.profiles p ON p.user_id = v.user_id
     WHERE v.status = 'live'
       AND COALESCE(v.flagged, false) = false
       AND COALESCE(p.is_banned, false) = false
       AND (urole <> 'player' OR v.user_id <> uid)
       AND (_sport IS NULL OR p.sport = _sport)
  )
  SELECT
    b.id, b.user_id, b.video_url, b.description, b.position_tags, b.trait_tags,
    b.full_name, b.p_sport, b.avatar_url,
    b.like_count, b.share_count, b.view_count,
    EXISTS (SELECT 1 FROM public.video_likes vl WHERE vl.video_id = b.id AND vl.user_id = uid) AS liked_by_me,
    (
      (b.like_count * 3.0
        + b.share_count * 5.0
        + LEAST(b.total_watch_ms::double precision / 1000.0, 100000) * 0.1
        + b.view_count * 0.5
      )
      * exp(- EXTRACT(EPOCH FROM (now() - b.created_at)) / (86400.0 * 7.0))
      + b.ach_count * 2.0
      + CASE WHEN urole = 'scout' AND pref_sport IS NOT NULL AND b.p_sport = pref_sport THEN 50.0 ELSE 0 END
      + CASE WHEN urole = 'scout' AND array_length(pref_positions,1) IS NOT NULL
               AND b.position_tags && pref_positions THEN 20.0 ELSE 0 END
    ) AS score
  FROM base b
  ORDER BY score DESC, b.created_at DESC
  LIMIT _limit OFFSET _offset;
END; $$;

REVOKE ALL ON FUNCTION public.get_ranked_feed(integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ranked_feed(integer, integer, text) TO authenticated;
REVOKE ALL ON FUNCTION public.enforce_feed_rate_limit(uuid, integer) FROM PUBLIC;
-- enforce_feed_rate_limit only called from other SECURITY DEFINER functions

-- ─────────────────────────────────────────────────────────────
-- 8. Backfill counters from existing rows (safe on empty tables)
-- ─────────────────────────────────────────────────────────────
UPDATE public.videos v SET
  like_count     = COALESCE((SELECT count(*) FROM public.video_likes  WHERE video_id = v.id), 0),
  share_count    = COALESCE((SELECT count(*) FROM public.video_shares WHERE video_id = v.id), 0),
  view_count     = COALESCE((SELECT count(*) FROM public.video_events WHERE video_id = v.id), 0),
  total_watch_ms = COALESCE((SELECT sum(watch_ms) FROM public.video_events WHERE video_id = v.id), 0);
