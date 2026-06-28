import { useEffect } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface LoadingIntroProps {
  onDone: () => void;
}

const letters = "SCOUT BD".split("");

// Cinematic stagger timing
const LOGO_IN    = 0.0;   // logo pops in
const LETTERS_IN = 0.55;  // letters cascade
const TAGLINE_IN = 1.25;  // tagline fades
const BAR_IN     = 1.35;  // progress bar
const TOTAL_MS   = 3200;  // total screen time

const LoadingIntro = ({ onDone }: LoadingIntroProps) => {
  useEffect(() => {
    const timer = setTimeout(onDone, TOTAL_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >

      {/* ── Ambient radial glow ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 1.2 }}
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 50%, hsl(var(--foreground)/0.07) 0%, transparent 70%)",
        }}
      />

      {/* ── Scanline ── */}
      <motion.div
        className="absolute inset-x-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg,transparent,hsl(var(--foreground)/0.10),transparent)",
        }}
        initial={{ top: "0%" }}
        animate={{ top: "100%" }}
        transition={{ delay: 0.2, duration: 2.4, ease: "linear", repeat: Infinity }}
      />

      {/* ── Corner brackets ── */}
      {(["tl", "tr", "bl", "br"] as const).map((pos, i) => (
        <motion.div
          key={pos}
          className="absolute w-8 h-8 pointer-events-none"
          style={{
            top:    pos.startsWith("t") ? "10%" : undefined,
            bottom: pos.startsWith("b") ? "10%" : undefined,
            left:   pos.endsWith("l")   ? "8%"  : undefined,
            right:  pos.endsWith("r")   ? "8%"  : undefined,
            borderTop:    pos.startsWith("t") ? "1px solid hsl(var(--foreground)/0.25)" : undefined,
            borderBottom: pos.startsWith("b") ? "1px solid hsl(var(--foreground)/0.25)" : undefined,
            borderLeft:   pos.endsWith("l")   ? "1px solid hsl(var(--foreground)/0.25)" : undefined,
            borderRight:  pos.endsWith("r")   ? "1px solid hsl(var(--foreground)/0.25)" : undefined,
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 + i * 0.06, duration: 0.45, ease: "easeOut" }}
        />
      ))}

      {/* ── Main content ── */}
      <div className="flex flex-col items-center gap-5 relative z-10">

        {/* Logo icon — dramatic zoom in + wobble */}
        <motion.div
          initial={{ scale: 0, rotate: -45, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{
            delay: LOGO_IN,
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <motion.div
            animate={{ rotate: [0, 6, -6, 3, 0] }}
            transition={{ delay: LOGO_IN + 0.65, duration: 0.8, ease: "easeInOut" }}
            className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{
              background: "hsl(var(--foreground))",
              boxShadow:
                "0 0 0 1px hsl(var(--foreground)/0.15), 0 0 60px hsl(var(--foreground)/0.25), 0 0 120px hsl(var(--foreground)/0.08)",
            }}
          >
            <Zap
              className="h-12 w-12"
              style={{ color: "hsl(var(--background))" }}
              fill="currentColor"
            />
          </motion.div>
        </motion.div>

        {/* Brand name — letter-by-letter cascade */}
        <div className="flex items-center gap-0.5 overflow-hidden">
          {letters.map((char, i) => (
            <motion.span
              key={i}
              className={`font-display text-5xl text-foreground leading-none ${char === " " ? "w-4" : ""}`}
              initial={{ opacity: 0, y: 28, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: LETTERS_IN + i * 0.058,
                duration: 0.38,
                ease: "easeOut",
              }}
            >
              {char}
            </motion.span>
          ))}
        </div>

        {/* Tagline */}
        <motion.p
          className="text-xs tracking-[0.28em] uppercase"
          style={{ color: "hsl(var(--muted-foreground))" }}
          initial={{ opacity: 0, letterSpacing: "0.4em" }}
          animate={{ opacity: 1, letterSpacing: "0.28em" }}
          transition={{ delay: TAGLINE_IN, duration: 0.7 }}
        >
          Digitizing Bangladesh Sports
        </motion.p>

        {/* Progress bar + percentage */}
        <div className="mt-2 flex flex-col items-center gap-1.5">
          <motion.div
            className="h-px rounded-full overflow-hidden"
            style={{
              width: 140,
              background: "hsl(var(--border))",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: BAR_IN }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "hsl(var(--foreground))" }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                delay: BAR_IN,
                duration: TOTAL_MS / 1000 - BAR_IN - 0.5,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          <motion.span
            className="text-[9px] font-mono tracking-widest"
            style={{ color: "hsl(var(--muted-foreground)/0.5)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: BAR_IN + 0.1 }}
          >
            LOADING
          </motion.span>
        </div>
      </div>

      {/* ── Bottom watermark ── */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.35em] uppercase"
        style={{ color: "hsl(var(--muted-foreground)/0.3)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
      >
        scoutbd.com
      </motion.div>
    </motion.div>
  );
};

export default LoadingIntro;
