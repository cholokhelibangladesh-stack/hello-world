-- Fixes from the Supabase security advisor on a fresh project.

-- 1. Pin search_path on the two helpers that lacked it.
alter function public.raise_forbidden(text) set search_path = public;
alter function public.try_uuid(text) set search_path = public;

-- 2. Trigger functions are never meant to be called over the REST API.
--    Triggers still fire after EXECUTE is revoked.
revoke execute on function
  public.bump_event(), public.bump_like(), public.bump_share(),
  public.create_moderation_alert(), public.log_username_change(),
  public.tg_bootstrap_user_settings(), public.tg_contact_rate_limit(),
  public.tg_dedupe_video_event(), public.tg_dedupe_video_share(),
  public.tg_enforce_upload_halt()
from public, anon, authenticated;

-- 3. Signed-in-only RPCs: nothing an anonymous visitor needs.
--    (has_role stays open to anon: the public news policy calls it.
--     is_username_available stays open: the sign-up form checks names before an account exists.)
revoke execute on function
  public.admin_set_ban(uuid, text, boolean, text, text, integer),
  public.get_admin_user_emails(),
  public.get_my_ban_status(),
  public.mfa_satisfied()
from public, anon;
grant execute on function
  public.admin_set_ban(uuid, text, boolean, text, text, integer),
  public.get_admin_user_emails(),
  public.get_my_ban_status(),
  public.mfa_satisfied()
to authenticated, service_role;
