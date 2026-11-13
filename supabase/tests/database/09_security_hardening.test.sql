-- Nov 2026 audit: verified-scout gate at the table level, private accounts, internal functions,
-- engagement inflation, input bounds, storage buckets, message read receipts, upload halt.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(30);

-- Fixture content: one live video each for the adult player (public) and the minor (private).
insert into public.privacy_settings (user_id, is_private) values ('33333333-3333-3333-3333-333333333333', true)
  on conflict (user_id) do update set is_private = true;
insert into public.videos (id, user_id, video_url, status) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'https://x.test/storage/v1/object/public/player-videos/11111111-1111-1111-1111-111111111111/a.mp4', 'live'),
  ('a0000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'https://x.test/storage/v1/object/public/player-videos/33333333-3333-3333-3333-333333333333/b.mp4', 'live');
insert into storage.objects (bucket_id, name, owner) values
  ('player-videos', '11111111-1111-1111-1111-111111111111/a.mp4', '11111111-1111-1111-1111-111111111111'),
  ('player-videos', '33333333-3333-3333-3333-333333333333/b.mp4', '33333333-3333-3333-3333-333333333333'),
  ('documents', '22222222-2222-2222-2222-222222222222/scout_cv.pdf', '22222222-2222-2222-2222-222222222222');

set local role authenticated;

-- --- pending scout: no talent browsing at the table level ----------------------------------
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*)::int from public.profiles where user_id <> auth.uid()), 0, 'pending scout cannot list other profiles');
select is((select count(*)::int from public.videos), 0, 'pending scout cannot read videos');
select is((select count(*)::int from storage.objects where bucket_id = 'player-videos'), 0, 'pending scout cannot read video files');
select is((select count(*)::int from public.profiles where user_id = auth.uid()), 1, 'pending scout can read own profile');
select is((select count(*)::int from storage.objects where bucket_id = 'documents'), 1, 'pending scout can read own verification document');

-- --- verified scout: sees public talent, not private accounts --------------------------------
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
select is((select count(*)::int from public.videos where id = 'a0000000-0000-0000-0000-000000000001'), 1, 'verified scout sees a public player''s video');
select is((select count(*)::int from public.videos where id = 'a0000000-0000-0000-0000-000000000002'), 0, 'verified scout does not see a private account''s video');
select is((select count(*)::int from storage.objects where name like '33333333-%'), 0, 'verified scout cannot read a private account''s video file');
select is((select count(*)::int from storage.objects where name like '11111111-%'), 1, 'verified scout can read a public player''s video file');
select is((select count(*)::int from storage.objects where bucket_id = 'documents'), 0, 'scouts cannot read other users'' documents');
select is((select count(*)::int from public.profiles where username = 'banned_t'), 1, 'profiles of banned users stay visible to verified scouts (for context)');

-- --- players: other players' public content, never private ----------------------------------
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*)::int from public.videos where user_id = '33333333-3333-3333-3333-333333333333'), 0, 'players cannot see a private account''s videos');
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select is((select count(*)::int from public.videos where user_id = auth.uid()), 1, 'a private account still sees its own videos');

-- --- internal functions are not callable ---------------------------------------------------
select throws_ok($$ select public.enforce_feed_rate_limit('44444444-4444-4444-4444-444444444444', 100000) $$, '42501', null,
  'users cannot pump another user''s feed rate limit');
select throws_ok($$ select public.refresh_video_scores() $$, '42501', null, 'users cannot trigger a ranking recompute');

-- --- engagement integrity ------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
insert into public.video_events (video_id, viewer_id, watch_ms) values
  ('a0000000-0000-0000-0000-000000000001', auth.uid(), 3600000),
  ('a0000000-0000-0000-0000-000000000001', auth.uid(), 3600000),
  ('a0000000-0000-0000-0000-000000000001', auth.uid(), 3600000);
insert into public.video_shares (video_id, user_id) values
  ('a0000000-0000-0000-0000-000000000001', auth.uid()), ('a0000000-0000-0000-0000-000000000001', auth.uid());
reset role;
select is((select view_count from public.videos where id = 'a0000000-0000-0000-0000-000000000001'), 1, 'repeat views within 30 minutes count once');
select is((select total_watch_ms from public.videos where id = 'a0000000-0000-0000-0000-000000000001'), 600000::bigint, 'watch time per event is capped at 10 minutes');
select is((select share_count from public.videos where id = 'a0000000-0000-0000-0000-000000000001'), 1, 'repeat shares by one user count once');
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.video_events (video_id, viewer_id, watch_ms) values ('a0000000-0000-0000-0000-000000000001', auth.uid(), 5000);
reset role;
select is((select view_count from public.videos where id = 'a0000000-0000-0000-0000-000000000001'), 1, 'owners viewing their own video do not add views');
set local role authenticated;

-- --- input bounds ----------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok($$ update public.profiles set bio = repeat('x', 501) where user_id = auth.uid() $$, '23514', null, 'bio is limited to 500 characters');
select throws_ok($$ update public.profiles set avatar_url = 'javascript:alert(1)' where user_id = auth.uid() $$, '23514', null, 'javascript: avatar URLs are rejected');
select throws_ok($$ insert into public.videos (user_id, video_url, status) values (auth.uid(), 'javascript:alert(1)', 'live') $$, '23514', null, 'javascript: video URLs are rejected');
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$ insert into public.contact_messages (name, email, subject, message) values ('a', 'a@b.c', 's', repeat('m', 5001)) $$, '23514', null, 'contact messages are size limited');
select lives_ok($$ insert into public.contact_messages (name, email, subject, message)
                   select 'a', 'flood@b.c', 's', 'm' from generate_series(1, 5) $$, 'five contact messages per hour are fine');
select throws_ok($$ insert into public.contact_messages (name, email, subject, message) values ('a', 'flood@b.c', 's', 'm') $$, '54000', null,
  'the sixth contact message from one email within an hour is refused');
select is(public.is_username_available('adult_t'), false, 'username check sees taken names (anon)');
select is(public.is_username_available('brand_new_name'), true, 'username check sees free names (anon)');

-- --- messages: recipient can mark read, not edit -------------------------------------------
reset role;
insert into public.messages (id, sender_id, receiver_id, content) values
  ('b0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'hello');
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok($$ update public.messages set read = true where id = 'b0000000-0000-0000-0000-000000000001' $$, 'recipient can mark a message read');
select throws_ok($$ update public.messages set content = 'edited' where id = 'b0000000-0000-0000-0000-000000000001' $$, '42501', null,
  'recipient cannot edit message content');

-- --- upload halt is enforced server-side ----------------------------------------------------
reset role;
update public.app_settings set value = '"true"'::jsonb where key = 'video_uploads_halted';
set local role authenticated;
select throws_ok($$ insert into public.videos (user_id, video_url, status) values (auth.uid(), '', 'draft') $$, '42501', null,
  'uploads are refused while halted');

select * from finish();
rollback;
