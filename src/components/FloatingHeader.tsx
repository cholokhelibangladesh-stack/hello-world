import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Home, Menu, Sun, Moon, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

// iOS-style glass circle: strong backdrop blur, subtle hairline ring, soft shadow
const iconBtn =
  "h-10 w-10 rounded-full flex items-center justify-center text-foreground " +
  "bg-white/40 dark:bg-white/10 backdrop-blur-2xl backdrop-saturate-150 " +
  "ring-1 ring-foreground/10 shadow-[0_2px_10px_rgba(0,0,0,0.08)] " +
  "transition-all duration-200 hover:bg-white/60 dark:hover:bg-white/20 active:scale-95";
const iconProps = { strokeWidth: 1.75, className: "h-[18px] w-[18px]" } as const;

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
        <Home className="h-5 w-5" />
      </Link>

      {/* Right cluster: theme + menu */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className={iconBtn}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Open menu"
          aria-expanded={open}
          className={iconBtn}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
