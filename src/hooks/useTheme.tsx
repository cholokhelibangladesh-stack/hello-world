import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";
export type ThemeMode = "system" | Theme;

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const KEY = "theme";

const applyTheme = (t: Theme) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", t === "dark");
  document.documentElement.classList.toggle("light", t === "light");
  document.documentElement.style.colorScheme = t;
};
const systemTheme = (): Theme =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Server and first client render use light to avoid a hydration mismatch; the effect then
  // applies the saved choice or follows the device appearance (like iOS apps).
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let stored: ThemeMode = "system";
    try { const v = localStorage.getItem(KEY); if (v === "light" || v === "dark") stored = v; } catch { /* ignore */ }
    setModeState(stored);
  }, []);

  useEffect(() => {
    const resolve = () => { const t = mode === "system" ? systemTheme() : mode; setTheme(t); applyTheme(t); };
    resolve();
    if (mode !== "system") return;
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener?.("change", resolve);
    return () => media?.removeEventListener?.("change", resolve);
  }, [mode]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try { if (m === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, m); } catch { /* ignore */ }
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, toggleTheme: () => setMode(theme === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
