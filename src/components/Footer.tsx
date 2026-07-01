import { Link } from "@tanstack/react-router";
import CholoKheliMark from "@/components/CholoKheliMark";
import { useLanguage } from "@/i18n/LanguageProvider";

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border surface-paper">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <CholoKheliMark className="h-7 w-9 text-foreground" accent="hsl(var(--teal-deep))" />
              <span className="font-display text-lg tracking-[0.04em] text-foreground font-semibold">
                CHOLO <span className="text-[hsl(var(--teal-deep))] font-bold">KHELI</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("footer.tagline")}
            </p>
          </div>
          <div>
            <h4 className="font-display text-lg text-foreground mb-3">{t("footer.quickLinks")}</h4>
            <div className="flex flex-col gap-2">
              <Link to="/safe-scouting" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.safeScouting")}</Link>
              <Link to="/mission" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.ourMission")}</Link>
              <Link to="/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.faqHelpline")}</Link>
              <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("cookie.privacyPolicy")}</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display text-lg text-foreground mb-3">{t("footer.contact")}</h4>
            <p className="text-sm text-muted-foreground">hello@cholokheli.com</p>
            <p className="text-sm text-muted-foreground">Legal: legal@cholokheli.com</p>
            <p className="text-sm text-muted-foreground mt-2">{t("footer.dhaka")}</p>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border text-center text-xs tracking-[0.25em] uppercase text-muted-foreground">
          {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
