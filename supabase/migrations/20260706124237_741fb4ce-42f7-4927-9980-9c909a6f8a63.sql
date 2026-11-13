
-- Prevent duplicate outstanding requests per (scout, player)
CREATE UNIQUE INDEX IF NOT EXISTS scout_requests_scout_player_key
  ON public.scout_requests (scout_id, player_id);

-- Allow scouts to rescind their own pending requests
DROP POLICY IF EXISTS "Scout deletes own pending" ON public.scout_requests;
CREATE POLICY "Scout deletes own pending"
  ON public.scout_requests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = scout_id AND status = 'pending');

-- Allow scouts to retry a rejected request by re-opening it (status -> pending)
DROP POLICY IF EXISTS "Scout retries own rejected" ON public.scout_requests;
CREATE POLICY "Scout retries own rejected"
  ON public.scout_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = scout_id AND status = 'rejected')
  WITH CHECK (auth.uid() = scout_id AND status = 'pending');

-- Realtime for scout_requests
ALTER TABLE public.scout_requests REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'scout_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scout_requests;
  END IF;
END $$;
