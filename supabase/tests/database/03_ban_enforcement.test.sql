-- Fix 4b: bans are enforced by the database, not just by the frontend BanGuard.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(7);

reset role;
insert into public.videos (id, user_id, video_url, status)
values ('99999999-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a.mp4', 'live');

set local role authenticated;
set local request.jwt.claims to '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
select throws_ok(
  $$ insert into public.videos (user_id, video_url) values (auth.uid(), 'b.mp4') $$,
  '42501', null, 'banned user cannot upload videos');
select throws_ok(
  $$ insert into public.video_likes (video_id, user_id) values ('99999999-0000-0000-0000-000000000002', auth.uid()) $$,
  '42501', null, 'banned user cannot like');
select throws_ok(
  $$ insert into public.messages (sender_id, receiver_id, content) values (auth.uid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'hi') $$,
  '42501', null, 'banned user cannot send messages');

-- verified scout gets banned on the scout profile
reset role;
update public.scout_profiles set is_banned = true where user_id = '44444444-4444-4444-4444-444444444444';
set local role authenticated;
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
select throws_ok(
  $$ insert into public.scout_requests (scout_id, player_id) values (auth.uid(), '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'banned scout cannot send scout requests');

-- expired ban no longer blocks
reset role;
update public.profiles set banned_until = now() - interval '1 hour'
 where user_id = '55555555-5555-5555-5555-555555555555';
set local role authenticated;
set local request.jwt.claims to '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
select lives_ok(
  $$ insert into public.video_likes (video_id, user_id) values ('99999999-0000-0000-0000-000000000002', auth.uid()) $$,
  'expired ban no longer blocks');

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$ insert into public.video_likes (video_id, user_id) values ('99999999-0000-0000-0000-000000000002', auth.uid()) $$,
  'normal user can like');
reset role;
select is((select like_count from public.videos where id = '99999999-0000-0000-0000-000000000002'), 2,
  'like trigger still updates like_count');

select * from finish();
rollback;
