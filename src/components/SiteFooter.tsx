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
    <footer
      className="py-14 border-t"
      style={{
        background: "hsl(var(--ink))",
        borderColor: "hsl(var(--green) / 0.15)",
      }}
    >
      <div className="container text-center">
        <p className="text-xs tracking-[0.2em] uppercase text-white/60 mb-6">
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
              className="text-white/70 hover:text-[hsl(var(--teal))] transition-colors duration-200"
              aria-label={label}
            >
              <Icon className="h-5 w-5" />
            </motion.a>
          ))}
        </div>
        <p className="text-xs text-white/50 mt-8">{t("footer.copyright")}</p>
      </div>
    </footer>
  );
};

export default SiteFooter;
