import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import PrivacyPolicy from "./PrivacyPolicy";
import heroVideo from "@/assets/about-hero.mp4.asset.json";
import heroPoster from "@/assets/about-hero-form.jpg.asset.json";
import nahroorPortrait from "@/assets/nahroor-rahman-khan.jpg.asset.json";

/* ------------------------------------------------------------------ */
/* Reusable side rails (Galapagos-style annotations)                   */
/* ------------------------------------------------------------------ */

const SectionRail = ({ index, label }: { index: string; label?: string }) => (
  <>
    <div className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-3 text-[10px] tracking-[0.3em] text-white/40">
      <div className="h-9 w-9 rounded-full border border-white/25 flex items-center justify-center text-[10px] text-white/70 font-mono">
        {index}
      </div>
    </div>
    {label && (
      <div className="pointer-events-none absolute left-6 bottom-8 hidden md:block text-[10px] tracking-[0.35em] text-white/40 font-mono uppercase">
        {label}
      </div>
    )}
  </>
);

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const Hero = () => {
  return (
    <section className="relative min-h-[100vh] w-full overflow-hidden bg-[#050505]">
      {/* Faint grid rails */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px)",
          backgroundSize: "16.6667% 100%",
        }}
      />

      {/* Background video */}
      <div className="absolute inset-0">
        <video
          src={heroVideo.url}
          poster={heroPoster.url}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover object-right opacity-90"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #050505 0%, rgba(5,5,5,0.85) 35%, rgba(5,5,5,0.15) 65%, transparent 100%)",
          }}
        />
      </div>

      <SectionRail index="01" label="galapagos-style • about" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-16 pt-40 md:pt-44 pb-24">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-white text-[52px] leading-[1.02] sm:text-[76px] md:text-[104px] md:leading-[0.96] tracking-[-0.02em] font-medium max-w-[10ch]"
        >
          We Digitise <br /> Bangladesh <br /> Sports.
        </motion.h1>

        <div className="mt-16 md:mt-24 grid md:grid-cols-2 gap-10 items-end">
          <div />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            <p className="text-white/70 text-sm md:text-[15px] leading-relaxed max-w-md">
              Cholo Kheli connects Bangladesh&apos;s grassroots talent with
              verified scouts through a safe, transparent platform — turning
              raw ability into recognised opportunity.
            </p>
            <Link
              to="/auth"
              className="group mt-6 inline-flex items-center gap-3 rounded-md p-[1px]"
              style={{
                background:
                  "linear-gradient(90deg, #6D28D9 0%, #C026D3 55%, #EC4899 100%)",
              }}
            >
              <span className="flex items-center justify-between gap-6 rounded-[5px] bg-[#050505] px-6 py-3.5 min-w-[280px] transition-colors group-hover:bg-transparent">
                <span className="text-[11px] tracking-[0.35em] font-mono uppercase text-white">
                  Try it now
                </span>
                <ArrowUpRight className="h-4 w-4 text-white" />
              </span>
            </Link>
          </motion.div>
        </div>

        <div className="mt-24 md:mt-32 flex items-center gap-3 text-white/60">
          <span className="inline-block h-2 w-2 rounded-full bg-fuchsia-500 animate-pulse" />
          <span className="text-[10px] tracking-[0.4em] uppercase font-mono">
            Scroll for more
          </span>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* History (timeline)                                                  */
/* ------------------------------------------------------------------ */

const HISTORY = [
  {
    date: "Feb 13, 2026",
    year: "2026 · 02",
    body: "The idea was established — a platform to bring Bangladesh's grassroots athletes into the same conversation as verified scouts.",
  },
  {
    date: "Mar 8, 2026",
    year: "2026 · 03",
    body: "The concept was validated by a tech CEO whose feedback gave us the conviction to keep building.",
  },
  {
    date: "Mar 26, 2026",
    year: "2026 · 03",
    body: "We ran a nationwide survey that proved real, measurable demand for a trusted scouting product.",
  },
  {
    date: "Jul 10, 2026",
    year: "2026 · 07",
    body: "Official start of Cholo Kheli — the team, the mission, the platform, live.",
  },
];

const History = () => {
  const [active, setActive] = useState(0);
  return (
    <section className="relative bg-[#050505] py-28 md:py-36 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 md:px-16">
        <div className="flex items-baseline justify-between mb-10">
          <h2 className="font-display text-white text-4xl md:text-5xl tracking-[-0.02em]">
            Our History
          </h2>
          <span className="hidden md:block text-[10px] tracking-[0.4em] font-mono uppercase text-white/40">
            02 — Chapters
          </span>
        </div>

        {/* Track */}
        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10" />
          <div
            className="absolute left-0 top-1/2 h-px transition-all duration-500"
            style={{
              width: `${((active + 1) / HISTORY.length) * 100}%`,
              background:
                "linear-gradient(90deg, #6D28D9 0%, #EC4899 100%)",
            }}
          />

          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
            {HISTORY.map((h, i) => {
              const isActive = i === active;
              return (
                <button
                  key={h.date}
                  onClick={() => setActive(i)}
                  className="group text-left flex flex-col items-start"
                >
                  <div
                    className={`mb-8 h-6 w-6 rounded-full border transition-all ${
                      isActive
                        ? "border-fuchsia-400 scale-125"
                        : "border-white/25"
                    }`}
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg,#7C3AED,#EC4899)"
                        : "transparent",
                    }}
                  />
                  <div
                    className={`text-[10px] font-mono tracking-[0.3em] uppercase mb-2 ${
                      isActive ? "text-fuchsia-300" : "text-white/40"
                    }`}
                  >
                    {h.year}
                  </div>
                  <div
                    className={`font-display text-2xl md:text-3xl tracking-[-0.01em] transition-colors ${
                      isActive ? "text-white" : "text-white/30"
                    }`}
                  >
                    {h.date}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <motion.p
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-16 max-w-2xl text-white/70 text-lg leading-relaxed"
        >
          {HISTORY[active].body}
        </motion.p>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* What We Do — big vertical titles                                    */
/* ------------------------------------------------------------------ */

const WHAT = [
  {
    title: "Scout Discovery",
    body:
      "Verified scouts explore a searchable index of players filtered by sport, district, position and highlight quality — no gatekeepers, no middlemen.",
  },
  {
    title: "Player Profiles",
    body:
      "Athletes build a single, credible profile: verified stats, curated highlight reels, a resume that follows them wherever the game takes them.",
  },
  {
    title: "Safe Selections",
    body:
      "Every scout is vetted, every contact is logged. Selections happen inside a transparent audit trail, so families and federations can trust the outcome.",
  },
];

const WhatWeDo = () => {
  const wrap = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrap,
    offset: ["start end", "end start"],
  });
  const idx = useTransform(scrollYProgress, [0.15, 0.5, 0.85], [0, 1, 2]);
  const [active, setActive] = useState(0);
  useEffect(() => idx.on("change", (v) => setActive(Math.round(v))), [idx]);

  return (
    <section
      ref={wrap}
      className="relative bg-[#050505] py-28 md:py-40 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-16">
        <div className="flex items-baseline justify-between mb-16">
          <h2 className="font-display text-white text-4xl md:text-5xl tracking-[-0.02em]">
            What We Do
          </h2>
          <span className="hidden md:block text-[10px] tracking-[0.4em] font-mono uppercase text-white/40">
            03 — Platform
          </span>
        </div>

        <div className="grid md:grid-cols-[1fr_1.2fr] gap-16 items-start">
          <div className="md:sticky md:top-32">
            <p className="text-white/70 text-lg leading-relaxed max-w-md">
              A single stack that turns raw talent into recognised opportunity —
              built for players, scouts, and the federations that back them.
            </p>
          </div>

          <div className="space-y-6">
            {WHAT.map((w, i) => {
              const isActive = i === active;
              return (
                <div
                  key={w.title}
                  className="relative border-t border-white/10 pt-8 pb-2 transition-opacity"
                  style={{ opacity: isActive ? 1 : 0.35 }}
                >
                  <div className="flex items-start justify-between gap-6">
                    <h3
                      className="font-display text-white text-4xl md:text-6xl tracking-[-0.02em]"
                      style={{
                        WebkitTextStroke: isActive ? "0" : "1px rgba(255,255,255,0.6)",
                        color: isActive ? "#fff" : "transparent",
                      }}
                    >
                      {w.title}
                    </h3>
                    <div
                      className="mt-3 h-9 w-9 rounded-full flex items-center justify-center border border-white/20 shrink-0"
                      style={{
                        background: isActive
                          ? "linear-gradient(135deg,#7C3AED,#EC4899)"
                          : "transparent",
                      }}
                    >
                      <Plus className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  {isActive && (
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 max-w-xl text-white/70 leading-relaxed"
                    >
                      {w.body}
                    </motion.p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

const Team = () => {
  return (
    <section className="relative bg-[#050505] py-28 md:py-36 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 md:px-16">
        <div className="flex items-baseline justify-between mb-16">
          <h2 className="font-display text-white text-4xl md:text-6xl tracking-[-0.02em]">
            Meet Our Team
          </h2>
          <span className="hidden md:block text-[10px] tracking-[0.4em] font-mono uppercase text-white/40">
            04 — Leadership
          </span>
        </div>

        <div className="grid md:grid-cols-[minmax(0,420px)_1fr] gap-12 md:gap-20 items-start">
          {/* Card */}
          <div
            className="relative rounded-md p-[1px]"
            style={{
              background:
                "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)",
            }}
          >
            <div className="relative rounded-[5px] overflow-hidden bg-[#0a0a0a]">
              <img
                src={nahroorPortrait.url}
                alt="Nahroor Rahman Khan"
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-6 pt-16">
                <div className="font-display text-white text-2xl">
                  Nahroor Rahman Khan
                </div>
                <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/60 mt-1">
                  Chief Executive Officer
                </div>
              </div>
              <div className="absolute top-4 left-4 text-[10px] font-mono tracking-[0.3em] text-white/70">
                01 / 01
              </div>
            </div>
          </div>

          {/* Quote */}
          <div className="pt-4">
            <div
              className="text-6xl leading-none font-display mb-4"
              style={{
                background:
                  "linear-gradient(135deg,#7C3AED,#EC4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              &ldquo;
            </div>
            <p className="text-white text-2xl md:text-3xl leading-[1.35] font-display tracking-[-0.01em] max-w-2xl">
              Cholo Kheli isn&apos;t just a product — it&apos;s the digital
              infrastructure Bangladeshi sport has been waiting for. Every
              athlete in this country deserves a fair shot at being seen, and
              we&apos;re here to make sure they get one.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-px w-10 bg-white/40" />
              <div>
                <div className="text-white text-sm font-medium">
                  Nahroor Rahman Khan
                </div>
                <div className="text-white/50 text-xs mt-0.5">
                  CEO, Cholo Kheli · CEO, NRK Group
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* CTA + Privacy footer                                                */
/* ------------------------------------------------------------------ */

const Mission = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Hero />
      <History />
      <WhatWeDo />
      <Team />

      {/* Privacy link + policy preserved */}
      <section className="relative bg-[#050505] pt-16 pb-6">
        <div className="mx-auto max-w-3xl px-6">
          <div className="border-t border-white/10 pt-10 flex items-center gap-3">
            <h2 className="font-display text-2xl text-white">Privacy Policy</h2>
            <Link
              to="/privacy-policy"
              className="ml-auto text-sm text-fuchsia-300 hover:text-fuchsia-200"
            >
              Open full page →
            </Link>
          </div>
        </div>
        <div className="-mt-4">
          <PrivacyPolicy />
        </div>
      </section>
    </div>
  );
};

export default Mission;
