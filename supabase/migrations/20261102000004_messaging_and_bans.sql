-- Fix 4a: bans were only enforced by the frontend (BanGuard). A banned user could
-- keep uploading, liking and messaging through the API.
-- Fix 4b: any signed-in user (including unverified scouts) could DM any player,
-- including minors, and either party could edit or un-flag messages.

create or replace function public.is_banned(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles
                  where user_id = _user_id and is_banned
                    and (banned_until is null or banned_until > now()))
      or exists (select 1 from public.scout_profiles
                  where user_id = _user_id and is_banned
                    and (banned_until is null or banned_until > now()))
$$;
revoke execute on function public.is_banned(uuid) from public, anon;
grant execute on function public.is_banned(uuid) to authenticated;

-- RESTRICTIVE policies are AND-ed with the permissive ones, so no other policy can
-- let a banned user through.
create policy "Banned users cannot upload" on public.videos
  as restrictive for insert to authenticated with check (not public.is_banned(auth.uid()));
create policy "Banned users cannot edit videos" on public.videos
  as restrictive for update to authenticated using (not public.is_banned(auth.uid()));
create policy "Banned users cannot like" on public.video_likes
  as restrictive for insert to authenticated with check (not public.is_banned(auth.uid()));
create policy "Banned users cannot share" on public.video_shares
  as restrictive for insert to authenticated with check (not public.is_banned(auth.uid()));
create policy "Banned users cannot message" on public.messages
  as restrictive for insert to authenticated with check (not public.is_banned(auth.uid()));
create policy "Banned users cannot send scout requests" on public.scout_requests
  as restrictive for insert to authenticated with check (not public.is_banned(auth.uid()));
create policy "Banned users cannot add achievements" on public.achievements
  as restrictive for insert to authenticated with check (not public.is_banned(auth.uid()));
create policy "Banned users cannot upload files" on storage.objects
  as restrictive for insert to authenticated with check (not public.is_banned(auth.uid()));

-- Messaging: every conversation must include an admin (safe-scouting model; the
-- only chat UI today is the admin dashboard). Scout <-> player contact happens
-- through admin-approved scout requests.
drop policy if exists "Send messages" on public.messages;
create policy "Send messages to or from admins" on public.messages
  for insert to authenticated
  with check (
    auth.uid() = sender_id
    and (public.has_role(auth.uid(), 'admin') or public.has_role(receiver_id, 'admin'))
  );

-- Participants can no longer edit, un-flag or "unsend" messages; admins keep
-- their own update policy for flagging.
drop policy if exists "Update own messages" on public.messages;

-- Scout requests: only verified (active) scouts can create or retry them.
drop policy if exists "Scout creates requests" on public.scout_requests;
create policy "Verified scouts create requests" on public.scout_requests
  for insert to authenticated
  with check (
    auth.uid() = scout_id
    and exists (select 1 from public.scout_profiles sp
                 where sp.user_id = auth.uid() and sp.verification_status = 'active')
  );
drop policy if exists "Scout retries own rejected" on public.scout_requests;
create policy "Verified scout retries own rejected" on public.scout_requests
  for update to authenticated
  using (auth.uid() = scout_id and status = 'rejected')
  with check (
    auth.uid() = scout_id and status = 'pending'
    and exists (select 1 from public.scout_profiles sp
                 where sp.user_id = auth.uid() and sp.verification_status = 'active')
  );
