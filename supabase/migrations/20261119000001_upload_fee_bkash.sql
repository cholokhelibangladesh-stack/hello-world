-- Paid uploads: when the upload fee is switched on, a player's new highlight waits in 'pending_payment'
-- until a bKash payment for it succeeds. A successful payment publishes the video and sends the player an
-- invoice and a certificate of participation in their notifications.

insert into public.app_settings (key, value) values
  ('upload_fee_enabled', 'false'::jsonb),
  ('upload_fee_bdt', '100'::jsonb)
on conflict (key) do nothing;

create or replace function public.upload_fee_enabled() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::boolean from public.app_settings where key = 'upload_fee_enabled'), false)
$$;

create or replace function public.upload_fee_bdt() returns numeric
language sql stable security definer set search_path = public as $$
  select greatest(1, least(100000, coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'upload_fee_bdt'), 100)))
$$;

create sequence if not exists public.invoice_seq;

-- The payments table already exists (id, user_id, amount, status, transaction_id, created_at); extend it.
alter table public.payments
  add column if not exists video_id uuid references public.videos(id) on delete set null,
  add column if not exists currency text not null default 'BDT',
  add column if not exists provider text not null default 'bkash',
  add column if not exists invoice_no text,
  add column if not exists certificate_no text,
  add column if not exists provider_payment_id text,
  add column if not exists payer_account text,          -- masked, e.g. 017******89
  add column if not exists return_url text,
  add column if not exists failure_reason text,
  add column if not exists video_title text,
  add column if not exists payer_name text,
  add column if not exists paid_at timestamptz;
update public.payments set invoice_no = 'CK-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0') where invoice_no is null;
alter table public.payments
  alter column invoice_no set default ('CK-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0')),
  alter column invoice_no set not null;
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded'));
alter table public.payments drop constraint if exists payments_amount_positive;
alter table public.payments add constraint payments_amount_positive check (amount > 0) not valid;
alter table public.payments drop constraint if exists payments_currency_bdt;
alter table public.payments add constraint payments_currency_bdt check (currency = 'BDT' and provider = 'bkash');
create unique index if not exists payments_invoice_no_key on public.payments (invoice_no);
create unique index if not exists payments_certificate_no_key on public.payments (certificate_no) where certificate_no is not null;
create unique index if not exists payments_provider_payment_id_key on public.payments (provider_payment_id) where provider_payment_id is not null;
create index if not exists idx_payments_video on public.payments (video_id);

alter table public.payments enable row level security;
-- Players see their own payments and admins see all. Rows are written only by the payment function (service role).
drop policy if exists "Own payments" on public.payments;
create policy "Own payments" on public.payments for select to authenticated
  using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'));
revoke insert, update, delete on public.payments from anon, authenticated;

-- A player can't publish a highlight they haven't paid for while the fee is on: 'live' becomes 'pending_payment'.
create or replace function public.protect_video_columns()
 returns trigger language plpgsql set search_path to 'public'
as $function$
begin
  if public.can_moderate() then return new; end if;
  if tg_op = 'INSERT' then
    if coalesce(new.view_count, 0) <> 0 or coalesce(new.like_count, 0) <> 0
       or coalesce(new.share_count, 0) <> 0 or coalesce(new.total_watch_ms, 0) <> 0
       or coalesce(new.ranking_score, 0) <> 0 or new.score_updated_at is not null
       or new.flagged or new.flag_reason is not null then
      perform public.raise_forbidden('metrics and moderation fields are system-managed');
    end if;
    if new.status not in ('draft', 'live', 'pending_payment') then
      perform public.raise_forbidden('invalid initial video status');
    end if;
    if new.status = 'live' and public.upload_fee_enabled() then new.status := 'pending_payment'; end if;
  else
    if new.user_id          is distinct from old.user_id
       or new.view_count       is distinct from old.view_count
       or new.like_count       is distinct from old.like_count
       or new.share_count      is distinct from old.share_count
       or new.total_watch_ms   is distinct from old.total_watch_ms
       or new.ranking_score    is distinct from old.ranking_score
       or new.score_updated_at is distinct from old.score_updated_at
       or new.flagged          is distinct from old.flagged
       or new.flag_reason      is distinct from old.flag_reason then
      perform public.raise_forbidden('metrics and moderation fields are system-managed');
    end if;
    if new.status is distinct from old.status
       and (old.status = 'rejected' or new.status not in ('draft', 'live', 'pending_payment')) then
      perform public.raise_forbidden('only admins can change a rejected video''s status');
    end if;
    -- Going live needs a paid upload while the fee is on (the payment function publishes it as service role).
    if new.status = 'live' and old.status is distinct from 'live' and public.upload_fee_enabled()
       and not exists (select 1 from public.payments p where p.video_id = new.id and p.status = 'paid') then
      new.status := 'pending_payment';
    end if;
  end if;
  return new;
end;
$function$;

-- Called by the payment function after bKash confirms the money: publish, then send invoice and certificate.
create or replace function public.complete_upload_payment(_payment_id uuid, _trx_id text, _payer text)
returns public.payments language plpgsql security definer set search_path = public as $$
declare p public.payments; v_title text; who text;
begin
  select * into p from public.payments where id = _payment_id for update;
  if not found then raise exception 'payment not found'; end if;
  if p.status = 'paid' then return p; end if;  -- idempotent: bKash may call back twice
  select title into v_title from public.videos where id = p.video_id;
  who := public.display_name(p.user_id);
  update public.payments set status = 'paid', paid_at = now(), transaction_id = _trx_id, payer_account = _payer,
    video_title = coalesce(v_title, video_title), payer_name = who,
    certificate_no = 'CKC-' || to_char(now(), 'YYYY') || '-' || substr(replace(id::text, '-', ''), 1, 8)
    where id = _payment_id returning * into p;
  update public.videos set status = 'live' where id = p.video_id and status in ('pending_payment', 'draft');
  insert into public.notifications (user_id, title, message, type, metadata) values
    (p.user_id, 'Payment received: invoice ' || p.invoice_no,
      'We received ৳' || trim(to_char(p.amount, 'FM999999990.00')) || ' by bKash (transaction ' || coalesce(_trx_id, '-') || '). Your highlight is now live.',
      'payment_receipt', jsonb_build_object('payment_id', p.id)),
    (p.user_id, 'Your certificate of participation',
      'Thank you for taking part in Cholo Kheli with "' || coalesce(v_title, 'your highlight') || '". Open to view or save your certificate.',
      'certificate', jsonb_build_object('payment_id', p.id));
  return p;
end $$;
revoke all on function public.complete_upload_payment(uuid, text, text) from public, anon, authenticated;
