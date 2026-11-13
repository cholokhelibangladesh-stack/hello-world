-- Lets the send-notification function confirm a call really came from this database,
-- without anyone copying the shared secret into the function's settings by hand.
create or replace function public.verify_notify_secret(_secret text)
returns boolean language sql stable security definer set search_path = public, private as $$
  select exists (select 1 from private.app_config where key = 'notify_secret' and value = _secret)
$$;
revoke all on function public.verify_notify_secret(text) from public, anon, authenticated;
grant execute on function public.verify_notify_secret(text) to service_role;
