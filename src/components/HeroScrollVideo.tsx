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

/**
 * Scroll-scrubbed cinematic hero.
 * - Pins the section for ~350vh of scroll
 * - Progresses video currentTime with scroll (GSAP ScrollTrigger, scrub:true)
 * - Reveals three minimal text stages at 15% / 45% / 75% progress
 */
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
  const [stage, setStage] = useState(0); // 0=mark,1=word,2=tagline,3=cta

  useEffect(() => {
    if (typeof window === "undefined") return;
    let ctx: any;
    let killFn: (() => void) | null = null;

    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      const video = videoRef.current;
      const wrap = wrapRef.current;
      const pin = pinRef.current;
      if (!video || !wrap || !pin) return;

      const setup = () => {
        const duration = video.duration || 1;

        const st = ScrollTrigger.create({
          trigger: wrap,
          start: "top top",
          end: "+=350%",
          pin: pin,
          pinSpacing: true,
          scrub: 0.4,
          onUpdate: (self) => {
            const p = self.progress;
            // seek video
            if (!Number.isNaN(duration)) {
              const target = Math.min(duration - 0.05, p * duration);
              // requestVideoFrameCallback isn't strictly needed; direct seek is fine
              try { video.currentTime = target; } catch {}
            }
            // stage reveal
            const s = p < 0.12 ? 0 : p < 0.4 ? 1 : p < 0.68 ? 2 : 3;
            setStage((prev) => (prev === s ? prev : s));
          },
        });

        killFn = () => st.kill();
      };

      // wait for metadata so we know duration
      if (video.readyState >= 1 && !Number.isNaN(video.duration)) {
        setup();
      } else {
        video.addEventListener("loadedmetadata", setup, { once: true });
      }
    })();

    return () => {
      killFn?.();
      ctx?.revert?.();
    };
  }, []);

  const stageVisible = (s: number) => stage >= s;

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

        {/* Cinematic gradient overlay for text legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.75) 100%)",
          }}
        />

        {/* Content stack */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          {/* Stage 0: Mark */}
          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: stageVisible(0) ? 1 : 0,
              transform: `translateY(${stageVisible(0) ? 0 : 20}px) scale(${stage >= 2 ? 0.55 : 1})`,
            }}
          >
            <CholoKheliMark
              className="h-24 w-32 sm:h-32 sm:w-44 text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
              accent="hsl(188 60% 70%)"
            />
          </div>

          {/* Stage 1: Wordmark */}
          <div
            className="mt-6 sm:mt-8 flex items-baseline justify-center gap-3 sm:gap-4 transition-all duration-700 ease-out"
            style={{
              opacity: stageVisible(1) ? 1 : 0,
              transform: `translateY(${stageVisible(1) ? 0 : 24}px)`,
              filter: stageVisible(1) ? "blur(0px)" : "blur(8px)",
            }}
          >
            <span className="font-display text-4xl sm:text-6xl lg:text-7xl font-medium text-white tracking-[0.04em] drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
              CHOLO
            </span>
            <span className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold text-[hsl(188_60%_72%)] tracking-[0.04em] drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
              KHELI
            </span>
          </div>

          {/* Divider */}
          <div
            className="mt-6 h-px bg-white/30 transition-all duration-700 ease-out"
            style={{
              width: stageVisible(2) ? "80px" : "0px",
              opacity: stageVisible(2) ? 1 : 0,
            }}
          />

          {/* Stage 2: Tagline */}
          <p
            className="mt-6 text-sm sm:text-base text-white/85 max-w-xl leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-all duration-700 ease-out"
            style={{
              opacity: stageVisible(2) ? 1 : 0,
              transform: `translateY(${stageVisible(2) ? 0 : 16}px)`,
            }}
          >
            {tagline}
          </p>

          {/* Stage 3: CTA */}
          <div
            className="mt-8 flex flex-col sm:flex-row gap-3 transition-all duration-700 ease-out"
            style={{
              opacity: stageVisible(3) ? 1 : 0,
              transform: `translateY(${stageVisible(3) ? 0 : 16}px)`,
              pointerEvents: stageVisible(3) ? "auto" : "none",
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
        </div>

        {/* Scroll nudge — only while in early stages */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 transition-opacity duration-500"
          style={{ opacity: stage < 3 ? 0.8 : 0 }}
        >
          <span className="text-[9px] tracking-[0.35em] uppercase text-white/70">{scrollLabel}</span>
          <ChevronDown className="h-4 w-4 text-white/70 animate-bounce" />
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-10">
          <div
            className="h-full transition-[width] duration-150"
            style={{
              width: `${(stage / 3) * 100}%`,
              background: "hsl(188 60% 70%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
