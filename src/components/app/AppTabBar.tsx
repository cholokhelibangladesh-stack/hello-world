import { useEffect } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Home, PlusSquare, User, ClipboardList, Search, ClipboardCheck, SlidersHorizontal, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { haptic } from "@/lib/native";

type Tab = { label: string; to: string; Icon: typeof Home };

export const TABS: Record<string, Tab[]> = {
  player: [
    { label: "Home", to: "/player", Icon: Home },
    { label: "Explore", to: "/player/explore", Icon: Search },
    { label: "Upload", to: "/player/upload", Icon: PlusSquare },
    { label: "Profile", to: "/player/profile", Icon: User },
  ],
  scout: [
    { label: "Home", to: "/scout", Icon: Home },
    { label: "Explore", to: "/scout/explore", Icon: Search },
    { label: "Picks", to: "/scout/selections", Icon: ClipboardList },
    { label: "Profile", to: "/scout/profile", Icon: User },
  ],
  admin: [
    { label: "Home", to: "/admin", Icon: Home },
    { label: "Explore", to: "/admin/explore", Icon: Search },
    { label: "Review", to: "/admin/panel", Icon: ClipboardCheck },
    { label: "Manage", to: "/admin/manage", Icon: SlidersHorizontal },
    { label: "Insights", to: "/admin/insights", Icon: BarChart3 },
  ],
};

/**
 * Floating pill navigation: a dark ink capsule holding round buttons. The active tab widens into
 * a pill with its label (a shared-layout animation slides it between tabs).
 */
const AppTabBar = () => {
  const { user, role } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  // Once the app is idle, load every tab's code in the background so switching tabs never waits on it.
  useEffect(() => {
    const list = role ? TABS[role] : undefined;
    // Dev servers serve hundreds of separate modules, so only preload in real builds.
    if (!list || import.meta.env.DEV) return;
    const run = () => list.forEach((t) => { router.preloadRoute({ to: t.to as never }).catch(() => {}); });
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(run, { timeout: 2500 }); return () => w.cancelIdleCallback?.(id); }
    const id = window.setTimeout(run, 1200); return () => window.clearTimeout(id);
  }, [role, router]);
  if (!user || !role) return null;
  if (["/auth", "/reset-password"].some((p) => pathname.startsWith(p))) return null;
  const tabs = TABS[role];
  if (!tabs) return null;
  // Over reels and profiles the bar turns to clear glass so it sits well on dark photos.
  const onReels = (pathname.endsWith("/explore") && role !== "admin") || /^\/(player|scout)\/profile$/.test(pathname) || pathname.startsWith("/resume/");

  return (
    <nav aria-label="Primary" className={`pointer-events-none fixed inset-x-0 bottom-0 flex justify-center ${/^\/messages\/.+/.test(pathname) ? "z-[46]" : "z-40"}`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
      <ul className={`pointer-events-auto flex items-center gap-1.5 rounded-full p-1.5 shadow-[0_14px_34px_-12px_rgba(14,42,51,0.55)] ${onReels
        ? "bg-white/12 ring-1 ring-white/20 backdrop-blur-xl"
        : "bg-[#0E2A33] ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/15 dark:backdrop-blur-xl"}`}>
        {tabs.map(({ label, to, Icon }) => {
          const root = to === `/${role}`;
          const active = root ? pathname === to : pathname === to || pathname.startsWith(to + "/") || (to.endsWith("/explore") && pathname.startsWith("/resume/"));
          return (
            <li key={to} className="relative">
              <Link
                to={to as never}
                onClick={() => haptic("light")}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={`press relative flex h-12 items-center justify-center rounded-full ${active ? "px-5" : "w-12"}`}
              >
                {active
                  ? <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                  : <span className={`absolute inset-0 rounded-full ${onReels ? "bg-white/15" : "bg-white dark:bg-white/12"}`} />}
                <span className={`relative flex items-center gap-2 ${active ? "text-[#0E2A33]" : onReels ? "text-white" : "text-[#0E2A33] dark:text-white"}`}>
                  <Icon className="h-[20px] w-[20px]" strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" />
                  {active && <span className="text-[15px] font-semibold leading-none">{label}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default AppTabBar;
