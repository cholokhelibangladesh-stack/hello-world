import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import CholoKheliMark from "@/components/CholoKheliMark";
import atlas0 from "@/assets/hero-atlas-0.jpg.asset.json";
import atlas1 from "@/assets/hero-atlas-1.jpg.asset.json";
import mistyField from "@/assets/hero-field-reveal.jpg.asset.json";
import sharpBeat0 from "@/assets/hero-beat-008.jpg.asset.json";
import sharpBeat1 from "@/assets/hero-beat-060.jpg.asset.json";
import sharpBeat2 from "@/assets/hero-beat-108.jpg.asset.json";
import sharpBeat3 from "@/assets/hero-beat-199.jpg.asset.json";
import sharpBeat4 from "@/assets/hero-beat-279.jpg.asset.json";

// AI-enhanced sharp still for each beat. Overlaid on top of the canvas
// when the animation settles on that beat, then hidden again the moment
// the next scroll gesture starts playback.
const SHARP_BEATS = [sharpBeat0.url, sharpBeat1.url, sharpBeat2.url, sharpBeat3.url, sharpBeat4.url];

interface HeroScrollVideoProps {
  tagline: string;
  scrollLabel: string;
  joinLabel: string;
  scoutLabel: string;
  openDashboardLabel: string;
  isAuthed: boolean;
  dashboardHref: string;
}

/**
 * Scroll-scrubbed cinematic hero, driven by a sprite atlas of 74 frames
 * (10 cols × 8 rows, 480×270 per frame). Each scroll pixel advances the
 * frame index deterministically — no video decoder, no seek jank, every
 * frame lands exactly where intended.
 *
 * Beats (frame indices in the atlas):
 *   2  — football on misty field (opening)
 *  15  — camera pulled back, Cholo Kheli stadium fully revealed
 *  27  — dive into stadium, cricket ball resting in the arena
 *  50  — basketball hovering above the rim
 *  70  — basketball has dropped through the net (final beat)
 */

const ATLAS_COLS = 12;
const ATLAS_ROWS = 13;
const FRAME_W = 1280;
const FRAME_H = 720;
const FRAME_COUNT = 295;
const FRAMES_PER_ATLAS = ATLAS_COLS * ATLAS_ROWS; // 156
const ATLAS_URLS = [atlas0.url, atlas1.url];



type BeatKind = "split" | "center" | "left";
interface Beat {
  frame: number;
  kind: BeatKind;
  kicker: string;
  titleA: string;
  titleB?: string;
  body?: string;
}

const BEATS: Beat[] = [
  {
    frame: 8,
    kind: "split",
    kicker: "BANGLADESH",
    titleA: "From every para,",
    titleB: "a nation of players.",
  },
  {
    frame: 60,
    kind: "center",
    kicker: "WELCOME TO",
    titleA: "Cholo Kheli.",
    body: "The home of Bangladeshi sport — where every talent is seen.",
  },
  {
    frame: 108,
    kind: "split",
    kicker: "CRICKET",
    titleA: "Every over,",
    titleB: "every opportunity.",
  },
  {
    frame: 199,
    kind: "left",
    kicker: "BASKETBALL",
    titleA: "Rise. Reach.",
    titleB: "Be recruited.",
  },
  {
    frame: 279,
    kind: "center",
    kicker: "EVERY ATHLETE",
    titleA: "Discovered on merit.",
  },
];

const HOLD_SHARE = 0.06;
const REVEAL_SHARE = 0.14;

export default function HeroScrollVideo({
  scrollLabel,
  joinLabel,
  scoutLabel,
  openDashboardLabel,
  isAuthed,
  dashboardHref,
  tagline,
}: HeroScrollVideoProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const atlasImgsRef = useRef<(HTMLImageElement | null)[]>([null, null]);
  const currentFrameRef = useRef<number>(-1);
  const pendingFrameRef = useRef<number>(-1);
  const rafRef = useRef<number | null>(null);
  const canvasSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  // Cached beat/reveal so we only touch React state when the visible
  // panel actually changes — avoids a re-render on every scroll tick.
  const beatRef = useRef<number>(0);
  const revealRef = useRef<number>(0);
  const [beat, setBeat] = useState<number>(0);
  const [revealCTA, setRevealCTA] = useState(0);
  const [ready, setReady] = useState(false);
  // Which beat's AI-enhanced still is currently visible on top of the
  // canvas. -1 while the video is animating between beats or while the
  // reveal panel is open.
  const [settledBeat, setSettledBeat] = useState<number>(0);

  // Preload both atlases in parallel.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const imgs: HTMLImageElement[] = [];
    const loads = ATLAS_URLS.map(
      (url, i) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.decoding = "async";
          img.src = url;
          img.onload = () => {
            imgs[i] = img;
            atlasImgsRef.current[i] = img;
            resolve();
          };
          img.onerror = () => resolve();
        })
    );
    Promise.all(loads).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Actual canvas paint — called at most once per animation frame.
  const paintFrame = (f: number) => {
    const canvas = canvasRef.current;
    const atlasIdx = Math.min(ATLAS_URLS.length - 1, Math.floor(f / FRAMES_PER_ATLAS));
    const img = atlasImgsRef.current[atlasIdx];
    if (!canvas || !img) return;
    if (currentFrameRef.current === f) return;
    currentFrameRef.current = f;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Size canvas to viewport (accounting for DPR) — recompute only when
    // the layout box actually changes, not on every draw.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const targetW = Math.floor(cw * dpr);
    const targetH = Math.floor(ch * dpr);
    if (canvasSizeRef.current.w !== targetW || canvasSizeRef.current.h !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvasSizeRef.current = { w: targetW, h: targetH };
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }

    const localIdx = f - atlasIdx * FRAMES_PER_ATLAS;
    const col = localIdx % ATLAS_COLS;
    const row = Math.floor(localIdx / ATLAS_COLS);
    const sx = col * FRAME_W;
    const sy = row * FRAME_H;

    // object-fit: cover math
    const srcAspect = FRAME_W / FRAME_H;
    const dstAspect = targetW / targetH;
    let dw: number, dh: number, dx: number, dy: number;
    if (dstAspect > srcAspect) {
      dw = targetW;
      dh = targetW / srcAspect;
      dx = 0;
      dy = (targetH - dh) / 2;
    } else {
      dh = targetH;
      dw = targetH * srcAspect;
      dy = 0;
      dx = (targetW - dw) / 2;
    }
    ctx.drawImage(img, sx, sy, FRAME_W, FRAME_H, dx, dy, dw, dh);
  };

  // Coalesce multiple frame requests within the same animation frame into
  // a single draw. This is the key jank-reduction on low-end devices —
  // many scroll ticks per frame collapse to one paint.
  const scheduleFrame = (frameFloat: number) => {
    const f = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(frameFloat)));
    pendingFrameRef.current = f;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const next = pendingFrameRef.current;
      if (next >= 0) paintFrame(next);
    });
  };


  // Gesture-driven, constant-speed driver.
  //
  // The hero pins itself at the top by locking body scroll while active.
  // Every scroll gesture (wheel tick, trackpad flick, touch swipe, key)
  // advances or retreats EXACTLY ONE step — a beat, or the final reveal.
  // The frame animation between beats always plays at the same natural
  // frame rate (PLAYBACK_FPS), so the video never fast-forwards or skips
  // no matter how big the scroll input was.
  useEffect(() => {
    if (!ready) return;
    if (typeof window === "undefined") return;

    let cleanup: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { Observer }] = await Promise.all([
        import("gsap"),
        import("gsap/Observer"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(Observer);

      const wrap = wrapRef.current;
      if (!wrap) return;

      // ─── constants ────────────────────────────────────────────────
      const PLAYBACK_FPS = 30;      // natural playback rate between beats
      const MIN_TRANSITION = 0.35;  // seconds, floor for very short hops
      const REVEAL_DURATION = 0.7;  // seconds, panel slide-in
      const GESTURE_TOLERANCE = 10; // pixels — ignore micro-noise
      const N = BEATS.length;

      // ─── mutable driver state ─────────────────────────────────────
      const anim = { f: BEATS[0].frame, r: 0 };
      let currentBeat = 0;
      let animating = false;
      let released = false;
      let observer: { disable: () => void; enable: () => void; kill: () => void } | null = null;


      // Paint the first frame.
      scheduleFrame(anim.f);
      beatRef.current = 0;
      setBeat(0);

      // ─── frame tween (constant PLAYBACK_FPS) ──────────────────────
      const animateFrameTo = (target: number, done?: () => void) => {
        animating = true;
        const delta = Math.abs(target - anim.f);
        const duration = Math.max(MIN_TRANSITION, delta / PLAYBACK_FPS);
        gsap.to(anim, {
          f: target,
          duration,
          ease: "power2.inOut",
          overwrite: true,
          onUpdate: () => scheduleFrame(anim.f),
          onComplete: () => {
            animating = false;
            done?.();
          },
        });
      };

      const animateRevealTo = (target: number, done?: () => void) => {
        animating = true;
        gsap.to(anim, {
          r: target,
          duration: REVEAL_DURATION,
          ease: "power2.inOut",
          overwrite: true,
          onUpdate: () => {
            const q = Math.round(anim.r * 50) / 50;
            if (Math.abs(q - revealRef.current) > 1e-4) {
              revealRef.current = q;
              setRevealCTA(q);
            }
          },
          onComplete: () => {
            // Ensure exact final value.
            revealRef.current = target;
            setRevealCTA(target);
            animating = false;
            done?.();
          },
        });
      };

      // ─── one-step advance / retreat ───────────────────────────────
      // Text and sharp still ONLY appear once playback stops on the beat's
      // dedicated frame. During the between-beat animation, all overlays
      // are hidden so the viewer sees clean video.
      const goForward = () => {
        if (animating || released) return;
        // Hide overlays for the beat we're leaving.
        setSettledBeat(-1);
        if (beatRef.current !== -1) {
          beatRef.current = -1;
          setBeat(-1);
        }
        if (currentBeat < N - 1) {
          const next = currentBeat + 1;
          animateFrameTo(BEATS[next].frame, () => {
            currentBeat = next;
            beatRef.current = next;
            setBeat(next);
            setSettledBeat(next);
          });
        } else if (anim.r < 1) {
          animateRevealTo(1, () => {
            // Release the pin — allow the rest of the page to scroll.
            released = true;
            observer.disable();
            document.documentElement.style.overflow = prevHtmlOverflow;
            document.body.style.overflow = prevBodyOverflow;
          });
        }
      };


      const goBackward = () => {
        if (animating || released) return;
        setSettledBeat(-1);
        if (beatRef.current !== -1) {
          beatRef.current = -1;
          setBeat(-1);
        }
        if (anim.r > 0) {
          // Slide the reveal panel back down and restore the last beat.
          animateRevealTo(0, () => {
            beatRef.current = N - 1;
            setBeat(N - 1);
            setSettledBeat(N - 1);
          });
        } else if (currentBeat > 0) {
          const prev = currentBeat - 1;
          animateFrameTo(BEATS[prev].frame, () => {
            currentBeat = prev;
            beatRef.current = prev;
            setBeat(prev);
            setSettledBeat(prev);
          });
        } else {
          // Already at first beat — snap overlays back on.
          beatRef.current = 0;
          setBeat(0);
          setSettledBeat(0);
        }
      };

      // ─── lock the page while the hero is active ───────────────────
      const prevHtmlOverflow = document.documentElement.style.overflow;
      const prevBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      window.scrollTo(0, 0);

      // ─── one-gesture-per-scroll interception ──────────────────────
      // Observer coalesces wheel/touch/key into discrete up/down events,
      // so a giant trackpad flick and a single wheel tick both count as
      // exactly one gesture. Combined with the constant-rate tween above,
      // this means the video plays at its natural speed on every scroll.
      const observer = Observer.create({
        target: window,
        type: "wheel,touch,pointer",
        tolerance: GESTURE_TOLERANCE,
        preventDefault: true,
        wheelSpeed: 1,
        onUp: () => goBackward(),   // user scrolled up (content moved down)
        onDown: () => goForward(),  // user scrolled down (content moved up)
        onPress: () => {},
      });

      cleanup = () => {
        observer.kill();
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.body.style.overflow = prevBodyOverflow;
        gsap.killTweensOf(anim);
      };
    })();

    return () => {
      cancelled = true;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      cleanup?.();
    };
  }, [ready]);

  return (
    <section ref={wrapRef} className="relative w-full" style={{ background: "hsl(0 0% 3%)" }}>
      <div ref={pinRef} className="relative w-full h-[100svh] overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
          style={{ background: "hsl(0 0% 3%)" }}
        />

        {/* AI-enhanced sharp stills, one per beat. Fade in the instant the
            video settles on a beat; fade out again the moment the next
            gesture starts playback. Sits above the canvas but below the
            gradient/text so the beat text remains legible. */}
        {SHARP_BEATS.map((url, i) => (
          <img
            key={i}
            src={url}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 ease-out"
            style={{ opacity: settledBeat === i ? 1 : 0 }}
          />
        ))}



        {/* Cinematic gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.85) 100%)",
          }}
        />

        {/* Mark */}
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 z-20 transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-50%) scale(${revealCTA > 0.4 ? 0.55 : 1})` }}
        >
          <CholoKheliMark className="h-14 w-20 sm:h-16 sm:w-24 drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]" />
        </div>

        {/* Text beats */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {BEATS.map((b, i) => {
            const active = beat === i;
            const baseClass =
              "absolute inset-0 flex items-center px-6 sm:px-12 transition-all duration-700 ease-out";
            const opacity = active ? 1 : 0;
            const blur = active ? "blur(0px)" : "blur(6px)";
            const translate = active ? "0px" : beat > i ? "-16px" : "16px";

            if (b.kind === "split") {
              return (
                <div
                  key={i}
                  className={baseClass + " justify-between"}
                  style={{ opacity, filter: blur, transform: `translateY(${translate})` }}
                >
                  <div className="max-w-[45%] text-left">
                    <div className="text-[10px] sm:text-xs tracking-[0.4em] uppercase text-[hsl(188_60%_72%)] mb-3 font-medium">
                      {b.kicker}
                    </div>
                    <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-medium text-white tracking-[0.02em] leading-[1.05] drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
                      {b.titleA}
                    </h2>
                  </div>
                  <div className="max-w-[45%] text-right self-end mb-8 sm:mb-16">
                    <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-medium text-white tracking-[0.02em] leading-[1.05] drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
                      {b.titleB}
                    </h2>
                  </div>
                </div>
              );
            }

            if (b.kind === "left") {
              return (
                <div
                  key={i}
                  className={baseClass + " justify-start"}
                  style={{ opacity, filter: blur, transform: `translateY(${translate})` }}
                >
                  <div className="max-w-[52%] text-left">
                    <div className="text-[10px] sm:text-xs tracking-[0.4em] uppercase text-[hsl(188_60%_72%)] mb-3 font-medium">
                      {b.kicker}
                    </div>
                    <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-medium text-white tracking-[0.02em] leading-[1.05] drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
                      {b.titleA}
                    </h2>
                    {b.titleB && (
                      <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-medium text-white/90 tracking-[0.02em] leading-[1.05] mt-1 drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
                        {b.titleB}
                      </h2>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={i}
                className={baseClass + " justify-center"}
                style={{ opacity, filter: blur, transform: `translateY(${translate})` }}
              >
                <div className="max-w-2xl text-center">
                  <div className="text-[10px] sm:text-xs tracking-[0.4em] uppercase text-[hsl(188_60%_72%)] mb-4 font-medium">
                    {b.kicker}
                  </div>
                  <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl font-medium text-white tracking-[0.02em] leading-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
                    {b.titleA}
                  </h2>
                  {b.body && (
                    <p className="mt-6 text-sm sm:text-base text-white/80 max-w-lg mx-auto leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                      {b.body}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Misty football-field reveal panel */}
        <div
          className="absolute inset-0 z-30"
          style={{
            transform: `translateY(${(1 - revealCTA) * 100}%)`,
            transition: "transform 120ms linear",
            pointerEvents: revealCTA > 0.9 ? "auto" : "none",
          }}
        >
          <div className="relative w-full h-full">
            <img
              src={mistyField.url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)",
              }}
            />
            <div
              className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center transition-all duration-700 ease-out"
              style={{
                opacity: revealCTA > 0.35 ? 1 : 0,
                transform: `translateY(${revealCTA > 0.35 ? 0 : 24}px)`,
              }}
            >
              <div className="text-[10px] sm:text-xs tracking-[0.4em] uppercase text-[hsl(188_60%_72%)] mb-4 font-medium">
                YOUR MOVE
              </div>
              <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl font-medium text-white tracking-[0.02em] leading-tight max-w-3xl">
                Step onto the field.
              </h2>
              <p className="mt-6 text-sm sm:text-base text-white/80 max-w-lg leading-relaxed">
                Join Cholo Kheli as a player to be discovered, or as a scout to discover the next generation.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                {isAuthed ? (
                  <Link to={dashboardHref as any}>
                    <Button
                      size="lg"
                      className="font-medium text-base px-9 py-6 rounded-full"
                      style={{
                        background: "hsl(var(--teal-deep))",
                        color: "hsl(var(--primary-foreground))",
                      }}
                    >
                      {openDashboardLabel} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button
                        size="lg"
                        className="font-medium text-base px-9 py-6 rounded-full"
                        style={{
                          background: "hsl(var(--teal-deep))",
                          color: "hsl(var(--primary-foreground))",
                        }}
                      >
                        {joinLabel} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/auth" search={{ role: "scout" }}>
                      <Button
                        size="lg"
                        variant="outline"
                        className="font-medium text-base px-9 py-6 rounded-full bg-white/5 backdrop-blur-sm hover:bg-white/15"
                        style={{
                          borderColor: "rgba(255,255,255,0.4)",
                          color: "#ffffff",
                        }}
                      >
                        {scoutLabel}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll nudge */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-[9px] tracking-[0.35em] uppercase text-white/70 transition-opacity duration-500"
          style={{ opacity: revealCTA > 0 ? 0 : 0.75 }}
        >
          {scrollLabel || "Scroll"}
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-20">
          <div
            className="h-full"
            style={{
              width: `${
                (revealCTA > 0
                  ? 0.85 + revealCTA * 0.15
                  : Math.max(0, Math.min(1, (beat === -1 ? 0 : (beat + 1) / (BEATS.length + 1))))) * 100
              }%`,
              background: "hsl(188 60% 70%)",
              transition: "width 120ms linear",
            }}
          />
        </div>

        <span className="sr-only">{tagline}</span>
      </div>
    </section>
  );
}
