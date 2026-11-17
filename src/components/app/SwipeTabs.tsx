import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { animate, motion, useMotionValue } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { haptic } from "@/lib/native";
import { FLICK_VELOCITY, IOS_SPRING, SWIPE_SLOP, TURN_FRACTION } from "@/lib/motion";
import { TABS } from "./AppTabBar";

/** Anything that scrolls sideways or takes text input keeps its own gestures. */
const IGNORE = "input, textarea, select, [role='slider'], [data-no-swipe], .overflow-x-auto, .overflow-x-scroll";
/** Screens with a fixed full-screen layer (the reels feed) can't be moved, so they only take a quick swipe. */
const FIXED_LAYOUT = /^\/(player|scout)\/explore$/;
/** Edge for the iOS back gesture on deeper screens. */
const EDGE = 28;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const tabIndex = (role: string | null, path: string) => {
  const tabs = role ? TABS[role] : undefined;
  if (!tabs) return -1;
  return tabs.findIndex((t) => t.to === path);
};

/**
 * Swipe sideways on a main tab to move to the neighbouring tab; on deeper screens, swipe from the left edge
 * to go back. Like iOS, the page follows the finger, a light flick or a drag past a quarter of the screen
 * completes the move, anything less springs back, and the last tab stretches a little instead of moving.
 * Native listeners on this element only, so sheets and dialogs (portals) never trigger it.
 */
const SwipeTabs = ({ children }: { children: ReactNode }) => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const lastIndex = useRef(tabIndex(role, pathname));
  const enter = useRef<{ from: number; velocity: number } | null>(null);

  const idx = tabIndex(role, pathname);
  if (idx !== lastIndex.current) {
    const d = idx >= 0 && lastIndex.current >= 0 ? Math.sign(idx - lastIndex.current) : 0;
    // Tab bar taps get a short slide too; swipes already set where the new page comes from.
    if (!enter.current && d) enter.current = { from: d * 40, velocity: 0 };
    lastIndex.current = idx;
  }

  // New page: slide in from the side the finger was moving towards, carrying the flick's speed.
  // Runs before paint so the new page never shows at the old page's offset.
  useIsoLayoutEffect(() => {
    const e = enter.current; enter.current = null;
    if (!e || FIXED_LAYOUT.test(pathname)) { x.set(0); return; }
    x.set(e.from);
    const c = animate(x, 0, { ...IOS_SPRING, velocity: e.velocity });
    return () => c.stop();
  }, [pathname, x]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let g: { x: number; y: number; t: number; axis: "x" | "y" | null; edge: boolean; lastX: number; lastT: number; v: number } | null = null;

    const target = () => {
      if (!role) return { kind: "none" as const };
      const tabs = TABS[role];
      const i = tabIndex(role, window.location.pathname);
      return i >= 0 && tabs ? { kind: "tab" as const, i, tabs } : { kind: "back" as const };
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || (e.target as Element | null)?.closest(IGNORE)) { g = null; return; }
      const t = e.touches[0];
      g = { x: t.clientX, y: t.clientY, t: performance.now(), axis: null, edge: t.clientX < EDGE, lastX: t.clientX, lastT: performance.now(), v: 0 };
    };
    const onMove = (e: TouchEvent) => {
      if (!g) return;
      const t = e.touches[0];
      const dx = t.clientX - g.x, dy = t.clientY - g.y;
      if (!g.axis) {
        if (Math.hypot(dx, dy) < SWIPE_SLOP) return;
        g.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
        const tg = target();
        if (g.axis === "x" && tg.kind === "back" && !(g.edge && dx > 0)) g.axis = "y";
      }
      if (g.axis !== "x") return;
      if (e.cancelable) e.preventDefault(); // no vertical scroll once the swipe is sideways
      const now = performance.now();
      g.v = ((t.clientX - g.lastX) / Math.max(1, now - g.lastT)) * 1000;
      g.lastX = t.clientX; g.lastT = now;
      if (FIXED_LAYOUT.test(window.location.pathname)) return;
      const tg = target();
      let off = dx;
      if (tg.kind === "tab") {
        const next = dx < 0 ? tg.i + 1 : tg.i - 1;
        if (next < 0 || next >= tg.tabs.length) off = dx * 0.22; // rubber band at the ends
      } else if (tg.kind === "back") off = Math.max(0, dx);
      x.set(off);
    };
    const onEnd = (e: TouchEvent) => {
      const s = g; g = null;
      if (!s || s.axis !== "x") return;
      const dx = e.changedTouches[0].clientX - s.x;
      const w = el.clientWidth || window.innerWidth;
      const flick = Math.abs(s.v) > FLICK_VELOCITY && Math.sign(s.v) === Math.sign(dx);
      const far = Math.abs(dx) > w * TURN_FRACTION;
      const tg = target();
      if ((flick || far) && tg.kind === "tab") {
        const next = dx < 0 ? tg.i + 1 : tg.i - 1;
        if (next >= 0 && next < tg.tabs.length) {
          haptic("light");
          // The new page picks up where the finger left the old one, from the opposite side.
          enter.current = { from: (dx < 0 ? 1 : -1) * Math.min(w * 0.45, Math.max(60, w - Math.abs(dx))), velocity: s.v };
          navigate({ to: tg.tabs[next].to as never });
          return;
        }
      } else if ((flick || far) && tg.kind === "back" && dx > 0) {
        haptic("light");
        enter.current = { from: -Math.min(w * 0.3, 90), velocity: s.v };
        router.history.back();
        return;
      }
      animate(x, 0, { ...IOS_SPRING, velocity: s.v });
    };
    const onCancel = () => { if (g?.axis === "x") animate(x, 0, IOS_SPRING); g = null; };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart); el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd); el.removeEventListener("touchcancel", onCancel);
    };
  }, [role, navigate, router, x]);

  return (
    <div ref={ref} className="flex flex-1 flex-col">
      {/* transform must end as "none": a leftover translate would re-anchor the fixed reels feed */}
      <motion.div key={pathname} className="flex flex-1 flex-col" style={{ x }}
        transformTemplate={({ x: tx }) => (!tx || tx === "0px" || tx === 0 ? "none" : `translateX(${tx})`)}>
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeTabs;
