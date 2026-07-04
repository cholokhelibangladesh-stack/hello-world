
REVOKE EXECUTE ON FUNCTION public.get_my_sessions() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_my_session(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_username_audit(INT) FROM PUBLIC, anon;
