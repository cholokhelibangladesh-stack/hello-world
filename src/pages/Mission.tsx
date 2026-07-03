import { motion } from "framer-motion";
import { ArrowUpRight, Plus, Minus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";
import heroVideo from "@/assets/about-hero.mp4.asset.json";
import heroPoster from "@/assets/about-hero-form.jpg.asset.json";
import nahroorPortrait from "@/assets/nahroor-rahman-khan.jpg.asset.json";

/* Blue palette driven by theme tokens — deep teal + candy blue in both modes */
const BLUE_GRADIENT = "linear-gradient(90deg, hsl(var(--teal-deep)) 0%, hsl(var(--teal-soft)) 100%)";
const BLUE_GRADIENT_135 = "linear-gradient(135deg, hsl(var(--teal-deep)) 0%, hsl(var(--teal-soft)) 100%)";

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const Hero = () => {
  const { t } = useLanguage();
  return (
    <section className="relative min-h-[100vh] w-full overflow-hidden bg-[hsl(var(--paper))] dark:bg-[#0a1620]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px)",
          backgroundSize: "16.6667% 100%",
        }}
      />

      {/* Video lives on the right; a theme-aware gradient masks the left so the
          title sits on a clean white (light) / deep-teal (dark) background. */}
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
        {/* Light mode gradient — white on the left fading to reveal video */}
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--paper)) 0%, hsl(var(--paper) / 0.92) 35%, hsl(var(--paper) / 0.15) 65%, transparent 100%)",
          }}
        />
        {/* Dark mode gradient — deep teal on the left */}
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            background:
              "linear-gradient(90deg, #0a1620 0%, rgba(10,22,32,0.85) 35%, rgba(10,22,32,0.15) 65%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-16 pt-40 md:pt-44 pb-24">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-foreground text-[52px] leading-[1.02] sm:text-[76px] md:text-[104px] md:leading-[0.96] tracking-[-0.02em] font-medium max-w-[10ch] dark:drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]"
        >
          {t("mission.hero.title")}
        </motion.h1>

        <div className="mt-16 md:mt-24 grid md:grid-cols-2 gap-10 items-end">
          <div />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            {/* Small copy sits over the video panel on the right — keep it white in both themes */}
            <p className="text-white text-sm md:text-[15px] leading-relaxed max-w-md drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
              {t("mission.hero.body")}
            </p>
            <Link
              to="/auth"
              className="group mt-6 inline-flex items-center gap-3 rounded-md p-[1px]"
              style={{ background: BLUE_GRADIENT }}
            >
              <span
                className="relative flex items-center justify-between gap-6 rounded-[5px] px-6 py-3.5 min-w-[280px] overflow-hidden dark:bg-[#0a1620] dark:group-hover:bg-transparent transition-colors"
              >
                {/* Light-mode gradient fill: soft candy-blue → deep teal on hover.
                    Two layers cross-fade so the whole gradient shifts, not just a solid color. */}
                <span
                  aria-hidden
                  className="absolute inset-0 dark:hidden transition-opacity duration-300 group-hover:opacity-0"
                  style={{
                    background:
                      "linear-gradient(90deg, hsl(var(--teal-soft)) 0%, hsl(var(--teal-soft) / 0.75) 100%)",
                  }}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 dark:hidden opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: BLUE_GRADIENT }}
                />
                <span
                  className="relative text-[11px] tracking-[0.35em] font-mono uppercase transition-colors
                    text-[hsl(var(--teal-deep))] group-hover:text-white
                    dark:text-white dark:group-hover:text-white"
                >
                  {t("mission.hero.cta")}
                </span>
                <ArrowUpRight
                  className="relative h-4 w-4 transition-colors
                    text-[hsl(var(--teal-deep))] group-hover:text-white
                    dark:text-white dark:group-hover:text-white"
                />
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

const History = () => {
  const { t } = useLanguage();
  const HISTORY = [
    { date: t("mission.history.d1"), year: "2026 · 02", body: t("mission.history.b1") },
    { date: t("mission.history.d2"), year: "2026 · 03", body: t("mission.history.b2") },
    { date: t("mission.history.d3"), year: "2026 · 03", body: t("mission.history.b3") },
    { date: t("mission.history.d4"), year: "2026 · 07", body: t("mission.history.b4") },
  ];
  const [active, setActive] = useState(0);
  return (
    <section className="relative bg-[hsl(var(--paper))] py-28 md:py-36 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-baseline justify-between mb-10"
        >
          <h2 className="font-display text-foreground text-4xl md:text-5xl tracking-[-0.02em]">
            {t("mission.history.title")}
          </h2>
        </motion.div>

        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-foreground/10" />
          <div
            className="absolute left-0 top-1/2 h-px transition-all duration-500"
            style={{
              width: `${((active + 1) / HISTORY.length) * 100}%`,
              background: BLUE_GRADIENT,
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
                    className="mb-8 h-6 w-6 rounded-full border transition-all"
                    style={{
                      borderColor: isActive
                        ? "hsl(var(--teal-soft))"
                        : "hsl(var(--foreground) / 0.25)",
                      transform: isActive ? "scale(1.25)" : "scale(1)",
                      background: isActive ? BLUE_GRADIENT_135 : "transparent",
                    }}
                  />
                  <div
                    className="text-[10px] font-mono tracking-[0.3em] uppercase mb-2"
                    style={{
                      color: isActive
                        ? "hsl(var(--teal-deep))"
                        : "hsl(var(--foreground) / 0.4)",
                    }}
                  >
                    {h.year}
                  </div>
                  <div
                    className={`font-display text-2xl md:text-3xl tracking-[-0.01em] transition-colors ${
                      isActive ? "text-foreground" : "text-foreground/30"
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
          className="mt-16 max-w-2xl text-foreground/75 text-lg leading-relaxed"
        >
          {HISTORY[active].body}
        </motion.p>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* What We Do                                                          */
/* ------------------------------------------------------------------ */

const WhatWeDo = () => {
  const { t } = useLanguage();
  const WHAT = [
    { title: t("mission.what.t1"), body: t("mission.what.b1"), extra: t("mission.what.e1") },
    { title: t("mission.what.t2"), body: t("mission.what.b2"), extra: t("mission.what.e2") },
    { title: t("mission.what.t3"), body: t("mission.what.b3"), extra: t("mission.what.e3") },
  ];
  const [active, setActive] = useState<number | null>(0);

  return (
    <section className="relative bg-[hsl(var(--paper-deep))] py-28 md:py-40 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-baseline justify-between mb-16"
        >
          <h2 className="font-display text-foreground text-4xl md:text-5xl tracking-[-0.02em]">
            {t("mission.what.title")}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-[1fr_1.2fr] gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="md:sticky md:top-32 space-y-6 max-w-md"
          >
            <p className="text-foreground/80 text-lg leading-relaxed">
              {t("mission.what.lead")}
            </p>
            <p className="text-foreground/65 text-base leading-relaxed">
              {t("mission.what.intro")}
            </p>
          </motion.div>

          <div className="space-y-6">
            {WHAT.map((w, i) => {
              const isOpen = i === active;
              return (
                <motion.div
                  key={w.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="relative border-t border-foreground/10 pt-8 pb-2"
                >
                  <button
                    type="button"
                    onClick={() => setActive(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-start justify-between gap-6 text-left group"
                  >
                    <h3
                      className="font-display text-4xl md:text-6xl tracking-[-0.02em] transition-colors"
                      style={{
                        WebkitTextStroke: isOpen ? "0" : "1px hsl(var(--foreground) / 0.6)",
                        color: isOpen ? "hsl(var(--foreground))" : "transparent",
                      }}
                    >
                      {w.title}
                    </h3>
                    <div
                      className="mt-3 h-9 w-9 rounded-full flex items-center justify-center border shrink-0 transition-all"
                      style={{
                        background: isOpen ? BLUE_GRADIENT_135 : "transparent",
                        borderColor: isOpen
                          ? "hsl(var(--teal-soft))"
                          : "hsl(var(--foreground) / 0.2)",
                      }}
                    >
                      {isOpen ? (
                        <Minus className="h-4 w-4 text-foreground" />
                      ) : (
                        <Plus className="h-4 w-4 text-foreground" />
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-6 max-w-xl space-y-4"
                    >
                      <p className="text-foreground/80 leading-relaxed">{w.body}</p>
                      <p className="text-foreground/60 text-sm leading-relaxed">{w.extra}</p>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-20 max-w-3xl text-foreground/70 text-base md:text-lg leading-relaxed"
        >
          {t("mission.what.outro")}
        </motion.p>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

const Team = () => {
  const { t } = useLanguage();
  return (
    <section className="relative bg-[hsl(var(--paper))] py-28 md:py-36 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-baseline justify-between mb-16"
        >
          <h2 className="font-display text-foreground text-4xl md:text-6xl tracking-[-0.02em]">
            {t("mission.team.title")}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-[minmax(0,420px)_1fr] gap-12 md:gap-20 items-start">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-md p-[1px]"
            style={{ background: BLUE_GRADIENT_135 }}
          >
            <div className="relative rounded-[5px] overflow-hidden bg-[hsl(var(--paper-deep))]">
              <img
                src={nahroorPortrait.url}
                alt="Nahroor Rahman Khan"
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              <div
                className="absolute inset-x-0 bottom-0 p-6 pt-16"
                style={{
                  background:
                    "linear-gradient(to top, hsl(var(--paper-deep)) 0%, hsl(var(--paper-deep) / 0.75) 55%, transparent 100%)",
                }}
              >
                <div className="font-display text-foreground text-2xl">Nahroor Rahman Khan</div>
                <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-foreground/60 mt-1">
                  {t("mission.team.ceo")}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="pt-4"
          >
            <div
              className="text-6xl leading-none font-display mb-4"
              style={{
                background: BLUE_GRADIENT_135,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              &ldquo;
            </div>
            <p className="text-foreground text-2xl md:text-3xl leading-[1.35] font-display tracking-[-0.01em] max-w-2xl">
              {t("mission.team.quote")}
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-px w-10 bg-foreground/40" />
              <div>
                <div className="text-foreground text-sm font-medium">Nahroor Rahman Khan</div>
                <div className="text-foreground/50 text-xs mt-0.5">{t("mission.team.role")}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Latest News                                                         */
/* ------------------------------------------------------------------ */

const LatestNews = () => {
  const { t } = useLanguage();
  const NEWS = [
    {
      tag: t("mission.news.n1.tag"),
      date: t("mission.news.n1.date"),
      title: t("mission.news.n1.title"),
      body: t("mission.news.n1.body"),
    },
    {
      tag: t("mission.news.n2.tag"),
      date: t("mission.news.n2.date"),
      title: t("mission.news.n2.title"),
      body: t("mission.news.n2.body"),
    },
    {
      tag: t("mission.news.n3.tag"),
      date: t("mission.news.n3.date"),
      title: t("mission.news.n3.title"),
      body: t("mission.news.n3.body"),
    },
  ];

  return (
    <section className="relative bg-[hsl(var(--paper-deep))] py-28 md:py-36 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-baseline justify-between mb-12"
        >
          <h2 className="font-display text-foreground text-4xl md:text-5xl tracking-[-0.02em]">
            {t("mission.news.title")}
          </h2>
          <span
            className="hidden md:inline-block text-[10px] tracking-[0.4em] font-mono uppercase"
            style={{ color: "hsl(var(--teal-deep))" }}
          >
            {t("mission.news.subtitle")}
          </span>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {NEWS.map((n, i) => (
            <motion.article
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="group relative rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6 hover:border-foreground/25 transition-colors"
            >
              <div className="flex items-center justify-between mb-6">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-mono tracking-[0.25em] uppercase"
                  style={{
                    color: "hsl(var(--teal-deep))",
                    background: "hsl(var(--teal-deep) / 0.12)",
                    border: "1px solid hsl(var(--teal-deep) / 0.35)",
                  }}
                >
                  {n.tag}
                </span>
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-foreground/40">
                  {n.date}
                </span>
              </div>
              <h3 className="font-display text-foreground text-2xl leading-tight mb-3">
                {n.title}
              </h3>
              <p className="text-foreground/65 text-sm leading-relaxed">{n.body}</p>
              <div
                className="mt-8 h-px w-full opacity-60"
                style={{ background: BLUE_GRADIENT }}
              />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const Mission = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Hero />
      <History />
      <WhatWeDo />
      <Team />
      <LatestNews />
    </div>
  );
};

export default Mission;
