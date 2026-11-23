-- Attack hardening (24 Nov 2026): admin second factor, notification cost abuse, upload abuse,
-- storage parking and sign-up email checks.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(16);

insert into public.videos (id, user_id, video_url, status, title, duration_seconds) values
  ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '', 'draft', 'Mine', 20),
  ('e0000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', '', 'draft', 'Theirs', 20);
insert into storage.objects (bucket_id, name) values
  ('player-videos', '33333333-3333-3333-3333-333333333333/e0000000-0000-0000-0000-000000000002.mp4');

-- ── admin needs a second factor ──
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aal":"aal1"}';
select is(public.has_role(auth.uid(), 'admin'), false, 'an admin signed in with only a password has no admin powers');
select is(public.has_role('11111111-1111-1111-1111-111111111111', 'player'), true, 'role checks about other users still work');
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aal":"aal2"}';
select is(public.has_role(auth.uid(), 'admin'), true, 'an admin who passed two-factor is an admin');

-- ── notifications ──
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}';
select throws_ok(
  $$ insert into public.notifications (user_id, title, message, type) values (auth.uid(), 'x', 'x', 'notice') $$,
  '42501', null, 'a user cannot create notifications (each one costs a push or an email)');

-- ── uploads ──
select throws_ok(
  $$ update public.videos set video_url = 'https://x.supabase.co/storage/v1/object/public/player-videos/33333333-3333-3333-3333-333333333333/e0000000-0000-0000-0000-000000000002.mp4', status = 'live'
     where id = 'e0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'cannot publish another player''s video file as your own');
select throws_ok(
  $$ update public.videos set video_url = 'https://evil.example.com/a.mp4' where id = 'e0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'the video URL must point at our own storage');
select throws_ok(
  $$ update public.videos set video_url = 'https://x.supabase.co/storage/v1/object/public/player-videos/11111111-1111-1111-1111-111111111111/e0000000-0000-0000-0000-000000000001.mp4', status = 'live'
     where id = 'e0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'a highlight cannot go live before its file is uploaded');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('player-videos', '11111111-1111-1111-1111-111111111111/e0000000-0000-0000-0000-000000000001.mp4') $$,
  'a player can upload the file for their own draft');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('player-videos', '11111111-1111-1111-1111-111111111111/parked.mp4') $$,
  '42501', null, 'a file that belongs to no draft is refused');
select lives_ok(
  $$ update public.videos set video_url = 'https://x.supabase.co/storage/v1/object/public/player-videos/11111111-1111-1111-1111-111111111111/e0000000-0000-0000-0000-000000000001.mp4', status = 'live'
     where id = 'e0000000-0000-0000-0000-000000000001' $$,
  'with the file uploaded, the highlight goes live');
select throws_ok(
  $$ insert into public.videos (user_id, video_url, status, duration_seconds) values (auth.uid(), 'https://x.supabase.co/storage/v1/object/public/player-videos/11111111-1111-1111-1111-111111111111/e0000000-0000-0000-0000-000000000001.mp4', 'live', null) $$,
  '42501', null, 'a highlight cannot go live without its length');

reset role;
update public.app_settings set value = '3'::jsonb where key = 'max_uploads_per_day';
delete from public.upload_attempts;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}';
select lives_ok($$ insert into public.videos (user_id, video_url, status, duration_seconds) select auth.uid(), '', 'draft', 10 from generate_series(1, 3) $$,
  'a player can start several highlights');
select throws_ok($$ insert into public.videos (user_id, video_url, status, duration_seconds) values (auth.uid(), '', 'draft', 10) $$,
  '54000', null, 'past the daily limit, new uploads are refused');

-- ── avatars ──
select lives_ok($$ insert into storage.objects (bucket_id, name) select 'avatars', auth.uid()::text || '/a' || g || '.jpg' from generate_series(1, 3) g $$,
  'a user can keep a few avatar files');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('avatars', auth.uid()::text || '/a4.jpg') $$,
  '42501', null, 'avatar files per user are capped');

-- ── sign-up email ──
reset role;
select ok(public.email_is_acceptable('rafiq.10@gmail.com') and not public.email_is_acceptable('a@b')
          and not public.email_is_acceptable('<script>@x.com') and not public.email_is_acceptable('x@mailinator.com'),
  'sign-up accepts real addresses and refuses malformed or throwaway ones');

select * from finish();
rollback;
