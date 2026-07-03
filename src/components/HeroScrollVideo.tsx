import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import CholoKheliMark from "@/components/CholoKheliMark";
import heroVideo from "@/assets/hero-scroll.mp4.asset.json";

interface HeroScrollVideoProps {
  tagline: string;
  scrollLabel: string;
  joinLabel: string;
  scoutLabel: string;
  openDashboardLabel: string;
  isAuthed: boolean;
  dashboardHref: string;
}

const STAGES = [
  { kicker: "CHOLO KHELI", title: "Bangladesh, in motion.", body: "" },
  { kicker: "Football", title: "From para to pitch.", body: "Every strike, every save — captured for scouts who're watching." },
  { kicker: "Cricket", title: "Bat. Ball. Belief.", body: "Maktab grounds to national selection — a verified pathway to be seen." },
  { kicker: "Every athlete", title: "Discovered on merit.", body: "Safe. Transparent. Built for the love of the game." },
];

export default function HeroScrollVideo({
  tagline,
  scrollLabel,
  joinLabel,
  scoutLabel,
  openDashboardLabel,
  isAuthed,
  dashboardHref,
}: HeroScrollVideoProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stage, setStage] = useState(0);
  const [showCTA, setShowCTA] = useState(false);

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

        // Proxy object animated by GSAP; we set currentTime on tick.
        const proxy = { t: 0 };

        const ctx = gsap.context(() => {
          const tween = gsap.to(proxy, {
            t: duration - 0.05,
            ease: "none",
            paused: true,
            onUpdate: () => {
              try {
                video.currentTime = proxy.t;
              } catch {}
            },
          });

          ScrollTrigger.create({
            trigger: wrap,
            start: "top top",
            end: () => "+=" + window.innerHeight * 4,
            pin: pin,
            pinSpacing: true,
            scrub: 1.2, // smoothing (in seconds) — this is what makes it silky
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              // Drive the tween by scroll progress (smooth thanks to scrub)
              tween.progress(self.progress);

              const p = self.progress;
              const s =
                p < 0.22 ? 0 :
                p < 0.48 ? 1 :
                p < 0.75 ? 2 :
                3;
              setStage((prev) => (prev === s ? prev : s));
              setShowCTA(p >= 0.94);
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
      // Extra safety: kill any lingering triggers scoped to this wrap
      import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
        ScrollTrigger.getAll().forEach((t) => {
          if (t.trigger === wrapRef.current) t.kill();
        });
      }).catch(() => {});
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
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.8) 100%)",
          }}
        />

        {/* Mark — always present, shrinks at final stage */}
        <div
          className="absolute top-8 left-1/2 -translate-x-1/2 z-10 transition-all duration-700 ease-out"
          style={{
            transform: `translateX(-50%) scale(${stage === 3 ? 0.55 : 1})`,
            opacity: 1,
          }}
        >
          <CholoKheliMark
            className="h-16 w-24 sm:h-20 sm:w-28 text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
            accent="hsl(188 60% 70%)"
          />
        </div>

        {/* Rotating text stages */}
        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <div className="w-full max-w-2xl text-center">
            {STAGES.map((s, i) => (
              <div
                key={i}
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 transition-all duration-700 ease-out"
                style={{
                  opacity: stage === i ? 1 : 0,
                  transform: `translateY(${stage === i ? "-50%" : stage > i ? "-56%" : "-44%"})`,
                  filter: stage === i ? "blur(0px)" : "blur(6px)",
                  pointerEvents: stage === i ? "auto" : "none",
                }}
              >
                <div className="text-[10px] sm:text-xs tracking-[0.4em] uppercase text-[hsl(188_60%_72%)] mb-4 font-medium">
                  {s.kicker}
                </div>
                <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl font-medium text-white tracking-[0.02em] leading-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
                  {s.title}
                </h2>
                {s.body && (
                  <p className="mt-6 text-sm sm:text-base text-white/80 max-w-lg mx-auto leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                    {s.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTAs — appear on final frame */}
        <div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex flex-col sm:flex-row gap-3 transition-all duration-700 ease-out"
          style={{
            opacity: showCTA ? 1 : 0,
            transform: `translateX(-50%) translateY(${showCTA ? 0 : 24}px)`,
            pointerEvents: showCTA ? "auto" : "none",
          }}
        >
          {isAuthed ? (
            <Link to={dashboardHref as any}>
              <Button
                size="lg"
                className="font-medium text-base px-9 py-6 rounded-full"
                style={{ background: "hsl(var(--teal-deep))", color: "hsl(var(--primary-foreground))" }}
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
                  style={{ background: "hsl(var(--teal-deep))", color: "hsl(var(--primary-foreground))" }}
                >
                  {joinLabel} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth" search={{ role: "scout" }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="font-medium text-base px-9 py-6 rounded-full bg-white/5 backdrop-blur-sm hover:bg-white/15"
                  style={{ borderColor: "rgba(255,255,255,0.4)", color: "#ffffff" }}
                >
                  {scoutLabel}
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Scroll nudge */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 transition-opacity duration-500"
          style={{ opacity: showCTA ? 0 : 0.75 }}
        >
          <span className="text-[9px] tracking-[0.35em] uppercase text-white/70">{scrollLabel || "Scroll"}</span>
          <ChevronDown className="h-4 w-4 text-white/70 animate-bounce" />
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-10">
          <div
            className="h-full transition-[width] duration-300 ease-out"
            style={{
              width: `${((stage + (showCTA ? 1 : 0)) / 4) * 100}%`,
              background: "hsl(188 60% 70%)",
            }}
          />
        </div>

        {/* Silence unused prop lint */}
        <span className="sr-only">{tagline}</span>
      </div>
    </section>
  );
}
