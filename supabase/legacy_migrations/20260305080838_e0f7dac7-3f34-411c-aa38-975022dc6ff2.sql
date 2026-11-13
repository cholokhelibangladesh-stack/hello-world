
-- Allow anyone (including unauthenticated) to read active scout_profiles
CREATE POLICY "Public can view active scout profiles"
  ON public.scout_profiles FOR SELECT
  USING (verification_status = 'active');

-- Allow anyone to read profiles of active scouts (needed for the homepage scouts list)
CREATE POLICY "Public can view profiles of active scouts"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scout_profiles
      WHERE scout_profiles.user_id = profiles.user_id
        AND scout_profiles.verification_status = 'active'
    )
  );
