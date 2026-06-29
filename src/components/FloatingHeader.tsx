import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Home, Menu, Sun, Moon, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

// Bare iOS-style icon: no background, no ring — just the glyph with a soft shadow for legibility
const iconBtn =
  "h-10 w-10 rounded-full flex items-center justify-center text-foreground " +
  "transition-all duration-200 hover:opacity-70 active:scale-95";
const iconProps = {
  strokeWidth: 1.75,
  className: "h-[20px] w-[20px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
} as const;

const FloatingHeader = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);

  const dashboard = role === "admin" ? "/admin" : role === "scout" ? "/scout" : "/player";

  return (
    <>
      {/* Left: Home */}
      <Link
        to="/"
        aria-label="Home"
        className={`fixed top-4 left-4 sm:top-6 sm:left-6 z-50 ${iconBtn}`}
      >
        <Home {...iconProps} />
      </Link>

      {/* Right cluster: theme + menu */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className={iconBtn}
        >
          {theme === "dark" ? <Sun {...iconProps} /> : <Moon {...iconProps} />}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Open menu"
          aria-expanded={open}
          className={iconBtn}
        >
          {open ? <X {...iconProps} /> : <Menu {...iconProps} />}
        </button>
      </div>

      {/* Dropdown menu */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute top-20 right-4 sm:right-6 w-60 rounded-2xl border border-foreground/10 bg-background/95 backdrop-blur-xl shadow-xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <MenuLink to="/" onClick={() => setOpen(false)}>Home</MenuLink>
            {user ? (
              <MenuLink to={dashboard as any} onClick={() => setOpen(false)}>Dashboard</MenuLink>
            ) : (
              <>
                <MenuLink to="/auth" onClick={() => setOpen(false)}>Join as Player</MenuLink>
                <MenuLink to="/auth" search={{ role: "scout" } as any} onClick={() => setOpen(false)}>
                  I'm a Scout
                </MenuLink>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const MenuLink = ({
  to,
  search,
  onClick,
  children,
}: {
  to: string;
  search?: any;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <Link
    to={to as any}
    search={search}
    onClick={onClick}
    className="block px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors"
  >
    {children}
  </Link>
);

export default FloatingHeader;
