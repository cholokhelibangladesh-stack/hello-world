import { useLanguage } from "@/i18n/LanguageProvider";

/**
 * English / বাংলা pill for screens shown before sign-in (welcome and sign-up). The choice is kept on this
 * device and saved to the account when it is created. Each label is written in its own language.
 */
const LanguageSwitch = ({ tone = "auto", className = "" }: { tone?: "auto" | "dark"; className?: string }) => {
  const { lang, setLang } = useLanguage();
  const base = tone === "dark" ? "bg-white/15 text-white ring-white/20" : "bg-white/60 text-foreground ring-black/[0.06] dark:bg-white/10 dark:ring-white/10";
  const on = tone === "dark" ? "bg-white text-[#0B2229]" : "bg-white text-[#0E2A33] shadow-sm dark:bg-white dark:text-[#0E2A33]";
  return (
    <div role="radiogroup" aria-label="Language / ভাষা" translate="no" data-no-i18n
      className={`inline-flex h-10 items-center gap-0.5 rounded-full p-1 ring-1 backdrop-blur-xl ${base} ${className}`}>
      {([["en", "English"], ["bn", "বাংলা"]] as const).map(([code, label]) => (
        <button key={code} type="button" role="radio" aria-checked={lang === code} onClick={() => setLang(code)} lang={code}
          className={`press h-8 rounded-full px-3.5 text-[14px] font-semibold transition-colors ${lang === code ? on : "opacity-80"}`}>
          {label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitch;
