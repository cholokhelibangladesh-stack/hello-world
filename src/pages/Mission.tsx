import { motion } from "framer-motion";
import { Target, Heart, Globe, FileText } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLanguage } from "@/i18n/LanguageProvider";
import PrivacyPolicy from "./PrivacyPolicy";
import { useEffect, useState } from "react";
import aboutCricket from "@/assets/about-20-14-59.jpg.asset.json";
import aboutBasketball from "@/assets/about-20-15-52.jpg.asset.json";
import aboutFootball from "@/assets/about-20-16-46.jpg.asset.json";

const ABOUT_SLIDES = [aboutCricket.url, aboutBasketball.url, aboutFootball.url];

const Mission = () => {
  const { t } = useLanguage();
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % ABOUT_SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="min-h-screen pb-16">
      {/* About Us hero carousel */}
      <section className="relative h-[60vh] min-h-[380px] w-full overflow-hidden">
        {ABOUT_SLIDES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-[1400ms] ease-in-out"
            style={{ opacity: i === slide ? 1 : 0 }}
            aria-hidden={i !== slide}
          >
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover"
              style={{ filter: "blur(6px) brightness(0.45)", transform: "scale(1.08)" }}
              loading={i === 0 ? "eager" : "lazy"}
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
        ))}
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-display text-white text-5xl sm:text-7xl md:text-8xl tracking-tight text-center drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
          >
            ABOUT US
          </motion.h1>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {ABOUT_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === slide ? "w-8 bg-white" : "w-4 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </section>

      <div className="pt-16">
      <div className="container max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-5xl text-foreground mb-4">{t("mission.title" as any)}</h1>
          <p className="text-lg text-muted-foreground mb-10">{t("mission.intro" as any)}</p>

          <div className="space-y-8">
            <div className="bg-card border border-border rounded-xl p-6">
              <Target className="h-8 w-8 text-primary mb-3" />
              <h2 className="font-display text-2xl text-foreground mb-3">{t("mission.problem.title" as any)}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("mission.problem.body" as any)}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <Heart className="h-8 w-8 text-primary mb-3" />
              <h2 className="font-display text-2xl text-foreground mb-3">{t("mission.approach.title" as any)}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("mission.approach.body" as any)}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <Globe className="h-8 w-8 text-primary mb-3" />
              <h2 className="font-display text-2xl text-foreground mb-3">{t("mission.vision.title" as any)}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("mission.vision.body" as any)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="container max-w-3xl mt-16">
        <div className="border-t border-border pt-10 flex items-center gap-3 mb-6">
          <FileText className="h-5 w-5 text-[hsl(var(--teal-deep))]" />
          <h2 className="font-display text-2xl text-foreground">Privacy Policy</h2>
          <Link to="/privacy-policy" className="ml-auto text-sm text-primary hover:underline">
            Open full page →
          </Link>
        </div>
      </div>

      <div className="-mt-20">
        <PrivacyPolicy />
      </div>
      </div>
    </div>
  );
};

export default Mission;
