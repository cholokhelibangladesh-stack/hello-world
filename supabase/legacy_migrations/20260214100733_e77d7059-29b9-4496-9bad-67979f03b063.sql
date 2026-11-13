
-- Messages table for scout-player communication (safety monitored)
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can send messages
CREATE POLICY "Users can insert own messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can read messages they sent or received
CREATE POLICY "Users can read own messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Admins can read all messages (safety monitoring)
CREATE POLICY "Admins can read all messages"
ON public.messages FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update messages (flag them)
CREATE POLICY "Admins can update messages"
ON public.messages FOR UPDATE
USING (has_role(auth.uid(), 'admin'));
