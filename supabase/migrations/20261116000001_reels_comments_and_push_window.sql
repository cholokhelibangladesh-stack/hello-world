-- Reels ranking: comments now count, and every reel has a push window.
--
-- Score (recomputed every 5 minutes by refresh_video_scores):
--   likes x3 + comments x5 + shares x8 + views x0.4 + watch seconds x0.5
--   decaying with age (e^(-age/7 days)), with up to a 5x boost in the first 24 hours.
-- Push window: get_ranked_feed only pushes reels newer than app_settings.reel_push_days
-- (default 30). Searches and the Following feed still reach older reels; profiles always show them.

insert into public.app_settings (key, value) values ('reel_push_days', '30'::jsonb)
on conflict (key) do nothing;

create or replace function public.reel_push_days()
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select greatest(1, least(365, coalesce(
    (select (value #>> '{}')::int from public.app_settings where key = 'reel_push_days' and (value #>> '{}') ~ '^[0-9]{1,3}$'),
    30)));
$$;
revoke all on function public.reel_push_days() from public, anon;
grant execute on function public.reel_push_days() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_video_scores()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  WITH creator_avg AS (
    SELECT user_id, AVG(base_score) FILTER (WHERE rn <= 5) AS ghost
    FROM (
      SELECT
        v.user_id,
        v.id,
        (
          COALESCE(v.like_count, 0) * 3.0
          + COALESCE(v.share_count, 0) * 8.0
          + LEAST(COALESCE(v.total_watch_ms, 0)::double precision / 1000.0, 100000) * 0.5
          + COALESCE(v.view_count, 0) * 0.4
          + (SELECT count(*) FROM public.video_comments c WHERE c.video_id = v.id) * 5.0
        ) AS base_score,
        ROW_NUMBER() OVER (PARTITION BY v.user_id ORDER BY v.created_at DESC) AS rn
      FROM public.videos v
      WHERE v.status = 'live' AND COALESCE(v.flagged, false) = false
    ) s
    GROUP BY user_id
  )
  UPDATE public.videos v
     SET ranking_score = (
           (
             COALESCE(v.like_count, 0) * 3.0
             + COALESCE(v.share_count, 0) * 8.0
             + LEAST(COALESCE(v.total_watch_ms, 0)::double precision / 1000.0, 100000) * 0.5
             + COALESCE(v.view_count, 0) * 0.4
             + (SELECT count(*) FROM public.video_comments c WHERE c.video_id = v.id) * 5.0
             + CASE
                 WHEN COALESCE(v.view_count, 0) = 0
                  AND COALESCE(v.like_count, 0) = 0
                  AND COALESCE(v.share_count, 0) = 0
                  AND NOT EXISTS (SELECT 1 FROM public.video_comments c WHERE c.video_id = v.id)
                 THEN COALESCE(ca.ghost, 0)
                 ELSE 0
               END
           )
           * exp(- EXTRACT(EPOCH FROM (now() - v.created_at)) / (86400.0 * 7.0))
           * CASE
               WHEN EXTRACT(EPOCH FROM (now() - v.created_at)) / 3600.0 < 24
               THEN 1.0 + 4.0 * exp(- EXTRACT(EPOCH FROM (now() - v.created_at)) / 3600.0 / 6.0)
               ELSE 1.0
             END
         ),
         score_updated_at = now()
    FROM creator_avg ca
   WHERE ca.user_id = v.user_id
     AND v.status = 'live'
     AND COALESCE(v.flagged, false) = false;

  UPDATE public.videos v
     SET ranking_score = 0,
         score_updated_at = now()
   WHERE v.status <> 'live' OR COALESCE(v.flagged, false) = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_ranked_feed(_limit integer DEFAULT 10, _offset integer DEFAULT 0, _sport text DEFAULT NULL::text, _positions text[] DEFAULT NULL::text[], _traits text[] DEFAULT NULL::text[], _query text DEFAULT NULL::text, _following_only boolean DEFAULT false)
 RETURNS TABLE(id uuid, user_id uuid, video_url text, title text, description text, position_tags text[], trait_tags text[], full_name text, username text, sport text, avatar_url text, like_count integer, share_count integer, view_count integer, comment_count integer, liked_by_me boolean, following boolean, comments_enabled boolean, created_at timestamp with time zone, score double precision, is_test_slot boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  is_admin boolean;
  is_scout boolean;
  pref_sport text;
  pref_positions text[] := '{}';
  q text := nullif(lower(btrim(coalesce(_query, ''))), '');
  pos text[] := (select array_agg(lower(x)) from unnest(coalesce(_positions, '{}')) x where btrim(x) <> '');
  trs text[] := (select array_agg(lower(x)) from unnest(coalesce(_traits, '{}')) x where btrim(x) <> '');
  page_num integer;
  push_days integer := public.reel_push_days();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.can_view_talent(uid) then raise exception 'scout_not_active' using errcode = '42501'; end if;
  perform public.enforce_feed_rate_limit(uid, 120);

  is_admin := public.has_role(uid, 'admin');
  is_scout := public.is_active_scout(uid);
  if is_scout then
    select sp.preferred_sport, coalesce(sp.preferred_positions, '{}') into pref_sport, pref_positions
      from public.scout_profiles sp where sp.user_id = uid;
  end if;

  _limit := least(greatest(coalesce(_limit, 10), 1), 50);
  _offset := greatest(coalesce(_offset, 0), 0);
  page_num := _offset / 10;

  return query
  with base as (
    select v.id as vid, v.user_id as vuser, v.video_url as vurl, v.title as vtitle, v.description as vdesc,
           coalesce(v.position_tags, '{}') as vpos, coalesce(v.trait_tags, '{}') as vtraits,
           coalesce(v.like_count, 0) as vlikes, coalesce(v.share_count, 0) as vshares,
           coalesce(v.view_count, 0) as vviews, coalesce(v.ranking_score, 0) as vscore, v.created_at as vcreated,
           p.full_name as pname, p.username as puser, p.sport as psport, p.avatar_url as pavatar,
           coalesce(ps.comment_control, 'everyone') <> 'off' as pcomments
      from public.videos v
      join public.profiles p on p.user_id = v.user_id
      left join public.privacy_settings ps on ps.user_id = v.user_id
     where v.status = 'live'
       and not coalesce(v.flagged, false)
       and not coalesce(v.archived, false)
       and not public.is_banned(v.user_id)
       and v.user_id <> uid
       and (is_admin or not coalesce(ps.is_private, false))
       and not exists (select 1 from public.blocked_users b
                        where (b.blocker_id = uid and b.blocked_id = v.user_id)
                           or (b.blocker_id = v.user_id and b.blocked_id = uid))
       and not exists (select 1 from public.muted_users m
                        where m.user_id = uid and m.muted_id = v.user_id and m.mute_posts)
       and (_sport is null or lower(p.sport) = lower(_sport))
       and (pos is null or exists (select 1 from unnest(v.position_tags) t where lower(t) = any (pos)))
       and (trs is null or exists (select 1 from unnest(v.trait_tags) t where lower(t) = any (trs)))
       and (q is null
            or lower(coalesce(p.full_name, '')) like '%' || q || '%'
            or lower(coalesce(p.username, '')) like '%' || q || '%'
            or lower(coalesce(v.title, '')) like '%' || q || '%'
            or lower(coalesce(v.description, '')) like '%' || q || '%'
            or exists (select 1 from unnest(v.position_tags || v.trait_tags) t where lower(t) like '%' || q || '%'))
       and (not _following_only or exists (select 1 from public.follows f where f.follower_id = uid and f.followee_id = v.user_id))
       -- Push window: the main feed only pushes reels newer than reel_push_days. Searches and the
       -- Following feed still reach older reels, and profiles always show them.
       and (q is not null or _following_only or v.created_at > now() - make_interval(days => push_days))
  ),
  scored as (
    select b.*,
      ( b.vscore
        + case when is_scout and pref_sport is not null and b.psport = pref_sport then 50.0 else 0 end
        + case when is_scout and array_length(pref_positions, 1) is not null
                 and exists (select 1 from unnest(b.vpos) t where lower(t) = any (select lower(x) from unnest(pref_positions) x)) then 20.0 else 0 end
        + case when exists (select 1 from public.follows f where f.follower_id = uid and f.followee_id = b.vuser) then 30.0 else 0 end
      ) as s,
      (b.vviews < 50) as fresh
    from base b
  ),
  -- 8 proven + 2 fresh clips per page of 10 so new players get seen
  proven as (
    select sc.*, false as is_test, row_number() over (order by sc.s desc, sc.vcreated desc, sc.vid) as rn
      from scored sc order by sc.s desc, sc.vcreated desc, sc.vid
     limit 8 offset page_num * 8
  ),
  test as (
    select sc.*, true as is_test, row_number() over (order by sc.vcreated desc, sc.vid) as rn
      from scored sc
     where sc.fresh and not exists (select 1 from proven pr where pr.vid = sc.vid)
     order by sc.vcreated desc, sc.vid
     limit 2 offset page_num * 2
  ),
  merged as (
    select pr.*, (pr.rn - 1) as slot from proven pr
    union all
    select t.*, (8 + t.rn - 1) as slot from test t
  )
  select m.vid, m.vuser, m.vurl, m.vtitle, m.vdesc, m.vpos, m.vtraits,
         coalesce(m.pname, 'Player'), m.puser, coalesce(m.psport, 'football'), coalesce(m.pavatar, ''),
         m.vlikes, m.vshares, m.vviews,
         (select count(*)::int from public.video_comments c where c.video_id = m.vid),
         exists (select 1 from public.video_likes vl where vl.video_id = m.vid and vl.user_id = uid),
         exists (select 1 from public.follows f where f.follower_id = uid and f.followee_id = m.vuser),
         m.pcomments, m.vcreated, m.s, m.is_test
    from merged m
   order by m.slot
   limit _limit;
end $function$;

