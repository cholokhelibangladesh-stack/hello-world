import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Home, Menu, Sun, Moon, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

const iconBtn =
  "h-11 w-11 rounded-full flex items-center justify-center bg-background/70 backdrop-blur-md border border-foreground/10 text-foreground shadow-sm hover:bg-background/90 transition-colors";

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
