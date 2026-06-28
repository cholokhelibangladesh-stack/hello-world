
-- 1. Role enum and user_roles table (per security requirements)
CREATE TYPE public.app_role AS ENUM ('player', 'scout', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Security definer helper function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  gender TEXT,
  avatar_url TEXT,
  sport TEXT CHECK (sport IN ('football', 'cricket')),
  guardian_contact TEXT,
  bio TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Scout verification status
CREATE TYPE public.scout_status AS ENUM ('pending', 'active', 'rejected');

CREATE TABLE public.scout_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  verification_status scout_status NOT NULL DEFAULT 'pending',
  organization TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scout_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Videos table
CREATE TYPE public.video_status AS ENUM ('draft', 'pending_payment', 'live', 'rejected');

CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  description TEXT,
  video_url TEXT,
  status video_status NOT NULL DEFAULT 'draft',
  position_tags TEXT[] DEFAULT '{}',
  trait_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- 6. Achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  year INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- 7. Payments table
CREATE TYPE public.payment_status AS ENUM ('pending', 'success', 'failed');

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  method TEXT NOT NULL DEFAULT 'bkash',
  status payment_status NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 8. Certificates table
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- 9. Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_scout_profiles_updated_at BEFORE UPDATE ON public.scout_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. RLS Policies

-- user_roles: only admin can manage, users can read own
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Active scouts can read player profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scout_profiles WHERE user_id = auth.uid() AND verification_status = 'active')
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = profiles.user_id AND role = 'player')
);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- scout_profiles
CREATE POLICY "Scouts can read own scout profile" ON public.scout_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all scout profiles" ON public.scout_profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update scout profiles" ON public.scout_profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Scouts can insert own scout profile" ON public.scout_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- videos
CREATE POLICY "Players can manage own videos" ON public.videos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Active scouts can view live videos" ON public.videos FOR SELECT USING (
  status = 'live' AND EXISTS (SELECT 1 FROM public.scout_profiles WHERE user_id = auth.uid() AND verification_status = 'active')
);
CREATE POLICY "Admins can manage all videos" ON public.videos FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- achievements
CREATE POLICY "Users can manage own achievements" ON public.achievements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Active scouts can view achievements" ON public.achievements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scout_profiles WHERE user_id = auth.uid() AND verification_status = 'active')
);
CREATE POLICY "Admins can view all achievements" ON public.achievements FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- payments
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- certificates
CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all certificates" ON public.certificates FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 12. Storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('player-videos', 'player-videos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies
CREATE POLICY "Players can upload videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'player-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view videos" ON storage.objects FOR SELECT USING (bucket_id = 'player-videos');
CREATE POLICY "Players can upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own certificates" ON storage.objects FOR SELECT USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "System can create certificates" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'certificates');
