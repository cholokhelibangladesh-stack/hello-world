-- Fix 1: nobody but a database owner (SQL editor / migrations) can create admins.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(6);

insert into auth.users (id, email) values ('66666666-6666-6666-6666-666666666666', 'new@test.local');

-- The signup edge function runs as service_role.
set local role service_role;
select throws_ok(
  $$ insert into public.user_roles (user_id, role) values ('66666666-6666-6666-6666-666666666666', 'admin') $$,
  '42501', null, 'service_role (signup edge function) cannot grant admin');
select throws_ok(
  $$ update public.user_roles set role = 'admin' where user_id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'service_role cannot promote an existing role to admin');
select lives_ok(
  $$ insert into public.user_roles (user_id, role) values ('66666666-6666-6666-6666-666666666666', 'player') $$,
  'service_role can still assign player');

-- Signed-in users can't touch user_roles at all.
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok(
  $$ insert into public.user_roles (user_id, role) values ('11111111-1111-1111-1111-111111111111', 'admin') $$,
  '42501', null, 'a user cannot insert their own admin role');

reset role;
select lives_ok(
  $$ insert into public.user_roles (user_id, role) values ('66666666-6666-6666-6666-666666666666', 'admin') $$,
  'database owner (SQL editor) can still create an admin');
select is(public.has_role('66666666-6666-6666-6666-666666666666', 'admin'), true, 'admin created by owner is recognised');

select * from finish();
rollback;
