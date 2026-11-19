-- Two-step scouting: intermediate scouts review every highlight once and forward the good ones;
-- professional scouts see only forwarded highlights. Players and pending scouts get neither.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(13);

-- an approved intermediate scout (reviewer)
insert into auth.users (id, email) values ('66666666-6666-6666-6666-666666666666', 'reviewer@test.local') on conflict do nothing;
insert into public.user_roles (user_id, role) values ('66666666-6666-6666-6666-666666666666', 'scout') on conflict do nothing;
insert into public.profiles (user_id, full_name, username) values ('66666666-6666-6666-6666-666666666666', 'Review Coach', 'rcoach_t') on conflict (user_id) do nothing;
insert into public.scout_profiles (user_id, full_name, scout_tier, verification_status)
  values ('66666666-6666-6666-6666-666666666666', 'Review Coach', 'reviewer', 'active');
insert into public.videos (id, user_id, video_url, status, title, created_at) values
  ('f0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'p/a.mp4', 'live', 'Dribbling', '2000-01-01'),
  ('f0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'p/b.mp4', 'live', 'Free kicks', '2000-01-02');

select is((select scout_tier from public.scout_profiles where user_id = '44444444-4444-4444-4444-444444444444'), 'professional',
  'existing scouts default to professional');

-- reviewer
set local role authenticated;
set local request.jwt.claims to '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
select is((select count(*)::int from public.get_review_queue(50, null) q where q.video_id in ('f0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002')), 2, 'the reviewer sees unreviewed live highlights');
select throws_ok($$ select public.get_recommended_videos(10, 0, null) $$, '42501', null, 'a reviewer cannot open the professional list');
select throws_ok($$ update public.scout_profiles set scout_tier = 'professional' where user_id = '66666666-6666-6666-6666-666666666666' $$,
  '42501', null, 'a scout cannot change their own tier');
select throws_ok($$ insert into public.video_reviews (video_id, reviewer_id, rating, decision) values ('f0000000-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666', 5, 'forward') $$,
  '42501', null, 'reviews cannot be written directly');
select lives_ok($$ select public.submit_video_review('f0000000-0000-0000-0000-000000000001', 5, 'forward', 'Quick feet, strong left foot') $$, 'the reviewer forwards a highlight');
select lives_ok($$ select public.submit_video_review('f0000000-0000-0000-0000-000000000002', 2, 'pass', '') $$, 'the reviewer passes a highlight');
select is((select count(*)::int from public.get_review_queue(50, null) q where q.video_id in ('f0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002')), 0, 'reviewed highlights leave the queue');
select is((select reviews from public.get_reviewer_stats(null)), 2, 'the reviewer sees their own review count');

reset role;
select is((select count(*)::int from public.notifications where user_id = '11111111-1111-1111-1111-111111111111' and type = 'review_forwarded'), 1,
  'the player is told once when a highlight reaches professional scouts');

-- professional scout
set local role authenticated;
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
select results_eq($$ select video_id, avg_rating from public.get_recommended_videos(10, 0, null) $$,
  $$ values ('f0000000-0000-0000-0000-000000000001'::uuid, 5.0::numeric) $$, 'professionals see only forwarded highlights, with the rating');
select throws_ok($$ select public.get_review_queue(10, null) $$, '42501', null, 'a professional does not get the review queue');

-- player and pending scout
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok($$ select public.get_recommended_videos(10, 0, null) $$, '42501', null, 'a pending scout sees nothing');

select * from finish();
rollback;
