CREATE OR REPLACE FUNCTION public.get_ranked_feed(_limit integer DEFAULT 10, _offset integer DEFAULT 0, _sport text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, user_id uuid, video_url text, description text, position_tags text[], trait_tags text[], full_name text, sport text, avatar_url text, like_count integer, share_count integer, view_count integer, liked_by_me boolean, score double precision, is_test_slot boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  urole app_role;
  pref_sport text;
  pref_positions text[] := '{}';
  page_size integer := 10;
  page_num integer;
  proven_take integer := 8;
  test_take integer := 2;
  proven_offset integer;
  test_offset integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  PERFORM public.enforce_feed_rate_limit(uid, 120);

  SELECT ur.role INTO urole
  FROM public.user_roles ur
  WHERE ur.user_id = uid
  LIMIT 1;

  IF urole IS NULL THEN
    RAISE EXCEPTION 'no_role' USING ERRCODE = '42501';
  END IF;

  IF urole = 'scout' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.scout_profiles sp
      WHERE sp.user_id = uid
        AND sp.verification_status = 'active'
        AND COALESCE(sp.is_banned, false) = false
    ) THEN
      RAISE EXCEPTION 'scout_not_active' USING ERRCODE = '42501';
    END IF;

    SELECT sp.preferred_sport, COALESCE(sp.preferred_positions, '{}')
    INTO pref_sport, pref_positions
    FROM public.scout_profiles sp
    WHERE sp.user_id = uid;
  END IF;

  _limit := LEAST(GREATEST(COALESCE(_limit, 10), 1), 50);
  _offset := GREATEST(COALESCE(_offset, 0), 0);
  page_num := _offset / page_size;
  proven_offset := page_num * proven_take;
  test_offset := page_num * test_take;

  RETURN QUERY
  WITH proven AS (
    SELECT
      v.id AS vid,
      v.user_id AS vuser,
      v.video_url AS vurl,
      v.description AS vdesc,
      v.position_tags AS vpos,
      v.trait_tags AS vtraits,
      COALESCE(v.like_count, 0) AS vlikes,
      COALESCE(v.share_count, 0) AS vshares,
      COALESCE(v.view_count, 0) AS vviews,
      COALESCE(v.ranking_score, 0) AS vscore,
      p.full_name AS pname,
      p.sport AS psport,
      p.avatar_url AS pavatar,
      false AS is_test,
      ROW_NUMBER() OVER (ORDER BY COALESCE(v.ranking_score, 0) DESC, v.created_at DESC, v.id) AS rn
    FROM public.videos v
    JOIN public.profiles p ON p.user_id = v.user_id
    WHERE v.status = 'live'
      AND COALESCE(v.flagged, false) = false
      AND COALESCE(p.is_banned, false) = false
      AND (urole <> 'player' OR v.user_id <> uid)
      AND (_sport IS NULL OR p.sport = _sport)
    ORDER BY COALESCE(v.ranking_score, 0) DESC, v.created_at DESC, v.id
    LIMIT proven_take OFFSET proven_offset
  ),
  test AS (
    SELECT
      v.id AS vid,
      v.user_id AS vuser,
      v.video_url AS vurl,
      v.description AS vdesc,
      v.position_tags AS vpos,
      v.trait_tags AS vtraits,
      COALESCE(v.like_count, 0) AS vlikes,
      COALESCE(v.share_count, 0) AS vshares,
      COALESCE(v.view_count, 0) AS vviews,
      COALESCE(v.ranking_score, 0) AS vscore,
      p.full_name AS pname,
      p.sport AS psport,
      p.avatar_url AS pavatar,
      true AS is_test,
      ROW_NUMBER() OVER (ORDER BY v.created_at DESC, v.id) AS rn
    FROM public.videos v
    JOIN public.profiles p ON p.user_id = v.user_id
    WHERE v.status = 'live'
      AND COALESCE(v.flagged, false) = false
      AND COALESCE(p.is_banned, false) = false
      AND COALESCE(v.view_count, 0) < 50
      AND (urole <> 'player' OR v.user_id <> uid)
      AND (_sport IS NULL OR p.sport = _sport)
      AND NOT EXISTS (SELECT 1 FROM proven pr WHERE pr.vid = v.id)
    ORDER BY v.created_at DESC, v.id
    LIMIT test_take OFFSET test_offset
  ),
  merged AS (
    SELECT p.*, (p.rn - 1) AS slot_pos FROM proven p
    UNION ALL
    SELECT t.*, (proven_take + t.rn - 1) AS slot_pos FROM test t
  )
  SELECT
    m.vid,
    m.vuser,
    m.vurl,
    m.vdesc,
    COALESCE(m.vpos, '{}'),
    COALESCE(m.vtraits, '{}'),
    COALESCE(m.pname, 'Unknown'),
    COALESCE(m.psport, 'football'),
    COALESCE(m.pavatar, ''),
    m.vlikes,
    m.vshares,
    m.vviews,
    EXISTS (
      SELECT 1 FROM public.video_likes vl
      WHERE vl.video_id = m.vid AND vl.user_id = uid
    ) AS liked_by_me,
    (
      m.vscore
      + CASE WHEN urole = 'scout' AND pref_sport IS NOT NULL AND m.psport = pref_sport THEN 50.0 ELSE 0 END
      + CASE WHEN urole = 'scout' AND array_length(pref_positions, 1) IS NOT NULL AND COALESCE(m.vpos, '{}') && pref_positions THEN 20.0 ELSE 0 END
    ) AS score,
    m.is_test AS is_test_slot
  FROM merged m
  ORDER BY m.slot_pos
  LIMIT _limit;
END;
$function$;