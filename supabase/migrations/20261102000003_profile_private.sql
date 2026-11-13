-- Fix 3: phone, date of birth and guardian contact were on public.profiles, which
-- every signed-in user (including unverified scouts) can read. Many players are
-- minors. Move these into an owner/admin-only table.
-- Also adds fields to record parental consent, which the signup form collects
-- but previously never stored.

create table if not exists public.profile_private (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  phone               text,
  date_of_birth       date,
  guardian_contact    text,
  guardian_name       text,
  guardian_email      text,
  parental_consent_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

revoke all on public.profile_private from anon;
grant select, insert, update on public.profile_private to authenticated;
grant all on public.profile_private to service_role;
alter table public.profile_private enable row level security;

create policy "Owner reads own private profile" on public.profile_private
  for select to authenticated using (auth.uid() = user_id);
create policy "Owner inserts own private profile" on public.profile_private
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Owner updates own private profile" on public.profile_private
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins read private profiles" on public.profile_private
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update private profiles" on public.profile_private
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger trg_profile_private_touch before update on public.profile_private
  for each row execute function public.tg_touch_updated_at();

-- Copy existing data across, then drop the exposed columns.
insert into public.profile_private (user_id, phone, date_of_birth, guardian_contact)
select user_id, phone, date_of_birth, guardian_contact
  from public.profiles
 where phone is not null or date_of_birth is not null or guardian_contact is not null
on conflict (user_id) do nothing;

alter table public.profiles
  drop column if exists phone,
  drop column if exists date_of_birth,
  drop column if exists guardian_contact;

-- Scouts and the public resume page may show a player's age, never the birth date.
create or replace function public.get_player_age(_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select extract(year from age(current_date, date_of_birth))::int
    from public.profile_private
   where user_id = _user_id
$$;
revoke execute on function public.get_player_age(uuid) from public, anon;
grant execute on function public.get_player_age(uuid) to authenticated;
