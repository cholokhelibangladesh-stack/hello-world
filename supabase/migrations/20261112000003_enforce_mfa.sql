-- Two-step verification must protect data, not just screens. Until now the app asked for the
-- authenticator code in the UI only, so a password-only session (aal1) could still read and write
-- everything through the API. These RESTRICTIVE policies are ANDed with every existing policy:
-- once a user has a verified authenticator, their requests need an aal2 session.

create or replace function public.mfa_satisfied()
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  has_factor boolean := false;
begin
  if uid is null or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' then
    return true;
  end if;
  -- auth.mfa_factors is managed by Supabase Auth (absent in minimal test shims).
  if to_regclass('auth.mfa_factors') is null then
    return true;
  end if;
  execute 'select exists (select 1 from auth.mfa_factors where user_id = $1 and status = ''verified'')'
    into has_factor using uid;
  return not has_factor;
end $$;
revoke all on function public.mfa_satisfied() from public;
grant execute on function public.mfa_satisfied() to anon, authenticated, service_role;

do $$
declare t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity loop
    execute format('drop policy if exists "Require second factor when enabled" on public.%I', t.relname);
    execute format('create policy "Require second factor when enabled" on public.%I as restrictive for all to authenticated using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()))', t.relname);
  end loop;
end $$;

drop policy if exists "Require second factor when enabled" on storage.objects;
create policy "Require second factor when enabled" on storage.objects as restrictive for all to authenticated
  using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()));
