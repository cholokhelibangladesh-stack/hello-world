import { motion } from "framer-motion";
import { Users, Shield, Trophy, MapPin, Zap } from "lucide-react";

const items = [
  { icon: Trophy,  text: "340+ Talents Discovered" },
  { icon: Shield,  text: "120+ Verified Scouts" },
  { icon: Zap,     text: "৳100 Registration" },
  { icon: MapPin,  text: "8 Divisions Covered" },
  { icon: Users,   text: "2,500+ Players Registered" },
  { icon: Trophy,  text: "340+ Talents Discovered" },
  { icon: Shield,  text: "120+ Verified Scouts" },
  { icon: Zap,     text: "৳100 Registration" },
  { icon: MapPin,  text: "8 Divisions Covered" },
  { icon: Users,   text: "2,500+ Players Registered" },
];

const Separator = () => (
  <span
    className="mx-6 inline-block w-1 h-1 rounded-full flex-shrink-0 self-center"
    style={{ background: "hsl(var(--foreground)/0.2)" }}
    aria-hidden
  />
);

export default function MarqueeTicker() {
  return (
    <div
      className="relative border-t border-b border-border overflow-hidden py-4"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Fade edges */}
      <div
        className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, hsl(var(--background)) 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to left, hsl(var(--background)) 0%, transparent 100%)",
        }}
      />

      {/* Scrolling track */}
      <motion.div
        className="flex items-center whitespace-nowrap will-change-transform"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 28,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center">
            <span className="inline-flex items-center gap-2.5 px-2">
              <item.icon
                className="h-3.5 w-3.5 flex-shrink-0"
                style={{ color: "hsl(var(--foreground)/0.5)" }}
              />
              <span
                className="text-xs font-semibold tracking-[0.12em] uppercase"
                style={{ color: "hsl(var(--foreground)/0.65)" }}
              >
                {item.text}
              </span>
            </span>
            <Separator />
          </span>
        ))}
      </motion.div>
    </div>
  );
}
