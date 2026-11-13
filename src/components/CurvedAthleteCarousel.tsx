import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

import a1 from "@/assets/athlete-1.jpg";
import a2 from "@/assets/athlete-2.jpg";
import a3 from "@/assets/athlete-3.jpg";
import a4 from "@/assets/athlete-4.jpg";
import a5 from "@/assets/athlete-5.jpg";
import a6 from "@/assets/athlete-6.jpg";
import a7 from "@/assets/athlete-7.jpg";
import a8 from "@/assets/athlete-8.jpg";

type Card = { src: string; sport: string; caption: string };

const CARDS: Card[] = [
  { src: a1, sport: "Football", caption: "Sprint, Dhaka" },
  { src: a2, sport: "Cricket", caption: "Cover drive" },
  { src: a3, sport: "Basketball", caption: "Rim, Chattogram" },
  { src: a4, sport: "Football", caption: "Dawn drills" },
  { src: a5, sport: "Cricket", caption: "Delivery stride" },
  { src: a6, sport: "Basketball", caption: "Crossover" },
  { src: a7, sport: "Football", caption: "Local cup" },
  { src: a8, sport: "Cricket", caption: "Nets" },
];
const N = CARDS.length;
const STEP = 360 / N; // degrees between neighbours on the drum

/** Card size and drum radius follow the viewport so the arc reads the same on a phone and a monitor. */
function useStage() {
  const [w, setW] = useState(1200);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    on(); window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const cardW = Math.round(Math.max(168, Math.min(300, w * 0.22)));
  const cardH = Math.round(cardW * 4 / 3);
  // Neighbours sit about one card width apart (sin 45° x 1.55), so three faces stay readable.
  const radius = Math.round(cardW * 1.55);
  return { cardW, cardH, radius };
}

/** Shortest signed distance between a card and the front, in cards, wrapped to (-N/2, N/2]. */
const wrap = (d: number) => ((((d + N / 2) % N) + N) % N) - N / 2;

/**
 * Faces of the game: athlete photos on a convex drum seen from slightly above. Scrolling past the
 * section tilts the drum; dragging, the arrow keys and the buttons turn it card by card,
 * and it always settles with one photo square to the viewer. When nobody is interacting it drifts
 * forward one card every few seconds. Everything runs on motion values, so React does not
 * re-render while it turns; with reduced motion it only moves when asked, without easing.
 */
export default function CurvedAthleteCarousel() {
  const reduce = useReducedMotion();
  const { cardW, cardH, radius } = useStage();
  const sectionRef = useRef<HTMLElement>(null);
  const target = useMotionValue(0); // where the drum is heading, in cards
  const smooth = useSpring(target, { stiffness: 90, damping: 22, mass: 0.9 });
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  // Scrolling tilts the whole drum (looking down on it as it rises, level as it leaves) for depth,
  // without turning it, so a card always comes to rest facing the viewer.
  const tilt = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [0, 0, 0] : [14, 4, -6]);
  const lift = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [40, -40]);
  const position = reduce ? target : smooth;

  const [front, setFront] = useState(0);
  useMotionValueEvent(position, "change", (v) => {
    const idx = ((Math.round(v) % N) + N) % N;
    setFront((f) => (f === idx ? f : idx));
  });

  const go = useCallback((delta: number) => {
    target.set(Math.round(target.get()) + delta);
  }, [target]);

  // Idle drift: one card every 3.6 s while the section is on screen and nobody is touching it.
  const paused = useRef(false);
  const inView = useInView(sectionRef, { amount: 0.35 });
  const visible = useRef(false);
  visible.current = inView;
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => { if (!paused.current && visible.current && !document.hidden) go(1); }, 3600);
    return () => window.clearInterval(id);
  }, [go, reduce]);

  // Drag: the drum follows the pointer, then coasts and snaps to the nearest card.
  const drag = useRef<{ x: number; start: number; t: number; v: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, start: target.get(), t: performance.now(), v: 0 };
    paused.current = true;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const now = performance.now();
    const next = d.start - (e.clientX - d.x) / (cardW * 0.9);
    d.v = (next - target.get()) / Math.max(1, now - d.t) * 1000; d.t = now;
    target.set(next);
  };
  const onPointerUp = () => {
    const d = drag.current; drag.current = null; paused.current = false;
    if (!d) return;
    const coast = Math.max(-3, Math.min(3, d.v * 0.25));
    const to = Math.round(target.get() + coast);
    if (reduce) target.set(to); else animate(target, to, { type: "spring", stiffness: 120, damping: 24 });
  };

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-background py-24 sm:py-32" aria-roledescription="carousel" aria-label="Faces of the game">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-10 max-w-3xl text-center sm:mb-14"
        >
          <p className="mb-4 text-sm font-medium text-primary/80">Faces of the game</p>
          <h2 className="font-display text-4xl leading-[1.05] tracking-[-0.03em] text-foreground text-balance sm:text-5xl lg:text-6xl">
            The talent already here.
          </h2>
          <p className="mx-auto mt-5 max-w-[60ch] text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
            Football, cricket and basketball. Real players on real grounds, from every corner of Bangladesh.
            Cholo Kheli exists so their next move finds them.
          </p>
        </motion.div>
      </div>

      <div
        className="relative mx-auto w-full cursor-grab touch-pan-y select-none outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring"
        style={{ height: cardH + 120, perspective: `${radius * 2.6}px`, perspectiveOrigin: "50% 38%" }}
        tabIndex={0}
        aria-label="Athlete photos. Use the left and right arrow keys to turn."
        onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); go(1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseEnter={() => { paused.current = true; }}
        onMouseLeave={() => { paused.current = false; }}
      >
        {/* Soft floor shadow that anchors the drum */}
        <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-foreground/15 blur-2xl"
          style={{ top: cardH * 0.5 + 60 + cardH * 0.46, width: cardW * 2.6, height: 44 }} />
        <motion.div className="absolute left-1/2 top-[60px]" style={{ transformStyle: "preserve-3d", rotateX: tilt, y: lift }}>
          {CARDS.map((c, i) => (
            <DrumCard key={c.src} card={c} index={i} position={position} cardW={cardW} cardH={cardH} radius={radius} isFront={front === i} />
          ))}
        </motion.div>
      </div>

      <div className="container mt-6 flex items-center justify-center gap-5">
        <button type="button" onClick={() => go(-1)} aria-label="Previous athlete"
          className="grid h-11 w-11 place-items-center rounded-full bg-card text-foreground shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5" aria-hidden>
          {CARDS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${front === i ? "w-6 bg-foreground" : "w-1.5 bg-foreground/25"}`} />
          ))}
        </div>
        <button type="button" onClick={() => go(1)} aria-label="Next athlete"
          className="grid h-11 w-11 place-items-center rounded-full bg-card text-foreground shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <p className="sr-only" aria-live="polite">{CARDS[front].sport}, {CARDS[front].caption}</p>
    </section>
  );
}

function DrumCard({ card, index, position, cardW, cardH, radius, isFront }: {
  card: Card; index: number; position: MotionValue<number>; cardW: number; cardH: number; radius: number; isFront: boolean;
}) {
  // Angle of this card relative to the front of the drum, in degrees.
  const angle = useTransform(position, (p) => wrap(index - p) * STEP);
  const transform = useTransform(angle, (a) => {
    const r = (a * Math.PI) / 180;
    const x = Math.sin(r) * radius;
    const z = (Math.cos(r) - 1) * radius;
    return `translate3d(${x - cardW / 2}px, 0px, ${z}px) rotateY(${a}deg)`;
  });
  const opacity = useTransform(angle, [-115, -82, 82, 115], [0, 1, 1, 0], { clamp: true });
  const shade = useTransform(angle, [-90, 0, 90], [0.62, 0, 0.62]);
  const zIndex = useTransform(angle, (a) => 100 - Math.round(Math.abs(a)));
  const caption = useTransform(angle, [-24, 0, 24], [0, 1, 0]);

  return (
    <motion.figure
      className="absolute left-0 top-0 m-0 overflow-hidden rounded-[22px] bg-[hsl(200_40%_6%)] shadow-[0_28px_60px_-24px_rgba(8,24,30,0.65)] ring-1 ring-white/10"
      style={{ width: cardW, height: cardH, transform, opacity, zIndex, backfaceVisibility: "hidden", willChange: "transform" }}
      aria-hidden={!isFront}
    >
      <img src={card.src} alt={`${card.sport} player, ${card.caption}`} draggable={false} loading="lazy" decoding="async"
        className="h-full w-full select-none object-cover" />
      {/* Side cards dim as they turn away, like light falling off a curved surface */}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-[hsl(200_40%_5%)]" style={{ opacity: shade }} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <motion.figcaption className="absolute inset-x-4 bottom-4 text-white" style={{ opacity: caption }}>
        <span className="block font-display text-xl leading-tight tracking-tight">{card.sport}</span>
        <span className="block text-sm text-white/75">{card.caption}</span>
      </motion.figcaption>
    </motion.figure>
  );
}
