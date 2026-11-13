-- Account deletion (required by Google Play for apps with account creation).
-- Deleting the auth user cascades to almost everything; this removes the rows
-- that don't cascade. Only the delete-account edge function (service_role) may call it.
create or replace function public.prepare_account_deletion(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.has_role(_user_id, 'admin') then
    raise exception 'admin accounts cannot be deleted this way' using errcode = '42501';
  end if;
  delete from public.username_audit   where user_id = _user_id;
  delete from public.feed_rate_limit  where user_id = _user_id;
  delete from public.moderation_alerts where target_user_id = _user_id;
end;
$$;
revoke execute on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
