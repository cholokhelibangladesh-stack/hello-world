-- Two-step scouting. Intermediate scouts ("reviewers", usually licensed grassroots coaches) watch every new
-- highlight once, rate it and either pass it or forward it. Professional scouts (federation and club scouts)
-- see only the forwarded highlights, ranked by rating, and shortlist or request players from there.

alter table public.scout_profiles
  add column if not exists scout_tier text not null default 'professional';
alter table public.scout_profiles drop constraint if exists scout_profiles_tier_check;
alter table public.scout_profiles add constraint scout_profiles_tier_check check (scout_tier in ('reviewer', 'professional'));

-- Scouts may apply as either tier, but only admins change the tier afterwards.
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
     or new.scout_tier          is distinct from old.scout_tier
     or new.is_banned           is distinct from old.is_banned
     or new.ban_reason          is distinct from old.ban_reason
     or new.ban_message         is distinct from old.ban_message
     or new.banned_until        is distinct from old.banned_until
     or new.banned_by           is distinct from old.banned_by
     or new.banned_at           is distinct from old.banned_at then
    perform public.raise_forbidden('verification, tier and ban fields are set by admins');
  end if;
  return new;
end;
$$;

-- True when the user is an approved, unbanned scout of the given tier.
create or replace function public.is_scout_tier(_uid uuid, _tier text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.scout_profiles sp
    where sp.user_id = _uid and sp.scout_tier = _tier and sp.verification_status = 'active'
      and not sp.is_banned and (sp.banned_until is null or sp.banned_until < now())
  )
$$;
revoke all on function public.is_scout_tier(uuid, text) from public, anon;
grant execute on function public.is_scout_tier(uuid, text) to authenticated;

create table if not exists public.video_reviews (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  decision text not null check (decision in ('forward', 'pass')),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  unique (video_id, reviewer_id)
);
create index if not exists idx_video_reviews_video on public.video_reviews (video_id);
create index if not exists idx_video_reviews_reviewer on public.video_reviews (reviewer_id, created_at desc);
create index if not exists idx_video_reviews_forward on public.video_reviews (created_at desc) where decision = 'forward';

alter table public.video_reviews enable row level security;
drop policy if exists "Reviewers see own reviews, pros and admins see all" on public.video_reviews;
create policy "Reviewers see own reviews, pros and admins see all" on public.video_reviews for select to authenticated
  using ((select auth.uid()) = reviewer_id
         or public.is_scout_tier((select auth.uid()), 'professional')
         or public.has_role((select auth.uid()), 'admin'));
drop policy if exists "Require second factor when enabled" on public.video_reviews;
create policy "Require second factor when enabled" on public.video_reviews as restrictive to authenticated
  using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()));
-- Reviews are written only through submit_video_review().
revoke insert, update, delete on public.video_reviews from anon, authenticated;
grant select on public.video_reviews to authenticated;

-- The reviewer's queue: live highlights nobody has reviewed yet, oldest first, so every player gets a turn.
create or replace function public.get_review_queue(_limit int default 10, _sport text default null)
returns table (video_id uuid, video_url text, title text, description text, position_tags text[],
               duration_seconds numeric, created_at timestamptz, player_id uuid, player_name text, sport text)
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if not (public.is_scout_tier(uid, 'reviewer') or public.has_role(uid, 'admin')) then
    perform public.raise_forbidden('only approved intermediate scouts can open the review queue');
  end if;
  return query
    select v.id, v.video_url, v.title, v.description, v.position_tags, v.duration_seconds, v.created_at,
           v.user_id, coalesce(nullif(p.full_name, ''), 'Player'), p.sport
    from public.videos v
    join public.profiles p on p.user_id = v.user_id
    where v.status = 'live' and not coalesce(v.flagged, false) and not coalesce(v.archived, false)
      and not coalesce(p.is_banned, false) and v.user_id <> uid
      and (_sport is null or _sport = '' or lower(p.sport) = lower(_sport))
      and not exists (select 1 from public.video_reviews r where r.video_id = v.id)
    order by v.created_at asc
    limit greatest(1, least(coalesce(_limit, 10), 50));
end $$;
revoke all on function public.get_review_queue(int, text) from public, anon;
grant execute on function public.get_review_queue(int, text) to authenticated;

-- Save a review. Forwarding a highlight for the first time tells the player it reached professional scouts.
create or replace function public.submit_video_review(_video_id uuid, _rating int, _decision text, _notes text default '')
returns public.video_reviews language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v public.videos; r public.video_reviews; first_forward boolean;
begin
  if not (public.is_scout_tier(uid, 'reviewer') or public.has_role(uid, 'admin')) then
    perform public.raise_forbidden('only approved intermediate scouts can review highlights');
  end if;
  if _decision not in ('forward', 'pass') then raise exception 'decision must be forward or pass'; end if;
  if _rating is null or _rating < 1 or _rating > 5 then raise exception 'rating must be 1 to 5'; end if;
  select * into v from public.videos where id = _video_id;
  if not found or v.status <> 'live' then raise exception 'this highlight is not live'; end if;
  if v.user_id = uid then perform public.raise_forbidden('you cannot review your own highlight'); end if;
  first_forward := _decision = 'forward'
    and not exists (select 1 from public.video_reviews x where x.video_id = _video_id and x.decision = 'forward');
  insert into public.video_reviews (video_id, reviewer_id, rating, decision, notes)
    values (_video_id, uid, _rating, _decision, left(coalesce(_notes, ''), 500))
    on conflict (video_id, reviewer_id) do update
      set rating = excluded.rating, decision = excluded.decision, notes = excluded.notes, created_at = now()
    returning * into r;
  if first_forward then
    insert into public.notifications (user_id, title, message, type, metadata) values
      (v.user_id, 'Your highlight reached professional scouts',
       'A Cholo Kheli scout reviewed "' || coalesce(nullif(v.title, ''), 'your highlight') ||
       '" and recommended it to professional scouts.', 'review_forwarded', jsonb_build_object('video_id', v.id));
  end if;
  return r;
end $$;
revoke all on function public.submit_video_review(uuid, int, text, text) from public, anon;
grant execute on function public.submit_video_review(uuid, int, text, text) to authenticated;

-- Professional scouts' list: forwarded highlights, best rated first.
create or replace function public.get_recommended_videos(_limit int default 20, _offset int default 0, _sport text default null)
returns table (video_id uuid, video_url text, title text, description text, position_tags text[],
               created_at timestamptz, player_id uuid, player_name text, sport text,
               avg_rating numeric, forward_count int, review_count int, latest_note text, last_forwarded_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if not (public.is_scout_tier(uid, 'professional') or public.has_role(uid, 'admin')) then
    perform public.raise_forbidden('only approved professional scouts can see recommended highlights');
  end if;
  return query
    with agg as (
      select r.video_id as vid, round(avg(r.rating)::numeric, 1) as avg_rating,
             count(*) filter (where r.decision = 'forward')::int as fwd, count(*)::int as n,
             max(r.created_at) filter (where r.decision = 'forward') as last_fwd,
             (array_agg(nullif(r.notes, '') order by r.created_at desc) filter (where r.decision = 'forward' and r.notes <> ''))[1] as note
      from public.video_reviews r group by r.video_id
    )
    select v.id, v.video_url, v.title, v.description, v.position_tags, v.created_at,
           v.user_id, coalesce(nullif(p.full_name, ''), 'Player'), p.sport,
           a.avg_rating, a.fwd, a.n, a.note, a.last_fwd
    from agg a
    join public.videos v on v.id = a.vid
    join public.profiles p on p.user_id = v.user_id
    where a.fwd > 0 and v.status = 'live' and not coalesce(v.flagged, false)
      and not coalesce(p.is_banned, false)
      and (_sport is null or _sport = '' or lower(p.sport) = lower(_sport))
    order by a.avg_rating desc, a.last_fwd desc
    limit greatest(1, least(coalesce(_limit, 20), 100)) offset greatest(0, coalesce(_offset, 0));
end $$;
revoke all on function public.get_recommended_videos(int, int, text) from public, anon;
grant execute on function public.get_recommended_videos(int, int, text) to authenticated;

-- Review counts for pay: a reviewer sees their own, an admin sees everyone's.
create or replace function public.get_reviewer_stats(_since timestamptz default date_trunc('month', now()))
returns table (reviewer_id uuid, reviewer_name text, reviews int, forwarded int, today int)
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_admin boolean := public.has_role(uid, 'admin');
begin
  if not (is_admin or public.is_scout_tier(uid, 'reviewer')) then
    perform public.raise_forbidden('not allowed');
  end if;
  return query
    select r.reviewer_id, coalesce(nullif(sp.full_name, ''), 'Scout'),
           count(*)::int, count(*) filter (where r.decision = 'forward')::int,
           count(*) filter (where r.created_at >= date_trunc('day', now()))::int
    from public.video_reviews r
    left join public.scout_profiles sp on sp.user_id = r.reviewer_id
    where r.created_at >= coalesce(_since, '-infinity'::timestamptz) and (is_admin or r.reviewer_id = uid)
    group by r.reviewer_id, sp.full_name
    order by count(*) desc;
end $$;
revoke all on function public.get_reviewer_stats(timestamptz) from public, anon;
grant execute on function public.get_reviewer_stats(timestamptz) to authenticated;

-- Pay per review, shown to admins next to the counts.
insert into public.app_settings (key, value) values ('review_pay_bdt', '15'::jsonb) on conflict (key) do nothing;
