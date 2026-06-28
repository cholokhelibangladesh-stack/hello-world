-- 1. Add INSERT policy for notifications so edge functions/service role can insert
CREATE POLICY "Service role can insert any notification"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2. Allow authenticated users to insert notifications (for client-side report flows)
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Fix profiles SELECT for scouts: allow ALL scouts (not just active) to read player profiles
DROP POLICY IF EXISTS "Active scouts can read player profiles" ON public.profiles;

CREATE POLICY "Scouts can read player profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scout_profiles
      WHERE scout_profiles.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = profiles.user_id
        AND user_roles.role = 'player'::app_role
    )
  );

-- 4. Fix videos SELECT for scouts: allow pending scouts to also see live videos
DROP POLICY IF EXISTS "Active scouts can view live videos" ON public.videos;

CREATE POLICY "Scouts can view live videos"
  ON public.videos FOR SELECT
  USING (
    (status = 'live'::video_status)
    AND
    EXISTS (
      SELECT 1 FROM scout_profiles
      WHERE scout_profiles.user_id = auth.uid()
    )
  );
