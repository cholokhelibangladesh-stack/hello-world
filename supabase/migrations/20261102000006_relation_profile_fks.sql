-- UI fix: the blocked / muted / restricted / favorites / close-friends settings
-- lists embed each person's profile (`profiles:blocked_id(...)`). Those columns
-- only referenced auth.users, so PostgREST had no relationship to follow and
-- every list request failed with HTTP 400 (PGRST200). The blocked page then
-- showed "You haven't blocked anyone" and users could not unblock anybody.
do $$
declare r record;
begin
  for r in select * from (values
      ('blocked_users',    'blocked_id'),
      ('muted_users',      'muted_id'),
      ('restricted_users', 'restricted_id'),
      ('favorites',        'favorite_id'),
      ('close_friends',    'friend_id')) as t(tbl, col)
  loop
    -- rows pointing at users without a profile can't be shown anyway
    execute format('delete from public.%I x where not exists (select 1 from public.profiles p where p.user_id = x.%I)', r.tbl, r.col);
    if not exists (select 1 from pg_constraint where conname = r.tbl || '_' || r.col || '_profile_fkey') then
      execute format('alter table public.%I add constraint %I foreign key (%I) references public.profiles (user_id) on delete cascade',
                     r.tbl, r.tbl || '_' || r.col || '_profile_fkey', r.col);
    end if;
  end loop;
end $$;

-- UI fix: Content preferences reads and writes profiles.position_tags, which
-- didn't exist, so the whole preferences query failed and positions were never saved.
alter table public.profiles add column if not exists position_tags text[] not null default '{}';
