-- Fixes from the structured attack on 24 November 2026. Each block names the attack it closes.

-- ── 1. Admin powers need a second factor ──
-- A stolen admin password alone no longer opens anything: the admin role only counts for the
-- signed-in admin's own session when that session passed two-factor (aal2). Background jobs and
-- checks about other users are unchanged. The app sends admins to set up two-factor first.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
    and (_role <> 'admin'
         or _user_id is distinct from auth.uid()
         or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2')
$$;

-- ── 2. Users cannot create notifications ──
-- Every notification row triggers a push and possibly an email, both paid. Only the system
-- (triggers) and admins create them; users read, mark read and delete their own.
drop policy if exists "Own notifications" on public.notifications;
drop policy if exists "Read own notifications" on public.notifications;
drop policy if exists "Update own notifications" on public.notifications;
drop policy if exists "Delete own notifications" on public.notifications;
create policy "Read own notifications" on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Update own notifications" on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own notifications" on public.notifications for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Only call the delivery function when there is something to deliver (a device to push to,
-- or an email-worthy notice). Saves an edge-function call for every like on an account
-- that never installed the app.
create or replace function public.tg_deliver_notification()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare url text; secret text;
begin
  if not exists (select 1 from public.push_tokens t where t.user_id = new.user_id)
     and coalesce(new.type, '') not in ('message', 'video_removed', 'video_restored', 'account_notice', 'notice',
                                        'scout_request', 'scout_verification', 'request_update', 'verification') then
    return null;
  end if;
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

-- ── 3. Uploads: own files only, real files only, limited bursts ──
create table if not exists public.upload_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists idx_upload_attempts_user on public.upload_attempts (user_id, at desc);
alter table public.upload_attempts enable row level security;
revoke all on public.upload_attempts from anon, authenticated;

-- Highlights a player may start per day. Admins can change it in app_settings.
insert into public.app_settings (key, value) values ('max_uploads_per_day', '10'::jsonb) on conflict (key) do nothing;

-- The storage path inside the player-videos bucket that a stored video URL points to.
create or replace function public.video_storage_path(_url text)
returns text language sql immutable set search_path = public as $$
  select nullif(substring(_url from '/storage/v1/object/(?:public|sign|authenticated)/player-videos/([^?#]+)'), '')
$$;

create or replace function public.tg_validate_video_upload()
returns trigger language plpgsql security definer set search_path = public, storage as $$
declare
  path text := public.video_storage_path(new.video_url);
  per_day int;
begin
  -- Runs as the function owner, so can_moderate() (which reads current_user) would always pass.
  -- Background jobs and SQL have no signed-in user; admins are checked by role.
  if auth.uid() is null or public.has_role(auth.uid(), 'admin') then return new; end if;

  if tg_op = 'INSERT' then
    select coalesce((select (value #>> '{}')::int from public.app_settings where key = 'max_uploads_per_day'), 10) into per_day;
    if (select count(*) from public.upload_attempts a where a.user_id = new.user_id and a.at > now() - interval '1 day') >= per_day then
      raise exception 'upload limit reached: you can post % highlights a day', per_day using errcode = '54000';
    end if;
    insert into public.upload_attempts (user_id) values (new.user_id);
    delete from public.upload_attempts where at < now() - interval '2 days';
  end if;

  -- The URL is empty (a draft) or a file in this player's own folder.
  if (tg_op = 'INSERT' or old.video_url is distinct from new.video_url)
     and coalesce(new.video_url, '') <> '' and (path is null or split_part(path, '/', 1) <> new.user_id::text) then
    perform public.raise_forbidden('the video file must be one you uploaded');
  end if;

  -- Going live (or waiting for payment) needs a real uploaded file and a declared length.
  if new.status in ('live', 'pending_payment')
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.video_url is distinct from new.video_url) then
    if path is null or not exists (select 1 from storage.objects o where o.bucket_id = 'player-videos' and o.name = path) then
      perform public.raise_forbidden('upload the video file before publishing');
    end if;
    if new.duration_seconds is null then
      perform public.raise_forbidden('the clip length is missing');
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.tg_validate_video_upload() from public, anon, authenticated;
drop trigger if exists trg_validate_video_upload on public.videos;
create trigger trg_validate_video_upload before insert or update on public.videos
  for each row execute function public.tg_validate_video_upload();

-- Storage: a video file can only be uploaded for one of the player's own drafts, named
-- <user id>/<video id>.<ext>. Nobody can park files that are not attached to a highlight.
create or replace function public.can_upload_video_file(_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.videos v
    where v.user_id = auth.uid()
      and split_part(_name, '/', 1) = auth.uid()::text
      and v.id::text = split_part(split_part(_name, '/', 2), '.', 1)
      and v.status = 'draft'
  )
$$;
revoke all on function public.can_upload_video_file(text) from public, anon;
grant execute on function public.can_upload_video_file(text) to authenticated;

-- How many files a user keeps in a bucket (caps avatars and documents).
create or replace function public.storage_file_count(_bucket text, _uid uuid)
returns int language sql stable security definer set search_path = public, storage as $$
  select count(*)::int from storage.objects o where o.bucket_id = _bucket and (storage.foldername(o.name))[1] = _uid::text
$$;
revoke all on function public.storage_file_count(text, uuid) from public, anon;
grant execute on function public.storage_file_count(text, uuid) to authenticated;

drop policy if exists "Users upload to own player-videos folder" on storage.objects;
create policy "Users upload to own player-videos folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'player-videos' and (select public.can_upload_video_file(name)));
drop policy if exists "Users update own player-videos" on storage.objects;
create policy "Users update own player-videos" on storage.objects for update to authenticated
  using (bucket_id = 'player-videos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'player-videos' and (select public.can_upload_video_file(name)));

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
              and public.storage_file_count('avatars', (select auth.uid())) < 3);
drop policy if exists "Users upload own documents" on storage.objects;
create policy "Users upload own documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text
              and public.storage_file_count('documents', (select auth.uid())) < 10);

-- Highlights are re-encoded in the app to HD MP4 (about 20 MB a minute); 30 MB is the hard cap.
update storage.buckets set file_size_limit = 31457280 where id = 'player-videos';

-- ── 4. Sign-up: real email addresses only ──
-- The app checks this too; the database check stops scripts that skip the app.
create or replace function public.email_is_acceptable(_email text)
returns boolean language sql immutable set search_path = public as $$
  select _email is not null
     and lower(_email) ~ '^[a-z0-9._%+''-]{1,64}@([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$'
     and split_part(lower(_email), '@', 2) not in (
       'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', 'grr.la', '10minutemail.com',
       'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net', 'tempail.com', 'yopmail.com', 'yopmail.net',
       'trashmail.com', 'getnada.com', 'nada.email', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com',
       'fakeinbox.com', 'mintemail.com', 'emailondeck.com', 'mohmal.com', 'burnermail.io', 'moakt.com',
       'mailnesia.com', 'mytemp.email', 'tmpmail.org', 'tmail.ws', 'spamgourmet.com', 'mailcatch.com',
       'inboxkitten.com', 'emailfake.com', 'fakemail.net', 'luxusmail.org', 'minuteinbox.com', 'tempinbox.com',
       'example.com', 'example.org', 'example.net', 'test.com')
$$;

create or replace function public.tg_check_signup_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null and not public.email_is_acceptable(new.email) then
    raise exception 'invalid_email: use a real email address' using errcode = '22023';
  end if;
  return new;
end $$;
revoke execute on function public.tg_check_signup_email() from public, anon, authenticated;
drop trigger if exists trg_check_signup_email on auth.users;
create trigger trg_check_signup_email before insert or update of email on auth.users
  for each row execute function public.tg_check_signup_email();
