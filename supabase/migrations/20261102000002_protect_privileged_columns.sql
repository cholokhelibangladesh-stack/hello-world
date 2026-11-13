-- Fix 2: ordinary users could edit moderation / verification / metric columns on
-- their own rows (self-unban, scout self-verification, fake like counts,
-- re-publishing rejected videos, self-approved scout requests).
-- RLS decides *which rows* a user can write; these triggers decide *which columns*.

-- True for admins, for service_role (edge functions), and for database owners.
-- Deliberately NOT security definer: current_user must be the real caller.
-- (Inside SECURITY DEFINER functions such as admin_set_ban or the like-count
-- triggers, current_user is the owner, so those keep working.)
create or replace function public.can_moderate()
returns boolean
language sql
stable
set search_path = public
as $$
  select current_user in ('postgres', 'supabase_admin', 'service_role')
      or coalesce(public.has_role(auth.uid(), 'admin'), false)
$$;

create or replace function public.raise_forbidden(_what text)
returns void language plpgsql as $$
begin
  raise exception 'permission denied: %', _what using errcode = '42501';
end;
$$;

-- profiles: ban fields ---------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.can_moderate() then return new; end if;
  if tg_op = 'INSERT' then
    if new.is_banned or new.ban_reason is not null or new.banned_until is not null
       or new.banned_by is not null or new.banned_at is not null or new.ban_message is not null then
      perform public.raise_forbidden('ban fields are set by admins');
    end if;
  elsif new.user_id      is distinct from old.user_id
     or new.is_banned    is distinct from old.is_banned
     or new.ban_reason   is distinct from old.ban_reason
     or new.ban_message  is distinct from old.ban_message
     or new.banned_until is distinct from old.banned_until
     or new.banned_by    is distinct from old.banned_by
     or new.banned_at    is distinct from old.banned_at then
    perform public.raise_forbidden('ban fields are set by admins');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_profile_columns on public.profiles;
create trigger trg_protect_profile_columns before insert or update on public.profiles
  for each row execute function public.protect_profile_columns();

-- scout_profiles: verification + ban fields ------------------------------------
create or replace function public.protect_scout_profile_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.can_moderate() then return new; end if;
  if tg_op = 'INSERT' then
    if new.verification_status <> 'pending' or new.is_banned or new.ban_reason is not null
       or new.banned_until is not null or new.banned_by is not null or new.banned_at is not null then
      perform public.raise_forbidden('scouts start as pending and cannot set ban fields');
    end if;
  elsif new.user_id             is distinct from old.user_id
     or new.verification_status is distinct from old.verification_status
     or new.is_banned           is distinct from old.is_banned
     or new.ban_reason          is distinct from old.ban_reason
     or new.ban_message         is distinct from old.ban_message
     or new.banned_until        is distinct from old.banned_until
     or new.banned_by           is distinct from old.banned_by
     or new.banned_at           is distinct from old.banned_at then
    perform public.raise_forbidden('verification and ban fields are set by admins');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_scout_profile_columns on public.scout_profiles;
create trigger trg_protect_scout_profile_columns before insert or update on public.scout_profiles
  for each row execute function public.protect_scout_profile_columns();

-- videos: metrics, moderation flags, status ------------------------------------
create or replace function public.protect_video_columns()
returns trigger language plpgsql set search_path = public as $$
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
       and (old.status = 'rejected' or new.status not in ('draft', 'live')) then
      perform public.raise_forbidden('only admins can change a rejected video''s status');
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_video_columns on public.videos;
create trigger trg_protect_video_columns before insert or update on public.videos
  for each row execute function public.protect_video_columns();

-- scout_requests: scouts can only create/retry pending requests -----------------
create or replace function public.protect_scout_request_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.can_moderate() then return new; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.admin_response is not null then
      perform public.raise_forbidden('new scout requests must be pending');
    end if;
  elsif new.scout_id is distinct from old.scout_id
     or new.player_id is distinct from old.player_id
     or new.admin_response is distinct from old.admin_response
     or (new.status is distinct from old.status and new.status <> 'pending') then
    perform public.raise_forbidden('only admins can decide scout requests');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_scout_request_columns on public.scout_requests;
create trigger trg_protect_scout_request_columns before insert or update on public.scout_requests
  for each row execute function public.protect_scout_request_columns();
