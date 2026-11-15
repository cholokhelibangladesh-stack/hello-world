-- Reels ranking: engagement (likes, comments, shares, views) raises a reel's score, newer reels
-- outrank equal older ones, and reels past the push window leave the main feed while staying
-- reachable through search and the Following feed.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(12);

-- ids: adult player 11111111, verified scout 44444444, admin aaaaaaaa
update public.profiles set sport = 'football' where user_id = '11111111-1111-1111-1111-111111111111';
insert into public.videos (id, user_id, video_url, status, title, created_at) values
  ('c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'p/a.mp4', 'live', 'Quiet clip',     now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'p/b.mp4', 'live', 'Talked about',   now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'p/c.mp4', 'live', 'Old screamer',   now() - interval '45 days'),
  ('c0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'p/d.mp4', 'live', 'Same but newer', now() - interval '1 day'),
  ('c0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'p/e.mp4', 'live', 'Same but older', now() - interval '6 days');

-- equal views on the two "Same" reels, so only age separates them
update public.videos set view_count = 10 where id in ('c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005');
-- one view each on the comparison pair, so neither borrows the creator's average
update public.videos set view_count = 1 where id in ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002');
insert into public.video_comments (video_id, user_id, body) values
  ('c0000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'Great touch'),
  ('c0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Brilliant');

select public.refresh_video_scores();

-- ── score ──
select cmp_ok(
  (select ranking_score from public.videos where id = 'c0000000-0000-0000-0000-000000000002'), '>',
  (select ranking_score from public.videos where id = 'c0000000-0000-0000-0000-000000000001'),
  'comments raise a reel''s score');

create temp table before_likes as select ranking_score from public.videos where id = 'c0000000-0000-0000-0000-000000000001';
update public.videos set like_count = 3 where id = 'c0000000-0000-0000-0000-000000000001';
select public.refresh_video_scores();
select ok(
  (select ranking_score from public.videos where id = 'c0000000-0000-0000-0000-000000000001') > (select ranking_score from before_likes),
  'likes raise a reel''s score');

update public.videos set share_count = 2 where id = 'c0000000-0000-0000-0000-000000000001';
select public.refresh_video_scores();
select is(
  round((select ranking_score from public.videos where id = 'c0000000-0000-0000-0000-000000000001')::numeric, 6),
  round(((3 * 3.0 + 2 * 8.0 + 1 * 0.4) * exp(-extract(epoch from (now() - (now() - interval '2 days'))) / (86400.0 * 7.0)))::numeric, 6),
  'score = likes x3 + comments x5 + shares x8 + views x0.4, fading with age');

select cmp_ok(
  (select ranking_score from public.videos where id = 'c0000000-0000-0000-0000-000000000004'), '>',
  (select ranking_score from public.videos where id = 'c0000000-0000-0000-0000-000000000005'),
  'with equal engagement, the newer reel scores higher');

-- ── push window ──
select is(public.reel_push_days(), 30, 'the push window defaults to 30 days');

set local role authenticated;
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select is((select count(*)::int from public.get_ranked_feed(50, 0) where id = 'c0000000-0000-0000-0000-000000000003'), 0,
  'a reel older than the push window is no longer pushed in the main feed');
select is((select count(*)::int from public.get_ranked_feed(50, 0) where id = 'c0000000-0000-0000-0000-000000000002'), 1,
  'a reel inside the window is pushed');
select is((select count(*)::int from public.get_ranked_feed(50, 0, null, null, null, 'screamer') where id = 'c0000000-0000-0000-0000-000000000003'), 1,
  'searching still finds a reel past the push window');

insert into public.follows (follower_id, followee_id) values (auth.uid(), '11111111-1111-1111-1111-111111111111');
select is((select count(*)::int from public.get_ranked_feed(50, 0, null, null, null, null, true) where id = 'c0000000-0000-0000-0000-000000000003'), 1,
  'the Following feed still shows a followed player''s older reels');

select ok(
  (select array_position(array_agg(id order by rn), 'c0000000-0000-0000-0000-000000000002'::uuid)
        < array_position(array_agg(id order by rn), 'c0000000-0000-0000-0000-000000000005'::uuid)
     from (select id, row_number() over () rn from public.get_ranked_feed(50, 0)) f),
  'the feed orders reels by score: the talked-about reel comes before a quieter older one');

-- an admin widens the window
reset role;
update public.app_settings set value = '60'::jsonb where key = 'reel_push_days';
set local role authenticated;
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
select is((select count(*)::int from public.get_ranked_feed(50, 0) where id = 'c0000000-0000-0000-0000-000000000003'), 1,
  'raising the push window brings the older reel back into the feed');

reset role;
update public.app_settings set value = '"abc"'::jsonb where key = 'reel_push_days';
select is(public.reel_push_days(), 30, 'a bad setting falls back to 30 days');

select * from finish();
rollback;
