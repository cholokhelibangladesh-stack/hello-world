-- Remove the old "Active scouts" policy that still exists (if it does)
DROP POLICY IF EXISTS "Active scouts can read player profiles" ON public.profiles;
