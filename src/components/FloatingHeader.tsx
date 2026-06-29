import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoAsset from "@/assets/cholo-kheli-mark.png.asset.json";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Safe Scouting", to: "/safe-scouting" },
  { label: "Mission", to: "/mission" },
  { label: "FAQ", to: "/faq" },
];

const FloatingHeader = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const dashboard = role === "admin" ? "/admin" : role === "scout" ? "/scout" : "/player";

  const handleSignOut = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    navigate({ to: "/" as any });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
        {/* LEFT: Login / Sign out */}
        <div className="pointer-events-auto">
          {user ? (
            <div className="flex items-center gap-2">
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
            </div>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center px-5 h-9 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 text-white text-sm font-medium hover:bg-white/25 transition-colors"
            >
              Login
            </Link>
          )}
        </div>

        {/* CENTER: Pill nav */}
        <nav className="pointer-events-auto hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 px-2 h-11 rounded-full bg-black/35 backdrop-blur-xl ring-1 ring-white/15 shadow-lg shadow-black/20">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to as any}
              activeOptions={{ exact: true }}
              className="px-4 h-9 inline-flex items-center rounded-full text-sm font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors [&.active]:bg-white/15 [&.active]:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* RIGHT: Logo + name = home */}
        <Link
          to="/"
          aria-label="Home"
          className="pointer-events-auto flex items-center gap-2.5 group"
        >
          <span className="font-display text-base sm:text-lg tracking-[0.04em] text-white font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
            CHOLO <span className="font-bold">KHELI</span>
          </span>
          <img
            src={logoAsset.url}
            alt=""
            className="h-8 w-8 sm:h-9 sm:w-9 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-105"
          />
        </Link>
      </div>
    </header>
  );
};

export default FloatingHeader;
