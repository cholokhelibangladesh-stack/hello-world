
-- Username change audit log
CREATE TABLE public.username_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  old_username TEXT,
  new_username TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.username_audit TO authenticated;
GRANT ALL ON public.username_audit TO service_role;

ALTER TABLE public.username_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own username audit"
  ON public.username_audit FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_username_audit_changed_at ON public.username_audit (changed_at DESC);
CREATE INDEX idx_username_audit_user_id ON public.username_audit (user_id);

-- Trigger to write audit rows whenever profiles.username changes
CREATE OR REPLACE FUNCTION public.log_username_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.username, '') IS DISTINCT FROM COALESCE(OLD.username, '') THEN
    INSERT INTO public.username_audit(user_id, old_username, new_username, changed_by)
    VALUES (NEW.user_id, OLD.username, NEW.username, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_username_change ON public.profiles;
CREATE TRIGGER trg_log_username_change
AFTER UPDATE OF username ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_username_change();

-- Admin-scoped audit view helper (joins in email for readability)
CREATE OR REPLACE FUNCTION public.get_username_audit(_limit INT DEFAULT 100)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  old_username TEXT,
  new_username TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ,
  user_email TEXT,
  changed_by_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT a.id, a.user_id, a.old_username, a.new_username, a.changed_by, a.changed_at,
         u.email::text, cb.email::text
    FROM public.username_audit a
    LEFT JOIN auth.users u ON u.id = a.user_id
    LEFT JOIN auth.users cb ON cb.id = a.changed_by
   ORDER BY a.changed_at DESC
   LIMIT LEAST(GREATEST(COALESCE(_limit, 100), 1), 500);
END;
$$;

-- Sessions helpers (list/revoke for current user)
CREATE OR REPLACE FUNCTION public.get_my_sessions()
RETURNS TABLE(
  id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_agent TEXT,
  ip TEXT,
  is_current BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  current_sid UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  BEGIN
    current_sid := (auth.jwt() ->> 'session_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    current_sid := NULL;
  END;
  RETURN QUERY
  SELECT s.id,
         s.created_at,
         s.updated_at,
         s.user_agent::text,
         s.ip::text,
         (s.id = current_sid) AS is_current
    FROM auth.sessions s
   WHERE s.user_id = uid
   ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_my_session(_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  affected INT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  DELETE FROM auth.sessions
   WHERE id = _session_id AND user_id = uid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_my_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_username_audit(INT) TO authenticated;
