
-- profiles
UPDATE public.profiles SET full_name = COALESCE(full_name, 'Unnamed');
ALTER TABLE public.profiles ALTER COLUMN full_name SET NOT NULL, ALTER COLUMN full_name SET DEFAULT '';

-- videos: add title, make required fields non-null
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Untitled';
UPDATE public.videos SET video_url = COALESCE(video_url, ''), description = COALESCE(description, '');
ALTER TABLE public.videos
  ALTER COLUMN video_url SET NOT NULL, ALTER COLUMN video_url SET DEFAULT '',
  ALTER COLUMN description SET NOT NULL, ALTER COLUMN description SET DEFAULT '',
  ALTER COLUMN position_tags SET NOT NULL,
  ALTER COLUMN trait_tags SET NOT NULL;

-- messages: rename recipient_id -> receiver_id, content NOT NULL
ALTER TABLE public.messages RENAME COLUMN recipient_id TO receiver_id;
ALTER TABLE public.messages ALTER COLUMN receiver_id SET NOT NULL;
UPDATE public.messages SET content = COALESCE(content, '');
ALTER TABLE public.messages ALTER COLUMN content SET NOT NULL, ALTER COLUMN content SET DEFAULT '';

DROP POLICY IF EXISTS "Read own messages" ON public.messages;
CREATE POLICY "Read own messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Update own messages" ON public.messages;
CREATE POLICY "Update own messages" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- scout_requests: add notes
ALTER TABLE public.scout_requests ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

-- scout_profiles non-null full_name
UPDATE public.scout_profiles SET full_name = COALESCE(full_name, 'Scout');
ALTER TABLE public.scout_profiles ALTER COLUMN full_name SET NOT NULL, ALTER COLUMN full_name SET DEFAULT '';
