import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import AppTabBar from "./AppTabBar";
import AppHeader from "./AppHeader";
import { initNative } from "@/lib/native";
import { enablePush, pushConfigured } from "@/lib/push";
import SwipeTabs from "./SwipeTabs";
import WebSideNav from "./WebSideNav";

/**
 * Root visual frame that turns the site into an app-style shell:
 *  - Fixed AppHeader + bottom AppTabBar on authenticated screens.
 *  - Phone-shaped max-width container on desktop preview.
 *  - Full-viewport with safe-area padding on native devices.
 *
 * Marketing routes (unauthenticated) fall through to the existing
 * FloatingHeader/SiteFooter layout so the public site is untouched.
 */

// Routes considered "in-app" (authenticated shell shown)
const APP_PREFIXES = ["/player", "/scout", "/admin", "/resume", "/messages"];

const AppFrame = ({ children }: { children: React.ReactNode }) => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    initNative();
  }, []);

  // Push: register this phone for the signed-in account. Ask for permission once; later visits
  // only refresh the token (people can change it under Settings, Notifications).
  useEffect(() => {
    if (!user || !role || !pushConfigured()) return;
    let asked = false;
    try { asked = localStorage.getItem("ck_push_asked") === "1"; localStorage.setItem("ck_push_asked", "1"); } catch { /* storage off */ }
    enablePush((path) => navigate({ to: path as never }), !asked);
  }, [user?.id, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const inApp = user && APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!inApp) {
    // Marketing / auth pages — render children directly. Still cap width on
    // very large desktop screens so previews feel phone-shaped when the user
    // has the mobile preview enabled.
    return <>{children}</>;
  }

  // Admin consoles hold tables and side-by-side panels, so they get a wider column on desktop.
  const wide = pathname.startsWith("/admin");

  return (
    <div className="relative mx-auto flex w-full max-w-[1320px] text-foreground lg:gap-6 lg:px-6">
      <WebSideNav />
      <div
        className={`relative mx-auto flex w-full min-w-0 flex-col ${wide ? "max-w-[1040px]" : "max-w-[680px]"}`}
        style={{ minHeight: "100dvh" }}
      >
        <AppHeader />
        <SwipeTabs>
          <main id="main" className="flex-1 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-12">
            {children}
          </main>
        </SwipeTabs>
        <div className="lg:hidden"><AppTabBar /></div>
      </div>
    </div>
  );
};

export default AppFrame;
