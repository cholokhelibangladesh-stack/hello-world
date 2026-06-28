
-- Add is_banned column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- Add is_banned to scout_profiles  
ALTER TABLE public.scout_profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- Create app_settings table for global toggles
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT 'false',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage app_settings"
  ON public.app_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read app_settings"
  ON public.app_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

INSERT INTO public.app_settings (key, value) VALUES ('video_uploads_halted', 'false')
ON CONFLICT (key) DO NOTHING;

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
