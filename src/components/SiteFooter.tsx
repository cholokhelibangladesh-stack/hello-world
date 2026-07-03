import { motion } from "framer-motion";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

const socialLinks = [
  { Icon: Facebook,  label: "Facebook",    href: "https://facebook.com/cholokheli" },
  { Icon: Twitter,   label: "Twitter / X", href: "https://twitter.com/cholokheli" },
  { Icon: Instagram, label: "Instagram",   href: "https://instagram.com/cholokheli" },
  { Icon: Youtube,   label: "YouTube",     href: "https://youtube.com/@cholokheli" },
];

const SiteFooter = () => {
  const { t } = useLanguage();
  return (
    <>
      {/* Physical gradient bridge into paper footer */}
      <div
        aria-hidden
        className="relative h-24 sm:h-32"
        style={{ background: "linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--paper)) 100%)" }}
      />
      <footer className="py-16 surface-paper">
        <div className="container text-center">
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-6">
            {t("footer.followJourney")}
          </p>
          <div className="flex justify-center gap-5">
            {socialLinks.map(({ Icon, label, href }) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.2, y: -4 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="text-muted-foreground hover:text-[hsl(var(--teal))] transition-colors duration-200"
                aria-label={label}
              >
                <Icon className="h-5 w-5" />
              </motion.a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/60 mt-8">{t("footer.copyright")}</p>
        </div>
      </footer>
    </>
  );
};

export default SiteFooter;
