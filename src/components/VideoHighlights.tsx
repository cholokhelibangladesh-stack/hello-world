import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Play, Volume2, VolumeX } from "lucide-react";

// Public domain / royalty-free sports clips from Pexels CDN
// Football/cricket slow-mo highlight atmosphere
const VIDEO_SRC =
  "https://videos.pexels.com/video-files/3257687/3257687-uhd_2560_1440_25fps.mp4";

export default function VideoHighlights() {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView   = useInView(wrapRef, { margin: "-15% 0px", once: false });
  const [muted,   setMuted]   = useState(true);
  const [started, setStarted] = useState(false);
  const [loaded,  setLoaded]  = useState(false);

  // Play / pause based on scroll visibility
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) {
      v.play().then(() => setStarted(true)).catch(() => {});
    } else {
      v.pause();
    }
  }, [inView]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden rounded-2xl"
      style={{
        borderColor: "hsl(var(--foreground)/0.08)",
        border: "1px solid hsl(var(--foreground)/0.08)",
        background: "hsl(0 0% 3%)",
        aspectRatio: "16/9",
        boxShadow: "0 0 0 1px hsl(var(--foreground)/0.04), 0 30px 80px -20px rgba(0,0,0,0.8)",
      }}
    >
      {/* Actual looping video */}
      <motion.video
        ref={videoRef}
        src={VIDEO_SRC}
        loop
        muted
        playsInline
        preload="metadata"
        onCanPlay={() => setLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded && inView ? 1 : 0 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />

      {/* Dark cinematic overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Scan line */}
      <motion.div
        className="absolute inset-x-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, hsl(var(--foreground)/0.18), transparent)",
        }}
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
      />

      {/* Centre play icon when not yet started */}
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            whileHover={{ scale: 1.12 }}
            className="w-16 h-16 rounded-full flex items-center justify-center border cursor-pointer"
            style={{
              background: "hsl(var(--foreground)/0.08)",
              borderColor: "hsl(var(--foreground)/0.2)",
              boxShadow: "0 0 40px hsl(var(--foreground)/0.15)",
            }}
          >
            <Play className="h-7 w-7 ml-1" style={{ color: "hsl(var(--foreground)/0.7)" }} />
          </motion.div>
        </div>
      )}

      {/* Bottom controls bar */}
      <div
        className="absolute bottom-0 inset-x-0 px-4 pb-3 pt-6"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Tags */}
          <div className="flex gap-1.5 flex-wrap">
            {["Live Action", "Highlight Reel", "Dhaka"].map((t) => (
              <span
                key={t}
                className="text-[8px] px-1.5 py-0.5 rounded font-medium"
                style={{
                  background: "hsl(var(--foreground)/0.12)",
                  color: "hsl(var(--foreground)/0.55)",
                }}
              >
                {t}
              </span>
            ))}
          </div>

          {/* Mute toggle */}
          {started && (
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-full transition-colors"
              style={{
                background: "hsl(var(--foreground)/0.12)",
                color: "hsl(var(--foreground)/0.6)",
              }}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Loading shimmer */}
      {!loaded && (
        <div className="absolute inset-0 shimmer" />
      )}
    </div>
  );
}
