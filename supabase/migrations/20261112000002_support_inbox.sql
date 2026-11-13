-- Support inbox for players and scouts. Messages already route only to/from admins
-- (20261102000004), but non-admins had no way to learn an admin's id, so the app could not
-- show admin replies or let users write to the team. This returns one support contact
-- (the longest-serving admin) without exposing the admin list.
create or replace function public.get_support_contact()
returns table (user_id uuid, display_name text)
language sql stable security definer set search_path = public as $$
  select ur.user_id, 'Cholo Kheli Team'::text
    from public.user_roles ur
   where ur.role = 'admin'
   order by ur.created_at asc
   limit 1
$$;
revoke all on function public.get_support_contact() from public, anon;
grant execute on function public.get_support_contact() to authenticated, service_role;

-- Messages a user can see are those they sent or received (existing policy); add an index for
-- the per-user thread query.
create index if not exists idx_messages_sender_created on public.messages (sender_id, created_at desc);
create index if not exists idx_messages_receiver_created on public.messages (receiver_id, created_at desc);
