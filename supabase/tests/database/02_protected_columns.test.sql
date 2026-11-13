-- Fix 3: users can't edit moderation/verification/ban/metric columns on their own rows.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(15);

-- --- banned player tries to unban themselves -------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
select throws_ok(
  $$ update public.profiles set is_banned = false where user_id = auth.uid() $$,
  '42501', null, 'banned player cannot clear is_banned');
select throws_ok(
  $$ update public.profiles set banned_until = now() - interval '1 day' where user_id = auth.uid() $$,
  '42501', null, 'banned player cannot backdate banned_until');
select is((select count(*)::int from public.get_my_ban_status()), 1, 'ban is still reported to the user');

-- --- ordinary profile edits still work ---------------------------------------
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$ update public.profiles set full_name = 'Renamed', bio = 'hi', sport = 'cricket' where user_id = auth.uid() $$,
  'player can still edit name, bio and sport');

-- --- pending scout tries to verify themselves ---------------------------------
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$ update public.scout_profiles set verification_status = 'active' where user_id = auth.uid() $$,
  '42501', null, 'pending scout cannot self-verify');
select lives_ok(
  $$ update public.scout_profiles set preferred_sport = 'football', preferred_positions = '{striker}' where user_id = auth.uid() $$,
  'scout can still edit their preferences');

-- --- videos: metrics, flags, moderation status --------------------------------
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok(
  $$ insert into public.videos (user_id, video_url, like_count, view_count) values (auth.uid(), 'x.mp4', 9999, 9999) $$,
  '42501', null, 'player cannot insert a video with fake counts');
select lives_ok(
  $$ insert into public.videos (id, user_id, video_url, status) values ('99999999-0000-0000-0000-000000000001', auth.uid(), 'x.mp4', 'live') $$,
  'player can publish their own video (free uploads go straight to live)');
select throws_ok(
  $$ update public.videos set like_count = 5000 where id = '99999999-0000-0000-0000-000000000001' $$,
  '42501', null, 'player cannot edit like_count');
select throws_ok(
  $$ update public.videos set ranking_score = 1e9 where id = '99999999-0000-0000-0000-000000000001' $$,
  '42501', null, 'player cannot edit ranking_score');

reset role;
update public.videos set status = 'rejected', flagged = true where id = '99999999-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok(
  $$ update public.videos set status = 'live' where id = '99999999-0000-0000-0000-000000000001' $$,
  '42501', null, 'player cannot re-publish a video an admin rejected');
select throws_ok(
  $$ update public.videos set flagged = false where id = '99999999-0000-0000-0000-000000000001' $$,
  '42501', null, 'player cannot clear an admin flag');
select lives_ok(
  $$ update public.videos set description = 'new caption' where id = '99999999-0000-0000-0000-000000000001' $$,
  'player can still edit the caption');

-- --- admins and triggers keep working -------------------------------------------
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
select lives_ok(
  $$ update public.scout_profiles set verification_status = 'active' where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'admin can verify a scout (AdminDashboard path)');
select lives_ok(
  $$ select public.admin_set_ban('55555555-5555-5555-5555-555555555555', 'profile', false) $$,
  'admin_set_ban can lift a ban');

select * from finish();
rollback;
