import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import CholoKheliMark from "@/components/CholoKheliMark";
import { useLanguage } from "@/i18n/LanguageProvider";

type Role = "player" | "scout";
type Sport = "football" | "cricket";

const ForgotPasswordInline = ({ email, toast }: { email: string; toast: any }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleForgot = async () => {
    if (!email) {
      toast({ title: "Enter your email first", description: "Type your email above then click Forgot Password.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast({ title: "Reset link sent!", description: "Check your email for the password reset link." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (sent) return <span className="text-foreground">Reset link sent! Check your email.</span>;

  return (
    <button type="button" onClick={handleForgot} disabled={sending} className="text-foreground hover:underline font-medium transition-colors disabled:opacity-60">
      {sending ? "Sending..." : "Forgot Password?"}
    </button>
  );
};

const Auth = () => {
  const navigate = useNavigate();
  const { user, role: userRole, signIn } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(false);
  const initialRole: Role = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("role") === "scout" ? "scout" : "player";
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [sport, setSport] = useState<Sport>("football");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGender, setFormGender] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formDob, setFormDob] = useState("");
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [parentalConsent, setParentalConsent] = useState(false);

  const computeAge = (dob: string): number | null => {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  };
  const age = computeAge(formDob);
  const isMinor = age !== null && age < 18;

  useEffect(() => {
    if (user && userRole) {
      const isMobile = window.innerWidth < 768;
      let dest: string;
      if (userRole === "admin") {
        dest = "/admin";
      } else if (userRole === "scout") {
        dest = isMobile ? "/scout/profile" : "/scout";
      } else {
        dest = isMobile ? "/player/profile" : "/player";
      }
      navigate({ to: dest as any, replace: true });
    }
  }, [user, userRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin) {
      if (!formDob) {
        toast({ title: "Date of birth required", description: "Please enter your date of birth.", variant: "destructive" });
        return;
      }
      if (age === null || age < 13) {
        toast({ title: "Not eligible", description: "You must be at least 13 years old to register.", variant: "destructive" });
        return;
      }
      if (!agreePrivacy) {
        toast({ title: "Privacy agreement required", description: "You must agree to the Privacy Policy to continue.", variant: "destructive" });
        return;
      }
      if (isMinor) {
        if (!guardianName.trim() || !guardianEmail.trim() || !parentalConsent) {
          toast({ title: "Parental consent required", description: "Parent/Guardian name, email, and consent are required for users under 18.", variant: "destructive" });
          return;
        }
      }
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(formEmail, formPassword);
        if (error) throw error;
        toast({ title: "Welcome back!", description: "You've been signed in." });
      } else {
        // Sign up — Supabase sends a confirmation link email
        const { data, error } = await supabase.auth.signUp({
          email: formEmail,
          password: formPassword,
          options: {
            data: { full_name: formName },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });

        if (error) {
          if (
            error.message.toLowerCase().includes("already registered") ||
            error.message.toLowerCase().includes("already exists") ||
            error.message.toLowerCase().includes("user already registered")
          ) {
            toast({ title: "Already registered", description: "Please sign in instead.", variant: "destructive" });
            setIsLogin(true);
            return;
          }
          throw error;
        }

        // Store role/profile data to be set after email confirmation
        if (data.user) {
          localStorage.setItem("pendingRole", selectedRole);
          localStorage.setItem("pendingSport", sport);
          localStorage.setItem("pendingPhone", formPhone);
          localStorage.setItem("pendingGender", formGender);
          localStorage.setItem("pendingName", formName);
        }

        setEmailSent(true);
        if (selectedRole === "scout") {
          toast({ title: "Account created! 📧", description: "Please confirm your email first." });
        } else {
          toast({ title: "Check your email! 📧", description: "Click the confirmation link to activate your account." });
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Handle email confirmation redirect — set role after user returns
  useEffect(() => {
    const setupPendingProfile = async () => {
      if (!user) return;
      const pendingRole = localStorage.getItem("pendingRole");
      if (!pendingRole) return;

      const sport = localStorage.getItem("pendingSport") || "football";
      const phone = localStorage.getItem("pendingPhone") || "";
      const gender = localStorage.getItem("pendingGender") || "";
      const name = localStorage.getItem("pendingName") || "";

      try {
        await supabase.functions.invoke("handle-signup-role", {
          body: { role: pendingRole, sport, phone, gender, full_name: name },
        });
      } catch {}

      localStorage.removeItem("pendingRole");
      localStorage.removeItem("pendingSport");
      localStorage.removeItem("pendingPhone");
      localStorage.removeItem("pendingGender");
      localStorage.removeItem("pendingName");
    };
    setupPendingProfile();
  }, [user]);

  if (emailSent) {
    const isScout = localStorage.getItem("pendingRole") === "scout";
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 pb-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl p-10 shadow-2xl text-center space-y-6"
        >
          <div className="flex justify-center">
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="w-20 h-20 rounded-full bg-foreground/10 border border-border flex items-center justify-center"
            >
              <CheckCircle2 className="h-10 w-10 text-foreground" />
            </motion.div>
          </div>
          <div>
            <h2 className="font-display text-3xl text-foreground mb-2">CHECK YOUR EMAIL</h2>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="text-foreground font-medium">{formEmail}</span>
            </p>
            {isScout ? (
              <div className="mt-4 bg-primary/10 border border-primary/30 rounded-xl p-4">
                <p className="text-sm text-foreground font-medium mb-1">🔍 Scout Account Under Review</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your account is being reviewed by our Team for authentication purposes and you will be shortly notified via Email.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-3">
                Click the link in the email to activate your account. You can close this tab.
              </p>
            )}
          </div>
          <button
            onClick={() => { setEmailSent(false); setIsLogin(true); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
          >
            Already confirmed? Sign in
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-24 pb-24 px-4 overflow-y-auto bg-gradient-to-b from-[hsl(var(--paper))] via-[hsl(var(--paper))] to-[hsl(var(--teal-deep)/0.08)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <CholoKheliMark className="h-10 w-10" />
            <span className="font-display text-2xl tracking-[0.04em] text-[hsl(var(--teal-deep))] font-semibold">
              CHOLO <span className="font-bold">KHELI</span>
            </span>
          </Link>
          <h1 className="font-display text-3xl text-[hsl(var(--teal-deep))]">
            {isLogin ? "Welcome back" : "Join the game"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isLogin ? "Sign in to continue your journey." : "Create your account to get scouted."}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-2xl"
        >
          {!isLogin && (
            <>
              <div className="mb-5">
                <Label className="text-sm text-muted-foreground mb-2 block">I am a</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["player", "scout"] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      className={`py-3 rounded-xl font-display text-lg tracking-wide transition-all duration-300 border ${
                        selectedRole === r
                          ? "bg-foreground text-background border-foreground"
                          : "bg-secondary text-secondary-foreground border-border hover:border-foreground/40"
                      }`}
                    >
                      {r === "player" ? "⚽ PLAYER" : "🔍 SCOUT"}
                    </button>
                  ))}
                </div>
              </div>

              {selectedRole === "player" && (
                <div className="mb-5">
                  <Label className="text-sm text-muted-foreground mb-2 block">Sport Category</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["football", "cricket"] as Sport[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSport(s)}
                        className={`py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border ${
                          sport === s
                            ? "bg-foreground/15 text-foreground border-foreground/50"
                            : "bg-secondary text-secondary-foreground border-border hover:border-foreground/30"
                        }`}
                      >
                        {s === "football" ? "⚽ Football" : "🏏 Cricket"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name" className="text-sm text-muted-foreground">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  required
                  className="bg-secondary border-border mt-1"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                className="bg-secondary border-border mt-1"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="phone" className="text-sm text-muted-foreground">Phone (BD)</Label>
                  <Input
                    id="phone"
                    placeholder="+880 1XXXXXXXXX"
                    required
                    className="bg-secondary border-border mt-1"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gender" className="text-sm text-muted-foreground">Gender</Label>
                  <select
                    id="gender"
                    className="flex h-10 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring mt-1"
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="dob" className="text-sm text-muted-foreground">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    required
                    max={new Date().toISOString().split("T")[0]}
                    className="bg-secondary border-border mt-1"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                  />
                  {age !== null && age >= 0 && age < 13 && (
                    <p className="text-xs text-destructive mt-1">You must be at least 13 to register.</p>
                  )}
                  {isMinor && age !== null && age >= 13 && (
                    <p className="text-xs text-muted-foreground mt-1">Since you are under 18, parental consent is required below.</p>
                  )}
                </div>
              </>
            )}
            <div>
              <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-secondary border-border pr-10"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {!isLogin && selectedRole === "player" && (
              <div className="hidden" />
            )}
            {!isLogin && isMinor && age !== null && age >= 13 && (
              <div className="space-y-3 p-4 rounded-xl border border-border bg-secondary/60">
                <p className="text-sm font-semibold text-foreground">Parental / Guardian Consent</p>
                <div>
                  <Label htmlFor="guardianName" className="text-sm text-muted-foreground">Parent / Guardian Full Name</Label>
                  <Input
                    id="guardianName"
                    placeholder="Guardian's full name"
                    required
                    className="bg-background border-border mt-1"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="guardianEmail" className="text-sm text-muted-foreground">Parent / Guardian Email</Label>
                  <Input
                    id="guardianEmail"
                    type="email"
                    placeholder="guardian@example.com"
                    required
                    className="bg-background border-border mt-1"
                    value={guardianEmail}
                    onChange={(e) => setGuardianEmail(e.target.value)}
                  />
                </div>
                <label className="flex items-start gap-2 text-sm text-foreground/85 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-border accent-foreground"
                    checked={parentalConsent}
                    onChange={(e) => setParentalConsent(e.target.checked)}
                    required
                  />
                  <span>
                    I am the parent or legal guardian of this Minor and I provide my explicit consent
                    for their registration and the processing of their data in accordance with the{" "}
                    <Link to="/privacy-policy" className="underline font-medium">Privacy Policy</Link>.
                  </span>
                </label>
              </div>
            )}
            {!isLogin && (
              <label className="flex items-start gap-2 text-sm text-foreground/85 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border accent-foreground"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  required
                />
                <span>
                  I have read and agree to the{" "}
                  <Link to="/privacy-policy" className="underline font-medium" target="_blank">Privacy Policy</Link>.
                </span>
              </label>
            )}
            <Button
              type="submit"
              disabled={loading || (!isLogin && !agreePrivacy) || (!isLogin && isMinor && !parentalConsent)}
              className="w-full bg-foreground text-background font-bold hover:bg-foreground/90 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); }}
              className="text-foreground hover:underline font-medium transition-colors"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
          {isLogin && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              <ForgotPasswordInline email={formEmail} toast={toast} />
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
