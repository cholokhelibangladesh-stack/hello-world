import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle2, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "@tanstack/react-router";

type SessionState = "checking" | "valid" | "invalid";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let recoveryFlow = false;

    // Detect Supabase error params in URL (expired/invalid links arrive here)
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const search = typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(
      hash.startsWith("#") ? hash.slice(1) : search.startsWith("?") ? search.slice(1) : ""
    );
    const urlError = params.get("error_description") || params.get("error");
    if (urlError) {
      setErrorMsg(decodeURIComponent(urlError).replace(/\+/g, " "));
      setSessionState("invalid");
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") {
        recoveryFlow = true;
        setSessionState("valid");
      } else if (event === "SIGNED_OUT") {
        if (!done) setSessionState("invalid");
      } else if (event === "SIGNED_IN" && session && !recoveryFlow && sessionState === "checking") {
        // Non-recovery session landing here is not a valid reset context
        setSessionState("invalid");
      }
    });

    // Fallback check after auth library has a chance to parse the URL
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const { data: { session } } = await supabase.auth.getSession();
      setSessionState((prev) => {
        if (prev !== "checking") return prev;
        return session && recoveryFlow ? "valid" : "invalid";
      });
      if (!session) setErrorMsg("This password reset link is invalid or has expired.");
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionState !== "valid") return;
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setDone(true);
      // Rotate/clear the recovery session — force a fresh login with the new password
      await supabase.auth.signOut();

      toast({
        title: "Password updated",
        description: "Please sign in with your new password.",
      });
      setTimeout(() => navigate({ to: "/auth" as any, replace: true }), 1800);
    } catch (err: any) {
      const msg = err?.message || "Could not update password. The reset link may have expired.";
      setErrorMsg(msg);
      toast({ title: "Reset failed", description: msg, variant: "destructive" });
      // If Supabase rejected the token, lock the form
      if (/expired|invalid|token|session/i.test(msg)) {
        await supabase.auth.signOut().catch(() => {});
        setSessionState("invalid");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-24 pb-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Zap className="h-6 w-6 text-foreground" />
            <span className="font-display text-2xl text-foreground">CHOLO KHELI</span>
          </Link>
          <h1 className="font-display text-3xl text-foreground">RESET PASSWORD</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-2xl"
        >
          {done ? (
            <div className="text-center space-y-4 py-4">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 rounded-full bg-foreground/10 border border-border flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="h-8 w-8 text-foreground" />
              </motion.div>
              <p className="font-display text-xl text-foreground">PASSWORD UPDATED</p>
              <p className="text-sm text-muted-foreground">Redirecting you to sign in...</p>
            </div>
          ) : sessionState === "checking" ? (
            <div className="text-center py-6 space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
            </div>
          ) : sessionState === "invalid" ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <p className="font-display text-lg text-foreground">LINK INVALID OR EXPIRED</p>
              <p className="text-muted-foreground text-sm">
                {errorMsg || "This password reset link is no longer valid. Please request a new one."}
              </p>
              <Link to="/auth">
                <Button className="bg-foreground text-background hover:bg-foreground/90 w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-sm text-muted-foreground">New Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="bg-secondary border-border pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirm" className="text-sm text-muted-foreground">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="bg-secondary border-border mt-1"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-foreground text-background font-bold hover:bg-foreground/90">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set New Password"}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
