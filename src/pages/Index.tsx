import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView, useMotionValue, useMotionTemplate, useSpring } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight, ArrowLeft, Users, Shield, Trophy, Twitter, Facebook,
  Instagram, Youtube, ChevronDown, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BangladeshMapTestimonials from "@/components/BangladeshMapTestimonials";
import VideoHighlights from "@/components/VideoHighlights";
import CholoKheliMark from "@/components/CholoKheliMark";
import HeroMistCursor from "@/components/HeroMistCursor";
import heroImg from "@/assets/hero-cricket.jpg.asset.json";
import statsImg from "@/assets/stats-football.jpg.asset.json";
import stadiumImg from "@/assets/stadium-dusk.jpg.asset.json";
import footballerImg from "@/assets/footballer-motion.jpg.asset.json";
import phoneDashboard from "@/assets/phone-dashboard-v2.png.asset.json";
import phonePlaystore from "@/assets/phone-playstore.png.asset.json";
import sportFootball from "@/assets/sport-football.jpg.asset.json";
import sportCricket from "@/assets/sport-cricket.jpg.asset.json";
import sportBasketball from "@/assets/sport-basketball.jpg.asset.json";
import { safeMediaUrl } from "@/lib/sanitize";
import { useLanguage } from "@/i18n/LanguageProvider";

const COPY = {
  en: {
    heroTagline: "A quiet place where Bangladesh's grassroots talent meets verified scouts. Safe. Transparent. Built for the love of the game.",
    openDashboard: "Open Dashboard",
    joinAsPlayer: "Join as Player",
    imAScout: "I'm a Scout",
    scroll: "Scroll",
    sportsTitle1: "EVERY GAME,",
    sportsTitle2: "EVERY PLAYER",
    football: "Football",
    cricket: "Cricket",
    basketball: "Basketball",
    footballTag: "From para to pitch",
    cricketTag: "Bat. Ball. Belief.",
    basketballTag: "Rising on the hardwood",
    footballBlurb: "Bangladesh's most-loved game. We connect strikers, keepers, and midfielders from every district to scouts who're watching.",
    cricketBlurb: "From maktab grounds to national selection — batters, bowlers, and all-rounders get a verified pathway to be seen.",
    basketballBlurb: "A growing scene in Dhaka and Chattogram. Guards, forwards, and centres — your jump shot deserves an audience.",
    explore: "Explore",
    thePlatform: "The Platform",
    howItWorks1: "HOW IT",
    howItWorks2: "WORKS",
    howItWorksSub: "Three simple steps from unknown talent to scouted athlete",
    step1Pill: "Create Profile",
    step1Title: "YOUR STORY\nSTARTS HERE",
    step1Body: "Sign up as a Player, add your details, select your sport — Football or Cricket. Your profile becomes your digital identity, visible to scouts across Bangladesh.",
    athletics: "Athletics",
    step2Pill: "Upload Highlights",
    step2Title: "LET YOUR GAME\nSPEAK",
    step2Body: "Record a 3-minute highlight video. Tag your position and traits. Pay ৳100 via bKash. Your reel goes live to hundreds of verified scouts instantly.",
    only100: "Only ৳100",
    only100Sub: "One-time payment via bKash · Instantly live",
    step3Pill: "Get Discovered",
    step3Title: "SCOUTS\nFIND YOU",
    step3Body: "Verified scouts browse your profile, shortlist you, and reach out through our safe admin-mediated channel. No direct contact. No corruption. Pure merit.",
    scoutDashboard: "Scout Dashboard",
    midfielder: "Midfielder", forward: "Forward", allRounder: "All-rounder",
    shortlisted: "★ Shortlisted",
    live: "Live",
    midfielderLong: "Midfielder · Football · Dhaka",
    skillSpeed: "Speed", skillDribbling: "Dribbling", skillVision: "Vision", skillPositioning: "Positioning",
    ourNetwork: "Our Network",
    verified: "VERIFIED", scouts: "SCOUTS",
    scoutsSub: "Hear directly from the professionals discovering talent across Bangladesh",
    of: "OF",
    previous: "Previous", next: "Next",
    joinFree: "Join Cholo Kheli Free",
    ourMission: "Our Mission",
    playersRegistered: "Players Registered",
    verifiedScouts: "Verified Scouts",
    talentDiscovered: "Talent Discovered",
    followJourney: "Follow the Journey",
    copyright: "© 2026 Cholo Kheli — Let's Play",
  },
  bn: {
    heroTagline: "একটি শান্ত জায়গা যেখানে বাংলাদেশের তৃণমূল প্রতিভা যাচাইকৃত স্কাউটদের সাথে মিলিত হয়। নিরাপদ। স্বচ্ছ। খেলার ভালোবাসার জন্য তৈরি।",
    openDashboard: "ড্যাশবোর্ড খুলুন",
    joinAsPlayer: "প্লেয়ার হিসেবে যোগ দিন",
    imAScout: "আমি একজন স্কাউট",
    scroll: "স্ক্রল",
    sportsTitle1: "প্রতিটি খেলা,",
    sportsTitle2: "প্রতিটি খেলোয়াড়",
    football: "ফুটবল",
    cricket: "ক্রিকেট",
    basketball: "বাস্কেটবল",
    footballTag: "পাড়া থেকে মাঠে",
    cricketTag: "ব্যাট। বল। বিশ্বাস।",
    basketballTag: "কাঠের কোর্টে উদীয়মান",
    footballBlurb: "বাংলাদেশের সবচেয়ে প্রিয় খেলা। আমরা প্রতিটি জেলার স্ট্রাইকার, গোলরক্ষক ও মিডফিল্ডারদের যাচাইকৃত স্কাউটদের সাথে যুক্ত করি।",
    cricketBlurb: "মক্তবের মাঠ থেকে জাতীয় নির্বাচন পর্যন্ত — ব্যাটার, বোলার ও অলরাউন্ডাররা দৃশ্যমান হওয়ার একটি যাচাইকৃত পথ পায়।",
    basketballBlurb: "ঢাকা ও চট্টগ্রামে ক্রমবর্ধমান একটি অঙ্গন। গার্ড, ফরোয়ার্ড ও সেন্টার — আপনার জাম্প শট দর্শক প্রাপ্য।",
    explore: "অন্বেষণ",
    thePlatform: "প্ল্যাটফর্ম",
    howItWorks1: "এটি কীভাবে",
    howItWorks2: "কাজ করে",
    howItWorksSub: "অজানা প্রতিভা থেকে স্কাউটেড অ্যাথলিটে — তিনটি সহজ ধাপ",
    step1Pill: "প্রোফাইল তৈরি করুন",
    step1Title: "আপনার গল্প\nএখানেই শুরু",
    step1Body: "প্লেয়ার হিসেবে সাইন আপ করুন, আপনার তথ্য যোগ করুন, আপনার খেলা নির্বাচন করুন — ফুটবল বা ক্রিকেট। আপনার প্রোফাইলই আপনার ডিজিটাল পরিচয়, বাংলাদেশের সকল স্কাউটের কাছে দৃশ্যমান।",
    athletics: "অ্যাথলেটিক্স",
    step2Pill: "হাইলাইট আপলোড করুন",
    step2Title: "আপনার খেলা\nকথা বলুক",
    step2Body: "একটি ৩-মিনিটের হাইলাইট ভিডিও রেকর্ড করুন। আপনার পজিশন ও বৈশিষ্ট্য ট্যাগ করুন। বিকাশে ১০০ টাকা পরিশোধ করুন। আপনার রিল তাৎক্ষণিকভাবে শত শত যাচাইকৃত স্কাউটের কাছে লাইভ হয়ে যাবে।",
    only100: "মাত্র ১০০ টাকা",
    only100Sub: "বিকাশে এককালীন পেমেন্ট · তাৎক্ষণিক লাইভ",
    step3Pill: "আবিষ্কৃত হন",
    step3Title: "স্কাউট\nআপনাকে খুঁজে পাবে",
    step3Body: "যাচাইকৃত স্কাউটরা আপনার প্রোফাইল দেখে, আপনাকে শর্টলিস্ট করে এবং আমাদের নিরাপদ অ্যাডমিন-মধ্যস্থ চ্যানেলে যোগাযোগ করে। কোনো সরাসরি যোগাযোগ নেই। কোনো দুর্নীতি নেই। শুধুই মেধা।",
    scoutDashboard: "স্কাউট ড্যাশবোর্ড",
    midfielder: "মিডফিল্ডার", forward: "ফরোয়ার্ড", allRounder: "অলরাউন্ডার",
    shortlisted: "★ শর্টলিস্টেড",
    live: "লাইভ",
    midfielderLong: "মিডফিল্ডার · ফুটবল · ঢাকা",
    skillSpeed: "গতি", skillDribbling: "ড্রিবলিং", skillVision: "দৃষ্টি", skillPositioning: "পজিশনিং",
    ourNetwork: "আমাদের নেটওয়ার্ক",
    verified: "যাচাইকৃত", scouts: "স্কাউট",
    scoutsSub: "বাংলাদেশজুড়ে প্রতিভা আবিষ্কারকারী পেশাদারদের কাছ থেকে সরাসরি শুনুন",
    of: "এর",
    previous: "পূর্ববর্তী", next: "পরবর্তী",
    joinFree: "চলো খেলিতে বিনামূল্যে যোগ দিন",
    ourMission: "আমাদের লক্ষ্য",
    playersRegistered: "নিবন্ধিত খেলোয়াড়",
    verifiedScouts: "যাচাইকৃত স্কাউট",
    talentDiscovered: "আবিষ্কৃত প্রতিভা",
    followJourney: "যাত্রা অনুসরণ করুন",
    copyright: "© ২০২৬ চলো খেলি — চলো খেলি",
  },
} as const;

const socialLinks = [
  { Icon: Facebook,  label: "Facebook",    href: "https://facebook.com/cholokheli",  color: "hover:text-[hsl(var(--teal))]" },
  { Icon: Twitter,   label: "Twitter / X", href: "https://twitter.com/cholokheli",   color: "hover:text-[hsl(var(--teal))]" },
  { Icon: Instagram, label: "Instagram",   href: "https://instagram.com/cholokheli", color: "hover:text-[hsl(var(--teal))]" },
  { Icon: Youtube,   label: "YouTube",     href: "https://youtube.com/@cholokheli",  color: "hover:text-[hsl(var(--teal))]" },
];

type ScoutProfile = {
  user_id: string;
  full_name: string;
  organization: string | null;
  avatar_url: string | null;
  bio: string | null;
};

const FALLBACK_SCOUTS: ScoutProfile[] = [
  {
    user_id: "fb-1",
    full_name: "Tanvir Hasan",
    organization: "Bashundhara Kings Academy",
    avatar_url: null,
    bio: "Fifteen years scouting football across Dhaka and Chattogram divisions. I look for players who read the game two passes ahead — technique can be coached, vision is rarer. My job is to give district-level talent a fair shot at the national pipeline.",
  },
  {
    user_id: "fb-2",
    full_name: "Nusrat Jahan",
    organization: "Bangladesh Cricket Board",
    avatar_url: null,
    bio: "Former domestic all-rounder, now scouting for the women's and U-19 pathways. Cholo Kheli lets me watch tape from villages I'd never reach in person. Every week I find someone worth a closer look — that didn't happen before.",
  },
  {
    user_id: "fb-3",
    full_name: "Imran Chowdhury",
    organization: "Sheikh Russel KC",
    avatar_url: null,
    bio: "I scout midfielders and defenders for the Premier League side. The verified, admin-mediated channel here means I'm talking to real players and real guardians — no agents, no noise. That trust is what made me sign up.",
  },
  {
    user_id: "fb-4",
    full_name: "Farhana Ahmed",
    organization: "Abahani Limited Dhaka",
    avatar_url: null,
    bio: "Twelve years in talent identification. The grassroots in Bangladesh is deeper than people think — what's been missing is a clean way to see it. Cholo Kheli is the first platform where I trust every profile in front of me.",
  },
  {
    user_id: "fb-5",
    full_name: "Rashed Mahmud",
    organization: "BFF Elite Academy",
    avatar_url: null,
    bio: "I focus on under-17 prospects. Three minutes of honest footage tells me more than a written CV ever could. The players I've shortlisted from this platform are now training with us in Sylhet — that's the proof I needed.",
  },
];


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

/* ── Scout carousel card with parallax shine + smooth fade ── */
function ScoutCarouselCard({ scout, defaultBio }: { scout: ScoutProfile; defaultBio: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(50);
  const my = useMotionValue(25);
  const sx = useSpring(mx, { stiffness: 120, damping: 20, mass: 0.4 });
  const sy = useSpring(my, { stiffness: 120, damping: 20, mass: 0.4 });
  const shine = useMotionTemplate`radial-gradient(120% 80% at ${sx}% ${sy}%, rgba(180,215,245,0.45) 0%, rgba(90,140,190,0.22) 28%, rgba(20,40,70,0.05) 58%, rgba(0,0,0,0) 78%)`;
  const accent = useMotionTemplate`radial-gradient(60% 50% at ${sx}% ${sy}%, hsl(var(--green) / 0.35), transparent 70%)`;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  };
  const onLeave = () => { mx.set(50); my.set(25); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.005 }}
      className="absolute inset-0 rounded-3xl border overflow-hidden p-8 sm:p-12 flex flex-col justify-between shadow-2xl"
      style={{ borderColor: "hsl(var(--green) / 0.22)", background: "#0a1520" }}
    >
      {/* Mouse-tracked shine */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ background: shine }} />
      {/* Static cool highlight bottom-right */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(90% 70% at 95% 100%, rgba(120,170,220,0.22) 0%, rgba(120,170,220,0.05) 35%, transparent 65%)" }} />
      {/* Mouse-tracked brand tint */}
      <motion.div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: accent }} />
      {/* Sweeping diagonal sheen on enter */}
      <motion.div
        className="absolute inset-y-0 -inset-x-1/4 pointer-events-none"
        initial={{ x: "-60%", opacity: 0 }}
        animate={{ x: "120%", opacity: [0, 0.6, 0] }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        style={{ background: "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)" }}
      />
      {/* Top edge gloss */}
      <div className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" }} />

      <div className="relative flex items-center gap-3">
        <div className="w-14 h-14 rounded-full overflow-hidden border-2 flex items-center justify-center"
          style={{ borderColor: "hsl(var(--green) / 0.4)", background: "hsl(var(--green) / 0.15)" }}>
          {scout.avatar_url ? (
            <img src={safeMediaUrl(scout.avatar_url)} alt={scout.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-xl text-white">{scout.full_name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center -ml-4 border-2"
          style={{ borderColor: "hsl(var(--ink))", background: "hsl(var(--green))" }}>
          <Shield className="h-4 w-4 text-white" />
        </div>
      </div>

      <p className="relative text-xl sm:text-2xl lg:text-[26px] leading-relaxed text-white/95 font-light tracking-tight my-8">
        "{scout.bio ?? defaultBio}"
      </p>

      <div className="relative">
        <p className="text-base font-semibold text-white">{scout.full_name}</p>
        {scout.organization && <p className="text-sm text-white/55 mt-0.5">{scout.organization}</p>}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════
   PAGE
════════════════════════════════════════════ */
const Index = () => {
  const { user, role } = useAuth();
  const { lang } = useLanguage();
  const T = COPY[lang];
  const [verifiedScouts, setVerifiedScouts] = useState<ScoutProfile[]>(FALLBACK_SCOUTS);
  const [scoutIndex, setScoutIndex] = useState(0);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const videoY      = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const videoScale  = useTransform(scrollYProgress, [0, 0.7], [1, 1.06]);

  useEffect(() => {
    const isPlaceholder = !import.meta.env.VITE_SUPABASE_URL;
    if (isPlaceholder) return;
    const fetchScouts = async () => {
      try {
        const { data: scoutData } = await supabase.from("scout_profiles").select("user_id, organization").eq("verification_status", "active").limit(12);
        if (!scoutData?.length) return;
        const userIds = scoutData.map((s) => s.user_id);
        const { data: profileData } = await supabase.from("profiles").select("user_id, full_name, avatar_url, bio").in("user_id", userIds);
        const map = Object.fromEntries((profileData ?? []).map((p) => [p.user_id, p]));
        setVerifiedScouts(scoutData.map((s) => ({
          user_id: s.user_id, organization: s.organization,
          full_name: map[s.user_id]?.full_name ?? "Scout",
          avatar_url: map[s.user_id]?.avatar_url ?? null,
          bio: map[s.user_id]?.bio ?? null,
        })));
      } catch (e) {
        console.warn("scouts fetch failed", e);
      }
    };
    fetchScouts();
  }, []);



  return (
    <div className="min-h-screen overflow-x-hidden bg-background">

      {/* ══════════════════════════════════════════
          HERO — Centered Mark, paper minimalism
      ══════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[100svh] flex items-center justify-center overflow-hidden surface-paper"
      >
        {/* Cinematic backdrop */}
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ opacity: heroOpacity, y: videoY, scale: videoScale }}
        >
          <img
            src={heroImg.url}
            alt=""
            aria-hidden
            loading="eager"
            decoding="async"
            {...({ fetchpriority: "high" } as any)}
            className="w-full h-full object-cover"
          />
          {/* Dark tint for text legibility over foggy night image */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, hsl(200 40% 4% / 0.45) 0%, hsl(200 40% 6% / 0.55) 55%, hsl(var(--paper-deep) / 0.95) 100%)",
            }}
          />

        </motion.div>

        {/* Cursor-following foggy mist */}
        <HeroMistCursor />



        {/* Subtle vertical grid lines for editorial feel */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "12.5% 100%",
          }}
        />


        {/* Centered mark + wordmark */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <CholoKheliMark
              className="h-28 w-36 sm:h-36 sm:w-48 text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
              accent="hsl(188 60% 70%)"
            />
          </motion.div>

          {/* Wordmark — letter cascade */}
          <div className="mt-6 sm:mt-8 flex items-baseline justify-center gap-3 sm:gap-4">
            {["CHOLO", "KHELI"].map((word, wi) => (
              <div key={word} className="flex">
                {word.split("").map((char, i) => (
                  <motion.span
                    key={`${word}-${i}`}
                    initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      delay: 0.15 + wi * 0.08 + i * 0.025,
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={`font-display text-5xl sm:text-7xl lg:text-8xl leading-none tracking-[0.04em] drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)] ${
                      wi === 1 ? "font-bold text-[hsl(188_60%_72%)]" : "font-medium text-white"
                    }`}
                  >
                    {char}
                  </motion.span>
                ))}
              </div>
            ))}
          </div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 text-base sm:text-lg text-white/85 max-w-xl leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          >
            {T.heroTagline}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-col sm:flex-row gap-3"
          >
            {user && role ? (
              <Link to={(role === "admin" ? "/admin" : role === "scout" ? "/scout" : "/player") as any}>
                <Button
                  size="lg"
                  className="font-medium text-base px-9 py-6 rounded-full"
                  style={{ background: "hsl(var(--teal-deep))", color: "hsl(var(--primary-foreground))" }}
                >
                  {T.openDashboard} <ArrowRight className="ml-2 h-4 w-4" />
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
                    {T.joinAsPlayer} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth" search={{ role: "scout" }}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="font-medium text-base px-9 py-6 rounded-full bg-white/5 backdrop-blur-sm hover:bg-white/15"
                    style={{ borderColor: "rgba(255,255,255,0.4)", color: "#ffffff" }}
                  >
                    {T.imAScout}
                  </Button>
                </Link>
              </>
            )}
          </motion.div>

        </motion.div>

        {/* Scroll nudge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5"
        >
          <span className="text-[9px] tracking-[0.35em] uppercase text-white/70">{T.scroll}</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
            <ChevronDown className="h-4 w-4 text-white/70" />
          </motion.div>
        </motion.div>


        {/* Seamless fade into next band */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[2]"
          style={{
            background:
              "linear-gradient(to bottom, transparent, hsl(var(--paper-deep)))",
          }}
        />
      </section>

      {/* ══════════════════════════════════════════
          SPORTS GRID — Hover to reveal
      ══════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 surface-paper border-t border-border">
        <div className="container">
          <Reveal className="text-center mb-12 sm:mb-16">
            <h2 className="font-display text-4xl sm:text-6xl" style={{ color: "hsl(var(--teal-deep))" }}>
              {T.sportsTitle1} <span style={{ color: "hsl(var(--teal))" }}>{T.sportsTitle2}</span>
            </h2>
          </Reveal>


          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
            {[
              { img: sportFootball.url, name: T.football, tagline: T.footballTag, blurb: T.footballBlurb },
              { img: sportCricket.url, name: T.cricket, tagline: T.cricketTag, blurb: T.cricketBlurb },
              { img: sportBasketball.url, name: T.basketball, tagline: T.basketballTag, blurb: T.basketballBlurb },
            ].map((sport, i) => (
              <Reveal key={sport.name} delay={i * 0.12}>
                <motion.div
                  whileHover={{ y: -10, scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="group relative aspect-[3/5] rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl"
                >
                  <img
                    src={sport.img}
                    alt={sport.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Base gradient — always visible */}
                  <div className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, hsl(200 40% 4% / 0.85) 0%, hsl(200 40% 4% / 0.2) 55%, transparent 100%)" }} />
                  {/* Hover overlay — deeper */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: "linear-gradient(to top, hsl(var(--teal-deep) / 0.92) 0%, hsl(var(--teal-deep) / 0.55) 60%, hsl(var(--teal-deep) / 0.2) 100%)" }} />

                  {/* Always-visible label */}
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
                    <h3 className="font-display text-2xl sm:text-3xl tracking-wide drop-shadow-lg whitespace-nowrap">

                      {sport.name.toUpperCase()}
                    </h3>
                    <p className="mt-1 text-sm text-white/80 transition-opacity duration-300 group-hover:opacity-0">
                      {sport.tagline}
                    </p>
                    {/* Revealed blurb */}
                    <div className="overflow-hidden max-h-0 group-hover:max-h-48 transition-all duration-500 ease-out">
                      <p className="mt-3 text-sm leading-relaxed text-white/95 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                        {sport.blurb}
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(188_60%_82%)]">
                        {T.explore} <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats moved below CTA phones section */}


      {/* ══════════════════════════════════════════
          HOW IT WORKS — 3 STEPS
      ══════════════════════════════════════════ */}
      <section className="py-20 sm:py-32 border-t border-border overflow-hidden relative surface-paper">
        {/* Subtle cinematic backdrop */}
        <img src={stadiumImg.url} alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-[0.07]" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, hsl(var(--paper-deep) / 0.96), hsl(var(--paper) / 0.98))" }} />
        {/* Vertical timeline */}
        <div className="hidden sm:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--teal-deep) / 0.35) 20%, hsl(var(--teal-deep) / 0.35) 80%, transparent)" }} />

        <div className="container relative z-10">
          <Reveal className="text-center mb-16 sm:mb-24">
            <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase mb-4 px-4 py-1.5 rounded-full"
              style={{ background: "hsl(var(--teal-deep) / 0.12)", color: "hsl(var(--teal-deep))" }}>
              {T.thePlatform}
            </span>
            <h2 className="font-display text-4xl sm:text-6xl" style={{ color: "hsl(var(--teal-deep))" }}>{T.howItWorks1} <span style={{ color: "hsl(var(--teal))" }}>{T.howItWorks2}</span></h2>
            <p className="mt-3 max-w-md mx-auto" style={{ color: "hsl(var(--teal-deep) / 0.75)" }}>{T.howItWorksSub}</p>
          </Reveal>


          <div className="space-y-24 sm:space-y-36">

            {/* Step 1 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-12">
              <Reveal direction="left" className="flex-1 max-w-lg">
                <div className="flex items-center gap-3 mb-5">
                  <span className="font-display text-7xl sm:text-8xl leading-none" style={{ color: "hsl(var(--green) / 0.15)" }}>01</span>
                  <div className="h-px flex-1" style={{ background: "hsl(var(--green) / 0.2)" }} />
                  <span className="text-xs font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full"
                    style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))" }}>{T.step1Pill}</span>
                </div>
                <h3 className="font-display text-4xl sm:text-5xl mb-4 whitespace-pre-line" style={{ color: "hsl(var(--teal-deep))" }}>{T.step1Title}</h3>
                <p className="leading-relaxed" style={{ color: "hsl(var(--teal-deep) / 0.8)" }}>{T.step1Body}</p>
                <div className="mt-6 flex gap-3">
                  {[T.football, T.cricket, T.athletics].map((s) => (
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
                      <div className="text-xs text-muted-foreground">{T.midfielderLong}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 border text-[10px] font-semibold"
                      style={{ borderColor: "hsl(var(--green) / 0.3)", color: "hsl(var(--green))" }}>
                      <Shield className="h-2.5 w-2.5" /> {T.live}
                    </div>
                  </div>
                  {[T.skillSpeed, T.skillDribbling, T.skillVision, T.skillPositioning].map((skill, j) => (
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
                    style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))" }}>{T.step2Pill}</span>
                </div>
                <h3 className="font-display text-4xl sm:text-5xl mb-4 whitespace-pre-line" style={{ color: "hsl(var(--teal-deep))" }}>{T.step2Title}</h3>
                <p className="leading-relaxed" style={{ color: "hsl(var(--teal-deep) / 0.8)" }}>{T.step2Body}</p>
                <div className="mt-6 p-4 rounded-xl border flex items-center gap-4"
                  style={{ borderColor: "hsl(var(--green) / 0.15)", background: "hsl(var(--green) / 0.05)" }}>
                  <Zap className="h-8 w-8 flex-shrink-0" style={{ color: "hsl(var(--green))" }} />
                  <div>
                    <div className="text-sm font-bold text-foreground">{T.only100}</div>
                    <div className="text-xs text-muted-foreground">{T.only100Sub}</div>
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
                    style={{ background: "hsl(var(--green) / 0.12)", color: "hsl(var(--green))" }}>{T.step3Pill}</span>
                </div>
                <h3 className="font-display text-4xl sm:text-5xl mb-4 whitespace-pre-line" style={{ color: "hsl(var(--teal-deep))" }}>{T.step3Title}</h3>
                <p className="leading-relaxed" style={{ color: "hsl(var(--teal-deep) / 0.8)" }}>{T.step3Body}</p>
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
          VERIFIED SCOUTS
      ══════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 border-t border-border relative overflow-hidden" style={{ background: "hsl(var(--ink))" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(hsl(var(--green)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--green)) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
        <div className="container relative z-10">
          <Reveal className="text-center mb-12">
            <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase mb-4 px-4 py-1.5 rounded-full"
              style={{ background: "hsl(var(--green) / 0.15)", color: "hsl(var(--green))" }}>Our Network</span>
            <h2 className="font-display text-3xl sm:text-5xl text-white">
              VERIFIED <span style={{ color: "hsl(var(--green))" }}>SCOUTS</span>
            </h2>
            <p className="text-sm sm:text-base text-white/60 max-w-lg mx-auto mt-2">
              Hear directly from the professionals discovering talent across Bangladesh
            </p>
          </Reveal>

          {verifiedScouts.length > 0 && (() => {
            const scout = verifiedScouts[scoutIndex % verifiedScouts.length];
            const prev = () => setScoutIndex((i) => (i - 1 + verifiedScouts.length) % verifiedScouts.length);
            const next = () => setScoutIndex((i) => (i + 1) % verifiedScouts.length);
            const defaultBio = `${scout.full_name} is a verified scout${scout.organization ? ` with ${scout.organization}` : ""}, actively discovering grassroots talent across Bangladesh through Cholo Kheli.`;
            return (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6 lg:gap-10 items-stretch max-w-6xl mx-auto">
                <div className="relative min-h-[360px] sm:min-h-[420px]">
                  <AnimatePresence mode="wait">
                    <ScoutCarouselCard key={scout.user_id} scout={scout} defaultBio={defaultBio} />
                  </AnimatePresence>
                </div>


                <div className="flex lg:flex-col justify-between gap-4 lg:py-2">
                  <div className="text-xs font-mono tracking-[0.2em] text-white/50 self-start">
                    {String(scoutIndex + 1).padStart(2, "0")} OF {String(verifiedScouts.length).padStart(2, "0")} //
                  </div>
                  <div className="flex lg:flex-col gap-3 lg:gap-2 lg:mt-auto w-full">
                    <button onClick={prev}
                      className="group flex-1 flex items-center justify-between gap-3 px-4 py-4 rounded-xl border transition-colors hover:bg-white/5"
                      style={{ borderColor: "hsl(var(--green) / 0.2)" }}>
                      <ArrowLeft className="h-4 w-4 text-white/70 group-hover:text-white transition-colors" />
                      <span className="text-sm font-medium text-white/80 group-hover:text-white">Previous</span>
                    </button>
                    <button onClick={next}
                      className="group flex-1 flex items-center justify-between gap-3 px-4 py-4 rounded-xl border transition-colors hover:bg-white/5"
                      style={{ borderColor: "hsl(var(--green) / 0.2)" }}>
                      <span className="text-sm font-medium text-white/80 group-hover:text-white">Next</span>
                      <ArrowRight className="h-4 w-4 text-white/70 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>


      {/* ══════════════════════════════════════════
          MAP SECTION
      ══════════════════════════════════════════ */}
      <BangladeshMapTestimonials />


      {/* ══════════════════════════════════════════
          CINEMATIC CTA
      ══════════════════════════════════════════ */}
      <section className="py-24 sm:py-36 border-t border-border relative overflow-hidden surface-ink">
        {/* Cinematic backdrop */}
        <img src={footballerImg.url} alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, hsl(var(--ink) / 0.85), hsl(var(--ink) / 0.95))" }} />
        <div className="absolute inset-x-0 top-0 h-px accent-line" />
        <div className="absolute inset-x-0 bottom-0 h-px accent-line" />
        {/* Animated grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{ backgroundImage: "linear-gradient(hsl(var(--green)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--green)) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="container relative z-10">
          <Reveal>
            <div className="max-w-5xl mx-auto">
              {/* Two vertical phones, tilted in 3D, slide in from sides */}
              <div className="relative mx-auto flex justify-center items-start gap-6 sm:gap-10 lg:gap-16 pb-16 [perspective:1800px]">
                {/* Left phone — slides in from left */}
                <motion.div
                  initial={{ opacity: 0, x: -220, rotateY: -12, rotate: 0 }}
                  whileInView={{ opacity: 1, x: 0, rotateY: -12, rotate: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformStyle: "preserve-3d" }}
                  className="relative z-20 w-[48%] sm:w-[40%] max-w-[280px] aspect-[9/19.5] rounded-[2.4rem] sm:rounded-[3rem] p-[3px] bg-gradient-to-br from-neutral-300 via-neutral-600 to-neutral-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.75),0_25px_50px_-15px_rgba(0,0,0,0.55)]"
                >
                  <div className="relative w-full h-full rounded-[2.2rem] sm:rounded-[2.8rem] p-[6px] bg-black overflow-hidden">
                    <div className="relative w-full h-full rounded-[1.9rem] sm:rounded-[2.4rem] overflow-hidden bg-black">
                      <img src={phoneDashboard.url} alt="Cholo Kheli player profile" loading="lazy"
                        className="w-full h-full object-cover select-none" draggable={false} />
                      <div className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 w-[28%] h-[18px] sm:h-[22px] bg-black rounded-full z-10" />
                      <div className="absolute inset-0 pointer-events-none rounded-[1.9rem] sm:rounded-[2.4rem]"
                        style={{ background: "linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.08) 100%)" }} />
                    </div>
                  </div>
                </motion.div>

                {/* Right phone — slides in from right, offset further down */}
                <motion.div
                  initial={{ opacity: 0, x: 220, rotateY: 12, rotate: 0 }}
                  whileInView={{ opacity: 1, x: 0, rotateY: 12, rotate: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 1.2, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformStyle: "preserve-3d" }}
                  className="relative z-10 w-[48%] sm:w-[40%] max-w-[280px] aspect-[9/19.5] rounded-[2.4rem] sm:rounded-[3rem] p-[3px] bg-gradient-to-bl from-neutral-300 via-neutral-600 to-neutral-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.75),0_25px_50px_-15px_rgba(0,0,0,0.55)] mt-32 sm:mt-48"
                >
                  <div className="relative w-full h-full rounded-[2.2rem] sm:rounded-[2.8rem] p-[6px] bg-black overflow-hidden">
                    <div className="relative w-full h-full rounded-[1.9rem] sm:rounded-[2.4rem] overflow-hidden bg-white">
                      <img src={phonePlaystore.url} alt="Cholo Kheli on Google Play" loading="lazy"
                        className="w-full h-full object-cover select-none" draggable={false} />
                      <div className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 w-[28%] h-[18px] sm:h-[22px] bg-black rounded-full z-10" />
                      <div className="absolute inset-0 pointer-events-none rounded-[1.9rem] sm:rounded-[2.4rem]"
                        style={{ background: "linear-gradient(245deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.08) 100%)" }} />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* CTAs below the phones */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {!user && (
                  <Link to="/auth">
                    <Button size="lg" className="font-bold text-lg px-12 py-6 animate-pulse-glow"
                      style={{ background: "hsl(var(--green))", color: "hsl(var(--primary-foreground))" }}>
                      Join Cholo Kheli Free <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )}
                <Link to="/mission">
                  <Button size="lg" variant="outline" className="font-semibold text-lg px-10 py-6"
                    style={{ borderColor: "hsl(var(--green) / 0.3)", color: "hsl(var(--green))" }}>
                    Our Mission
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          LIVE STATS BAR — moved below CTA phones
      ══════════════════════════════════════════ */}
      <section className="py-16 border-t border-border relative overflow-hidden surface-card">
        <img src={statsImg.url} alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.96))" }} />
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
                  <div className="font-display text-3xl sm:text-4xl lg:text-5xl mb-1 leading-tight tracking-tight whitespace-nowrap" style={{ color: "hsl(var(--green))" }}>
                    <Counter target={stat.target} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 group-hover:w-full transition-all duration-500 rounded-full"
                    style={{ background: "hsl(var(--green))" }} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════
          FOOTER SOCIAL
      ══════════════════════════════════════════ */}
      <section className="py-16 border-t border-border surface-paper">
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
            <p className="text-xs text-muted-foreground/40 mt-8">© 2026 Cholo Kheli — Let&apos;s Play</p>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default Index;
