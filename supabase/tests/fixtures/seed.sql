-- Shared fixtures for pgTAP tests. Included with \ir inside each test's transaction,
-- so everything is rolled back afterwards.
--   admin   aaaaaaaa-…   player (adult) 11111111-…   minor player 33333333-…
--   pending scout 22222222-…   verified scout 44444444-…   banned player 55555555-…
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@test.local'),
  ('11111111-1111-1111-1111-111111111111', 'player@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'scout.pending@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'minor@test.local'),
  ('44444444-4444-4444-4444-444444444444', 'scout.verified@test.local'),
  ('55555555-5555-5555-5555-555555555555', 'banned@test.local')
on conflict (id) do nothing;

insert into public.user_roles (user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin'),
  ('11111111-1111-1111-1111-111111111111', 'player'),
  ('22222222-2222-2222-2222-222222222222', 'scout'),
  ('33333333-3333-3333-3333-333333333333', 'player'),
  ('44444444-4444-4444-4444-444444444444', 'scout'),
  ('55555555-5555-5555-5555-555555555555', 'player')
on conflict do nothing;

insert into public.profiles (user_id, full_name, username) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Admin', 'admin_t'),
  ('11111111-1111-1111-1111-111111111111', 'Adult Player', 'adult_t'),
  ('22222222-2222-2222-2222-222222222222', 'Pending Scout', 'pscout_t'),
  ('33333333-3333-3333-3333-333333333333', 'Minor Player', 'minor_t'),
  ('44444444-4444-4444-4444-444444444444', 'Verified Scout', 'vscout_t'),
  ('55555555-5555-5555-5555-555555555555', 'Banned Player', 'banned_t')
on conflict (user_id) do update set full_name = excluded.full_name, username = excluded.username;

update public.profiles set is_banned = true, ban_reason = 'spam'
 where user_id = '55555555-5555-5555-5555-555555555555';

insert into public.scout_profiles (user_id, full_name) values
  ('22222222-2222-2222-2222-222222222222', 'Pending Scout'),
  ('44444444-4444-4444-4444-444444444444', 'Verified Scout')
on conflict (user_id) do nothing;
update public.scout_profiles set verification_status = 'active'
 where user_id = '44444444-4444-4444-4444-444444444444';

insert into storage.buckets (id, name, public) values ('player-videos', 'player-videos', true)
on conflict (id) do nothing;
