-- Fix 5a: any signed-in user could upload into ANY user's folder in player-videos.
drop policy if exists "Authenticated upload player-videos" on storage.objects;
create policy "Users upload to own player-videos folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'player-videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Fix 5b: uploads are free (see .lovable/plan.md). Users could also forge
-- "successful" payment rows directly. Keep the table read-only for history.
drop policy if exists "Insert own payment" on public.payments;
alter table public.videos alter column status set default 'draft';
update public.videos set status = 'draft' where status = 'pending_payment';
delete from public.app_settings where key = 'video_upload_price_bdt';

-- Fix 5c: "report a scout" never reached admins. Non-admins can't see who the
-- admins are (user_roles RLS) or insert notifications for other users, so the
-- client code silently did nothing while showing "Report submitted".
create table if not exists public.user_reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  reason           text not null check (char_length(reason) between 1 and 2000),
  status           text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'dismissed')),
  created_at       timestamptz not null default now()
);
create index if not exists user_reports_reported_idx on public.user_reports (reported_user_id, created_at desc);
create index if not exists user_reports_reporter_idx on public.user_reports (reporter_id, created_at desc);
revoke all on public.user_reports from anon;
grant select, update on public.user_reports to authenticated;
grant all on public.user_reports to service_role;
alter table public.user_reports enable row level security;
create policy "Admins read reports" on public.user_reports
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update reports" on public.user_reports
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
-- No insert policy: reports are created only through report_user().

create or replace function public.report_user(_reported_user uuid, _reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean text := btrim(coalesce(_reason, ''));
  report_id uuid;
  reporter_name text;
  reported_name text;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if public.is_banned(uid) then
    raise exception 'banned users cannot file reports' using errcode = '42501';
  end if;
  if _reported_user is null or _reported_user = uid
     or not exists (select 1 from auth.users where id = _reported_user) then
    raise exception 'invalid user to report' using errcode = '22023';
  end if;
  if char_length(clean) = 0 or char_length(clean) > 2000 then
    raise exception 'reason must be 1-2000 characters' using errcode = '22023';
  end if;
  if (select count(*) from public.user_reports
       where reporter_id = uid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too many reports, try again later' using errcode = '54000';
  end if;

  insert into public.user_reports (reporter_id, reported_user_id, reason)
  values (uid, _reported_user, clean)
  returning id into report_id;

  select full_name into reporter_name from public.profiles where user_id = uid;
  select full_name into reported_name from public.profiles where user_id = _reported_user;

  insert into public.notifications (user_id, title, message, type, metadata)
  select ur.user_id,
         'User report: ' || coalesce(reported_name, 'Unknown'),
         coalesce(reporter_name, 'A user') || ' reported ' || coalesce(reported_name, 'a user') || ': ' || clean,
         'info',
         jsonb_build_object('report_id', report_id, 'reporter_id', uid, 'reported_user_id', _reported_user)
    from public.user_roles ur
   where ur.role = 'admin';

  return report_id;
end;
$$;
revoke execute on function public.report_user(uuid, text) from public, anon;
grant execute on function public.report_user(uuid, text) to authenticated;
