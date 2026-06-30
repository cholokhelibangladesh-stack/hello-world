import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageProvider";

const SafeScouting = () => {
  const { toast } = useToast();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="font-display text-4xl text-foreground">{t("safe.title")}</h1>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <h2 className="font-display text-2xl text-foreground mb-4">{t("safe.promise.title")}</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {["safe.promise.1", "safe.promise.2", "safe.promise.3", "safe.promise.4"].map((k) => (
                <li key={k} className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{t(k as any)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-accent/10 border border-accent/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-accent" />
              <h3 className="font-display text-xl text-foreground">{t("safe.redFlags.title")}</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• {t("safe.redFlags.1")}</li>
              <li>• {t("safe.redFlags.2")}</li>
              <li>• {t("safe.redFlags.3")}</li>
              <li>• {t("safe.redFlags.4")}</li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <h3 className="font-display text-xl text-foreground mb-4">{t("safe.report.title")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("safe.report.body")}</p>
            <Button
              className="bg-accent text-accent-foreground font-bold hover:bg-accent/90"
              onClick={() => toast({ title: t("safe.report.toastTitle"), description: t("safe.report.toastBody") })}
            >
              <AlertTriangle className="h-4 w-4 mr-2" /> {t("safe.report.button")}
            </Button>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-xl text-foreground mb-4">{t("safe.contact.title")}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>{t("safe.contact.legal")}: <strong className="text-foreground">legal@cholokheli.com</strong></span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>{t("safe.contact.support")}: <strong className="text-foreground">support@cholokheli.com</strong></span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <span>{t("safe.contact.helpline")}: <strong className="text-foreground">+880 1700-000000</strong></span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SafeScouting;
