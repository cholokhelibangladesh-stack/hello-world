-- The faster reels feed still applies every visibility rule.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(6);
insert into public.videos (id, user_id, video_url, status, title, ranking_score, created_at) values
  ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'p/1.mp4', 'live', 'Top clip', 90, now() - interval '1 day'),
  ('e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'p/2.mp4', 'live', 'Old clip', 99, now() - interval '400 days'),
  ('e0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'p/3.mp4', 'draft', 'Draft clip', 99, now());
select has_index('public', 'videos', 'idx_videos_title_trgm', 'search index on titles exists');
set local role authenticated;
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal2"}';
select ok(exists (select 1 from public.get_ranked_feed(50, 0, null, null, null, null, false) where id = 'e0000000-0000-0000-0000-000000000001'), 'a recent live clip is in the feed');
select ok(not exists (select 1 from public.get_ranked_feed(50, 0, null, null, null, null, false) where id = 'e0000000-0000-0000-0000-000000000002'), 'clips older than the push window stay out of the main feed');
select ok(not exists (select 1 from public.get_ranked_feed(50, 0, null, null, null, null, false) where id = 'e0000000-0000-0000-0000-000000000003'), 'drafts never appear');
select ok(exists (select 1 from public.get_ranked_feed(50, 0, null, null, null, 'old clip', false) where id = 'e0000000-0000-0000-0000-000000000002'), 'search still reaches older clips');
reset role;
update public.profiles set is_banned = true where user_id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal2"}';
select ok(not exists (select 1 from public.get_ranked_feed(50, 0, null, null, null, null, false) where id = 'e0000000-0000-0000-0000-000000000001'), 'a banned player''s clips disappear');
select * from finish();
rollback;
