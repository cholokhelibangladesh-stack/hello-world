begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(6);

insert into public.videos (user_id, video_url, status) values ('11111111-1111-1111-1111-111111111111', 'x.mp4', 'live');
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}';
select throws_ok($$ select public.prepare_account_deletion(auth.uid()) $$, '42501', null,
  'signed-in users cannot call the cleanup directly');

set local role service_role;
select lives_ok($$ select public.prepare_account_deletion('11111111-1111-1111-1111-111111111111') $$, 'service_role can');
select throws_ok($$ select public.prepare_account_deletion('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$, '42501', null,
  'admins are refused');

reset role;
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is((select count(*)::int from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'profile removed');
select is((select count(*)::int from public.videos where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'videos removed');
select is((select count(*)::int from public.user_roles where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'role removed');
select * from finish();
rollback;
