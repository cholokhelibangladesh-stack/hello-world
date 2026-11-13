-- Keep pg_net out of the public schema (Supabase security advisor). Its functions live in "net" either way.
do $$ begin
  if exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pg_net' and n.nspname = 'public') then
    drop extension pg_net;
  end if;
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'pg_net not available (%)', sqlerrm;
end $$;
