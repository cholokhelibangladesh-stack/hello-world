-- Social features, server-side notifications with push/email delivery, and admin moderation.
--
--  1. follows            players and scouts follow players (watchlist for scouts)
--  2. video_comments     comments on highlights, respecting the owner's comment setting
--  3. notify_user()      one place that writes notifications and honours notification_preferences
--     triggers           likes, comments, follows, support messages, scout request decisions
--  4. push_tokens        device tokens for Android/iOS push
--     delivery           AFTER INSERT on notifications calls the send-notification edge function (pg_net)
--  5. get_ranked_feed    server-side sport / position / trait / text filters, blocks and mutes,
--                        comment counts and "following" flag
--  6. admin              audit log, remove/restore video with notice, ban/suspend/warn with notice,
--                        broadcast notices, video reports, real statistics in one RPC

-- ───────────────────────────── 1. follows ─────────────────────────────
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (user_id) on delete cascade,
  followee_id uuid not null references public.profiles (user_id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);
create index if not exists idx_follows_followee on public.follows (followee_id, created_at desc);
revoke all on public.follows from anon;
grant select, insert, delete on public.follows to authenticated;
grant all on public.follows to service_role;
alter table public.follows enable row level security;

create or replace function public.is_blocked_between(_a uuid, _b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocked_users
                  where (blocker_id = _a and blocked_id = _b) or (blocker_id = _b and blocked_id = _a))
$$;
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated, service_role;

create policy "See follows of visible profiles" on public.follows
  for select to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()) or public.can_view_talent((select auth.uid())));
create policy "Follow as yourself" on public.follows
  for insert to authenticated
  with check (follower_id = (select auth.uid())
              and public.can_view_talent((select auth.uid()))
              and not public.is_banned((select auth.uid()))
              and not public.is_blocked_between(follower_id, followee_id));
create policy "Unfollow as yourself" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

create or replace function public.get_follow_stats(_user_id uuid)
returns table (followers bigint, following bigint, i_follow boolean, follows_me boolean)
language sql stable security definer set search_path = public as $$
  select (select count(*) from public.follows where followee_id = _user_id),
         (select count(*) from public.follows where follower_id = _user_id),
         exists (select 1 from public.follows where follower_id = auth.uid() and followee_id = _user_id),
         exists (select 1 from public.follows where follower_id = _user_id and followee_id = auth.uid())
   where auth.uid() = _user_id or public.can_view_talent(auth.uid())
$$;
revoke all on function public.get_follow_stats(uuid) from public, anon;
grant execute on function public.get_follow_stats(uuid) to authenticated, service_role;

-- ─────────────────────────── 2. video_comments ───────────────────────────
create table if not exists public.video_comments (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid not null references public.videos (id) on delete cascade,
  user_id    uuid not null references public.profiles (user_id) on delete cascade,
  body       text not null constraint video_comments_body_len check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists idx_video_comments_video on public.video_comments (video_id, created_at desc);
create index if not exists idx_video_comments_user on public.video_comments (user_id, created_at desc);
revoke all on public.video_comments from anon;
grant select, insert, delete on public.video_comments to authenticated;
grant all on public.video_comments to service_role;
alter table public.video_comments enable row level security;

create or replace function public.comments_allowed(_video_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select coalesce(ps.comment_control, 'everyone') <> 'off'
      from public.videos v left join public.privacy_settings ps on ps.user_id = v.user_id
     where v.id = _video_id), false)
$$;
revoke all on function public.comments_allowed(uuid) from public, anon;
grant execute on function public.comments_allowed(uuid) to authenticated, service_role;

-- The sub-select on videos runs under the caller's RLS, so you only see comments on videos you can see.
create policy "Read comments on visible videos" on public.video_comments
  for select to authenticated
  using (exists (select 1 from public.videos v where v.id = video_id));
create policy "Comment as yourself on visible videos" on public.video_comments
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and not public.is_banned((select auth.uid()))
              and exists (select 1 from public.videos v where v.id = video_id and v.status = 'live')
              and public.comments_allowed(video_id)
              and not public.is_blocked_between((select auth.uid()),
                    (select v.user_id from public.videos v where v.id = video_id)));
create policy "Delete own comments, comments on own videos, or as admin" on public.video_comments
  for delete to authenticated
  using (user_id = (select auth.uid())
         or public.has_role((select auth.uid()), 'admin')
         or exists (select 1 from public.videos v where v.id = video_id and v.user_id = (select auth.uid())));

create or replace function public.tg_comment_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.video_comments
       where user_id = new.user_id and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'too many comments, slow down' using errcode = '54000';
  end if;
  new.body := btrim(new.body);
  return new;
end $$;
drop trigger if exists trg_comment_rate_limit on public.video_comments;
create trigger trg_comment_rate_limit before insert on public.video_comments
  for each row execute function public.tg_comment_rate_limit();

-- ───────────────────────── 3. notifications ─────────────────────────
-- Categories map to notification_preferences columns. "system" notices always go through.
create or replace function public.notify_user(
  _user_id uuid, _title text, _message text, _type text,
  _metadata jsonb default '{}'::jsonb, _category text default 'system')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  p public.notification_preferences%rowtype;
  allowed boolean := true;
  nid uuid;
begin
  if _user_id is null then return null; end if;
  select * into p from public.notification_preferences where user_id = _user_id;
  if found and _category <> 'system' then
    if p.pause_all_until is not null and p.pause_all_until > now() then
      allowed := false;
    else
      allowed := case _category
        when 'likes' then p.likes
        when 'comments' then p.comments
        when 'new_followers' then p.new_followers
        when 'messages' then p.messages
        when 'scout_requests' then p.scout_requests
        when 'video_activity' then p.video_activity
        when 'from_cholo_kheli' then p.from_cholo_kheli
        else true end;
    end if;
  end if;
  if not allowed then return null; end if;
  insert into public.notifications (user_id, title, message, type, metadata)
  values (_user_id, left(coalesce(nullif(btrim(_title), ''), 'Notification'), 200), left(coalesce(_message, ''), 2000), _type,
          coalesce(_metadata, '{}'::jsonb) || jsonb_build_object('category', _category))
  returning id into nid;
  return nid;
end $$;
revoke all on function public.notify_user(uuid, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.notify_user(uuid, text, text, text, jsonb, text) to service_role;

create or replace function public.display_name(_user_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select coalesce(nullif(btrim(full_name), ''), '@' || username) from public.profiles where user_id = _user_id), 'Someone')
$$;
revoke all on function public.display_name(uuid) from public, anon;
grant execute on function public.display_name(uuid) to authenticated, service_role;

create or replace function public.tg_notify_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; vtitle text;
begin
  select user_id, title into owner, vtitle from public.videos where id = new.video_id;
  if owner is null or owner = new.user_id then return null; end if;
  -- one notification per person per video, even if they unlike and like again
  if exists (select 1 from public.notifications
              where user_id = owner and type = 'like'
                and metadata ->> 'video_id' = new.video_id::text
                and metadata ->> 'actor_id' = new.user_id::text) then
    return null;
  end if;
  perform public.notify_user(owner, public.display_name(new.user_id) || ' liked your highlight',
    coalesce(vtitle, ''), 'like',
    jsonb_build_object('video_id', new.video_id, 'actor_id', new.user_id), 'likes');
  return null;
end $$;
drop trigger if exists trg_notify_like on public.video_likes;
create trigger trg_notify_like after insert on public.video_likes
  for each row execute function public.tg_notify_like();

create or replace function public.tg_notify_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select user_id into owner from public.videos where id = new.video_id;
  if owner is null or owner = new.user_id then return null; end if;
  perform public.notify_user(owner, public.display_name(new.user_id) || ' commented on your highlight',
    left(new.body, 140), 'comment',
    jsonb_build_object('video_id', new.video_id, 'comment_id', new.id, 'actor_id', new.user_id), 'comments');
  return null;
end $$;
drop trigger if exists trg_notify_comment on public.video_comments;
create trigger trg_notify_comment after insert on public.video_comments
  for each row execute function public.tg_notify_comment();

create or replace function public.tg_notify_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare is_scout boolean;
begin
  if exists (select 1 from public.notifications
              where user_id = new.followee_id and type = 'follow'
                and metadata ->> 'actor_id' = new.follower_id::text
                and created_at > now() - interval '1 day') then
    return null;
  end if;
  is_scout := public.is_active_scout(new.follower_id);
  perform public.notify_user(new.followee_id,
    case when is_scout then 'A verified scout added you to their watchlist'
         else public.display_name(new.follower_id) || ' started following you' end,
    case when is_scout then public.display_name(new.follower_id) || ' will see your new highlights first.' else '' end,
    'follow', jsonb_build_object('actor_id', new.follower_id, 'scout', is_scout), 'new_followers');
  return null;
end $$;
drop trigger if exists trg_notify_follow on public.follows;
create trigger trg_notify_follow after insert on public.follows
  for each row execute function public.tg_notify_follow();

create or replace function public.tg_notify_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.receiver_id is null or new.receiver_id = new.sender_id then return null; end if;
  perform public.notify_user(new.receiver_id,
    case when public.has_role(new.sender_id, 'admin') then 'New message from the Cholo Kheli team'
         else 'New message from ' || public.display_name(new.sender_id) end,
    left(new.content, 140), 'message',
    jsonb_build_object('message_id', new.id, 'actor_id', new.sender_id), 'messages');
  return null;
end $$;
drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message after insert on public.messages
  for each row execute function public.tg_notify_message();

-- A new highlight from someone you follow
create or replace function public.tg_notify_followers_new_video()
returns trigger language plpgsql security definer set search_path = public as $$
declare f record; who text;
begin
  if new.status <> 'live' or (tg_op = 'UPDATE' and old.status = 'live') then return null; end if;
  if public.is_private_account(new.user_id) then return null; end if;
  who := public.display_name(new.user_id);
  for f in select follower_id from public.follows where followee_id = new.user_id limit 1000 loop
    perform public.notify_user(f.follower_id, who || ' posted a new highlight', coalesce(new.title, ''),
      'new_video', jsonb_build_object('video_id', new.id, 'actor_id', new.user_id), 'video_activity');
  end loop;
  return null;
end $$;
drop trigger if exists trg_notify_followers_new_video on public.videos;
create trigger trg_notify_followers_new_video after insert or update of status on public.videos
  for each row execute function public.tg_notify_followers_new_video();

revoke execute on function public.tg_comment_rate_limit(), public.tg_notify_like(), public.tg_notify_comment(),
  public.tg_notify_follow(), public.tg_notify_message(), public.tg_notify_followers_new_video()
  from public, anon, authenticated;

-- ───────────────────── 4. push tokens and delivery ─────────────────────
create table if not exists public.push_tokens (
  token      text primary key constraint push_tokens_token_len check (char_length(token) between 10 and 4096),
  user_id    uuid not null references auth.users (id) on delete cascade,
  platform   text not null default 'android' check (platform in ('android', 'ios', 'web')),
  updated_at timestamptz not null default now()
);
create index if not exists idx_push_tokens_user on public.push_tokens (user_id);
revoke all on public.push_tokens from anon;
grant select, insert, update, delete on public.push_tokens to authenticated;
grant all on public.push_tokens to service_role;
alter table public.push_tokens enable row level security;
create policy "Manage own push tokens" on public.push_tokens
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Registers (or moves) a device token to the caller. A device signed into a new account
-- stops receiving the previous account's pushes.
create or replace function public.register_push_token(_token text, _platform text default 'android')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (_token, auth.uid(), coalesce(_platform, 'android'), now())
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;
revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- Private config the API cannot read: edge function URL and shared secret for delivery.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.app_config (key text primary key, value text not null);
insert into private.app_config (key, value)
values ('notify_secret', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

do $$ begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net not available (%); push/email delivery stays off until it is enabled', sqlerrm;
end $$;

create or replace function public.tg_deliver_notification()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare url text; secret text;
begin
  select value into url from private.app_config where key = 'notify_url';
  select value into secret from private.app_config where key = 'notify_secret';
  if url is null or secret is null or to_regproc('net.http_post') is null then return null; end if;
  begin
    execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 5000)'
      using url, jsonb_build_object('notification_id', new.id),
            jsonb_build_object('Content-Type', 'application/json', 'x-ck-secret', secret);
  exception when others then
    raise warning 'notification delivery skipped: %', sqlerrm;
  end;
  return null;
end $$;
revoke execute on function public.tg_deliver_notification() from public, anon, authenticated;
drop trigger if exists trg_deliver_notification on public.notifications;
create trigger trg_deliver_notification after insert on public.notifications
  for each row execute function public.tg_deliver_notification();

-- ─────────────────────── 5. ranked feed with filters ───────────────────────
drop function if exists public.get_ranked_feed(integer, integer, text);
create or replace function public.get_ranked_feed(
  _limit integer default 10, _offset integer default 0, _sport text default null,
  _positions text[] default null, _traits text[] default null, _query text default null,
  _following_only boolean default false)
returns table (
  id uuid, user_id uuid, video_url text, title text, description text,
  position_tags text[], trait_tags text[], full_name text, username text, sport text, avatar_url text,
  like_count integer, share_count integer, view_count integer, comment_count integer,
  liked_by_me boolean, following boolean, comments_enabled boolean, created_at timestamptz,
  score double precision, is_test_slot boolean)
language plpgsql security definer set search_path = public as $$
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
end $$;
revoke all on function public.get_ranked_feed(integer, integer, text, text[], text[], text, boolean) from public, anon;
grant execute on function public.get_ranked_feed(integer, integer, text, text[], text[], text, boolean) to authenticated;

-- Live counts for one video (after a like/share the client re-reads the truth).
create or replace function public.get_video_counts(_video_id uuid)
returns table (like_count integer, share_count integer, view_count integer, comment_count integer, liked_by_me boolean)
language sql stable security definer set search_path = public as $$
  select v.like_count, v.share_count, v.view_count,
         (select count(*)::int from public.video_comments c where c.video_id = v.id),
         exists (select 1 from public.video_likes l where l.video_id = v.id and l.user_id = auth.uid())
    from public.videos v
   where v.id = _video_id
     and (v.user_id = auth.uid() or public.has_role(auth.uid(), 'admin')
          or (public.can_view_talent(auth.uid()) and v.status = 'live' and not public.is_private_account(v.user_id)))
$$;
revoke all on function public.get_video_counts(uuid) from public, anon;
grant execute on function public.get_video_counts(uuid) to authenticated;

-- ─────────────────────────────── 6. admin ───────────────────────────────
create table if not exists public.admin_actions (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid references auth.users (id) on delete set null,
  action       text not null,
  target_user  uuid references auth.users (id) on delete set null,
  target_video uuid,
  reason       text constraint admin_actions_reason_len check (char_length(coalesce(reason, '')) <= 2000),
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_admin_actions_created on public.admin_actions (created_at desc);
create index if not exists idx_admin_actions_target on public.admin_actions (target_user, created_at desc);
revoke all on public.admin_actions from anon;
grant select on public.admin_actions to authenticated;
grant all on public.admin_actions to service_role;
alter table public.admin_actions enable row level security;
create policy "Admins read the audit log" on public.admin_actions
  for select to authenticated using (public.has_role((select auth.uid()), 'admin'));

create or replace function public.require_admin()
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return auth.uid();
end $$;
revoke all on function public.require_admin() from public, anon, authenticated;

create or replace function public.log_admin_action(_action text, _user uuid, _video uuid, _reason text, _details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_actions (admin_id, action, target_user, target_video, reason, details)
  values (auth.uid(), _action, _user, _video, left(_reason, 2000), coalesce(_details, '{}'::jsonb))
$$;
revoke all on function public.log_admin_action(text, uuid, uuid, text, jsonb) from public, anon, authenticated;

-- Remove a video and tell the owner why. The row is kept (status 'rejected') so it can be restored.
create or replace function public.admin_remove_video(_video_id uuid, _reason text, _notify boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.require_admin(); owner uuid; vtitle text; why text := nullif(btrim(coalesce(_reason, '')), '');
begin
  if why is null then raise exception 'a reason is required' using errcode = '22023'; end if;
  update public.videos set status = 'rejected', flagged = true, flag_reason = left(why, 500)
   where id = _video_id returning user_id, title into owner, vtitle;
  if owner is null then raise exception 'video not found' using errcode = 'P0002'; end if;
  update public.moderation_alerts set status = 'resolved', resolved_at = now(), resolved_by = me
   where kind = 'video' and target_id = _video_id and status = 'new';
  if _notify then
    perform public.notify_user(owner, 'Your highlight was removed',
      '"' || coalesce(vtitle, 'Highlight') || '" was removed by the Cholo Kheli team. Reason: ' || why,
      'video_removed', jsonb_build_object('video_id', _video_id, 'reason', why), 'system');
  end if;
  perform public.log_admin_action('remove_video', owner, _video_id, why);
end $$;

create or replace function public.admin_restore_video(_video_id uuid, _note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.require_admin(); owner uuid; vtitle text;
begin
  update public.videos set status = 'live', flagged = false, flag_reason = null
   where id = _video_id returning user_id, title into owner, vtitle;
  if owner is null then raise exception 'video not found' using errcode = 'P0002'; end if;
  perform public.notify_user(owner, 'Your highlight is live again',
    '"' || coalesce(vtitle, 'Highlight') || '" was reviewed and restored.' || coalesce(' ' || nullif(btrim(_note), ''), ''),
    'video_restored', jsonb_build_object('video_id', _video_id), 'system');
  perform public.log_admin_action('restore_video', owner, _video_id, _note);
end $$;

-- One entry point for account actions. _action: 'warn' | 'suspend' (needs _hours) | 'ban' | 'unban'.
create or replace function public.admin_moderate_user(
  _target uuid, _action text, _reason text default null, _message text default null, _hours integer default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.require_admin();
  why text := nullif(btrim(coalesce(_reason, '')), '');
  note text := nullif(btrim(coalesce(_message, '')), '');
  until_text text;
  is_scout boolean;
begin
  if _target is null or _target = me then raise exception 'invalid target' using errcode = '22023'; end if;
  if public.has_role(_target, 'admin') then raise exception 'admins cannot be moderated here' using errcode = '42501'; end if;
  is_scout := exists (select 1 from public.scout_profiles where user_id = _target);

  if _action in ('warn', 'suspend', 'ban') and why is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  if _action = 'warn' then
    perform public.notify_user(_target, 'Warning from the Cholo Kheli team',
      why || coalesce(E'\n\n' || note, ''), 'account_notice',
      jsonb_build_object('action', 'warn', 'reason', why), 'system');
  elsif _action in ('suspend', 'ban') then
    if _action = 'suspend' and (coalesce(_hours, 0) < 1 or _hours > 24 * 365) then
      raise exception 'suspension length must be 1 hour to 1 year' using errcode = '22023';
    end if;
    perform public.admin_set_ban(_target, 'profile', true, why, note, case when _action = 'suspend' then _hours end);
    if is_scout then
      perform public.admin_set_ban(_target, 'scout', true, why, note, case when _action = 'suspend' then _hours end);
    end if;
    until_text := case when _action = 'suspend'
      then to_char((now() + make_interval(hours => _hours)) at time zone 'Asia/Dhaka', 'DD Mon YYYY, HH12:MI AM') end;
    perform public.notify_user(_target,
      case when _action = 'suspend' then 'Your account is suspended' else 'Your account is banned' end,
      'Reason: ' || why
        || coalesce(E'\nUntil: ' || until_text || ' (Dhaka time)', '')
        || coalesce(E'\n\n' || note, ''),
      'account_notice', jsonb_build_object('action', _action, 'reason', why, 'hours', _hours), 'system');
    -- end active sessions so the restriction applies right away
    delete from auth.sessions where user_id = _target;
  elsif _action = 'unban' then
    perform public.admin_set_ban(_target, 'profile', false);
    if is_scout then perform public.admin_set_ban(_target, 'scout', false); end if;
    perform public.notify_user(_target, 'Your account is active again',
      coalesce(note, 'You can use Cholo Kheli as normal.'), 'account_notice',
      jsonb_build_object('action', 'unban'), 'system');
  else
    raise exception 'unknown action %', _action using errcode = '22023';
  end if;
  perform public.log_admin_action(_action, _target, null, why, jsonb_build_object('hours', _hours, 'message', note));
end $$;

-- Notice to one user, everyone, or everyone with a role. Returns how many were sent.
create or replace function public.admin_send_notice(_title text, _message text, _audience text default 'all', _user_id uuid default null, _metadata jsonb default '{}'::jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare me uuid := public.require_admin(); n integer := 0; r record;
begin
  if nullif(btrim(coalesce(_title, '')), '') is null then raise exception 'a title is required' using errcode = '22023'; end if;
  if _user_id is not null then
    perform public.notify_user(_user_id, _title, _message, 'notice', coalesce(_metadata, '{}'::jsonb) || jsonb_build_object('audience', 'user'), 'system');
    n := 1;
  else
    for r in select distinct ur.user_id from public.user_roles ur
              where (_audience = 'all' or ur.role::text = _audience) and ur.user_id <> me loop
      perform public.notify_user(r.user_id, _title, _message, 'notice', coalesce(_metadata, '{}'::jsonb) || jsonb_build_object('audience', _audience), 'from_cholo_kheli');
      n := n + 1;
    end loop;
  end if;
  perform public.log_admin_action('notice', _user_id, null, _title, jsonb_build_object('audience', coalesce(_audience, 'user'), 'recipients', n));
  return n;
end $$;

revoke all on function public.admin_remove_video(uuid, text, boolean), public.admin_restore_video(uuid, text),
  public.admin_moderate_user(uuid, text, text, text, integer), public.admin_send_notice(text, text, text, uuid, jsonb)
  from public, anon;
grant execute on function public.admin_remove_video(uuid, text, boolean), public.admin_restore_video(uuid, text),
  public.admin_moderate_user(uuid, text, text, text, integer), public.admin_send_notice(text, text, text, uuid, jsonb)
  to authenticated;

-- Video reports go to the same queue as user reports.
alter table public.user_reports add column if not exists video_id uuid references public.videos (id) on delete set null;
create index if not exists user_reports_video_idx on public.user_reports (video_id) where video_id is not null;

create or replace function public.report_video(_video_id uuid, _reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare owner uuid; rid uuid;
begin
  select user_id into owner from public.videos where id = _video_id;
  if owner is null then raise exception 'video not found' using errcode = 'P0002'; end if;
  rid := public.report_user(owner, _reason);
  update public.user_reports set video_id = _video_id where id = rid;
  insert into public.moderation_alerts (kind, target_id, target_user_id)
  values ('video', _video_id, owner)
  on conflict (kind, target_id) do update set status = 'new', resolved_at = null, resolved_by = null;
  return rid;
end $$;
revoke all on function public.report_video(uuid, text) from public, anon;
grant execute on function public.report_video(uuid, text) to authenticated;

-- Real platform statistics, computed in the database (no row limits, no client-side counting).
create or replace function public.get_admin_stats(_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare d integer := least(greatest(coalesce(_days, 30), 7), 365); since timestamptz; out jsonb;
begin
  perform public.require_admin();
  since := date_trunc('day', now()) - make_interval(days => d - 1);
  select jsonb_build_object(
    'generated_at', now(),
    'days', d,
    'users', jsonb_build_object(
      'players',        (select count(distinct user_id) from public.user_roles where role = 'player'),
      'scouts_active',  (select count(*) from public.scout_profiles where verification_status = 'active'),
      'scouts_pending', (select count(*) from public.scout_profiles where verification_status = 'pending'),
      'admins',         (select count(distinct user_id) from public.user_roles where role = 'admin'),
      'banned',         (select count(*) from public.profiles where is_banned and (banned_until is null or banned_until > now())),
      'suspended',      (select count(*) from public.profiles where is_banned and banned_until > now()),
      'private',        (select count(*) from public.privacy_settings where is_private),
      'minors',         (select count(*) from public.profile_private where date_of_birth > (current_date - interval '18 years')),
      'new_in_period',  (select count(*) from public.profiles where created_at >= since),
      'active_7d',      (select count(distinct x) from (
                           select viewer_id x from public.video_events where created_at > now() - interval '7 days'
                           union select user_id from public.video_likes where created_at > now() - interval '7 days'
                           union select user_id from public.video_comments where created_at > now() - interval '7 days'
                           union select user_id from public.videos where created_at > now() - interval '7 days') a)),
    'content', jsonb_build_object(
      'videos_live',    (select count(*) from public.videos where status = 'live' and not flagged),
      'videos_flagged', (select count(*) from public.videos where flagged and status <> 'rejected'),
      'videos_removed', (select count(*) from public.videos where status = 'rejected'),
      'views',          (select coalesce(sum(view_count), 0) from public.videos),
      'watch_hours',    (select round(coalesce(sum(total_watch_ms), 0) / 3600000.0, 1) from public.videos),
      'likes',          (select count(*) from public.video_likes),
      'shares',         (select count(*) from public.video_shares),
      'comments',       (select count(*) from public.video_comments),
      'follows',        (select count(*) from public.follows)),
    'queues', jsonb_build_object(
      'reports_open',    (select count(*) from public.user_reports where status in ('new', 'reviewing')),
      'alerts_new',      (select count(*) from public.moderation_alerts where status = 'new'),
      'scout_requests',  (select count(*) from public.scout_requests where status = 'pending'),
      'contact_unread',  (select count(*) from public.contact_messages where not is_read),
      'support_unread',  (select count(*) from public.messages m where not m.read and public.has_role(m.receiver_id, 'admin'))),
    'sports', (select coalesce(jsonb_object_agg(s, c), '{}'::jsonb) from (
                 select coalesce(p.sport, 'unknown') s, count(*) c from public.profiles p
                   join public.user_roles ur on ur.user_id = p.user_id and ur.role = 'player' group by 1) t),
    'daily', (select jsonb_agg(jsonb_build_object(
                 'day', to_char(g.day, 'YYYY-MM-DD'),
                 'signups', (select count(*) from public.profiles p where p.created_at >= g.day and p.created_at < g.day + interval '1 day'),
                 'uploads', (select count(*) from public.videos v where v.created_at >= g.day and v.created_at < g.day + interval '1 day'),
                 'views',   (select count(*) from public.video_events e where e.created_at >= g.day and e.created_at < g.day + interval '1 day'),
                 'likes',   (select count(*) from public.video_likes l where l.created_at >= g.day and l.created_at < g.day + interval '1 day')
               ) order by g.day)
               from generate_series(since, date_trunc('day', now()), interval '1 day') as g(day)),
    'top_videos', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                     select v.id, v.title, v.user_id, p.full_name, v.view_count, v.like_count, v.share_count
                       from public.videos v join public.profiles p on p.user_id = v.user_id
                      where v.status = 'live' order by v.view_count desc, v.like_count desc limit 5) t),
    'top_players', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                     select p.user_id, p.full_name, p.username, p.sport,
                            sum(v.view_count) as views, sum(v.like_count) as likes,
                            (select count(*) from public.follows f where f.followee_id = p.user_id) as followers
                       from public.profiles p join public.videos v on v.user_id = p.user_id and v.status = 'live'
                      group by p.user_id, p.full_name, p.username, p.sport order by sum(v.view_count) desc limit 5) t)
  ) into out;
  return out;
end $$;
revoke all on function public.get_admin_stats(integer) from public, anon;
grant execute on function public.get_admin_stats(integer) to authenticated;

-- The new tables get the same "second factor when enabled" guard as everything else.
do $$
declare t text;
begin
  foreach t in array array['follows', 'video_comments', 'push_tokens', 'admin_actions'] loop
    execute format('drop policy if exists "Require second factor when enabled" on public.%I', t);
    execute format('create policy "Require second factor when enabled" on public.%I as restrictive for all to authenticated using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()))', t);
  end loop;
end $$;

-- Realtime for the notification bell and comment threads.
do $$
declare t text;
begin
  foreach t in array array['notifications', 'video_comments'] loop
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Date of birth decides guardian consent and who may be a scout, so after sign-up only an admin
-- (or the service role) can change it. Guardian details can be added but not cleared by a minor.
create or replace function public.protect_private_profile_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.can_moderate() then return new; end if;
  if tg_op = 'UPDATE' then
    if old.date_of_birth is not null and new.date_of_birth is distinct from old.date_of_birth then
      perform public.raise_forbidden('date of birth can only be corrected by the Cholo Kheli team');
    end if;
    if old.parental_consent_at is not null and new.parental_consent_at is distinct from old.parental_consent_at then
      perform public.raise_forbidden('guardian consent can only be changed by the Cholo Kheli team');
    end if;
    if old.guardian_email is not null and new.guardian_email is null then
      perform public.raise_forbidden('guardian details can only be removed by the Cholo Kheli team');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_private_profile_columns on public.profile_private;
create trigger trg_protect_private_profile_columns before update on public.profile_private
  for each row execute function public.protect_private_profile_columns();
