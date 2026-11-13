-- Follows, comments, notifications (with preferences), filtered feed, admin moderation and stats.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(38);

-- ids: admin aaaaaaaa, adult player 11111111, minor 33333333, pending scout 22222222,
--      verified scout 44444444, banned player 55555555
insert into public.videos (id, user_id, video_url, status, title, position_tags, trait_tags) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'p/1.mp4', 'live', 'Solo goal', '{Striker}', '{Pace,Finishing}'),
  ('b0000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'p/2.mp4', 'live', 'Keeper saves', '{Goalkeeper}', '{Aerial}');
update public.profiles set sport = 'football' where user_id in ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333');
insert into public.notification_preferences (user_id) values
  ('11111111-1111-1111-1111-111111111111'), ('33333333-3333-3333-3333-333333333333')
  on conflict do nothing;
insert into public.privacy_settings (user_id, is_private) values ('33333333-3333-3333-3333-333333333333', true)
  on conflict (user_id) do update set is_private = true;

set local role authenticated;

-- ── follows ──
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
select lives_ok($$ insert into public.follows (follower_id, followee_id) values (auth.uid(), '11111111-1111-1111-1111-111111111111') $$,
  'a verified scout can follow a player');
select throws_ok($$ insert into public.follows (follower_id, followee_id) values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333') $$,
  '42501', null, 'nobody can create a follow on someone else''s behalf');
select is((select followers from public.get_follow_stats('11111111-1111-1111-1111-111111111111')), 1::bigint, 'follower count is right');
select ok((select i_follow from public.get_follow_stats('11111111-1111-1111-1111-111111111111')), 'i_follow is true for the follower');

set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok($$ insert into public.follows (follower_id, followee_id) values (auth.uid(), '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'a pending scout cannot follow players yet');

set local request.jwt.claims to '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
select throws_ok($$ insert into public.follows (follower_id, followee_id) values (auth.uid(), '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'a banned user cannot follow');

-- ── comments ──
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
select lives_ok($$ insert into public.video_comments (video_id, user_id, body) values ('b0000000-0000-0000-0000-000000000001', auth.uid(), '  Great finish  ') $$,
  'a verified scout can comment on a public video');
select is((select body from public.video_comments where user_id = auth.uid() limit 1), 'Great finish', 'comment text is trimmed');
select throws_ok($$ insert into public.video_comments (video_id, user_id, body) values ('b0000000-0000-0000-0000-000000000001', auth.uid(), '   ') $$,
  '23514', null, 'empty comments are rejected');
select throws_ok($$ insert into public.video_comments (video_id, user_id, body) values ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'spoof') $$,
  '42501', null, 'nobody can comment as someone else');

-- comments switched off by the owner
reset role;
insert into public.privacy_settings (user_id, comment_control) values ('11111111-1111-1111-1111-111111111111', 'off')
  on conflict (user_id) do update set comment_control = 'off';
set local role authenticated;
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
select throws_ok($$ insert into public.video_comments (video_id, user_id, body) values ('b0000000-0000-0000-0000-000000000001', auth.uid(), 'again') $$,
  '42501', null, 'comments are refused when the owner turned them off');
reset role;
update public.privacy_settings set comment_control = 'everyone' where user_id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;

-- blocked: the player blocks the scout
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.blocked_users (blocker_id, blocked_id) values (auth.uid(), '44444444-4444-4444-4444-444444444444');
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
select throws_ok($$ insert into public.video_comments (video_id, user_id, body) values ('b0000000-0000-0000-0000-000000000001', auth.uid(), 'hi') $$,
  '42501', null, 'a blocked user cannot comment');
select is((select count(*)::int from public.get_ranked_feed(10, 0) where user_id = '11111111-1111-1111-1111-111111111111'), 0,
  'videos from someone who blocked you are not in your feed');
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
delete from public.blocked_users where blocker_id = auth.uid();

-- video owner can delete a comment on their own video
select is((select count(*)::int from public.video_comments where video_id = 'b0000000-0000-0000-0000-000000000001'), 1, 'owner sees comments on their video');
delete from public.video_comments where video_id = 'b0000000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.video_comments where video_id = 'b0000000-0000-0000-0000-000000000001'), 0, 'owner can remove comments on their video');

-- ── notifications from activity ──
reset role;
select is((select count(*)::int from public.notifications where user_id = '11111111-1111-1111-1111-111111111111' and type = 'follow'), 1,
  'following someone notifies them');
select ok((select title from public.notifications where user_id = '11111111-1111-1111-1111-111111111111' and type = 'follow') like '%scout%',
  'a scout follow says it is a scout watchlist');
select is((select count(*)::int from public.notifications where user_id = '11111111-1111-1111-1111-111111111111' and type = 'comment'), 1,
  'a comment notifies the video owner');

set local role authenticated;
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
insert into public.video_likes (video_id, user_id) values ('b0000000-0000-0000-0000-000000000001', auth.uid());
delete from public.video_likes where video_id = 'b0000000-0000-0000-0000-000000000001' and user_id = auth.uid();
insert into public.video_likes (video_id, user_id) values ('b0000000-0000-0000-0000-000000000001', auth.uid());
reset role;
select is((select count(*)::int from public.notifications where user_id = '11111111-1111-1111-1111-111111111111' and type = 'like'), 1,
  'unlike + like again does not spam the owner');

update public.notification_preferences set likes = false where user_id = '33333333-3333-3333-3333-333333333333';
set local role authenticated;
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
insert into public.video_likes (video_id, user_id) values ('b0000000-0000-0000-0000-000000000002', auth.uid());
reset role;
select is((select count(*)::int from public.notifications where user_id = '33333333-3333-3333-3333-333333333333' and type = 'like'), 0,
  'turning off like notifications is respected');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok($$ select public.notify_user('33333333-3333-3333-3333-333333333333', 'fake', 'x', 'notice') $$,
  '42501', null, 'users cannot send notifications to others directly');
select lives_ok($$ select public.register_push_token('fcm-token-abcdef-123', 'android') $$, 'a user can register a push token');
select is((select count(*)::int from public.push_tokens), 1, 'and only sees their own tokens');

-- ── filtered feed ──
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
select is((select count(*)::int from public.get_ranked_feed(10, 0, 'football', array['striker'])), 1, 'position filter is case-insensitive and server-side');
select is((select count(*)::int from public.get_ranked_feed(10, 0, null, null, array['aerial'])), 0, 'private accounts never appear, even when they match');
select is((select count(*)::int from public.get_ranked_feed(10, 0, null, null, null, 'solo')), 1, 'text search matches titles');
select ok((select following from public.get_ranked_feed(10, 0) limit 1), 'feed reports that you follow the creator');
select is((select count(*)::int from public.get_ranked_feed(10, 0, null, null, null, null, true)), 1, 'following-only feed');

-- ── admin moderation ──
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok($$ select public.admin_remove_video('b0000000-0000-0000-0000-000000000001', 'spam') $$, '42501', null, 'non-admins cannot remove videos');
select throws_ok($$ select public.get_admin_stats() $$, '42501', null, 'non-admins cannot read platform stats');

set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
select throws_ok($$ select public.admin_remove_video('b0000000-0000-0000-0000-000000000001', '  ') $$, '22023', null, 'removing a video needs a reason');
select public.admin_remove_video('b0000000-0000-0000-0000-000000000001', 'Contains another player''s footage');
reset role;
select is((select status from public.videos where id = 'b0000000-0000-0000-0000-000000000001'), 'rejected', 'removed video is taken down');
select ok((select message from public.notifications where user_id = '11111111-1111-1111-1111-111111111111' and type = 'video_removed') like '%another player''s footage%',
  'owner is told the reason');

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
select public.admin_moderate_user('11111111-1111-1111-1111-111111111111', 'suspend', 'Abusive comments', 'Please read the community rules.', 48);
reset role;
select ok((select is_banned and banned_until > now() + interval '47 hours' from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  'suspension sets a time limit');
select is((select count(*)::int from public.admin_actions where target_user = '11111111-1111-1111-1111-111111111111'), 2,
  'both actions are in the audit log');

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
select ok((public.get_admin_stats() -> 'users' ->> 'suspended')::int >= 1, 'stats count suspended users');

-- ── date of birth is fixed after sign-up ──
reset role;
insert into public.profile_private (user_id, date_of_birth) values ('33333333-3333-3333-3333-333333333333', '2012-01-01')
  on conflict (user_id) do update set date_of_birth = '2012-01-01';
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select throws_ok($$ update public.profile_private set date_of_birth = '2000-01-01' where user_id = auth.uid() $$,
  '42501', null, 'a minor cannot change their date of birth to become an adult');
select lives_ok($$ update public.profile_private set phone = '+8801712345678' where user_id = auth.uid() $$,
  'the phone number can still be changed');

select * from finish();
rollback;
