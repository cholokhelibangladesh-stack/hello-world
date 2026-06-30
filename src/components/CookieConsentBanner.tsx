import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageProvider";

const STORAGE_KEY = "ck.cookie-consent.v1";

type Consent = "accepted" | "essential-only";

export const hasAnalyticsConsent = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
};

const CookieConsentBanner = () => {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const setConsent = (value: Consent) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    setVisible(false);
    window.dispatchEvent(new CustomEvent("ck:cookie-consent", { detail: value }));
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed bottom-4 left-4 right-4 z-[60] sm:left-6 sm:right-6 sm:bottom-6 max-w-2xl mx-auto"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1 text-sm text-foreground/85 leading-relaxed">
                <p className="font-display text-base text-foreground mb-1">We use cookies.</p>
                <p>
                  Essential cookies keep you signed in and the Platform running. We only enable
                  analytics and non-essential tracking after you accept. Read our{" "}
                  <Link to="/privacy-policy" className="underline text-foreground font-medium">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
              <div className="flex gap-2 sm:flex-col sm:w-44 shrink-0">
                <Button
                  variant="outline"
                  className="flex-1 sm:w-full"
                  onClick={() => setConsent("essential-only")}
                >
                  Essential only
                </Button>
                <Button
                  className="flex-1 sm:w-full bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => setConsent("accepted")}
                >
                  Accept all
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsentBanner;
