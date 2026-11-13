-- Fix 5 + general: storage folders, payments, and RLS coverage.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(11);

set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('player-videos', '11111111-1111-1111-1111-111111111111/fake.mp4') $$,
  '42501', null, 'cannot upload into another user''s player-videos folder');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('player-videos', '33333333-3333-3333-3333-333333333333/clip.mp4') $$,
  'can upload into own folder');
select throws_ok(
  $$ insert into public.payments (user_id, amount, status, transaction_id) values (auth.uid(), 100, 'success', 'FAKE') $$,
  '42501', null, 'users cannot forge payment records');

-- reporting a scout reaches every admin
select ok(public.report_user('44444444-4444-4444-4444-444444444444', 'asked me to move to whatsapp') is not null,
  'player can report a scout');
reset role;
select is((select count(*)::int from public.notifications
            where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and metadata->>'reported_user_id' = '44444444-4444-4444-4444-444444444444'),
  1, 'the admin receives the report');
set local role authenticated;
select is((select count(*)::int from public.user_reports), 0, 'non-admins cannot read reports');
select throws_ok($$ insert into public.user_reports (reporter_id, reported_user_id, reason)
                    values (auth.uid(), '44444444-4444-4444-4444-444444444444', 'x') $$,
  '42501', null, 'reports can only be created through report_user()');
select throws_ok($$ select public.report_user(auth.uid(), 'me') $$, '22023', null, 'cannot report yourself');
select lives_ok($$ select public.report_user('44444444-4444-4444-4444-444444444444', 'r' || g) from generate_series(2, 5) g $$,
  'up to 5 reports per hour');
select throws_ok($$ select public.report_user('44444444-4444-4444-4444-444444444444', 'spam') $$,
  '54000', null, 'the 6th report in an hour is rate-limited');

reset role;
select is(
  (select coalesce(string_agg(c.relname, ', '), '') from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), '',
  'every public table has RLS enabled');

select * from finish();
rollback;
