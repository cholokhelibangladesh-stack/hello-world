
-- Add unique username to profiles with case-insensitive uniqueness
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- Backfill existing rows with derived unique usernames
UPDATE public.profiles
   SET username = lower(regexp_replace(coalesce(full_name, ''), '[^a-zA-Z0-9_]+', '_', 'g')) || '_' || substr(user_id::text, 1, 6)
 WHERE username IS NULL OR username = '';

-- Case-insensitive unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key ON public.profiles (lower(username));

-- Enforce format at DB level: 3-24 chars, lowercase letters/numbers/underscore
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,24}$');
