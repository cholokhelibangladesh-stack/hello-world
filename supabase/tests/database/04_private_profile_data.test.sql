-- Fix 2: phone, date of birth and guardian details are readable only by the owner and admins.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(14);

select hasnt_column('public', 'profiles', 'phone', 'phone no longer lives on the world-readable profiles table');
select hasnt_column('public', 'profiles', 'date_of_birth', 'date_of_birth moved off profiles');
select hasnt_column('public', 'profiles', 'guardian_contact', 'guardian_contact moved off profiles');
select has_table('public', 'profile_private', 'profile_private table exists');

reset role;
insert into public.profile_private (user_id, phone, date_of_birth, guardian_name, guardian_email, guardian_contact)
values ('33333333-3333-3333-3333-333333333333', '01811111111', current_date - interval '14 years',
        'Parent', 'parent@test.local', '01922222222')
on conflict (user_id) do update set phone = excluded.phone, date_of_birth = excluded.date_of_birth;

set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.profile_private where user_id = '33333333-3333-3333-3333-333333333333'), 0,
  'a (pending) scout cannot read a minor''s private data');
select is((select count(*)::int from public.profiles where user_id = '33333333-3333-3333-3333-333333333333'), 0,
  'a pending scout cannot browse player profiles');
select is(public.get_player_age('33333333-3333-3333-3333-333333333333'), null,
  'a pending scout cannot see a player''s age');

set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal2"}';
select is((select full_name from public.profiles where user_id = '33333333-3333-3333-3333-333333333333'), 'Minor Player',
  'a verified scout can read public profile fields');
select is(public.get_player_age('33333333-3333-3333-3333-333333333333'), 14,
  'verified scouts can see age (not the exact birth date) via get_player_age');
select is((select count(*)::int from public.profile_private where user_id = '33333333-3333-3333-3333-333333333333'), 0,
  'a verified scout still cannot read a minor''s private data');

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.profile_private where user_id = '33333333-3333-3333-3333-333333333333'), 0,
  'another player cannot read it either');

set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","aal":"aal2"}';
select is((select phone from public.profile_private where user_id = auth.uid()), '01811111111', 'owner can read own private data');
select lives_ok(
  $$ update public.profile_private set phone = '01700000000' where user_id = auth.uid() $$, 'owner can update own private data');

set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aal":"aal2"}';
select is((select phone from public.profile_private where user_id = '33333333-3333-3333-3333-333333333333'), '01700000000',
  'admin can read private data (needed to share contact on approved requests)');

select * from finish();
rollback;
