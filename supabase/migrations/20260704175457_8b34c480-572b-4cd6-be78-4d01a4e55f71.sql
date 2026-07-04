-- Moderation alert inbox: track new scout requests, videos, and scout profiles that need admin action.
CREATE TABLE public.moderation_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('scout_request','video','scout')),
  target_id uuid NOT NULL,
  target_user_id uuid,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  UNIQUE (kind, target_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moderation_alerts TO authenticated;
GRANT ALL ON public.moderation_alerts TO service_role;

ALTER TABLE public.moderation_alerts ENABLE ROW LEVEL SECURITY;

-- Admin-only read + write. No anon, no owner access.
CREATE POLICY "Admins view moderation alerts" ON public.moderation_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update moderation alerts" ON public.moderation_alerts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete moderation alerts" ON public.moderation_alerts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX moderation_alerts_status_created_idx
  ON public.moderation_alerts(status, created_at DESC);

-- SECURITY DEFINER trigger inserts alert rows. No INSERT policy needed
-- because the function runs as its owner and callers never insert directly.
CREATE OR REPLACE FUNCTION public.create_moderation_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  k text; tid uuid; tuid uuid;
BEGIN
  IF TG_TABLE_NAME = 'scout_requests' THEN
    k := 'scout_request'; tid := NEW.id; tuid := NEW.player_id;
  ELSIF TG_TABLE_NAME = 'videos' THEN
    k := 'video'; tid := NEW.id; tuid := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'scout_profiles' THEN
    k := 'scout'; tid := NEW.id; tuid := NEW.user_id;
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO public.moderation_alerts(kind, target_id, target_user_id)
    VALUES (k, tid, tuid)
    ON CONFLICT (kind, target_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_alert_scout_request
  AFTER INSERT ON public.scout_requests
  FOR EACH ROW EXECUTE FUNCTION public.create_moderation_alert();
CREATE TRIGGER trg_alert_video
  AFTER INSERT ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.create_moderation_alert();
CREATE TRIGGER trg_alert_scout
  AFTER INSERT ON public.scout_profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_moderation_alert();

-- Backfill open items so existing pending work shows up in the inbox.
INSERT INTO public.moderation_alerts(kind, target_id, target_user_id, created_at, status)
SELECT 'scout_request', id, player_id, created_at,
       CASE WHEN status = 'pending' THEN 'new' ELSE 'resolved' END
  FROM public.scout_requests
ON CONFLICT (kind, target_id) DO NOTHING;

INSERT INTO public.moderation_alerts(kind, target_id, target_user_id, created_at, status)
SELECT 'video', id, user_id, created_at,
       CASE WHEN status IN ('pending_payment','draft') THEN 'new' ELSE 'resolved' END
  FROM public.videos
ON CONFLICT (kind, target_id) DO NOTHING;

INSERT INTO public.moderation_alerts(kind, target_id, target_user_id, created_at, status)
SELECT 'scout', id, user_id, created_at,
       CASE WHEN verification_status = 'pending' THEN 'new' ELSE 'resolved' END
  FROM public.scout_profiles
ON CONFLICT (kind, target_id) DO NOTHING;

-- Harden username audit: admin-only read (was own-user OR admin).
DROP POLICY IF EXISTS "Users can view their own username audit" ON public.username_audit;
CREATE POLICY "Admins view username audit"
  ON public.username_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));