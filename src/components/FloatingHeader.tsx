import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, X, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import NotificationBell from "@/components/NotificationBell";
import logoAsset from "@/assets/cholo-kheli-mark.png.asset.json";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/mission" },
  { label: "Safe Scouting", to: "/safe-scouting" },
  { label: "FAQ", to: "/faq" },
];

// Routes where the top of the page is dark (hero image) — icons stay white.
// All other routes have light backgrounds — icons switch to dark for contrast.
const DARK_TOP_ROUTES = new Set<string>(["/"]);

const FloatingHeader = () => {
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onDark = DARK_TOP_ROUTES.has(pathname);

  const dashboard = role === "admin" ? "/admin" : role === "scout" ? "/scout" : "/player";

  const handleSignOut = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    navigate({ to: "/" as any });
  };

  // Adaptive color tokens
  const fg = onDark ? "text-white" : "text-foreground";
  const fgSoft = onDark ? "text-white/85 hover:text-white" : "text-foreground/70 hover:text-foreground";
  const ring = onDark ? "ring-white/15" : "ring-foreground/15";
  const bgPill = onDark ? "bg-black/35" : "bg-white/55";
  const bgChip = onDark ? "bg-white/15 hover:bg-white/25 ring-white/25" : "bg-foreground/10 hover:bg-foreground/15 ring-foreground/20";
  const shadow = onDark ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" : "drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]";
  const wordmarkShadow = onDark ? "drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" : "";

  const pill =
    `px-4 h-9 inline-flex items-center rounded-full text-sm font-medium ${fgSoft} hover:bg-foreground/5 transition-colors [&.active]:font-semibold`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="relative flex items-center justify-between px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
        {/* LEFT: Logo + name = home */}
        <Link
          to="/"
          aria-label="Home"
          className="pointer-events-auto flex items-center gap-2.5 group shrink-0"
        >
          <img
            src={logoAsset.url}
            alt=""
            className={`h-8 w-8 sm:h-9 sm:w-9 object-contain ${shadow} transition-transform group-hover:scale-105`}
          />
          <span className={`font-display text-base sm:text-lg tracking-[0.04em] ${fg} font-semibold ${wordmarkShadow}`}>
            CHOLO <span className="font-bold">KHELI</span>
          </span>
        </Link>

        {/* CENTER: Pill nav (desktop) */}
        <nav className={`pointer-events-auto hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 px-2 h-11 rounded-full ${bgPill} backdrop-blur-xl ring-1 ${ring} shadow-lg shadow-black/10`}>
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to as any} activeOptions={{ exact: true }} className={pill}>
              {l.label}
            </Link>
          ))}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`h-9 w-9 inline-flex items-center justify-center rounded-full ${fgSoft} hover:bg-foreground/5 transition-colors`}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>

        {/* RIGHT: Login / Dashboard + mobile menu */}
        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <div className={`hidden sm:inline-flex items-center justify-center h-9 w-9 rounded-full ${bgChip} backdrop-blur-md ring-1 ${fg}`}>
                <NotificationBell />
              </div>
              <Link
                to={dashboard as any}
                className={`hidden sm:inline-flex items-center px-4 h-9 rounded-full ${bgChip} backdrop-blur-md ring-1 ${fg} text-sm font-medium transition-colors`}
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                disabled={busy}
                aria-label="Sign out"
                className={`inline-flex items-center justify-center h-9 w-9 sm:w-auto sm:px-4 rounded-full ${bgChip} backdrop-blur-md ring-1 ${fg} text-sm font-medium transition-colors`}
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className={`inline-flex items-center px-5 h-9 rounded-full ${bgChip} backdrop-blur-md ring-1 ${fg} text-sm font-medium transition-colors`}
            >
              Login
            </Link>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            className={`md:hidden inline-flex items-center justify-center h-9 w-9 rounded-full ${bgChip} backdrop-blur-md ring-1 ${fg} transition-colors`}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* MOBILE: Dropdown panel */}
      {open && (
        <div className={`md:hidden pointer-events-auto mx-4 mt-3 rounded-2xl ${onDark ? "bg-black/55" : "bg-white/85"} backdrop-blur-xl ring-1 ${ring} shadow-lg shadow-black/20 p-2`}>
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
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      )}
    </header>
  );
};

export default FloatingHeader;
