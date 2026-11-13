-- Regressions found by the UI crawl (Nov 2026).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(8);
select ok(exists(select 1 from pg_constraint where conrelid = 'public.blocked_users'::regclass and contype = 'f'
  and confrelid = 'public.profiles'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.blocked_users'::regclass and attname = 'blocked_id')]::int2[]),
  'blocked_users.blocked_id references profiles (so the settings list can show names)');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.muted_users'::regclass and contype = 'f'
  and confrelid = 'public.profiles'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.muted_users'::regclass and attname = 'muted_id')]::int2[]),
  'muted_users.muted_id references profiles (so the settings list can show names)');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.restricted_users'::regclass and contype = 'f'
  and confrelid = 'public.profiles'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.restricted_users'::regclass and attname = 'restricted_id')]::int2[]),
  'restricted_users.restricted_id references profiles (so the settings list can show names)');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.favorites'::regclass and contype = 'f'
  and confrelid = 'public.profiles'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.favorites'::regclass and attname = 'favorite_id')]::int2[]),
  'favorites.favorite_id references profiles (so the settings list can show names)');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.close_friends'::regclass and contype = 'f'
  and confrelid = 'public.profiles'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.close_friends'::regclass and attname = 'friend_id')]::int2[]),
  'close_friends.friend_id references profiles (so the settings list can show names)');
select has_column('public', 'profiles', 'position_tags', 'profiles.position_tags exists');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.blocked_users (blocker_id, blocked_id) values (auth.uid(), '22222222-2222-2222-2222-222222222222');
select is((select p.username from public.blocked_users b join public.profiles p on p.user_id = b.blocked_id
            where b.blocker_id = auth.uid()), 'pscout_t', 'blocked list resolves to the blocked user''s profile');
select lives_ok($$ update public.profiles set position_tags = '{striker,winger}' where user_id = auth.uid() $$,
  'player can save position preferences');
select * from finish();
rollback;
