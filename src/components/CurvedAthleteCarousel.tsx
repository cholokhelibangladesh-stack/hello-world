import { motion } from "framer-motion";
import { useState } from "react";
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
  { src: a1, sport: "Football", caption: "Sprint — Dhaka" },
  { src: a2, sport: "Cricket", caption: "Cover Drive" },
  { src: a3, sport: "Basketball", caption: "Rim — Chattogram" },
  { src: a4, sport: "Football", caption: "Dawn Drills" },
  { src: a5, sport: "Cricket", caption: "Delivery Stride" },
  { src: a6, sport: "Basketball", caption: "Crossover" },
  { src: a7, sport: "Football", caption: "Local Cup" },
  { src: a8, sport: "Cricket", caption: "Nets" },
];

// 12 slots around the ring — 30° apart — gives ~5 cards across the front
// arc, close enough to nearly touch, with strong tilt at the edges.
const RING = [...CARDS, ...CARDS.slice(0, 4)];

/**
 * Looping curved coverflow. Cards sit on a vertical cylinder that spins
 * continuously; the front arc reads as a shallow bowl curving toward the
 * viewer — center card faces forward, edge cards tilt inward.
 */
export default function CurvedAthleteCarousel() {
  const N = RING.length;
  const angleStep = 360 / N; // 30°
  const cardW = 300;
  const cardH = 400;
  // Radius just above the touching threshold so cards sit shoulder-to-shoulder.
  const radius = 570;

  return (
    <section className="relative overflow-hidden py-24 sm:py-32 bg-background">
      {/* Header */}
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-3xl mx-auto text-center mb-14 sm:mb-20"
        >
          <div className="text-xs sm:text-sm tracking-[0.4em] uppercase text-primary/80 mb-4 font-medium">
            Faces of the Game
          </div>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-foreground">
            The talent already here.
          </h2>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Football, cricket, and basketball — real players, real grounds, from every
            corner of Bangladesh. Cholo Kheli exists so their next move finds them.
          </p>
        </motion.div>
      </div>

      {/* 3D stage */}
      <div
        className="relative w-full carousel-stage"
        style={{
          height: cardH + 140,
          perspective: "1100px",
          perspectiveOrigin: "50% 60%",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative carousel-ring"
            style={{
              transformStyle: "preserve-3d",
              width: 0,
              height: 0,
            }}
          >
            {RING.map((c, i) => (
              <div
                key={i}
                className="absolute rounded-2xl overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
                style={{
                  width: cardW,
                  height: cardH,
                  marginLeft: -cardW / 2,
                  marginTop: -cardH / 2,
                  transform: `rotateY(${i * angleStep}deg) translateZ(${radius}px)`,
                  backfaceVisibility: "hidden",
                  background: "hsl(0 0% 4%)",
                }}
              >
                <img
                  src={c.src}
                  alt={`${c.sport} player — ${c.caption}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="w-full h-full object-cover select-none"
                />
                {/* Bottom scrim + label */}
                <div
                  className="absolute inset-x-0 bottom-0 h-2/5 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)",
                  }}
                />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="text-[10px] tracking-[0.35em] uppercase text-white/70 mb-1">
                    #{String((i % CARDS.length) + 1).padStart(2, "0")}
                  </div>
                  <div className="font-display text-lg leading-tight">{c.sport}</div>
                  <div className="text-xs text-white/75">{c.caption}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side vignettes to fade the ring into the section */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-32 sm:w-56 z-10"
          style={{
            background:
              "linear-gradient(to right, hsl(var(--background)) 0%, transparent 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-32 sm:w-56 z-10"
          style={{
            background:
              "linear-gradient(to left, hsl(var(--background)) 0%, transparent 100%)",
          }}
        />
      </div>

      <style>{`
        @keyframes spinCarousel {
          from { transform: rotateY(0deg); }
          to   { transform: rotateY(-360deg); }
        }
        .carousel-ring {
          animation: spinCarousel 42s linear infinite;
          will-change: transform;
        }
        .carousel-stage:hover .carousel-ring {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .carousel-ring { animation-duration: 120s; }
        }
      `}</style>
    </section>
  );
}
