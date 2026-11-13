import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { haptic } from "@/lib/native";
import { TABS } from "./AppTabBar";

/** Anything that scrolls sideways or takes text input keeps its own gestures. */
const IGNORE = "input, textarea, select, [role='slider'], [data-no-swipe], .overflow-x-auto, .overflow-x-scroll";

const tabIndex = (role: string | null, path: string) => {
  const tabs = role ? TABS[role] : undefined;
  if (!tabs) return -1;
  return tabs.findIndex((t) => t.to === path);
};

/**
 * Swipe left or right on a main tab to move to the neighbouring tab.
 * On deeper screens, a swipe from the left edge goes back, like iOS.
 * Native listeners on this element only, so sheets and dialogs (portals) never trigger it.
 */
const SwipeTabs = ({ children }: { children: ReactNode }) => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastIndex = useRef(tabIndex(role, pathname));
  const dir = useRef(0);

  const idx = tabIndex(role, pathname);
  if (idx !== lastIndex.current) {
    dir.current = idx >= 0 && lastIndex.current >= 0 ? Math.sign(idx - lastIndex.current) : 0;
    lastIndex.current = idx;
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || (e.target as Element | null)?.closest(IGNORE)) { start.current = null; return; }
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    };
    const onEnd = (e: TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || !role) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Date.now() - s.t > 600 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
      const tabs = TABS[role];
      const i = tabIndex(role, window.location.pathname);
      if (i >= 0 && tabs) {
        const next = dx < 0 ? i + 1 : i - 1;
        if (next >= 0 && next < tabs.length) { haptic("light"); navigate({ to: tabs[next].to as never }); }
      } else if (dx > 0 && s.x < 32) {
        haptic("light");
        router.history.back();
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => { el.removeEventListener("touchstart", onStart); el.removeEventListener("touchend", onEnd); };
  }, [role, navigate, router]);

  return (
    <div ref={ref} className="flex flex-1 flex-col">
      {/* transform must end as "none": a leftover translate would re-anchor the fixed reels feed */}
      <motion.div key={pathname} className="flex flex-1 flex-col"
        transformTemplate={({ x }) => (!x || x === "0px" || x === 0 ? "none" : `translateX(${x})`)}
        initial={dir.current ? { x: dir.current * 28, opacity: 0.4 } : { opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}>
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeTabs;
