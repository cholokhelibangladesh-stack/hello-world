
-- Add username to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- 'info', 'certificate', 'feedback', 'selection', 'admin_notice'
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create scout_requests table (scout selects a player, admin sees it)
CREATE TABLE public.scout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id uuid NOT NULL,
  player_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  notes text,
  admin_response text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scouts can create own requests"
  ON public.scout_requests FOR INSERT
  WITH CHECK (auth.uid() = scout_id);

CREATE POLICY "Scouts can read own requests"
  ON public.scout_requests FOR SELECT
  USING (auth.uid() = scout_id);

CREATE POLICY "Admins can manage all scout requests"
  ON public.scout_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Players can see requests about them
CREATE POLICY "Players can see requests about them"
  ON public.scout_requests FOR SELECT
  USING (auth.uid() = player_id);

-- Add realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger for updated_at on scout_requests
CREATE TRIGGER update_scout_requests_updated_at
  BEFORE UPDATE ON public.scout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Allow players to view other players' live videos (add permissive policy)
CREATE POLICY "Players can view live videos"
  ON public.videos FOR SELECT
  USING (status = 'live' AND has_role(auth.uid(), 'player'));
