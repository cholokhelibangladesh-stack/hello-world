import { Link, useRouterState } from "@tanstack/react-router";
import { Globe2, LogOut, MessageCircle, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadDms } from "@/pages/messages/Inbox";
import CholoKheliMark from "@/components/CholoKheliMark";
import { TABS } from "./AppTabBar";

/**
 * Desktop navigation for signed-in screens: a frosted rail on the left with the same tabs as the
 * phone's floating bar, plus Messages and Settings, which on a phone live in the header.
 * Shown from the lg breakpoint; below that the floating tab bar takes over.
 */
const WebSideNav = () => {
  const { user, role, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unread = useUnreadDms();
  if (!user || !role || !TABS[role]) return null;
  const base = `/${role}`;

  const items = [
    ...TABS[role],
    { label: "Messages", to: "/messages", Icon: MessageCircle },
    { label: "Settings", to: role === "admin" ? "/admin/settings" : `${base}/settings`, Icon: Settings },
  ];

  return (
    <aside aria-label="Primary" className="sticky top-0 hidden h-[100dvh] w-[248px] shrink-0 flex-col px-4 py-6 lg:flex">
      <Link to="/" className="press mb-8 flex items-center gap-3 px-2" aria-label="Cholo Kheli website">
        <span className="glass-icon !rounded-[14px]"><CholoKheliMark className="h-6 w-6" /></span>
        <span className="text-[19px] font-bold tracking-tight">Cholo Kheli</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map(({ label, to, Icon }) => {
          const root = to === base;
          const active = root ? pathname === to : pathname === to || pathname.startsWith(to + "/") || (to.endsWith("/explore") && pathname.startsWith("/resume/"));
          return (
            <Link key={to} to={to as never} aria-current={active ? "page" : undefined}
              className={`press flex h-12 items-center gap-3.5 rounded-full px-4 text-[15px] transition-colors ${active
                ? "bg-[#0E2A33] font-semibold text-white dark:bg-white dark:text-[#0E2A33]"
                : "text-foreground/80 hover:bg-card hover:text-foreground"}`}>
              <Icon className="h-[20px] w-[20px]" strokeWidth={active ? 2.2 : 1.8} />
              <span className="flex-1">{label}</span>
              {label === "Messages" && unread > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <Link to="/" className="press flex h-11 items-center gap-3.5 rounded-full px-4 text-[14px] text-muted-foreground hover:bg-card hover:text-foreground">
          <Globe2 className="h-[18px] w-[18px]" /> Website
        </Link>
        <button type="button" onClick={() => signOut()} className="press flex h-11 items-center gap-3.5 rounded-full px-4 text-left text-[14px] text-muted-foreground hover:bg-card hover:text-foreground">
          <LogOut className="h-[18px] w-[18px]" /> Sign out
        </button>
      </div>
    </aside>
  );
};

export default WebSideNav;
