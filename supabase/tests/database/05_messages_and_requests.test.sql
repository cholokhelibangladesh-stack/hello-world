-- Fix 4a: messaging goes through admins; scouts can't DM players or approve their own requests.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(9);

set local role authenticated;
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
select throws_ok(
  $$ insert into public.messages (sender_id, receiver_id, content) values (auth.uid(), '33333333-3333-3333-3333-333333333333', 'add me on whatsapp') $$,
  '42501', null, 'even a verified scout cannot DM a player directly');
select lives_ok(
  $$ insert into public.messages (sender_id, receiver_id, content) values (auth.uid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'question for admin') $$,
  'scout can message an admin');
select throws_ok(
  $$ insert into public.scout_requests (scout_id, player_id, status) values (auth.uid(), '33333333-3333-3333-3333-333333333333', 'approved') $$,
  '42501', null, 'scout cannot create an already-approved request');
select lives_ok(
  $$ insert into public.scout_requests (scout_id, player_id) values (auth.uid(), '33333333-3333-3333-3333-333333333333') $$,
  'verified scout can create a pending request');

set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$ insert into public.scout_requests (scout_id, player_id) values (auth.uid(), '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'unverified scout cannot send requests');

set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select lives_ok(
  $$ insert into public.messages (id, sender_id, receiver_id, content) values ('88888888-0000-0000-0000-000000000001', auth.uid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'help') $$,
  'player can message an admin');

set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
select lives_ok(
  $$ update public.messages set flagged = true, flag_reason = 'review' where id = '88888888-0000-0000-0000-000000000001' $$,
  'admin can flag a message');

set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
update public.messages set flagged = false, content = 'edited' where id = '88888888-0000-0000-0000-000000000001';
reset role;
select is((select flagged from public.messages where id = '88888888-0000-0000-0000-000000000001'), true,
  'participant cannot un-flag a message');
select is((select content from public.messages where id = '88888888-0000-0000-0000-000000000001'), 'help',
  'participant cannot rewrite a sent message');

select * from finish();
rollback;
