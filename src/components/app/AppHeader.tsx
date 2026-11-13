import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, Send, Settings } from "lucide-react";
import { useUnreadDms } from "@/pages/messages/Inbox";
import NotificationBell from "@/components/NotificationBell";
import CholoKheliMark from "@/components/CholoKheliMark";
import { useAuth } from "@/hooks/useAuth";
import { haptic } from "@/lib/native";

// Tab roots show the brand mark; anything deeper shows a back chevron.
const TAB_ROOTS = new Set([
  "/player", "/player/explore", "/player/upload", "/player/profile",
  "/scout", "/scout/explore", "/scout/selections", "/scout/profile",
  "/admin", "/admin/explore", "/admin/panel", "/messages",
]);

const iconButton = "press glass-icon";

/** Frosted iOS-style navigation bar. Settings screens draw their own bar, so this one steps aside. */
const AppHeader = () => {
  const { user, role } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unread = useUnreadDms();

  if (!user) return null;
  if (/^\/messages\/.+/.test(pathname)) return null; // a thread draws its own bar
  if (pathname.startsWith("/auth") || pathname.startsWith("/reset-password")) return null;
  if (/\/settings(\/|$)/.test(pathname) || pathname.startsWith("/admin/") && pathname !== "/admin/explore" && pathname !== "/admin/panel") return null;

  const isTabRoot = TAB_ROOTS.has(pathname);
  const base = role === "scout" ? "/scout" : role === "admin" ? "/admin" : "/player";

  return (
    <header className="ios-bar sticky top-0 z-30" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex h-14 w-full items-center justify-between px-3 lg:h-16 lg:px-4">
        {isTabRoot ? (
          <Link to={base as never} aria-label="Cholo Kheli home" className="press flex items-center gap-2.5 lg:invisible">
            <span className="glass-icon !rounded-[14px]"><CholoKheliMark className="h-5 w-7" /></span>
            <span className="text-[17px] font-semibold tracking-tight">Cholo Kheli</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => { haptic("light"); router.history.back(); }}
            aria-label="Back"
            className="press glass-icon"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <Link to="/messages" onClick={() => haptic("light")} aria-label={unread ? `Messages, ${unread} unread` : "Messages"} className={`${iconButton} relative lg:!hidden`}>
            <Send className="h-[19px] w-[19px]" strokeWidth={1.8} />
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
          </Link>
          <div className={iconButton}><NotificationBell /></div>
          <Link to={`${base}/settings` as never} onClick={() => haptic("light")} aria-label="Settings" className={`${iconButton} lg:!hidden`}>
            <Settings className="h-[20px] w-[20px]" strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
