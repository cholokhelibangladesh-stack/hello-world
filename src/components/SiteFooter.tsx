import { motion } from "framer-motion";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLanguage } from "@/i18n/LanguageProvider";
import { BUSINESS, mailto } from "@/lib/business";
import { LEGAL_LINKS } from "@/pages/legal/LegalPage";

const socialLinks = [
  { Icon: Facebook,  label: "Facebook",    href: "https://facebook.com/cholokheli" },
  { Icon: Twitter,   label: "Twitter / X", href: "https://twitter.com/cholokheli" },
  { Icon: Instagram, label: "Instagram",   href: "https://instagram.com/cholokheli" },
  { Icon: Youtube,   label: "YouTube",     href: "https://youtube.com/@cholokheli" },
];

const SiteFooter = () => {
  const { t, lang } = useLanguage();
  return (
    <footer
      className="py-14 border-t"
      style={{
        background: "hsl(var(--ink))",
        borderColor: "hsl(var(--green) / 0.15)",
      }}
    >
      <div className="container text-center">
        <p className="text-xs tracking-[0.2em] uppercase text-white/75 mb-6">
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
        <nav aria-label={lang === "bn" ? "আইনি তথ্য" : "Legal"} className="mt-8">
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px]">
            {LEGAL_LINKS.map((l) => (
              <li key={l.id}><Link to={l.to as never} className="text-white/80 underline-offset-2 hover:text-white hover:underline">{lang === "bn" ? l.bn : l.en}</Link></li>
            ))}
          </ul>
        </nav>
        <address className="mt-6 not-italic text-[13px] leading-relaxed text-white/75">
          {BUSINESS.name} · {lang === "bn" ? "ঢাকা, বাংলাদেশ" : BUSINESS.city}
          <br />
          {lang === "bn" ? "কোম্পানি নিবন্ধনের কাজ চলছে।" : BUSINESS.registration}{" "}
          <a href={mailto("Hello")} className="underline underline-offset-2 hover:text-white">{BUSINESS.email}</a>
        </address>
        <p className="text-xs text-white/70 mt-6">{t("footer.copyright")}</p>
      </div>
    </footer>
  );
};

export default SiteFooter;
