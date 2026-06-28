import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import NotificationBell from "@/components/NotificationBell";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "Safe Scouting", path: "/safe-scouting" },
  { label: "Our Mission", path: "/mission" },
  { label: "FAQ", path: "/faq" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      // hide when scrolling down past 80px, show when scrolling up
      if (current > 80 && current > lastScrollY.current) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 bg-transparent"
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container flex items-center justify-between h-16 gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Zap className="h-6 w-6 text-primary" />
          <span className="font-display text-xl sm:text-2xl tracking-wider text-foreground">
            SCOUT <span className="text-primary">BD</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6 overflow-hidden">
          {navLinks.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className={`text-sm font-medium transition-colors hover:text-primary whitespace-nowrap ${
                location.pathname === l.path ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center gap-2 shrink-0">
              <NotificationBell />
              <Link to={role === "admin" ? "/admin" : role === "scout" ? "/scout" : "/player"}>
                <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 whitespace-nowrap">
                  Dashboard
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link to="/auth" className="shrink-0">
              <Button size="sm" className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          )}
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="md:hidden flex items-center gap-2 shrink-0">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button className="text-foreground p-1" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-t border-border overflow-hidden"
            style={{ background: "hsl(var(--background) / 0.95)", backdropFilter: "blur(16px)" }}
          >
            <div className="container py-4 flex flex-col gap-3">
              {navLinks.map((l) => (
                <Link
                  key={l.path}
                  to={l.path}
                  onClick={() => setOpen(false)}
                  className={`text-sm font-medium py-2 ${
                    location.pathname === l.path ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              {user ? (
                <>
                  <div className="flex items-center gap-2">
                    <NotificationBell />
                    <span className="text-sm text-muted-foreground">Notifications</span>
                  </div>
                  <Link to={role === "admin" ? "/admin" : role === "scout" ? "/scout" : "/player"} onClick={() => setOpen(false)}>
                    <Button size="sm" variant="outline" className="w-full border-primary/40 text-primary">
                      Dashboard
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => { handleSignOut(); setOpen(false); }} className="text-muted-foreground">
                    Sign Out
                  </Button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setOpen(false)}>
                  <Button size="sm" className="w-full bg-primary text-primary-foreground font-semibold">
                    Get Started
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
