import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Language, type TranslationKey } from "./translations";
import { applyDomLanguage } from "./domTranslate";

export const STORAGE_KEY = "ck.lang.v1";
/** Fired (with the language as detail) when something outside React changes the language, e.g. after sign-in. */
export const LANG_EVENT = "ck:lang";

/** Saves a language choice and tells the app to switch. Safe to call from anywhere. */
export const storeLanguage = (lang: Language) => {
  try { window.localStorage.setItem(STORAGE_KEY, lang); } catch { /* private mode */ }
  try { window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: lang })); } catch { /* SSR */ }
};

type LanguageContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const readStoredLang = (): Language => {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "bn") return stored;
  } catch {}
  return "en";
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Language>("en");

  // Hydrate from localStorage on mount (avoid SSR mismatch by defaulting EN first).
  useEffect(() => {
    const stored = readStoredLang();
    if (stored !== lang) setLangState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang> in sync, and switch every screen's text (see domTranslate.ts).
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      applyDomLanguage(lang);
    }
  }, [lang]);

  // Language picked elsewhere (sign-up, settings saved on another device and loaded at sign-in).
  useEffect(() => {
    const on = (e: Event) => { const l = (e as CustomEvent).detail; if (l === "en" || l === "bn") setLangState(l); };
    window.addEventListener(LANG_EVENT, on);
    return () => window.removeEventListener(LANG_EVENT, on);
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  const value = useMemo<LanguageContextValue>(() => {
    const dict = translations[lang];
    return {
      lang,
      setLang,
      toggleLang: () => setLang(lang === "en" ? "bn" : "en"),
      t: (key: TranslationKey) =>
        (dict[key] as string) ?? (translations.en[key] as string) ?? key,
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback so any component used outside the provider still renders English.
    return {
      lang: "en",
      setLang: () => {},
      toggleLang: () => {},
      t: (key: TranslationKey) => (translations.en[key] as string) ?? key,
    };
  }
  return ctx;
};
