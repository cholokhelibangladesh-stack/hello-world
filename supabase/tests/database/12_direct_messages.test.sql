-- Direct messages: only after admin approval, participants only, admin can read, pins/reactions/unsend.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(27);

-- ids: admin aaaaaaaa, adult player 11111111, minor 33333333, pending scout 22222222,
--      verified scout 44444444, banned player 55555555
insert into public.scout_requests (id, scout_id, player_id, status) values
  ('c0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'pending');

set local role authenticated;

-- no conversation before approval
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.get_conversations()), 0, 'no conversation exists before an admin approves');
select throws_ok($$ select public.admin_open_conversation('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'a scout cannot open a conversation themselves');
select throws_ok($$ insert into public.conversations (scout_id, player_id) values (auth.uid(), '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'nobody can insert a conversation directly');

-- admin approves the request -> conversation opens, both are told
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aal":"aal2"}';
update public.scout_requests set status = 'approved' where id = 'c0000000-0000-0000-0000-000000000001';
reset role;
select is((select count(*)::int from public.conversations where status = 'open'), 1, 'approving the request opens one conversation');
select is((select count(*)::int from public.notifications where type = 'dm'), 2, 'scout and player are both notified');
create temp table t as select id as cid from public.conversations limit 1;
grant select on t to authenticated;
set local role authenticated;

-- scout writes
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal2"}';
select lives_ok($$ insert into public.direct_messages (id, conversation_id, sender_id, body) values ('d0000000-0000-0000-0000-000000000001', (select cid from t), auth.uid(), '  Hello Rafiq, great highlights  ') $$,
  'the scout can send a message');
select is((select body from public.direct_messages where id = 'd0000000-0000-0000-0000-000000000001'), 'Hello Rafiq, great highlights', 'message text is trimmed');
select throws_ok($$ insert into public.direct_messages (conversation_id, sender_id, body) values ((select cid from t), '11111111-1111-1111-1111-111111111111', 'spoof') $$,
  '42501', null, 'nobody can send as the other person');
select throws_ok($$ insert into public.direct_messages (conversation_id, sender_id, body) values ((select cid from t), auth.uid(), '   ') $$,
  '42501', null, 'empty messages are refused');

-- player replies, reacts, pins
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}';
select is((select unread from public.get_conversations()), 1, 'the player sees one unread message');
select lives_ok($$ insert into public.direct_messages (id, conversation_id, sender_id, body, reply_to_id) values ('d0000000-0000-0000-0000-000000000002', (select cid from t), auth.uid(), 'Thank you!', 'd0000000-0000-0000-0000-000000000001') $$,
  'the player can reply to a specific message');
select lives_ok($$ insert into public.message_reactions (message_id, user_id, emoji) values ('d0000000-0000-0000-0000-000000000001', auth.uid(), '🔥') $$, 'the player can react');
select throws_ok($$ insert into public.message_reactions (message_id, user_id, emoji) values ('d0000000-0000-0000-0000-000000000001', auth.uid(), '❤️') $$,
  '23505', null, 'one reaction per person per message');
select throws_ok($$ insert into public.message_reactions (message_id, user_id, emoji) values ('d0000000-0000-0000-0000-000000000002', auth.uid(), 'lol') $$,
  '23514', null, 'only the allowed emoji are accepted');
select ok(public.dm_toggle_pin('d0000000-0000-0000-0000-000000000001'), 'either participant can pin a message');
select public.dm_mark_read((select cid from t));
select is((select unread from public.get_conversations()), 0, 'marking read clears the unread count');

-- outsiders see nothing
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.direct_messages), 0, 'another player cannot read the conversation');
select is((select count(*)::int from public.message_reactions), 0, 'or its reactions');
select throws_ok($$ insert into public.direct_messages (conversation_id, sender_id, body) values ((select cid from t), auth.uid(), 'hi') $$,
  '42501', null, 'or write in it');
select throws_ok($$ select public.dm_toggle_pin('d0000000-0000-0000-0000-000000000001') $$, '42501', null, 'or pin in it');

-- unsend
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}';
select throws_ok($$ select public.dm_delete_message('d0000000-0000-0000-0000-000000000001') $$, '42501', null, 'you cannot unsend someone else''s message');
select public.dm_delete_message('d0000000-0000-0000-0000-000000000002');
select is((select body from public.direct_messages where id = 'd0000000-0000-0000-0000-000000000002'), '', 'an unsent message has no text for participants');

-- admin can read everything, including what was unsent, and close the conversation
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.direct_messages), 2, 'an admin can read the whole conversation');
select is((select body from public.direct_message_removals), 'Thank you!', 'and sees the text of unsent messages');
select throws_ok($$ insert into public.direct_messages (conversation_id, sender_id, body) values ((select cid from t), auth.uid(), 'admin here') $$,
  '42501', null, 'admins read but do not write in the thread');
select public.admin_set_conversation_status((select cid from t), false, 'Asked for a phone number');

set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal2"}';
select throws_ok($$ insert into public.direct_messages (conversation_id, sender_id, body) values ((select cid from t), auth.uid(), 'still there?') $$,
  '42501', null, 'nobody can write in a closed conversation');
select is((select closed_reason from public.get_conversations()), 'Asked for a phone number', 'participants see why it was closed');

select * from finish();
rollback;
