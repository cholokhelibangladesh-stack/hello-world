import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Loader2, Lock, Mail, AtSign, ShieldCheck, Save, KeyRound, Monitor,
  Eye, EyeOff, LogOut,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// ---- Username validation with granular error messages ---------------------
type UsernameCheck =
  | { ok: true }
  | { ok: false; code:
      | "empty" | "too_short" | "too_long" | "uppercase"
      | "leading_digit_underscore" | "invalid_chars"; message: string };

const validateUsernameDetail = (raw: string): UsernameCheck => {
  const value = raw.trim();
  if (!value) return { ok: false, code: "empty", message: "Username is required." };
  if (value.length < 3)
    return { ok: false, code: "too_short", message: "Too short — usernames must be at least 3 characters." };
  if (value.length > 24)
    return { ok: false, code: "too_long", message: "Too long — usernames must be 24 characters or fewer." };
  if (/[A-Z]/.test(value))
    return { ok: false, code: "uppercase", message: "No uppercase letters — usernames are lowercase only." };
  if (/^[0-9_]/.test(value))
    return { ok: false, code: "leading_digit_underscore", message: "Must start with a lowercase letter (a–z)." };
  if (!/^[a-z0-9_]+$/.test(value))
    return { ok: false, code: "invalid_chars", message: "Only lowercase letters, digits, and underscore (_) are allowed." };
  return { ok: true };
};

const AccountSettings = () => {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [newUsername, setNewUsername] = useState<string>("");
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<
    "idle" | "available" | "taken" | "same"
  >("idle");
  const validity = useMemo(() => validateUsernameDetail(newUsername), [newUsername]);

  // ---- Password change state ---------------------------------------------
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShow, setPwShow] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwStatus, setPwStatus] = useState<
    { kind: "idle" } | { kind: "error"; message: string } | { kind: "success"; message: string }
  >({ kind: "idle" });

  const pwValidation = useMemo(() => {
    if (!pwNew) return { ok: false, message: "" };
    if (pwNew.length < 8)
      return { ok: false, message: "New password must be at least 8 characters." };
    if (!/[A-Za-z]/.test(pwNew) || !/[0-9]/.test(pwNew))
      return { ok: false, message: "New password must include a letter and a number." };
    if (pwConfirm && pwConfirm !== pwNew)
      return { ok: false, message: "Confirmation does not match the new password." };
    return { ok: true, message: "Looks good." };
  }, [pwNew, pwConfirm]);

  // ---- Sessions state -----------------------------------------------------
  type SessionRow = {
    id: string; created_at: string; updated_at: string;
    user_agent: string | null; ip: string | null; is_current: boolean;
  };
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    const { data, error } = await (supabase.rpc as any)("get_my_sessions");
    setSessionsLoading(false);
    if (error) {
      toast({ title: "Could not load sessions", description: error.message, variant: "destructive" });
      return;
    }
    setSessions(((data as SessionRow[]) || []));
  }, [toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" as any });
      return;
    }
    if (!user) return;
    supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const u = (data as any)?.username || "";
        setCurrentUsername(u);
        setNewUsername(u);
        setLoading(false);
      });
    loadSessions();
  }, [user, authLoading, loadSessions, navigate]);

  // Debounced availability check
  useEffect(() => {
    const value = newUsername.trim().toLowerCase();
    if (!user) return;
    if (value === currentUsername.toLowerCase()) {
      setChecking(false);
      setAvailability("same");
      return;
    }
    if (!validity.ok) {
      setChecking(false);
      setAvailability("idle");
      return;
    }
    setChecking(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("username", value)
        .neq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setChecking(false);
      setAvailability(data ? "taken" : "available");
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [newUsername, currentUsername, user, validity.ok]);

  const handleSave = async () => {
    if (!user) return;
    const value = newUsername.trim().toLowerCase();
    if (value === currentUsername.toLowerCase()) {
      toast({ title: "No changes to save" });
      return;
    }
    const v = validateUsernameDetail(value);
    if (!v.ok) {
      toast({ title: "Invalid username", description: v.message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: value } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      const msg =
        error.message.includes("unique") ||
        error.message.includes("duplicate") ||
        error.code === "23505"
          ? "That username is already taken. Please choose another."
          : error.message.includes("profiles_username_format")
            ? "Invalid username format."
            : error.message;
      toast({ title: "Could not update username", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Username updated" });
    setCurrentUsername(value);
  };

  const handlePasswordChange = async () => {
    if (!user?.email) return;
    setPwStatus({ kind: "idle" });
    if (!pwCurrent) {
      setPwStatus({ kind: "error", message: "Enter your current password to continue." });
      return;
    }
    if (!pwValidation.ok) {
      setPwStatus({ kind: "error", message: pwValidation.message || "New password is invalid." });
      return;
    }
    if (pwNew === pwCurrent) {
      setPwStatus({ kind: "error", message: "New password must differ from your current password." });
      return;
    }
    setPwSaving(true);
    // Verify current password by re-authenticating
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwCurrent,
    });
    if (signErr) {
      setPwSaving(false);
      setPwStatus({ kind: "error", message: "Current password is incorrect." });
      return;
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: pwNew });
    setPwSaving(false);
    if (updErr) {
      setPwStatus({ kind: "error", message: updErr.message });
      return;
    }
    setPwStatus({ kind: "success", message: "Password updated successfully." });
    setPwCurrent(""); setPwNew(""); setPwConfirm("");
    toast({ title: "Password updated" });
    loadSessions();
  };

  const handleRevokeSession = async (sid: string) => {
    setRevoking(sid);
    const { error } = await (supabase.rpc as any)("revoke_my_session", { _session_id: sid });
    setRevoking(null);
    if (error) {
      toast({ title: "Could not revoke session", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Session revoked" });
    loadSessions();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const profileHref = role === "scout" ? "/scout/profile" : "/player/profile";
  const saveDisabled =
    saving || checking || availability === "taken" ||
    availability === "same" || !validity.ok;

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4 space-y-6"
          data-testid="account-settings"
        >
          <div>
            <h1 className="font-display text-3xl text-foreground">ACCOUNT SETTINGS</h1>
            <p className="text-sm text-muted-foreground">
              View your account identity and manage credentials.
            </p>
          </div>

          {/* Identity card */}
          <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur-sm p-5 space-y-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Identity
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <div
                className="flex items-center justify-between rounded-xl border border-white/10 bg-background/60 px-3 py-2"
                data-testid="settings-email"
              >
                <span className="text-sm text-foreground break-all">{user?.email}</span>
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" /> Locked
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <AtSign className="h-3.5 w-3.5" /> Current username
              </Label>
              <div
                className="flex items-center justify-between rounded-xl border border-white/10 bg-background/60 px-3 py-2"
                data-testid="settings-current-username"
              >
                <span className="text-sm text-foreground">
                  @{currentUsername || <em className="text-muted-foreground">not set</em>}
                </span>
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="h-3 w-3" /> Unique
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Usernames must be globally unique. Case-insensitive matches are treated as the
                same handle.
              </p>
            </div>
          </div>

          {/* Change username card */}
          <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur-sm p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Change username</h2>
              <p className="text-xs text-muted-foreground">
                3–24 characters. Start with a lowercase letter; then lowercase letters,
                digits, or underscore.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-username">New username</Label>
              <Input
                id="new-username"
                data-testid="settings-username-input"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="your_handle"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={!validity.ok && newUsername.length > 0}
                aria-describedby="settings-username-status"
                className="bg-background/60 border-white/10 rounded-xl"
              />
              <div
                id="settings-username-status"
                className="min-h-[1.25rem] text-xs"
                data-testid="settings-username-status"
                data-status={
                  checking ? "checking"
                    : availability === "same" ? "same"
                    : !validity.ok ? validity.code
                    : availability
                }
              >
                {checking && <span className="text-muted-foreground">Checking availability…</span>}
                {!checking && availability === "same" && (
                  <span className="text-muted-foreground">This is your current username.</span>
                )}
                {!checking && availability !== "same" && !validity.ok && newUsername.length > 0 && (
                  <span className="text-destructive">{validity.message}</span>
                )}
                {!checking && availability === "taken" && validity.ok && (
                  <span className="text-destructive">
                    That username is already taken. Please choose another.
                  </span>
                )}
                {!checking && availability === "available" && validity.ok && (
                  <span className="text-emerald-400">Available — you can save this handle.</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saveDisabled}
                data-testid="settings-username-save"
                className="rounded-xl"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save username
              </Button>
              <Button
                variant="ghost"
                onClick={() => setNewUsername(currentUsername)}
                disabled={saving || newUsername === currentUsername}
                className="rounded-xl"
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Change password card */}
          <div
            className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur-sm p-5 space-y-4"
            data-testid="settings-password-card"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Change password</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your current password, then choose a new one. You will stay signed in on
              this device.
            </p>

            <div className="space-y-2">
              <Label htmlFor="pw-current">Current password</Label>
              <div className="relative">
                <Input
                  id="pw-current"
                  data-testid="pw-current"
                  type={pwShow ? "text" : "password"}
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  autoComplete="current-password"
                  className="bg-background/60 border-white/10 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setPwShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={pwShow ? "Hide password" : "Show password"}
                >
                  {pwShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pw-new">New password</Label>
              <Input
                id="pw-new"
                data-testid="pw-new"
                type={pwShow ? "text" : "password"}
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                autoComplete="new-password"
                className="bg-background/60 border-white/10 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters, including a letter and a number.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pw-confirm">Confirm new password</Label>
              <Input
                id="pw-confirm"
                data-testid="pw-confirm"
                type={pwShow ? "text" : "password"}
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                autoComplete="new-password"
                className="bg-background/60 border-white/10 rounded-xl"
              />
            </div>

            <div
              className="min-h-[1.25rem] text-xs"
              data-testid="pw-status"
              data-status={pwStatus.kind}
            >
              {pwStatus.kind === "error" && (
                <span className="text-destructive">{pwStatus.message}</span>
              )}
              {pwStatus.kind === "success" && (
                <span className="text-emerald-400">{pwStatus.message}</span>
              )}
              {pwStatus.kind === "idle" && pwNew.length > 0 && !pwValidation.ok && (
                <span className="text-destructive">{pwValidation.message}</span>
              )}
              {pwStatus.kind === "idle" && pwNew.length > 0 && pwValidation.ok && (
                <span className="text-emerald-400">{pwValidation.message}</span>
              )}
            </div>

            <Button
              onClick={handlePasswordChange}
              disabled={pwSaving || !pwCurrent || !pwValidation.ok}
              data-testid="pw-save"
              className="rounded-xl"
            >
              {pwSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
              Update password
            </Button>
          </div>

          {/* Sessions & devices card */}
          <div
            className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur-sm p-5 space-y-4"
            data-testid="settings-sessions-card"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">Sessions & devices</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadSessions}
                data-testid="sessions-refresh"
                disabled={sessionsLoading}
                className="text-xs rounded-lg"
              >
                {sessionsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Active logins for your account. Revoke any session you don’t recognize.
            </p>

            <div className="space-y-2" data-testid="sessions-list">
              {sessions.length === 0 && !sessionsLoading && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No active sessions found.
                </p>
              )}
              {sessions.map((s) => (
                <div
                  key={s.id}
                  data-testid="session-row"
                  data-session-id={s.id}
                  data-is-current={String(s.is_current)}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-background/60 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">
                      {s.user_agent || "Unknown device"}
                      {s.is_current && (
                        <Badge className="ml-2 bg-primary/20 text-primary border-primary/30 rounded-full text-[10px]">
                          This device
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.ip || "unknown ip"} • last active{" "}
                      {s.updated_at ? new Date(s.updated_at).toLocaleString() : "—"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRevokeSession(s.id)}
                    disabled={revoking === s.id}
                    data-testid={`session-revoke-${s.id}`}
                    className="rounded-lg text-xs"
                  >
                    {revoking === s.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <><LogOut className="h-3.5 w-3.5 mr-1" /> Revoke</>}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Link
              to={profileHref as any}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              ← Back to profile
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AccountSettings;
