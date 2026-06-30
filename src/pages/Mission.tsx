import { motion } from "framer-motion";
import { Target, Heart, Globe } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

const Mission = () => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen pt-20 pb-16">
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
    </div>
  );
};

export default Mission;
