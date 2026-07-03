import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import CholoKheliMark from "@/components/CholoKheliMark";
import heroVideo from "@/assets/hero-scroll.mp4.asset.json";
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
 * Scroll-scrubbed cinematic hero.
 *
 * Video is 14.72s @ 25fps. Scene keyframes (measured from the source):
 *   0.4s  — football on misty field (opening)
 *   3.5s  — camera pulled back to reveal the Cholo Kheli stadium
 *   5.5s  — dive into stadium → cricket ball resting in the arena
 *  10.0s  — ball has transformed to a basketball, hovering above the rim
 *  13.5s  — basketball has dropped through the net (final beat)
 *
 * Each beat is a "play + hold" pair. The play portion of a beat gets a
 * scroll share proportional to how many seconds of video it must cover,
 * so playback speed is constant (natural, no frame skipping). The hold
 * portion is a fixed slice where the video is pinned on that beat's
 * frame and the text panel fades in. A final REVEAL beat slides the
 * misty football-field panel up over the last frame.
 */
type BeatKind = "split" | "center" | "left";
interface Beat {
  /** Exact video time in seconds where this beat lands and holds. */
  videoAt: number;
  kind: BeatKind;
  kicker: string;
  titleA: string;
  titleB?: string;
  body?: string;
}

const BEATS: Beat[] = [
  // 0 — opening: football on misty field, text on either side (not centered)
  {
    videoAt: 0.4,
    kind: "split",
    kicker: "BANGLADESH",
    titleA: "From every para,",
    titleB: "a nation of players.",
  },
  // 1 — camera pulls back to reveal the stadium
  {
    videoAt: 3.5,
    kind: "center",
    kicker: "WELCOME TO",
    titleA: "Cholo Kheli.",
    body: "The home of Bangladeshi sport — where every talent is seen.",
  },
  // 2 — dive into stadium → cricket ball, text on either side
  {
    videoAt: 5.5,
    kind: "split",
    kicker: "CRICKET",
    titleA: "Every over,",
    titleB: "every opportunity.",
  },
  // 3 — ball is now a basketball hovering above the rim, text on the left
  {
    videoAt: 10.0,
    kind: "left",
    kicker: "BASKETBALL",
    titleA: "Rise. Reach.",
    titleB: "Be recruited.",
  },
  // 4 — basketball has dropped through the rim (final frame)
  {
    videoAt: 13.5,
    kind: "center",
    kicker: "EVERY ATHLETE",
    titleA: "Discovered on merit.",
  },
];

/** Fixed scroll share reserved for each beat's "hold" (text fade-in). */
const HOLD_SHARE = 0.06;
/** Scroll share reserved at the end for the misty-field reveal panel. */
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
  const videoRef = useRef<HTMLVideoElement>(null);
  // -1 = between beats (text hidden while video is playing)
  const [beat, setBeat] = useState(0);
  const [revealCTA, setRevealCTA] = useState(0); // 0..1 progress of the field slide-up

  useEffect(() => {
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

      const video = videoRef.current;
      const wrap = wrapRef.current;
      const pin = pinRef.current;
      if (!video || !wrap || !pin) return;

      const start = () => {
        if (cancelled) return;
        const duration = video.duration;
        if (!duration || Number.isNaN(duration)) return;

        // Beats live at these fractions of the video timeline. Between them,
        // the video plays (scrubbed linearly). At each beat we PAUSE the video
        // (a short "hold" window) and fade the text panel in.
        //
        // Timeline layout (scroll progress 0..1):
        //   [play → beat0 hold] [play → beat1 hold] ... [play → beat4 hold]
        //   [reveal misty field + CTAs]
        //
        // We give each of the 5 play+hold pairs equal share of the first 85%
        // of scroll, then the last 15% is the field-reveal.
        const N = BEATS.length; // 5
        const REVEAL_START = 0.85;
        const beatShare = REVEAL_START / N; // 0.17
        const holdShare = beatShare * 0.35;  // ~35% of each pair is the "hold"

        const proxy = { t: 0 };
        const setTime = () => {
          try {
            // requestVideoFrameCallback would be ideal but not universal;
            // setting currentTime each tick is smooth enough with scrub.
            video.currentTime = proxy.t;
          } catch {}
        };

        const ctx = gsap.context(() => {
          ScrollTrigger.create({
            trigger: wrap,
            start: "top top",
            end: () => "+=" + window.innerHeight * 6,
            pin: pin,
            pinSpacing: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const p = self.progress;

              // ---- Video timeline mapping ----
              if (p < REVEAL_START) {
                const local = p / REVEAL_START; // 0..1 within the video section
                const idx = Math.min(N - 1, Math.floor(local / (1 / N)));
                const withinBeat = (local - idx / N) * N; // 0..1 within this beat
                const playPortion = 1 - (holdShare / beatShare); // 0..0.65

                // From previous beat's frame → this beat's frame during "play",
                // then hold on this beat's frame.
                const prevFrame = idx === 0 ? 0 : BEATS[idx - 1].videoAt;
                const targetFrame = BEATS[idx].videoAt;

                let frame: number;
                let showText: boolean;
                if (withinBeat <= playPortion) {
                  const k = withinBeat / playPortion; // 0..1
                  frame = prevFrame + (targetFrame - prevFrame) * k;
                  showText = false;
                } else {
                  frame = targetFrame;
                  showText = true;
                }
                proxy.t = frame * (duration - 0.05);
                setTime();
                setBeat(showText ? idx : -1);
                setRevealCTA(0);
              } else {
                // Field slide-up section
                proxy.t = duration - 0.05;
                setTime();
                setBeat(-1);
                const r = (p - REVEAL_START) / (1 - REVEAL_START);
                setRevealCTA(Math.min(1, Math.max(0, r)));
              }
            },
          });
        }, pin);

        cleanup = () => ctx.revert();
      };

      if (video.readyState >= 1 && video.duration) {
        start();
      } else {
        const onMeta = () => start();
        video.addEventListener("loadedmetadata", onMeta, { once: true });
        cleanup = () => video.removeEventListener("loadedmetadata", onMeta);
      }
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
  }, []);

  return (
    <section
      ref={wrapRef}
      className="relative w-full"
      style={{ background: "hsl(0 0% 3%)" }}
    >
      <div
        ref={pinRef}
        className="relative w-full h-[100svh] overflow-hidden"
      >
        {/* Video */}
        <video
          ref={videoRef}
          src={heroVideo.url}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          className="absolute inset-0 w-full h-full object-cover"
          style={{ willChange: "transform" }}
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
          style={{
            transform: `translateX(-50%) scale(${revealCTA > 0.4 ? 0.55 : 1})`,
          }}
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

            // center
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

        {/* Misty football-field reveal panel — slides up over the final frame */}
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

        {/* Scroll nudge — hidden once the reveal starts */}
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
