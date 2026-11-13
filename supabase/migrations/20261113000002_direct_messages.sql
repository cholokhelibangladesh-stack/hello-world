-- Direct messages between a verified scout and a player.
--
-- A conversation exists only after an admin approves the scout's request for that player
-- (or opens one by hand). Both people can write while it is open; admins can read every
-- conversation and close it. Replies, one emoji reaction per person per message, up to
-- three pinned messages, and unsend are all enforced here, not in the app.

create table if not exists public.conversations (
  id            uuid primary key default gen_random_uuid(),
  scout_id      uuid not null references public.profiles (user_id) on delete cascade,
  player_id     uuid not null references public.profiles (user_id) on delete cascade,
  request_id    uuid references public.scout_requests (id) on delete set null,
  status        text not null default 'open' check (status in ('open', 'closed')),
  opened_by     uuid references auth.users (id) on delete set null,
  closed_by     uuid references auth.users (id) on delete set null,
  closed_reason text constraint conversations_reason_len check (char_length(coalesce(closed_reason, '')) <= 500),
  created_at    timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_pair unique (scout_id, player_id),
  constraint conversations_not_self check (scout_id <> player_id)
);
create index if not exists idx_conversations_player on public.conversations (player_id, last_message_at desc);
create index if not exists idx_conversations_scout on public.conversations (scout_id, last_message_at desc);

create table if not exists public.direct_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (user_id) on delete cascade,
  body            text not null constraint direct_messages_body_len check (char_length(body) <= 2000),
  reply_to_id     uuid references public.direct_messages (id) on delete set null,
  pinned_at       timestamptz,
  pinned_by       uuid references auth.users (id) on delete set null,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_direct_messages_conversation on public.direct_messages (conversation_id, created_at desc);
create index if not exists idx_direct_messages_sender on public.direct_messages (sender_id, created_at desc);
create index if not exists idx_direct_messages_reply on public.direct_messages (reply_to_id) where reply_to_id is not null;

create table if not exists public.message_reactions (
  message_id uuid not null references public.direct_messages (id) on delete cascade,
  user_id    uuid not null references public.profiles (user_id) on delete cascade,
  emoji      text not null check (emoji in ('❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '⚽')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index if not exists idx_message_reactions_user on public.message_reactions (user_id);

create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists idx_conversation_reads_user on public.conversation_reads (user_id);

revoke all on public.conversations, public.direct_messages, public.message_reactions, public.conversation_reads from anon;
grant select on public.conversations to authenticated;
grant select, insert on public.direct_messages to authenticated;
grant select, insert, update, delete on public.message_reactions to authenticated;
grant select, insert, update on public.conversation_reads to authenticated;
grant all on public.conversations, public.direct_messages, public.message_reactions, public.conversation_reads to service_role;
alter table public.conversations enable row level security;
alter table public.direct_messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.conversation_reads enable row level security;

-- Is the caller one of the two people in this conversation?
create or replace function public.in_conversation(_conversation_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversations c
                  where c.id = _conversation_id and _user_id in (c.scout_id, c.player_id))
$$;
-- Can the caller write in it right now? Open, both accounts in good standing, nobody blocked.
create or replace function public.can_send_dm(_conversation_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
     where c.id = _conversation_id and c.status = 'open'
       and _user_id in (c.scout_id, c.player_id)
       and public.is_active_scout(c.scout_id)
       and not public.is_banned(c.scout_id) and not public.is_banned(c.player_id)
       and not public.is_blocked_between(c.scout_id, c.player_id))
$$;
revoke all on function public.in_conversation(uuid, uuid), public.can_send_dm(uuid, uuid) from public, anon;
grant execute on function public.in_conversation(uuid, uuid), public.can_send_dm(uuid, uuid) to authenticated, service_role;

create policy "Participants and admins see conversations" on public.conversations
  for select to authenticated
  using ((select auth.uid()) in (scout_id, player_id) or public.has_role((select auth.uid()), 'admin'));

create policy "Participants and admins read messages" on public.direct_messages
  for select to authenticated
  using (public.in_conversation(conversation_id, (select auth.uid())) or public.has_role((select auth.uid()), 'admin'));
create policy "Participants send in open conversations" on public.direct_messages
  for insert to authenticated
  with check (sender_id = (select auth.uid())
              and public.can_send_dm(conversation_id, (select auth.uid()))
              and pinned_at is null and deleted_at is null
              and char_length(btrim(body)) >= 1);

create policy "Participants and admins see reactions" on public.message_reactions
  for select to authenticated
  using (exists (select 1 from public.direct_messages m
                  where m.id = message_id
                    and (public.in_conversation(m.conversation_id, (select auth.uid())) or public.has_role((select auth.uid()), 'admin'))));
create policy "Participants react as themselves" on public.message_reactions
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.direct_messages m
                           where m.id = message_id and m.deleted_at is null
                             and public.can_send_dm(m.conversation_id, (select auth.uid()))));
create policy "Change own reaction" on public.message_reactions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Remove own reaction" on public.message_reactions
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Own read markers" on public.conversation_reads
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Mark own conversations read" on public.conversation_reads
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.in_conversation(conversation_id, (select auth.uid())));
create policy "Update own read markers" on public.conversation_reads
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Trim, rate-limit, bump the conversation, notify the other person.
create or replace function public.tg_dm_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.body := btrim(new.body);
  new.created_at := now();
  -- a reply must point at a message in the same conversation
  if new.reply_to_id is not null and not exists (
       select 1 from public.direct_messages r where r.id = new.reply_to_id and r.conversation_id = new.conversation_id) then
    raise exception 'reply target is not in this conversation' using errcode = '42501';
  end if;
  if (select count(*) from public.direct_messages
       where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'too many messages, slow down' using errcode = '54000';
  end if;
  return new;
end $$;
drop trigger if exists trg_dm_before_insert on public.direct_messages;
create trigger trg_dm_before_insert before insert on public.direct_messages
  for each row execute function public.tg_dm_before_insert();

create or replace function public.tg_dm_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.conversations%rowtype; other uuid;
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id returning * into c;
  other := case when new.sender_id = c.scout_id then c.player_id else c.scout_id end;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (new.conversation_id, new.sender_id, new.created_at)
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
  -- one unread notification per conversation at a time, so a burst of messages is one alert
  if not exists (select 1 from public.notifications n
                  where n.user_id = other and n.type = 'dm' and not n.read
                    and n.metadata ->> 'conversation_id' = new.conversation_id::text) then
    perform public.notify_user(other, public.display_name(new.sender_id) || ' sent you a message', left(new.body, 140), 'dm',
      jsonb_build_object('conversation_id', new.conversation_id, 'actor_id', new.sender_id), 'messages');
  end if;
  return null;
end $$;
drop trigger if exists trg_dm_after_insert on public.direct_messages;
create trigger trg_dm_after_insert after insert on public.direct_messages
  for each row execute function public.tg_dm_after_insert();
revoke execute on function public.tg_dm_before_insert(), public.tg_dm_after_insert() from public, anon, authenticated;

-- Pin or unpin. Either participant can pin; at most three pinned messages per conversation.
create or replace function public.dm_toggle_pin(_message_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare m public.direct_messages%rowtype; uid uuid := auth.uid();
begin
  select * into m from public.direct_messages where id = _message_id;
  if m.id is null or not public.can_send_dm(m.conversation_id, uid) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if m.deleted_at is not null then raise exception 'message was removed' using errcode = '22023'; end if;
  if m.pinned_at is not null then
    update public.direct_messages set pinned_at = null, pinned_by = null where id = _message_id;
    return false;
  end if;
  if (select count(*) from public.direct_messages where conversation_id = m.conversation_id and pinned_at is not null) >= 3 then
    raise exception 'you can pin up to 3 messages' using errcode = '54000';
  end if;
  update public.direct_messages set pinned_at = now(), pinned_by = uid where id = _message_id;
  return true;
end $$;

-- Unsend your own message. The row stays (so replies and the admin record keep their place)
-- but the text is kept only for admins in the audit table below.
create table if not exists public.direct_message_removals (
  message_id uuid primary key references public.direct_messages (id) on delete cascade,
  body       text not null,
  removed_by uuid references auth.users (id) on delete set null,
  removed_at timestamptz not null default now()
);
revoke all on public.direct_message_removals from anon;
grant select on public.direct_message_removals to authenticated;
grant all on public.direct_message_removals to service_role;
alter table public.direct_message_removals enable row level security;
create policy "Admins read removed messages" on public.direct_message_removals
  for select to authenticated using (public.has_role((select auth.uid()), 'admin'));

create or replace function public.dm_delete_message(_message_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m public.direct_messages%rowtype; uid uuid := auth.uid();
begin
  select * into m from public.direct_messages where id = _message_id;
  if m.id is null or (m.sender_id <> uid and not public.has_role(uid, 'admin')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if m.deleted_at is not null then return; end if;
  insert into public.direct_message_removals (message_id, body, removed_by) values (m.id, m.body, uid)
  on conflict (message_id) do nothing;
  update public.direct_messages set body = '', deleted_at = now(), pinned_at = null, pinned_by = null where id = _message_id;
  delete from public.message_reactions where message_id = _message_id;
end $$;

create or replace function public.dm_mark_read(_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if not public.in_conversation(_conversation_id, uid) then return; end if;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at) values (_conversation_id, uid, now())
  on conflict (conversation_id, user_id) do update set last_read_at = now();
  update public.notifications set read = true
   where user_id = uid and type = 'dm' and not read and metadata ->> 'conversation_id' = _conversation_id::text;
end $$;

-- Inbox: the other person, the last message and how many are unread. Admins get every conversation.
create or replace function public.get_conversations()
returns table (
  id uuid, status text, scout_id uuid, player_id uuid, other_id uuid, other_name text, other_username text,
  other_avatar text, other_is_scout boolean, scout_name text, player_name text,
  last_body text, last_sender uuid, last_at timestamptz, unread integer, closed_reason text)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as uid, public.has_role(auth.uid(), 'admin') as is_admin)
  select c.id, c.status, c.scout_id, c.player_id,
         o.user_id, o.full_name, o.username, o.avatar_url, (o.user_id = c.scout_id),
         sp.full_name, pp.full_name,
         case when lm.deleted_at is not null then null else lm.body end, lm.sender_id, c.last_message_at,
         case when me.is_admin and me.uid not in (c.scout_id, c.player_id) then 0 else
           (select count(*)::int from public.direct_messages m
             where m.conversation_id = c.id and m.sender_id <> me.uid
               and m.created_at > coalesce((select r.last_read_at from public.conversation_reads r
                                             where r.conversation_id = c.id and r.user_id = me.uid), '-infinity')) end,
         c.closed_reason
    from public.conversations c
    cross join me
    join public.profiles sp on sp.user_id = c.scout_id
    join public.profiles pp on pp.user_id = c.player_id
    join public.profiles o on o.user_id = case when me.uid = c.scout_id then c.player_id else c.scout_id end
    left join lateral (select m.body, m.sender_id, m.deleted_at from public.direct_messages m
                        where m.conversation_id = c.id order by m.created_at desc limit 1) lm on true
   where me.uid in (c.scout_id, c.player_id) or me.is_admin
   order by c.last_message_at desc
   limit 500
$$;

-- Admin controls.
create or replace function public.admin_open_conversation(_scout uuid, _player uuid, _request uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := public.require_admin(); cid uuid; was_new boolean;
begin
  if not public.is_active_scout(_scout) then raise exception 'the scout is not verified' using errcode = '22023'; end if;
  if not public.has_role(_player, 'player') then raise exception 'that account is not a player' using errcode = '22023'; end if;
  select id into cid from public.conversations where scout_id = _scout and player_id = _player;
  was_new := cid is null;
  if was_new then
    insert into public.conversations (scout_id, player_id, request_id, opened_by)
    values (_scout, _player, _request, me) returning id into cid;
  else
    update public.conversations set status = 'open', closed_by = null, closed_reason = null,
           request_id = coalesce(_request, request_id) where id = cid;
  end if;
  perform public.notify_user(_player, 'A verified scout can now message you',
    public.display_name(_scout) || ' was approved to contact you. The Cholo Kheli team can see this conversation.',
    'dm', jsonb_build_object('conversation_id', cid, 'actor_id', _scout), 'system');
  perform public.notify_user(_scout, 'You can now message ' || public.display_name(_player),
    'Your request was approved. Keep it professional: the Cholo Kheli team can see this conversation.',
    'dm', jsonb_build_object('conversation_id', cid, 'actor_id', _player), 'system');
  perform public.log_admin_action('open_conversation', _player, null, null, jsonb_build_object('scout_id', _scout, 'conversation_id', cid));
  return cid;
end $$;

create or replace function public.admin_set_conversation_status(_conversation_id uuid, _open boolean, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.require_admin(); c public.conversations%rowtype; why text := nullif(btrim(coalesce(_reason, '')), '');
begin
  if not _open and why is null then raise exception 'a reason is required' using errcode = '22023'; end if;
  update public.conversations
     set status = case when _open then 'open' else 'closed' end,
         closed_by = case when _open then null else me end,
         closed_reason = case when _open then null else left(why, 500) end
   where id = _conversation_id returning * into c;
  if c.id is null then raise exception 'conversation not found' using errcode = 'P0002'; end if;
  perform public.notify_user(u, case when _open then 'A conversation was reopened' else 'A conversation was closed' end,
            case when _open then 'You can message each other again.' else 'Closed by the Cholo Kheli team. Reason: ' || why end,
            'dm', jsonb_build_object('conversation_id', c.id), 'system')
     from unnest(array[c.scout_id, c.player_id]) u;
  perform public.log_admin_action(case when _open then 'reopen_conversation' else 'close_conversation' end,
            c.player_id, null, why, jsonb_build_object('scout_id', c.scout_id, 'conversation_id', c.id));
end $$;

-- Approving a scout's request opens the conversation; nothing else does.
create or replace function public.tg_request_opens_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved'
     and public.has_role(auth.uid(), 'admin') and public.is_active_scout(new.scout_id) then
    perform public.admin_open_conversation(new.scout_id, new.player_id, new.id);
  end if;
  return null;
end $$;
drop trigger if exists trg_request_opens_conversation on public.scout_requests;
create trigger trg_request_opens_conversation after update of status on public.scout_requests
  for each row execute function public.tg_request_opens_conversation();
revoke execute on function public.tg_request_opens_conversation() from public, anon, authenticated;

revoke all on function public.dm_toggle_pin(uuid), public.dm_delete_message(uuid), public.dm_mark_read(uuid),
  public.get_conversations(), public.admin_open_conversation(uuid, uuid, uuid),
  public.admin_set_conversation_status(uuid, boolean, text) from public, anon;
grant execute on function public.dm_toggle_pin(uuid), public.dm_delete_message(uuid), public.dm_mark_read(uuid),
  public.get_conversations(), public.admin_open_conversation(uuid, uuid, uuid),
  public.admin_set_conversation_status(uuid, boolean, text) to authenticated;

-- Report a message: goes to the admin report queue with the conversation attached.
alter table public.user_reports add column if not exists conversation_id uuid references public.conversations (id) on delete set null;
create or replace function public.report_message(_message_id uuid, _reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare m public.direct_messages%rowtype; rid uuid;
begin
  select * into m from public.direct_messages where id = _message_id;
  if m.id is null or not public.in_conversation(m.conversation_id, auth.uid()) or m.sender_id = auth.uid() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  rid := public.report_user(m.sender_id, 'Message: "' || left(m.body, 300) || '". ' || coalesce(_reason, ''));
  update public.user_reports set conversation_id = m.conversation_id where id = rid;
  return rid;
end $$;
revoke all on function public.report_message(uuid, text) from public, anon;
grant execute on function public.report_message(uuid, text) to authenticated;

-- Same second-factor guard as every other table, and realtime for live threads.
do $$
declare t text;
begin
  foreach t in array array['conversations', 'direct_messages', 'message_reactions', 'conversation_reads', 'direct_message_removals'] loop
    execute format('create policy "Require second factor when enabled" on public.%I as restrictive for all to authenticated using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()))', t);
  end loop;
  foreach t in array array['direct_messages', 'message_reactions', 'conversations'] loop
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
alter table public.direct_messages replica identity full;
alter table public.message_reactions replica identity full;

-- Deleting an account must not be blocked by the audit rows.
create or replace function public.prepare_account_deletion(_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.has_role(_user_id, 'admin') then
    raise exception 'admin accounts cannot be deleted this way' using errcode = '42501';
  end if;
  delete from public.username_audit   where user_id = _user_id;
  delete from public.feed_rate_limit  where user_id = _user_id;
  delete from public.moderation_alerts where target_user_id = _user_id;
  delete from public.push_tokens where user_id = _user_id;
end $$;
revoke execute on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
