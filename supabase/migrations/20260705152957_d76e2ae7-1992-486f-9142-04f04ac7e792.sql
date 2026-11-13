
-- 1. privacy_settings
CREATE TABLE public.privacy_settings (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_private BOOLEAN NOT NULL DEFAULT false,
  story_visibility TEXT NOT NULL DEFAULT 'followers',
  activity_status BOOLEAN NOT NULL DEFAULT true,
  read_receipts BOOLEAN NOT NULL DEFAULT true,
  allow_tags TEXT NOT NULL DEFAULT 'everyone',
  allow_mentions TEXT NOT NULL DEFAULT 'everyone',
  comment_control TEXT NOT NULL DEFAULT 'everyone',
  sharing_allowed BOOLEAN NOT NULL DEFAULT true,
  hide_like_counts BOOLEAN NOT NULL DEFAULT false,
  hide_share_counts BOOLEAN NOT NULL DEFAULT false,
  hidden_words_enabled BOOLEAN NOT NULL DEFAULT false,
  language TEXT NOT NULL DEFAULT 'en',
  data_saver BOOLEAN NOT NULL DEFAULT false,
  hd_uploads BOOLEAN NOT NULL DEFAULT true,
  reduce_motion BOOLEAN NOT NULL DEFAULT false,
  captions_default BOOLEAN NOT NULL DEFAULT false,
  daily_limit_minutes INTEGER,
  break_reminder_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.privacy_settings TO authenticated;
GRANT ALL ON public.privacy_settings TO service_role;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_privacy_all" ON public.privacy_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. notification_preferences
CREATE TABLE public.notification_preferences (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pause_all_until TIMESTAMPTZ,
  likes BOOLEAN NOT NULL DEFAULT true,
  comments BOOLEAN NOT NULL DEFAULT true,
  new_followers BOOLEAN NOT NULL DEFAULT true,
  messages BOOLEAN NOT NULL DEFAULT true,
  scout_requests BOOLEAN NOT NULL DEFAULT true,
  video_activity BOOLEAN NOT NULL DEFAULT true,
  from_cholo_kheli BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_notifprefs_all" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. blocked_users
CREATE TABLE public.blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_blocks_all" ON public.blocked_users
  FOR ALL USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- 4. muted_users
CREATE TABLE public.muted_users (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mute_posts BOOLEAN NOT NULL DEFAULT true,
  mute_stories BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, muted_id),
  CHECK (user_id <> muted_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.muted_users TO authenticated;
GRANT ALL ON public.muted_users TO service_role;
ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_mutes_all" ON public.muted_users
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. restricted_users
CREATE TABLE public.restricted_users (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restricted_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, restricted_id),
  CHECK (user_id <> restricted_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restricted_users TO authenticated;
GRANT ALL ON public.restricted_users TO service_role;
ALTER TABLE public.restricted_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_restricted_all" ON public.restricted_users
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. close_friends
CREATE TABLE public.close_friends (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.close_friends TO authenticated;
GRANT ALL ON public.close_friends TO service_role;
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_closefriends_all" ON public.close_friends
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. favorites
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  favorite_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, favorite_id),
  CHECK (user_id <> favorite_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_favorites_all" ON public.favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. hidden_words
CREATE TABLE public.hidden_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, word)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hidden_words TO authenticated;
GRANT ALL ON public.hidden_words TO service_role;
ALTER TABLE public.hidden_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_hiddenwords_all" ON public.hidden_words
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. saved_videos
CREATE TABLE public.saved_videos (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_videos TO authenticated;
GRANT ALL ON public.saved_videos TO service_role;
ALTER TABLE public.saved_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_saved_all" ON public.saved_videos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. add archived flag on videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- 11. updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_privacy_updated BEFORE UPDATE ON public.privacy_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER trg_notifprefs_updated BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 12. auto-create rows on profile insert
CREATE OR REPLACE FUNCTION public.tg_bootstrap_user_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.privacy_settings(user_id) VALUES (NEW.user_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.notification_preferences(user_id) VALUES (NEW.user_id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_bootstrap_user_settings AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_bootstrap_user_settings();

-- 13. Backfill existing profiles
INSERT INTO public.privacy_settings(user_id) SELECT user_id FROM public.profiles ON CONFLICT DO NOTHING;
INSERT INTO public.notification_preferences(user_id) SELECT user_id FROM public.profiles ON CONFLICT DO NOTHING;
