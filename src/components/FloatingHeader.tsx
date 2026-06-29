import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, X, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import logoAsset from "@/assets/cholo-kheli-mark.png.asset.json";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/mission" },
  { label: "Safe Scouting", to: "/safe-scouting" },
  { label: "FAQ", to: "/faq" },
];

const FloatingHeader = () => {
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const dashboard = role === "admin" ? "/admin" : role === "scout" ? "/scout" : "/player";

  const handleSignOut = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    navigate({ to: "/" as any });
  };

  const pill =
    "px-4 h-9 inline-flex items-center rounded-full text-sm font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors [&.active]:bg-white/15 [&.active]:text-white";

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
            className="h-8 w-8 sm:h-9 sm:w-9 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-105"
          />
          <span className="font-display text-base sm:text-lg tracking-[0.04em] text-white font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
            CHOLO <span className="font-bold">KHELI</span>
          </span>
        </Link>

        {/* CENTER: Pill nav (desktop) */}
        <nav className="pointer-events-auto hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 px-2 h-11 rounded-full bg-black/35 backdrop-blur-xl ring-1 ring-white/15 shadow-lg shadow-black/20">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to as any} activeOptions={{ exact: true }} className={pill}>
              {l.label}
            </Link>
          ))}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="h-9 w-9 inline-flex items-center justify-center rounded-full text-white/85 hover:text-white hover:bg-white/10 transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>

        {/* RIGHT: Login / Dashboard + mobile menu */}
        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <Link
                to={dashboard as any}
                className="hidden sm:inline-flex items-center px-4 h-9 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 text-white text-sm font-medium hover:bg-white/25 transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                disabled={busy}
                aria-label="Sign out"
                className="inline-flex items-center justify-center h-9 w-9 sm:w-auto sm:px-4 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 text-white text-sm font-medium hover:bg-white/25 transition-colors"
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center px-5 h-9 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 text-white text-sm font-medium hover:bg-white/25 transition-colors"
            >
              Login
            </Link>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 text-white hover:bg-white/25 transition-colors"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* MOBILE: Dropdown panel */}
      {open && (
        <div className="md:hidden pointer-events-auto mx-4 mt-3 rounded-2xl bg-black/55 backdrop-blur-xl ring-1 ring-white/15 shadow-lg shadow-black/30 p-2">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to as any}
              activeOptions={{ exact: true }}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 rounded-xl text-sm font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors [&.active]:bg-white/15 [&.active]:text-white"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => { toggleTheme(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors"
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
