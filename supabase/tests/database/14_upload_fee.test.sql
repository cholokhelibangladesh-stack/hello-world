-- Paid uploads: with the fee on, a player's highlight can't go live until a bKash payment for it succeeds;
-- the payment then publishes it and sends an invoice and a certificate. Players can't write payments.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir ../fixtures/seed.sql
select plan(10);

-- fee off: uploads go live as before
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.videos (id, user_id, video_url, status, title) values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'p/free.mp4', 'live', 'Free clip');
select is((select status from public.videos where id = 'd0000000-0000-0000-0000-000000000001'), 'live', 'fee off: a new highlight goes live');

reset role;
update public.app_settings set value = 'true'::jsonb where key = 'upload_fee_enabled';

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.videos (id, user_id, video_url, status, title) values
  ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'p/paid.mp4', 'draft', 'Paid clip');
update public.videos set status = 'live' where id = 'd0000000-0000-0000-0000-000000000002';
select is((select status from public.videos where id = 'd0000000-0000-0000-0000-000000000002'), 'pending_payment', 'fee on: publishing waits for payment');

insert into public.videos (id, user_id, video_url, status, title) values
  ('d0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'p/direct.mp4', 'live', 'Straight to live');
select is((select status from public.videos where id = 'd0000000-0000-0000-0000-000000000003'), 'pending_payment', 'fee on: inserting as live also waits');

select throws_ok($$ insert into public.payments (user_id, amount, video_id) values ('11111111-1111-1111-1111-111111111111', 100, 'd0000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'players cannot create payment records');
select throws_ok($$ select public.complete_upload_payment(gen_random_uuid(), 'X', 'Y') $$, '42501', null, 'players cannot mark a payment paid');

reset role;
insert into public.payments (id, user_id, video_id, amount) values
  ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000002', 100);
select public.complete_upload_payment('e0000000-0000-0000-0000-000000000001', 'TRX123', '017******89');
select is((select status from public.videos where id = 'd0000000-0000-0000-0000-000000000002'), 'live', 'a successful payment publishes the highlight');
select is((select status from public.payments where id = 'e0000000-0000-0000-0000-000000000001'), 'paid', 'payment is marked paid');
select is((select count(*)::int from public.notifications where user_id = '11111111-1111-1111-1111-111111111111' and type in ('payment_receipt', 'certificate')), 2,
  'the player gets an invoice and a certificate');
select public.complete_upload_payment('e0000000-0000-0000-0000-000000000001', 'TRX123', '017******89');
select is((select count(*)::int from public.notifications where user_id = '11111111-1111-1111-1111-111111111111' and type in ('payment_receipt', 'certificate')), 2,
  'a repeated callback does not send them twice');

set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*)::int from public.payments), 0, 'other users cannot see someone else''s payments');

select * from finish();
rollback;
