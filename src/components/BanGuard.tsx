import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useRouterState } from "@tanstack/react-router";

/**
 * Watches the signed-in user for active bans. If a ban row exists in
 * profiles or scout_profiles (with banned_until in the future or NULL),
 * redirects the user to /blocked where the admin message + expiry are shown.
 * Runs on route changes and every 60s in the background.
 */
const BanGuard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!user) return;
    // Never redirect off the blocked / auth pages themselves.
    if (pathname.startsWith("/blocked") || pathname.startsWith("/auth")) return;

    let cancelled = false;
    const check = async () => {
      const { data } = await (supabase as any).rpc("get_my_ban_status");
      if (cancelled) return;
      const row = data && data[0];
      if (row && row.is_banned) {
        navigate({ to: "/blocked" as any });
      }
    };
    check();
    const iv = setInterval(check, 60_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [user?.id, pathname, navigate]);

  return null;
};

export default BanGuard;
