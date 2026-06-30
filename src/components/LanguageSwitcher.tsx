import { Languages } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

type Props = {
  className?: string;
  iconClassName?: string;
  variant?: "pill" | "chip";
};

/**
 * Visually prominent EN ⇄ বাং toggle. Click swaps the active language and
 * persists the choice via the LanguageProvider (localStorage backed).
 */
const LanguageSwitcher = ({ className = "", iconClassName = "h-4 w-4", variant = "pill" }: Props) => {
  const { lang, toggleLang, t } = useLanguage();
  const next = lang === "en" ? "বাং" : "EN";
  const current = lang === "en" ? "EN" : "বাং";

  const base =
    variant === "chip"
      ? "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold tracking-wide transition-colors"
      : "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold tracking-wide transition-colors";

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={`${t("nav.language")}: ${current} → ${next}`}
      title={`${t("nav.language")}: ${current} → ${next}`}
      className={`${base} ${className}`}
    >
      <Languages className={iconClassName} aria-hidden />
      <span className="leading-none">{current}</span>
      <span className="leading-none opacity-50">/</span>
      <span className="leading-none opacity-60">{next}</span>
    </button>
  );
};

export default LanguageSwitcher;
