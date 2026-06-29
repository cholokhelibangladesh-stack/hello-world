import { useEffect } from "react";
import { motion } from "framer-motion";
import CholoKheliMark from "@/components/CholoKheliMark";

interface LoadingIntroProps {
  onDone: () => void;
}

const TOTAL_MS = 2600;

const LoadingIntro = ({ onDone }: LoadingIntroProps) => {
  useEffect(() => {
    const t = setTimeout(onDone, TOTAL_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center surface-paper"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* soft teal wash */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 55%, hsl(var(--teal) / 0.15), transparent 70%)",
        }}
      />

      <div className="flex flex-col items-center gap-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <CholoKheliMark
            className="h-24 w-32 text-foreground"
            accent="hsl(var(--teal-deep))"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.7 }}
          className="font-display text-2xl tracking-[0.18em] text-foreground font-semibold"
        >
          CHOLO <span className="text-[hsl(var(--teal-deep))] font-bold">KHELI</span>
        </motion.div>

        <motion.div
          className="h-px w-32 overflow-hidden bg-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <motion.div
            className="h-full"
            style={{ background: "hsl(var(--teal-deep))" }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.9, duration: 1.4, ease: "easeInOut" }}
          />
        </motion.div>

        <motion.p
          className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          Let's Play
        </motion.p>
      </div>
    </motion.div>
  );
};

export default LoadingIntro;
