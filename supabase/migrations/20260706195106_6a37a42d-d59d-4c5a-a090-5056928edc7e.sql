
-- ============================================================
-- 1. Ban/suspend with duration + admin message
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS ban_message text,
  ADD COLUMN IF NOT EXISTS banned_until timestamptz,
  ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz;

ALTER TABLE public.scout_profiles
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS ban_message text,
  ADD COLUMN IF NOT EXISTS banned_until timestamptz,
  ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- Signed-in user reads their own ban state (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.get_my_ban_status()
RETURNS TABLE(
  is_banned boolean,
  ban_reason text,
  ban_message text,
  banned_until timestamptz,
  banned_at timestamptz,
  scope text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  -- Auto-expire: treat as unbanned if banned_until has passed
  RETURN QUERY
  SELECT
    (COALESCE(p.is_banned, false) AND (p.banned_until IS NULL OR p.banned_until > now())) AS is_banned,
    p.ban_reason,
    p.ban_message,
    p.banned_until,
    p.banned_at,
    'profile'::text AS scope
  FROM public.profiles p
  WHERE p.user_id = uid
    AND COALESCE(p.is_banned, false) = true
    AND (p.banned_until IS NULL OR p.banned_until > now())
  UNION ALL
  SELECT
    (COALESCE(sp.is_banned, false) AND (sp.banned_until IS NULL OR sp.banned_until > now())),
    sp.ban_reason,
    sp.ban_message,
    sp.banned_until,
    sp.banned_at,
    'scout'::text
  FROM public.scout_profiles sp
  WHERE sp.user_id = uid
    AND COALESCE(sp.is_banned, false) = true
    AND (sp.banned_until IS NULL OR sp.banned_until > now())
  LIMIT 1;
END;
$$;

-- Admin helper to apply ban with duration + message in one call
CREATE OR REPLACE FUNCTION public.admin_set_ban(
  _target_user uuid,
  _scope text,               -- 'profile' | 'scout'
  _banned boolean,
  _reason text DEFAULT NULL,
  _message text DEFAULT NULL,
  _duration_hours integer DEFAULT NULL   -- NULL = permanent
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_uid uuid := auth.uid();
  until_ts timestamptz;
BEGIN
  IF NOT public.has_role(admin_uid, 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _banned AND _duration_hours IS NOT NULL AND _duration_hours > 0 THEN
    until_ts := now() + make_interval(hours => _duration_hours);
  ELSE
    until_ts := NULL;  -- permanent when banned, cleared when unbanning
  END IF;

  IF _scope = 'scout' THEN
    UPDATE public.scout_profiles
       SET is_banned    = _banned,
           ban_reason   = CASE WHEN _banned THEN _reason ELSE NULL END,
           ban_message  = CASE WHEN _banned THEN _message ELSE NULL END,
           banned_until = CASE WHEN _banned THEN until_ts ELSE NULL END,
           banned_by    = CASE WHEN _banned THEN admin_uid ELSE NULL END,
           banned_at    = CASE WHEN _banned THEN now() ELSE NULL END
     WHERE user_id = _target_user;
  ELSE
    UPDATE public.profiles
       SET is_banned    = _banned,
           ban_reason   = CASE WHEN _banned THEN _reason ELSE NULL END,
           ban_message  = CASE WHEN _banned THEN _message ELSE NULL END,
           banned_until = CASE WHEN _banned THEN until_ts ELSE NULL END,
           banned_by    = CASE WHEN _banned THEN admin_uid ELSE NULL END,
           banned_at    = CASE WHEN _banned THEN now() ELSE NULL END
     WHERE user_id = _target_user;
  END IF;
END;
$$;

-- ============================================================
-- 2. Admin → scout talent-profile sharing
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profile_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scout_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'sent',   -- 'sent' | 'viewed' | 'dismissed'
  viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_shares_scout_idx ON public.profile_shares(scout_id, created_at DESC);
CREATE INDEX IF NOT EXISTS profile_shares_admin_idx ON public.profile_shares(admin_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS profile_shares_unique_active
  ON public.profile_shares(scout_id, player_id)
  WHERE status <> 'dismissed';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_shares TO authenticated;
GRANT ALL ON public.profile_shares TO service_role;

ALTER TABLE public.profile_shares ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage all profile shares"
  ON public.profile_shares FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Scouts: read shares sent to them
CREATE POLICY "Scouts read their own shares"
  ON public.profile_shares FOR SELECT
  TO authenticated
  USING (scout_id = auth.uid());

-- Scouts: update status (viewed/dismissed) on shares sent to them
CREATE POLICY "Scouts update status of their shares"
  ON public.profile_shares FOR UPDATE
  TO authenticated
  USING (scout_id = auth.uid())
  WITH CHECK (scout_id = auth.uid());

CREATE TRIGGER profile_shares_touch
  BEFORE UPDATE ON public.profile_shares
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
