import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight, Users, Shield, Trophy, Twitter, Facebook,
  Instagram, Youtube, ChevronDown, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BangladeshMapTestimonials from "@/components/BangladeshMapTestimonials";
import MarqueeTicker from "@/components/MarqueeTicker";
import VideoHighlights from "@/components/VideoHighlights";
import heroVideo from "@/assets/hero-sports.mp4";

const socialLinks = [
  { Icon: Facebook,  label: "Facebook",    href: "https://facebook.com/scoutbd",  color: "hover:text-blue-500" },
  { Icon: Twitter,   label: "Twitter / X", href: "https://twitter.com/scoutbd",   color: "hover:text-sky-500" },
  { Icon: Instagram, label: "Instagram",   href: "https://instagram.com/scoutbd", color: "hover:text-pink-500" },
  { Icon: Youtube,   label: "YouTube",     href: "https://youtube.com/@scoutbd",  color: "hover:text-red-500" },
];

type ScoutProfile = {
  user_id: string;
  full_name: string;
  organization: string | null;
  avatar_url: string | null;
};

/* ── Animated counter ── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / 1800, 1);
      const eased = 1 - Math.pow(1 - prog, 3);
      setCount(Math.floor(eased * target));
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ── Scroll-reveal ── */
function Reveal({ children, delay = 0, className = "", direction = "up" }: {
  children: React.ReactNode; delay?: number; className?: string; direction?: "up" | "left" | "right";
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const initial = direction === "left" ? { opacity: 0, x: -50 } : direction === "right" ? { opacity: 0, x: 50 } : { opacity: 0, y: 50 };
  return (
    <motion.div ref={ref} initial={initial} animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════
   PAGE
════════════════════════════════════════════ */
const Index = () => {
  const { user, role } = useAuth();
  const [verifiedScouts, setVerifiedScouts] = useState<ScoutProfile[]>([]);
  const [heroReady, setHeroReady] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const videoY      = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const videoScale  = useTransform(scrollYProgress, [0, 0.7], [1, 1.06]);

  useEffect(() => {
    const fetchScouts = async () => {
      const { data: scoutData } = await supabase.from("scout_profiles").select("user_id, organization").eq("verification_status", "active").limit(12);
      if (!scoutData?.length) return;
      const userIds = scoutData.map((s) => s.user_id);
      const { data: profileData } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      const map = Object.fromEntries((profileData ?? []).map((p) => [p.user_id, p]));
      setVerifiedScouts(scoutData.map((s) => ({
        user_id: s.user_id, organization: s.organization,
        full_name: map[s.user_id]?.full_name ?? "Scout",
        avatar_url: map[s.user_id]?.avatar_url ?? null,
      })));
    };
    fetchScouts();
    const t = setTimeout(() => setHeroReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">

      {/* ══════════════════════════════════════════
          HERO — full-bleed video, liquid glass card
      ══════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-start overflow-hidden">

        {/* ── FULL-BLEED VIDEO — fills entire hero ── */}
        <motion.div className="absolute inset-0 z-0" style={{ y: videoY, scale: videoScale }}>
          <video
            autoPlay loop muted playsInline preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
          {/* Very subtle vignette only at extreme edges — keeps video visible */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 120% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)"
          }} />
        </motion.div>

        {/* ── Bottom fade into page ── */}
        <div className="absolute bottom-0 left-0 right-0 z-[3] pointer-events-none" style={{
          height: "28%",
          background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)"
        }} />

        {/* ── LIQUID GLASS CARD — floats over video, iOS-style ── */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-10 container pt-28 pb-24 flex items-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={heroReady ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-xl w-full rounded-3xl overflow-hidden p-8 sm:p-12"
            style={{
              /* iOS liquid glass: near-transparent with heavy blur */
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(48px) saturate(200%) brightness(1.08)",
              WebkitBackdropFilter: "blur(48px) saturate(200%) brightness(1.08)",
              /* Specular rim — very faint white border that fades on bottom-right */
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), inset 1px 0 0 rgba(255,255,255,0.2), 0 24px 80px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.12)",
              border: "1px solid rgba(255,255,255,0.22)",
              /* Soft bottom/right edge dissolve via gradient border trick */
              WebkitMaskImage: "radial-gradient(ellipse 110% 105% at 30% 40%, black 60%, rgba(0,0,0,0.92) 75%, rgba(0,0,0,0.6) 88%, transparent 100%)",
              maskImage: "radial-gradient(ellipse 110% 105% at 30% 40%, black 60%, rgba(0,0,0,0.92) 75%, rgba(0,0,0,0.6) 88%, transparent 100%)",
            }}
          >
            {/* Specular highlight streak across top-left (depth effect) */}
            <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 30%, rgba(255,255,255,0.3) 60%, transparent 100%)"
            }} />
            <div className="absolute top-0 left-0 bottom-0 w-px pointer-events-none" style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 50%, transparent 100%)"
            }} />

            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={heroReady ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 mb-7"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                backdropFilter: "blur(8px)",
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="w-2 h-2 rounded-full"
                style={{ background: "hsl(var(--green))" }}
              />
              <span className="text-xs font-bold tracking-[0.18em] uppercase" style={{ color: "hsl(var(--green))" }}>
                Bangladesh Sports Revolution
              </span>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={heroReady ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="font-display leading-[0.88] mb-6"
              style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)", color: "rgba(255,255,255,0.96)" }}
            >
              YOUR TALENT
              <br />
              <span style={{
                backgroundImage: "linear-gradient(135deg, hsl(var(--green)), hsl(142 90% 65%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                DESERVES
              </span>
              <br />
              A STAGE
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={heroReady ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="text-base sm:text-lg mb-10 leading-relaxed"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              The first platform connecting Bangladesh's grassroots football &amp; cricket talent
              with verified scouts. Safe. Transparent. Built for you.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={heroReady ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.62 }}
              className="flex flex-col xs:flex-row gap-3"
            >
              {user && role ? (
                <Link to={role === "admin" ? "/admin" : role === "scout" ? "/scout" : "/player"}>
                  <Button size="lg" className="font-bold text-lg px-10 animate-pulse-glow"
                    style={{ background: "hsl(var(--green))", color: "#fff" }}>
                    Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth">
                    <Button size="lg" className="font-bold text-base sm:text-lg px-8 sm:px-10 animate-pulse-glow"
                      style={{ background: "hsl(var(--green))", color: "#fff" }}>
                      Join as Player <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/auth?role=scout">
                    <Button size="lg" className="font-semibold text-base sm:text-lg px-8 sm:px-10"
                      style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}>
                      I'm a Scout
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>

            {/* Stat pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={heroReady ? { opacity: 1 } : {}}
              transition={{ delay: 0.9 }}
              className="flex flex-wrap gap-3 mt-8"
            >
              {[
                { v: "2,500+", l: "Players" },
                { v: "120+",   l: "Scouts" },
                { v: "৳100",   l: "Registration" },
                { v: "8",      l: "Divisions" },
              ].map((s) => (
                <div key={s.l} className="flex items-center gap-2 rounded-full px-3 py-1.5"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <span className="text-sm font-bold" style={{ color: "hsl(var(--green))" }}>{s.v}</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{s.l}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll nudge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5"
        >
          <span className="text-[10px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Scroll</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
            <ChevronDown className="h-5 w-5" style={{ color: "rgba(255,255,255,0.3)" }} />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          MARQUEE
      ══════════════════════════════════════════ */}
      <MarqueeTicker />

      {/* ══════════════════════════════════════════
          LIVE STATS BAR
      ══════════════════════════════════════════ */}
      <section className="py-16 border-t border-border relative overflow-hidden">
        {/* Green ambient glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 60% 80% at 50% 50%, hsl(var(--green) / 0.08) 0%, transparent 70%)"
        }} />
        <div className="container">
          <div className="grid grid-cols-3 gap-4 sm:gap-8">
            {[
              { label: "Players Registered", target: 2500, suffix: "+", Icon: Users },
              { label: "Verified Scouts",    target: 120,  suffix: "+", Icon: Shield },
              { label: "Talent Discovered",  target: 340,  suffix: "+", Icon: Trophy },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 0.12} className="text-center group">
                <div className="relative p-6 rounded-2xl border transition-all duration-300 card-hover"
                  style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                      style={{ background: "hsl(var(--green) / 0.12)" }}>
                      <stat.Icon className="h-5 w-5" style={{ color: "hsl(var(--green))" }} />
                    </div>
                  </div>
                  <div className="font-display text-4xl sm:text-6xl mb-1" style={{ color: "hsl(var(--green))" }}>
                    <Counter target={stat.target} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 group-hover:w-full transition-all duration-500 rounded-full"
                    style={{ background: "hsl(var(--green))" }} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS — 3 STEPS
      ══════════════════════════════════════════ */}
      <section className="py-20 sm:py-32 border-t border-border overflow-hidden relative">
        {/* Vertical timeline */}
        <div className="hidden sm:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--green) / 0.2) 20%, hsl(var(--green) / 0.2) 80%, transparent)" }} />

        <div className="container">
          <Reveal className="text-center mb-16 sm:mb-24">
            <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase mb-4 px-4 py-1.5 rounded-full"
              style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))" }}>
              The Platform
            </span>
            <h2 className="font-display text-4xl sm:text-6xl text-foreground">HOW IT <span style={{ color: "hsl(var(--green))" }}>WORKS</span></h2>
            <p className="text-muted-foreground mt-3 max-w-md mx-auto">Three simple steps from unknown talent to scouted athlete</p>
          </Reveal>

          <div className="space-y-24 sm:space-y-36">

            {/* Step 1 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-12">
              <Reveal direction="left" className="flex-1 max-w-lg">
                <div className="flex items-center gap-3 mb-5">
                  <span className="font-display text-7xl sm:text-8xl leading-none" style={{ color: "hsl(var(--green) / 0.15)" }}>01</span>
                  <div className="h-px flex-1" style={{ background: "hsl(var(--green) / 0.2)" }} />
                  <span className="text-xs font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full"
                    style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))" }}>Create Profile</span>
                </div>
                <h3 className="font-display text-4xl sm:text-5xl text-foreground mb-4">YOUR STORY<br />STARTS HERE</h3>
                <p className="text-muted-foreground leading-relaxed">Sign up as a Player, add your details, select your sport — Football or Cricket. Your profile becomes your digital identity, visible to scouts across Bangladesh.</p>
                <div className="mt-6 flex gap-3">
                  {["Football", "Cricket", "Athletics"].map((s) => (
                    <span key={s} className="text-xs px-3 py-1 rounded-full border font-medium"
                      style={{ borderColor: "hsl(var(--green) / 0.25)", color: "hsl(var(--green))", background: "hsl(var(--green) / 0.06)" }}>{s}</span>
                  ))}
                </div>
              </Reveal>

              {/* Player card mockup */}
              <Reveal delay={0.2} direction="right" className="flex-1 max-w-sm w-full">
                <motion.div whileHover={{ y: -6, rotateY: 3 }} transition={{ type: "spring", stiffness: 200 }}
                  className="relative rounded-2xl border p-6 overflow-hidden card-3d"
                  style={{ borderColor: "hsl(var(--green) / 0.2)", background: "hsl(var(--card))" }}>
                  <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--green) / 0.6), transparent)" }} />
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, hsl(var(--green) / 0.08) 0%, transparent 70%)" }} />
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-14 h-14 rounded-full border-2 flex items-center justify-center font-display text-2xl"
                      style={{ borderColor: "hsl(var(--green) / 0.4)", background: "hsl(var(--green) / 0.08)", color: "hsl(var(--green))" }}>R</div>
                    <div>
                      <div className="font-semibold text-foreground">Rafiqul Islam</div>
                      <div className="text-xs text-muted-foreground">Midfielder · Football · Dhaka</div>
                    </div>
                    <div className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 border text-[10px] font-semibold"
                      style={{ borderColor: "hsl(var(--green) / 0.3)", color: "hsl(var(--green))" }}>
                      <Shield className="h-2.5 w-2.5" /> Live
                    </div>
                  </div>
                  {["Speed", "Dribbling", "Vision", "Positioning"].map((skill, j) => (
                    <div key={skill} className="mb-3">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">{skill}</span>
                        <span className="font-bold" style={{ color: "hsl(var(--green))" }}>{[88, 76, 91, 82][j]}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--foreground) / 0.07)" }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg, hsl(var(--green)), hsl(142 76% 32%))" }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${[88, 76, 91, 82][j]}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: j * 0.1 }} />
                      </div>
                    </div>
                  ))}
                </motion.div>
              </Reveal>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col sm:flex-row-reverse items-center justify-between gap-12">
              <Reveal direction="right" className="flex-1 max-w-lg">
                <div className="flex items-center gap-3 mb-5">
                  <span className="font-display text-7xl sm:text-8xl leading-none" style={{ color: "hsl(var(--green) / 0.15)" }}>02</span>
                  <div className="h-px flex-1" style={{ background: "hsl(var(--green) / 0.2)" }} />
                  <span className="text-xs font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full"
                    style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))" }}>Upload Highlights</span>
                </div>
                <h3 className="font-display text-4xl sm:text-5xl text-foreground mb-4">LET YOUR GAME<br />SPEAK</h3>
                <p className="text-muted-foreground leading-relaxed">Record a 3-minute highlight video. Tag your position and traits. Pay ৳100 via bKash. Your reel goes live to hundreds of verified scouts instantly.</p>
                <div className="mt-6 p-4 rounded-xl border flex items-center gap-4"
                  style={{ borderColor: "hsl(var(--green) / 0.15)", background: "hsl(var(--green) / 0.05)" }}>
                  <Zap className="h-8 w-8 flex-shrink-0" style={{ color: "hsl(var(--green))" }} />
                  <div>
                    <div className="text-sm font-bold text-foreground">Only ৳100</div>
                    <div className="text-xs text-muted-foreground">One-time payment via bKash · Instantly live</div>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={0.2} direction="left" className="flex-1 max-w-sm w-full">
                <VideoHighlights />
              </Reveal>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-12">
              <Reveal direction="left" className="flex-1 max-w-lg">
                <div className="flex items-center gap-3 mb-5">
                  <span className="font-display text-7xl sm:text-8xl leading-none" style={{ color: "hsl(var(--green) / 0.15)" }}>03</span>
                  <div className="h-px flex-1" style={{ background: "hsl(var(--green) / 0.2)" }} />
                  <span className="text-xs font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full"
                    style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))" }}>Get Discovered</span>
                </div>
                <h3 className="font-display text-4xl sm:text-5xl text-foreground mb-4">SCOUTS<br />FIND YOU</h3>
                <p className="text-muted-foreground leading-relaxed">Verified scouts browse your profile, shortlist you, and reach out through our safe admin-mediated channel. No direct contact. No corruption. Pure merit.</p>
              </Reveal>

              {/* Scout dashboard mockup */}
              <Reveal delay={0.2} direction="right" className="flex-1 max-w-sm w-full">
                <motion.div whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 200 }}
                  className="relative rounded-2xl border p-5 overflow-hidden"
                  style={{ borderColor: "hsl(var(--green) / 0.2)", background: "hsl(var(--card))" }}>
                  <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--green) / 0.6), transparent)" }} />
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-4 w-4" style={{ color: "hsl(var(--green))" }} />
                    <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "hsl(var(--green))" }}>Scout Dashboard</span>
                  </div>
                  {[
                    { name: "Rafiqul Islam", pos: "Midfielder",  score: 91 },
                    { name: "Nusrat Jahan",  pos: "Forward",     score: 87 },
                    { name: "Tanjim Ahmed",  pos: "All-rounder", score: 84 },
                  ].map((p, j) => (
                    <motion.div key={p.name}
                      initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }} transition={{ delay: j * 0.15 }}
                      className="flex items-center gap-3 p-3 rounded-xl border mb-2 last:mb-0"
                      style={{ borderColor: "hsl(var(--foreground) / 0.06)", background: "hsl(var(--foreground) / 0.02)" }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm border"
                        style={{ borderColor: "hsl(var(--green) / 0.25)", background: "hsl(var(--green) / 0.06)", color: "hsl(var(--green))" }}>
                        {p.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">{p.pos}</div>
                      </div>
                      <div className="text-sm font-bold" style={{ color: "hsl(var(--green))" }}>{p.score}</div>
                      <div className="text-[9px] px-2 py-1 rounded-full font-semibold"
                        style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))" }}>★ Shortlisted</div>
                    </motion.div>
                  ))}
                </motion.div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          MARQUEE #2
      ══════════════════════════════════════════ */}
      <MarqueeTicker />

      {/* ══════════════════════════════════════════
          MAP SECTION
      ══════════════════════════════════════════ */}
      <BangladeshMapTestimonials />

      {/* ══════════════════════════════════════════
          VERIFIED SCOUTS
      ══════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 border-t border-border">
        <div className="container">
          <Reveal className="text-center mb-12">
            <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase mb-4 px-4 py-1.5 rounded-full"
              style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))" }}>Our Network</span>
            <h2 className="font-display text-3xl sm:text-5xl text-foreground">
              VERIFIED <span style={{ color: "hsl(var(--green))" }}>SCOUTS</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto mt-2">
              These professionals are actively discovering talent across Bangladesh
            </p>
          </Reveal>

          {verifiedScouts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {verifiedScouts.map((scout, i) => (
                <Reveal key={scout.user_id} delay={i * 0.07}>
                  <motion.div whileHover={{ y: -5, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}
                    className="group rounded-2xl border p-5 flex flex-col items-center text-center gap-3 card-hover"
                    style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
                    <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center overflow-hidden"
                      style={{ borderColor: "hsl(var(--green) / 0.2)", background: "hsl(var(--green) / 0.06)" }}>
                      {scout.avatar_url ? (
                        <img src={scout.avatar_url} alt={scout.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-display text-2xl" style={{ color: "hsl(var(--green))" }}>
                          {scout.full_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">{scout.full_name}</p>
                      {scout.organization && <p className="text-xs text-muted-foreground mt-0.5">{scout.organization}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full px-3 py-1 border text-xs font-medium"
                      style={{ borderColor: "hsl(var(--green) / 0.2)", color: "hsl(var(--green))", background: "hsl(var(--green) / 0.07)" }}>
                      <Shield className="h-3 w-3" /> Verified
                    </div>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-12">No verified scouts listed yet.</p>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CINEMATIC CTA
      ══════════════════════════════════════════ */}
      <section className="py-24 sm:py-36 border-t border-border relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, hsl(var(--green) / 0.07) 0%, transparent 70%)"
        }} />
        <div className="absolute inset-x-0 top-0 h-px accent-line" />
        <div className="absolute inset-x-0 bottom-0 h-px accent-line" />
        {/* Animated grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{ backgroundImage: "linear-gradient(hsl(var(--green)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--green)) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="container relative z-10 text-center">
          <Reveal>
            <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 3, repeat: Infinity }}>
              <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase mb-6 px-4 py-1.5 rounded-full"
                style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))" }}>Ready to Shine</span>
            </motion.div>
            <h2 className="font-display text-5xl sm:text-7xl lg:text-9xl text-foreground mb-6 leading-none">
              YOUR MOMENT<br />
              <span style={{ color: "hsl(var(--green))" }}>STARTS NOW</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-10 text-base sm:text-lg">
              Join thousands of players who have already uploaded their highlights. Scouts are watching.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="font-bold text-lg px-12 py-6 animate-pulse-glow"
                  style={{ background: "hsl(var(--green))", color: "hsl(var(--primary-foreground))" }}>
                  Join Scout BD Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/mission">
                <Button size="lg" variant="outline" className="font-semibold text-lg px-10 py-6"
                  style={{ borderColor: "hsl(var(--green) / 0.3)", color: "hsl(var(--green))" }}>
                  Our Mission
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER SOCIAL
      ══════════════════════════════════════════ */}
      <section className="py-16 border-t border-border">
        <div className="container text-center">
          <Reveal>
            <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-6">Follow the Journey</p>
            <div className="flex justify-center gap-5">
              {socialLinks.map(({ Icon, label, href, color }) => (
                <motion.a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  whileHover={{ scale: 1.2, y: -4 }} transition={{ type: "spring", stiffness: 400 }}
                  className={`text-muted-foreground transition-colors duration-200 ${color}`}
                  aria-label={label}>
                  <Icon className="h-5 w-5" />
                </motion.a>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/40 mt-8">© 2025 Scout BD. All rights reserved.</p>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default Index;
