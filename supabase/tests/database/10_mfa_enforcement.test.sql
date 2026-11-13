-- Two-step verification is enforced by the database: with a verified authenticator, an aal1
-- (password-only) session can't read or write anything; aal2 restores normal access.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(6);

-- Minimal stand-in for Supabase Auth's table where it doesn't exist (CI shim); on a real stack
-- the insert below lists every column Supabase requires.
create table if not exists auth.mfa_factors (id uuid primary key, user_id uuid not null, factor_type text,
  status text not null, created_at timestamptz, updated_at timestamptz, secret text, friendly_name text);
insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at, secret, friendly_name)
values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'totp', 'verified', now(), now(), 'JBSWY3DPEHPK3PXP', 'Test');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.profiles), 0, 'password-only session sees no profiles once 2FA is on');
select is((select count(*)::int from public.user_roles), 0, 'password-only session cannot even read its own role');
select throws_ok($$ insert into public.notifications (user_id, title, message, type) values (auth.uid(), 't', 'm', 'info') $$,
  '42501', null, 'password-only session cannot write');

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}';
select ok((select count(*) from public.profiles) > 0, 'aal2 session reads normally');
select lives_ok($$ update public.profiles set bio = 'x' where user_id = auth.uid() $$, 'aal2 session writes normally');

set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.profiles where user_id = auth.uid()), 1, 'users without 2FA are unaffected');

select * from finish();
rollback;
