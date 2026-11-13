-- Fix 1 (defence in depth): only a database owner (migrations / SQL editor) can
-- grant the admin role. The signup edge function runs as service_role, so even a
-- bug in that function can no longer mint admins.
create or replace function public.guard_admin_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role = 'admin'
     and (tg_op = 'INSERT' or old.role is distinct from 'admin')
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'the admin role can only be granted by a database owner'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_admin_role on public.user_roles;
create trigger trg_guard_admin_role
  before insert or update on public.user_roles
  for each row execute function public.guard_admin_role();
