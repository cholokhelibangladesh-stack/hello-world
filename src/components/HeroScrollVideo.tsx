import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import CholoKheliMark from "@/components/CholoKheliMark";
import atlas from "@/assets/hero-atlas.jpg.asset.json";
import mistyField from "@/assets/footballer-motion.jpg.asset.json";

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

const ATLAS_COLS = 10;
const ATLAS_ROWS = 8;
const FRAME_W = 960;
const FRAME_H = 540;
const FRAME_COUNT = 74;


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
    frame: 2,
    kind: "split",
    kicker: "BANGLADESH",
    titleA: "From every para,",
    titleB: "a nation of players.",
  },
  {
    frame: 15,
    kind: "center",
    kicker: "WELCOME TO",
    titleA: "Cholo Kheli.",
    body: "The home of Bangladeshi sport — where every talent is seen.",
  },
  {
    frame: 27,
    kind: "split",
    kicker: "CRICKET",
    titleA: "Every over,",
    titleB: "every opportunity.",
  },
  {
    frame: 50,
    kind: "left",
    kicker: "BASKETBALL",
    titleA: "Rise. Reach.",
    titleB: "Be recruited.",
  },
  {
    frame: 70,
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
  const atlasImgRef = useRef<HTMLImageElement | null>(null);
  const currentFrameRef = useRef<number>(-1);
  const [beat, setBeat] = useState<number>(0);
  const [revealCTA, setRevealCTA] = useState(0);
  const [ready, setReady] = useState(false);

  // Preload the atlas.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const img = new Image();
    img.decoding = "async";
    img.src = atlas.url;
    img.onload = () => {
      atlasImgRef.current = img;
      setReady(true);
    };
    return () => {
      img.onload = null;
    };
  }, []);

  // Draw a specific frame into the canvas, letterboxed to cover.
  const drawFrame = (frame: number) => {
    const canvas = canvasRef.current;
    const img = atlasImgRef.current;
    if (!canvas || !img) return;
    const f = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(frame)));
    if (currentFrameRef.current === f) return;
    currentFrameRef.current = f;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to viewport (accounting for DPR) once per resize.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (canvas.width !== Math.floor(cw * dpr) || canvas.height !== Math.floor(ch * dpr)) {
      canvas.width = Math.floor(cw * dpr);
      canvas.height = Math.floor(ch * dpr);
    }

    const col = f % ATLAS_COLS;
    const row = Math.floor(f / ATLAS_COLS);
    const sx = col * FRAME_W;
    const sy = row * FRAME_H;

    // object-fit: cover math
    const targetW = canvas.width;
    const targetH = canvas.height;
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

  // ScrollTrigger driver.
  useEffect(() => {
    if (!ready) return;
    if (typeof window === "undefined") return;

    let cleanup: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const wrap = wrapRef.current;
      const pin = pinRef.current;
      if (!wrap || !pin) return;

      // Draw first frame immediately.
      drawFrame(BEATS[0].frame);

      // Build the scroll → (frame, beat) segment map. Each PLAY segment gets
      // a scroll share proportional to the number of frames it must cover,
      // so playback runs at a constant, natural frame rate.
      const N = BEATS.length;
      const playDeltas: number[] = [];
      let prev = 0;
      for (const b of BEATS) {
        playDeltas.push(Math.max(0, b.frame - prev));
        prev = b.frame;
      }
      const totalPlay = playDeltas.reduce((a, b) => a + b, 0) || 1;
      const totalHold = HOLD_SHARE * N;
      const totalPlayShare = Math.max(0, 1 - totalHold - REVEAL_SHARE);

      interface Seg {
        kind: "play" | "hold" | "reveal";
        start: number;
        end: number;
        from: number;
        to: number;
        beatIdx: number;
      }
      const segs: Seg[] = [];
      let cursor = 0;
      let fprev = 0;
      for (let i = 0; i < N; i++) {
        const playLen = (playDeltas[i] / totalPlay) * totalPlayShare;
        segs.push({
          kind: "play",
          start: cursor,
          end: cursor + playLen,
          from: fprev,
          to: BEATS[i].frame,
          beatIdx: i,
        });
        cursor += playLen;
        segs.push({
          kind: "hold",
          start: cursor,
          end: cursor + HOLD_SHARE,
          from: BEATS[i].frame,
          to: BEATS[i].frame,
          beatIdx: i,
        });
        cursor += HOLD_SHARE;
        fprev = BEATS[i].frame;
      }
      segs.push({
        kind: "reveal",
        start: cursor,
        end: 1,
        from: fprev,
        to: FRAME_COUNT - 1,
        beatIdx: N - 1,
      });

      const ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: wrap,
          start: "top top",
          // Long distance = ~1 scroll pixel per frame update = silky.
          end: () => "+=" + window.innerHeight * 7,
          pin: pin,
          pinSpacing: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => {
            // Force canvas resize + redraw on layout changes.
            currentFrameRef.current = -1;
            drawFrame(BEATS[0].frame);
          },
          onUpdate: (self) => {
            const p = self.progress;
            let seg = segs[segs.length - 1];
            for (const s of segs) {
              if (p <= s.end) {
                seg = s;
                break;
              }
            }
            const span = Math.max(1e-6, seg.end - seg.start);
            const local = Math.min(1, Math.max(0, (p - seg.start) / span));
            const frame = seg.from + (seg.to - seg.from) * local;
            drawFrame(frame);

            if (seg.kind === "play") {
              setBeat(-1);
              setRevealCTA(0);
            } else if (seg.kind === "hold") {
              setBeat(seg.beatIdx);
              setRevealCTA(0);
            } else {
              setBeat(-1);
              setRevealCTA(local);
            }
          },
        });
      }, pin);

      cleanup = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
      import("gsap/ScrollTrigger")
        .then(({ ScrollTrigger }) => {
          ScrollTrigger.getAll().forEach((t) => {
            if (t.trigger === wrapRef.current) t.kill();
          });
        })
        .catch(() => {});
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
