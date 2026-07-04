CREATE OR REPLACE FUNCTION public.get_admin_user_emails()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT u.id, u.email::text FROM auth.users u;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_user_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_user_emails() TO authenticated;