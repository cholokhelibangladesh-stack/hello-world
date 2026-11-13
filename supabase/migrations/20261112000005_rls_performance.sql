-- Performance advisor fixes.
-- 1. Wrap auth.uid() in a sub-select inside every RLS policy so Postgres evaluates it once
--    per query instead of once per row (lint 0003 auth_rls_initplan). Logic is unchanged.
do $$
declare
  p record;
  q text;
  c text;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where schemaname in ('public', 'storage')
       and (qual ~ 'auth\.uid\(\)' or with_check ~ 'auth\.uid\(\)'
            or qual ~ 'auth\.role\(\)' or with_check ~ 'auth\.role\(\)')
  loop
    q := p.qual;
    c := p.with_check;
    -- undo any existing wrapping first so we never double-wrap, then wrap every call
    q := regexp_replace(regexp_replace(q, '\(\s*SELECT\s+auth\.(uid|role)\(\)\s+AS\s+\w+\s*\)', 'auth.\1()', 'gi'), 'auth\.(uid|role)\(\)', '(select auth.\1())', 'g');
    c := regexp_replace(regexp_replace(c, '\(\s*SELECT\s+auth\.(uid|role)\(\)\s+AS\s+\w+\s*\)', 'auth.\1()', 'gi'), 'auth\.(uid|role)\(\)', '(select auth.\1())', 'g');
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if q is not null then stmt := stmt || format(' using (%s)', q); end if;
    if c is not null then stmt := stmt || format(' with check (%s)', c); end if;
    execute stmt;
  end loop;
end $$;

-- 2. Cover the foreign keys the app actually filters or joins on (lint 0001).
create index if not exists idx_blocked_users_blocked on public.blocked_users (blocked_id);
create index if not exists idx_close_friends_friend on public.close_friends (friend_id);
create index if not exists idx_favorites_favorite on public.favorites (favorite_id);
create index if not exists idx_muted_users_muted on public.muted_users (muted_id);
create index if not exists idx_restricted_users_restricted on public.restricted_users (restricted_id);
create index if not exists idx_documents_user on public.documents (user_id);
create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists idx_payments_user on public.payments (user_id);
create index if not exists idx_profile_shares_player on public.profile_shares (player_id);
create index if not exists idx_saved_videos_video on public.saved_videos (video_id);
create index if not exists idx_scout_requests_player on public.scout_requests (player_id);
