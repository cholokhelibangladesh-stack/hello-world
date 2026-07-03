import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, X, Sun, Moon, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageProvider";
import logoAsset from "@/assets/cholo-kheli-mark.png.asset.json";

// Routes where the top of the page is dark (hero image) — icons stay white.
const DARK_TOP_ROUTES = new Set<string>(["/"]);

const FloatingHeader = () => {
  const { user, role, loading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const navLinks = [
    { label: t("nav.home"), to: "/" },
    { label: t("nav.about"), to: "/mission" },
    { label: t("nav.safeScouting"), to: "/safe-scouting" },
    { label: t("nav.faq"), to: "/faq" },
  ];

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onDark = DARK_TOP_ROUTES.has(pathname);

  const dashboard = role === "admin" ? "/admin" : role === "scout" ? "/scout" : "/player";

  const handleSignOut = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    setOpen(false);
    navigate({ to: "/" as any });
  };

  // Adaptive color tokens
  const fg = onDark ? "text-white" : "text-foreground";
  const fgSoft = onDark ? "text-white/85 hover:text-white" : "text-foreground/70 hover:text-foreground";
  const ring = onDark ? "ring-white/15" : "ring-foreground/15";
  const bgChip = onDark ? "bg-white/15 hover:bg-white/25 ring-white/25" : "bg-foreground/10 hover:bg-foreground/15 ring-foreground/20";
  const shadow = onDark ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" : "drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]";
  const wordmarkShadow = onDark ? "drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" : "";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="relative flex items-center justify-between px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
        {/* LEFT: Logo + name = home */}
        <Link
          to="/"
          aria-label={t("nav.home")}
          className="pointer-events-auto flex items-center gap-2.5 group shrink-0"
        >
          <span
            aria-hidden
            className={`h-11 w-11 sm:h-12 sm:w-12 shrink-0 ${shadow} transition-transform group-hover:scale-105`}
            style={{
              // Deep teal in light theme; Candy Blue on dark backgrounds
              // (hero + dark theme) so it stays punchy against the video.
              backgroundColor:
                theme === "light" ? "hsl(var(--teal-deep))" : "#B2D5E5",

              WebkitMaskImage: `url(${logoAsset.url})`,
              maskImage: `url(${logoAsset.url})`,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskSize: "contain",
              maskSize: "contain",
            }}
          />

          <span className={`font-display text-lg sm:text-xl tracking-[0.04em] ${fg} font-semibold ${wordmarkShadow}`}>
            CHOLO <span className="font-bold">KHELI</span>
          </span>



        </Link>

        {/* RIGHT: Language + Notification + Menu (uniform across all sizes) */}
        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          <LanguageSwitcher
            className={`${bgChip} backdrop-blur-md ring-1 ${fg}`}
          />

          {loading ? (
            <div className={`h-9 w-9 rounded-full ${bgChip} backdrop-blur-md ring-1 animate-pulse`} aria-hidden />
          ) : user ? (
            <div className={`flex items-center justify-center h-9 px-1 rounded-full ${bgChip} backdrop-blur-md ring-1 ${fg}`}>
              <NotificationBell />
            </div>
          ) : (
            <Link
              to="/auth"
              className={`inline-flex items-center px-5 h-9 rounded-full ${bgChip} backdrop-blur-md ring-1 ${fg} text-sm font-medium transition-colors`}
            >
              {t("nav.login")}
            </Link>
          )}

          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={t("nav.menu")}
            className={`inline-flex items-center justify-center h-9 w-9 rounded-full ${bgChip} backdrop-blur-md ring-1 ${fg} transition-colors`}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Dropdown panel — contains nav links + (if signed in) dashboard & sign out */}
      {open && (
        <div className={`pointer-events-auto ml-auto mr-4 sm:mr-6 lg:mr-8 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-2xl ${onDark ? "bg-black/55" : "bg-white/85"} backdrop-blur-xl ring-1 ${ring} shadow-lg shadow-black/20 p-2`}>
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to as any}
              activeOptions={{ exact: true }}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2.5 rounded-xl text-sm font-medium ${fgSoft} hover:bg-foreground/5 transition-colors [&.active]:font-semibold`}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => { toggleTheme(); setOpen(false); }}
            className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${fgSoft} hover:bg-foreground/5 transition-colors`}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
          </button>

          {user && (
            <>
              <div className={`my-1 h-px ${onDark ? "bg-white/10" : "bg-foreground/10"}`} />
              <Link
                to={dashboard as any}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${fgSoft} hover:bg-foreground/5 transition-colors`}
              >
                <LayoutDashboard className="h-4 w-4" />
                {t("nav.dashboard")}
              </Link>
              <button
                onClick={handleSignOut}
                disabled={busy}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${fgSoft} hover:bg-foreground/5 transition-colors`}
              >
                <LogOut className="h-4 w-4" />
                {t("nav.signOut")}
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default FloatingHeader;
