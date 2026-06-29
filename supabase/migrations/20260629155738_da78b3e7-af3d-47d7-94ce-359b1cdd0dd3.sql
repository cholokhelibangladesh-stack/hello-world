
-- Enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('player', 'scout', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- has_role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- scout_profiles (minimal, needed by useAuth)
CREATE TABLE IF NOT EXISTS public.scout_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.scout_profiles TO authenticated;
GRANT ALL ON public.scout_profiles TO service_role;
ALTER TABLE public.scout_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scouts view own profile" ON public.scout_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Scouts update own profile" ON public.scout_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
