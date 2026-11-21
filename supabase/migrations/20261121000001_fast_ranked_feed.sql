-- Faster reels feed. At about 3 lakh videos the old feed scored every recent reel on each request
-- (1.7 to 3 seconds). It now ranks a short candidate list taken from indexes, with the same rules.
set search_path = public, extensions;
create extension if not exists pg_trgm with schema extensions;

-- Tags as one lower-case string, so search can use a text index.
create or replace function public.tags_text(_a text[], _b text[])
returns text language sql immutable parallel safe set search_path = public as $$
  select lower(array_to_string(coalesce(_a, '{}'::text[]) || coalesce(_b, '{}'::text[]), ' '))
$$;

create index if not exists idx_videos_title_trgm on public.videos using gin (lower(coalesce(title, '')) gin_trgm_ops) where status = 'live';
create index if not exists idx_videos_description_trgm on public.videos using gin (lower(coalesce(description, '')) gin_trgm_ops) where status = 'live';
create index if not exists idx_videos_tags_trgm on public.videos using gin (public.tags_text(position_tags, trait_tags) gin_trgm_ops) where status = 'live';
create index if not exists idx_profiles_full_name_trgm on public.profiles using gin (lower(coalesce(full_name, '')) gin_trgm_ops);
create index if not exists idx_profiles_username_trgm on public.profiles using gin (lower(coalesce(username, '')) gin_trgm_ops);
-- Following feed: newest reels of the people you follow.
create index if not exists idx_videos_live_user_created on public.videos (user_id, created_at desc) where status = 'live';

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
  cand_n integer;
  fresh_n integer;
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
  -- Candidate list sizes: comfortably more than the page needs, far less than every recent reel.
  cand_n := 400 + (page_num + 1) * 24;
  fresh_n := 100 + (page_num + 1) * 2;

  return query
  with cand as (
    -- Ranking every recent reel on each scroll does not scale, so take a short candidate list from
    -- indexes first. The same ranking rules below then run on these candidates only.
    (select v.id as cid from public.videos v
      where q is null and not _following_only
        and v.status = 'live' and coalesce(v.flagged, false) = false and not coalesce(v.archived, false)
        and v.created_at > now() - make_interval(days => push_days)
      order by v.ranking_score desc, v.created_at desc limit cand_n)
    union
    (select v.id from public.follows f join public.videos v on v.user_id = f.followee_id
      where q is null and f.follower_id = uid and v.status = 'live'
        and (_following_only or v.created_at > now() - make_interval(days => push_days))
      order by v.created_at desc limit case when _following_only then 2000 else cand_n end)
    union
    (select v.id from public.videos v join public.profiles p on p.user_id = v.user_id
      where q is null and not _following_only and is_scout and pref_sport is not null and p.sport = pref_sport
        and v.status = 'live' and coalesce(v.flagged, false) = false and not coalesce(v.archived, false)
        and v.created_at > now() - make_interval(days => push_days)
      order by v.ranking_score desc, v.created_at desc limit cand_n)
    union
    (select v.id from public.videos v
      where q is null and not _following_only
        and v.status = 'live' and coalesce(v.flagged, false) = false and v.view_count < 50
        and not coalesce(v.archived, false) and v.created_at > now() - make_interval(days => push_days)
      order by v.created_at desc limit fresh_n)
    union
    -- Search: best-ranked matches and the newest unseen matches, found through text indexes.
    (select v.id from public.videos v
      where q is not null and v.status = 'live' and (lower(coalesce(v.title, '')) like '%' || q || '%'
             or lower(coalesce(v.description, '')) like '%' || q || '%'
             or public.tags_text(v.position_tags, v.trait_tags) like '%' || q || '%')
      order by v.ranking_score desc, v.created_at desc limit cand_n)
    union
    (select v.id from public.videos v
      where q is not null and v.status = 'live' and v.view_count < 50 and (lower(coalesce(v.title, '')) like '%' || q || '%'
             or lower(coalesce(v.description, '')) like '%' || q || '%'
             or public.tags_text(v.position_tags, v.trait_tags) like '%' || q || '%')
      order by v.created_at desc limit fresh_n)
    union
    (select v.id from public.profiles p join public.videos v on v.user_id = p.user_id
      where q is not null and v.status = 'live' and (lower(coalesce(p.full_name, '')) like '%' || q || '%' or lower(coalesce(p.username, '')) like '%' || q || '%')
      order by v.ranking_score desc, v.created_at desc limit cand_n)
    union
    (select v.id from public.profiles p join public.videos v on v.user_id = p.user_id
      where q is not null and v.status = 'live' and v.view_count < 50 and (lower(coalesce(p.full_name, '')) like '%' || q || '%' or lower(coalesce(p.username, '')) like '%' || q || '%')
      order by v.created_at desc limit fresh_n)
  ),
  base as (
    select v.id as vid, v.user_id as vuser, v.video_url as vurl, v.title as vtitle, v.description as vdesc,
           coalesce(v.position_tags, '{}') as vpos, coalesce(v.trait_tags, '{}') as vtraits,
           coalesce(v.like_count, 0) as vlikes, coalesce(v.share_count, 0) as vshares,
           coalesce(v.view_count, 0) as vviews, coalesce(v.ranking_score, 0) as vscore, v.created_at as vcreated,
           p.full_name as pname, p.username as puser, p.sport as psport, p.avatar_url as pavatar,
           coalesce(ps.comment_control, 'everyone') <> 'off' as pcomments
      from public.videos v
      join public.profiles p on p.user_id = v.user_id
      left join public.privacy_settings ps on ps.user_id = v.user_id
     where v.id in (select c.cid from cand c)
       and v.status = 'live'
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

-- Indexes for foreign keys flagged by Supabase's performance advisor (keeps user deletes fast).
create index if not exists idx_admin_actions_admin on public.admin_actions (admin_id);
create index if not exists idx_app_settings_updated_by on public.app_settings (updated_by);
create index if not exists idx_conversations_closed_by on public.conversations (closed_by);
create index if not exists idx_conversations_opened_by on public.conversations (opened_by);
create index if not exists idx_conversations_request on public.conversations (request_id);
create index if not exists idx_dm_removals_removed_by on public.direct_message_removals (removed_by);
create index if not exists idx_direct_messages_pinned_by on public.direct_messages (pinned_by);
create index if not exists idx_news_posts_created_by on public.news_posts (created_by);
create index if not exists idx_profiles_banned_by on public.profiles (banned_by);
create index if not exists idx_scout_profiles_banned_by on public.scout_profiles (banned_by);
create index if not exists idx_user_reports_conversation on public.user_reports (conversation_id);
