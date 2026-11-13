-- Security hardening found by the Nov 2026 end-to-end audit.
--  1. Unverified scouts could read every player profile and video by querying tables directly
--     (the verified-scout gate only existed in the UI and in get_ranked_feed).
--  2. "Private account" did nothing at the table level: the videos policy looked up
--     privacy_settings under the caller's RLS, which hides other users' rows, so NOT EXISTS was
--     always true. Private players' videos (and their files, in a public bucket) were readable.
--  3. Any signed-in user could call enforce_feed_rate_limit() with someone else's id and lock
--     them out of the feed; anon could trigger refresh_video_scores() repeatedly.
--  4. Views, watch time and shares could be inflated without limit by one account.
--  5. No length / URL constraints on user text (100 KB bios, javascript: URLs, contact spam).
--  6. Storage: no bucket definitions in code, identity documents in a public bucket with no
--     policies, no owner delete for videos, no MIME/size limits.
--  7. Message recipients could not mark messages read; upload halt was client-side only.

-- ---------------------------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so they see rows regardless of the caller's RLS)
-- ---------------------------------------------------------------------------------------------
create or replace function public.is_active_scout(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.scout_profiles sp
     where sp.user_id = _user_id and sp.verification_status = 'active'
       and not (coalesce(sp.is_banned, false) and (sp.banned_until is null or sp.banned_until > now())))
$$;

-- Who may browse talent (other users' profiles, videos and video files):
-- admins, players, and verified, unbanned scouts. Pending/rejected scouts may not.
create or replace function public.can_view_talent(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _user_id is not null and not public.is_banned(_user_id) and (
       public.has_role(_user_id, 'admin')
    or public.has_role(_user_id, 'player')
    or public.is_active_scout(_user_id))
$$;

create or replace function public.is_private_account(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select ps.is_private from public.privacy_settings ps where ps.user_id = _user_id), false)
$$;

create or replace function public.try_uuid(_v text)
returns uuid language plpgsql immutable as $$
begin return _v::uuid; exception when others then return null; end $$;

revoke all on function public.is_active_scout(uuid), public.can_view_talent(uuid), public.is_private_account(uuid) from public, anon;
grant execute on function public.is_active_scout(uuid), public.can_view_talent(uuid), public.is_private_account(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- 1 + 2. Profiles and videos visibility
-- ---------------------------------------------------------------------------------------------
drop policy if exists "Profiles readable to authed" on public.profiles;
create policy "Profiles readable to own, admins, players and verified scouts" on public.profiles
  for select to authenticated
  using (auth.uid() = user_id or public.can_view_talent(auth.uid()));

drop policy if exists "Videos readable respecting privacy" on public.videos;
create policy "Videos readable respecting privacy" on public.videos
  for select to authenticated
  using (
       auth.uid() = user_id
    or public.has_role(auth.uid(), 'admin')
    or (    public.can_view_talent(auth.uid())
        and status = 'live'
        and not coalesce(flagged, false)
        and not coalesce(archived, false)
        and not public.is_private_account(user_id)
        and not public.is_banned(user_id)));

-- Age is shown on talent cards; only people allowed to browse talent may see it.
create or replace function public.get_player_age(_user_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() = _user_id or public.can_view_talent(auth.uid())
    then (select extract(year from age(current_date, pp.date_of_birth))::int
            from public.profile_private pp where pp.user_id = _user_id)
  end
$$;
revoke all on function public.get_player_age(uuid) from public, anon;
grant execute on function public.get_player_age(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- 3. Internal functions must not be callable from the API
-- ---------------------------------------------------------------------------------------------
revoke all on function public.enforce_feed_rate_limit(uuid, integer) from public, anon, authenticated;
revoke all on function public.refresh_video_scores() from public, anon, authenticated;
grant execute on function public.enforce_feed_rate_limit(uuid, integer), public.refresh_video_scores() to service_role;

-- ---------------------------------------------------------------------------------------------
-- 4. Engagement integrity: one counted view per viewer per video per 30 min, no self-views,
--    at most 10 min of watch time per event; one counted share per user per video.
-- ---------------------------------------------------------------------------------------------
create or replace function public.tg_dedupe_video_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.viewer_id is null then return null; end if;
  if exists (select 1 from public.videos v where v.id = new.video_id and v.user_id = new.viewer_id) then
    return null;
  end if;
  if exists (select 1 from public.video_events e
              where e.video_id = new.video_id and e.viewer_id = new.viewer_id
                and e.created_at > now() - interval '30 minutes') then
    return null;
  end if;
  new.watch_ms := least(greatest(coalesce(new.watch_ms, 0), 0), 600000);
  return new;
end $$;
drop trigger if exists trg_video_events_dedupe on public.video_events;
create trigger trg_video_events_dedupe before insert on public.video_events
  for each row execute function public.tg_dedupe_video_event();
create index if not exists idx_video_events_viewer_video on public.video_events (viewer_id, video_id, created_at desc);

create or replace function public.tg_dedupe_video_share()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.video_shares s where s.video_id = new.video_id and s.user_id = new.user_id) then
    return null;
  end if;
  return new;
end $$;
drop trigger if exists trg_video_shares_dedupe on public.video_shares;
create trigger trg_video_shares_dedupe before insert on public.video_shares
  for each row execute function public.tg_dedupe_video_share();
create index if not exists idx_video_shares_user_video on public.video_shares (user_id, video_id);

-- ---------------------------------------------------------------------------------------------
-- 5. Input bounds. Legacy rows are trimmed first so the constraints can be fully validated
--    (a NOT VALID constraint would still reject any later update to an oversized row).
-- ---------------------------------------------------------------------------------------------
update public.profiles set full_name = left(full_name, 100) where char_length(full_name) > 100;
update public.profiles set bio = left(bio, 500) where char_length(bio) > 500;
update public.profiles set avatar_url = null where avatar_url ~* '^\s*(javascript|data|vbscript|file):';
update public.profiles set position_tags = position_tags[1:10] where cardinality(position_tags) > 10;
update public.videos set title = left(title, 120) where char_length(title) > 120;
update public.videos set description = left(description, 1000) where char_length(description) > 1000;
update public.videos set position_tags = position_tags[1:10] where cardinality(position_tags) > 10;
update public.videos set trait_tags = trait_tags[1:15] where cardinality(trait_tags) > 15;
delete from public.videos where video_url ~* '^\s*(javascript|data|vbscript|file):';
update public.messages set content = left(content, 2000) where char_length(content) > 2000;
delete from public.messages where char_length(coalesce(content, '')) = 0;
update public.contact_messages set name = left(name, 100), email = left(email, 254), subject = left(subject, 200), message = left(message, 5000);
delete from public.contact_messages where char_length(coalesce(message, '')) = 0;
update public.notifications set title = left(title, 200), message = left(message, 2000) where char_length(title) > 200 or char_length(message) > 2000;
update public.news_posts set title = left(title, 200), body = left(body, 10000) where char_length(title) > 200 or char_length(body) > 10000;
update public.news_posts set media_url = null where media_url ~* '^\s*(javascript|data|vbscript|file):';
update public.achievements set title = left(title, 120), description = left(description, 500) where char_length(title) > 120 or char_length(description) > 500;
delete from public.hidden_words where char_length(word) not between 1 and 50;
update public.scout_requests set notes = left(notes, 1000), admin_response = left(admin_response, 2000) where char_length(notes) > 1000 or char_length(admin_response) > 2000;
update public.profile_shares set message = left(message, 1000) where char_length(message) > 1000;
update public.documents set name = left(name, 200) where char_length(name) > 200;

alter table public.profiles
  add constraint profiles_full_name_len check (full_name is null or char_length(full_name) <= 100),
  add constraint profiles_bio_len check (bio is null or char_length(bio) <= 500),
  add constraint profiles_avatar_url_safe check (avatar_url is null or avatar_url !~* '^\s*(javascript|data|vbscript|file):'),
  add constraint profiles_position_tags_len check (position_tags is null or cardinality(position_tags) <= 10);
alter table public.videos
  add constraint videos_title_len check (title is null or char_length(title) <= 120),
  add constraint videos_description_len check (description is null or char_length(description) <= 1000),
  add constraint videos_url_safe check (video_url !~* '^\s*(javascript|data|vbscript|file):'),
  add constraint videos_tags_len check (cardinality(coalesce(position_tags, '{}')) <= 10 and cardinality(coalesce(trait_tags, '{}')) <= 15);
alter table public.messages
  add constraint messages_content_len check (char_length(content) between 1 and 2000);
alter table public.contact_messages
  add constraint contact_messages_len check (
    char_length(coalesce(name, '')) <= 100 and char_length(coalesce(email, '')) <= 254
    and char_length(coalesce(subject, '')) <= 200 and char_length(coalesce(message, '')) between 1 and 5000);
alter table public.notifications
  add constraint notifications_len check (char_length(coalesce(title, '')) <= 200 and char_length(coalesce(message, '')) <= 2000);
alter table public.news_posts
  add constraint news_posts_len check (char_length(coalesce(title, '')) <= 200 and char_length(coalesce(body, '')) <= 10000),
  add constraint news_posts_media_url_safe check (media_url is null or media_url !~* '^\s*(javascript|data|vbscript|file):');
alter table public.achievements
  add constraint achievements_len check (char_length(coalesce(title, '')) <= 120 and char_length(coalesce(description, '')) <= 500);
alter table public.hidden_words
  add constraint hidden_words_len check (char_length(word) between 1 and 50);
alter table public.scout_requests
  add constraint scout_requests_len check (char_length(coalesce(notes, '')) <= 1000 and char_length(coalesce(admin_response, '')) <= 2000);
alter table public.profile_shares
  add constraint profile_shares_message_len check (char_length(coalesce(message, '')) <= 1000);
alter table public.documents
  add constraint documents_len check (char_length(coalesce(name, '')) <= 200 and char_length(coalesce(url, '')) <= 1000);

-- Contact form: 5 per email per hour and 30 per minute overall.
create or replace function public.tg_contact_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- SECURITY DEFINER runs as the owner, so judge the caller by their JWT, not current_user.
  if auth.role() = 'service_role' or public.has_role(auth.uid(), 'admin') then return new; end if;
  if (select count(*) from public.contact_messages
       where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.contact_messages where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'too many messages, please try again later' using errcode = '54000';
  end if;
  return new;
end $$;
drop trigger if exists trg_contact_rate_limit on public.contact_messages;
create trigger trg_contact_rate_limit before insert on public.contact_messages
  for each row execute function public.tg_contact_rate_limit();

-- ---------------------------------------------------------------------------------------------
-- 7a. Upload halt is enforced by the database, not only the UI.
-- ---------------------------------------------------------------------------------------------
create or replace function public.tg_enforce_upload_halt()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or public.has_role(auth.uid(), 'admin') then return new; end if;
  if coalesce((select value from public.app_settings where key = 'video_uploads_halted') in ('true'::jsonb, '"true"'::jsonb), false) then
    raise exception 'video uploads are paused right now' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_enforce_upload_halt on public.videos;
create trigger trg_enforce_upload_halt before insert on public.videos
  for each row execute function public.tg_enforce_upload_halt();

-- 7b. Recipients may mark messages read (and nothing else).
drop policy if exists "Recipients mark messages read" on public.messages;
create policy "Recipients mark messages read" on public.messages
  for update to authenticated using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);
create or replace function public.protect_message_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.can_moderate() then return new; end if;
  if new.sender_id is distinct from old.sender_id or new.receiver_id is distinct from old.receiver_id
     or new.content is distinct from old.content or new.flagged is distinct from old.flagged
     or new.flag_reason is distinct from old.flag_reason or new.created_at is distinct from old.created_at then
    perform public.raise_forbidden('only the read flag can be changed');
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_message_columns on public.messages;
create trigger trg_protect_message_columns before update on public.messages
  for each row execute function public.protect_message_columns();

-- ---------------------------------------------------------------------------------------------
-- Username availability for the sign-up form (anon cannot read profiles).
-- ---------------------------------------------------------------------------------------------
create or replace function public.is_username_available(_username text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(_username ~ '^[a-z0-9_]{3,24}$', false)
     and not exists (select 1 from public.profiles p where lower(p.username) = lower(_username))
$$;
revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- 6. Storage buckets and policies
-- ---------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('player-videos', 'player-videos', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/3gpp']),
  ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('media', 'media', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Player videos: private bucket. Owner, admins, and talent viewers (respecting privacy/bans).
drop policy if exists "Public read player-videos" on storage.objects;
drop policy if exists "Read player-videos respecting privacy" on storage.objects;
create policy "Read player-videos respecting privacy" on storage.objects
  for select to authenticated
  using (bucket_id = 'player-videos' and (
       (storage.foldername(name))[1] = auth.uid()::text
    or public.has_role(auth.uid(), 'admin')
    or (    public.can_view_talent(auth.uid())
        and not public.is_private_account(public.try_uuid((storage.foldername(name))[1]))
        and not public.is_banned(public.try_uuid((storage.foldername(name))[1])))));
drop policy if exists "Users delete own player-videos" on storage.objects;
create policy "Users delete own player-videos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'player-videos' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin')));
drop policy if exists "Users update own player-videos" on storage.objects;
create policy "Users update own player-videos" on storage.objects
  for update to authenticated
  using (bucket_id = 'player-videos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'player-videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Identity / verification documents: owner and admins only.
drop policy if exists "Users upload own documents" on storage.objects;
create policy "Users upload own documents" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Owner or admin read documents" on storage.objects;
create policy "Owner or admin read documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin')));
drop policy if exists "Owner or admin delete documents" on storage.objects;
create policy "Owner or admin delete documents" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin')));
drop policy if exists "Owner updates documents" on storage.objects;
create policy "Owner updates documents" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can read verification documents rows (documents table had owner-only access).
drop policy if exists "Admins read documents" on public.documents;
create policy "Admins read documents" on public.documents
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
