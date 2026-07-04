import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Lock, Mail, AtSign, ShieldCheck, Save } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

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
    "idle" | "available" | "taken" | "invalid" | "same"
  >("idle");

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
  }, [user, authLoading]);

  // Debounced availability check
  useEffect(() => {
    const value = newUsername.trim().toLowerCase();
    if (!user) return;
    if (value === currentUsername.toLowerCase()) {
      setAvailability("same");
      return;
    }
    if (!USERNAME_RE.test(value)) {
      setAvailability("invalid");
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("username", value)
        .neq("user_id", user.id)
        .maybeSingle();
      setChecking(false);
      setAvailability(data ? "taken" : "available");
    }, 400);
    return () => clearTimeout(t);
  }, [newUsername, currentUsername, user]);

  const handleSave = async () => {
    if (!user) return;
    const value = newUsername.trim().toLowerCase();
    if (value === currentUsername.toLowerCase()) {
      toast({ title: "No changes to save" });
      return;
    }
    if (!USERNAME_RE.test(value)) {
      toast({
        title: "Invalid username",
        description: "3–24 chars, lowercase letters, digits, or underscore.",
        variant: "destructive",
      });
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const profileHref = role === "scout" ? "/scout/profile" : "/player/profile";

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
                Choose a handle 3–24 chars (lowercase letters, digits, underscore).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-username">New username</Label>
              <Input
                id="new-username"
                data-testid="settings-username-input"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                placeholder="your_handle"
                maxLength={24}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="bg-background/60 border-white/10 rounded-xl"
              />
              <div className="min-h-[1.25rem] text-xs" data-testid="settings-username-status">
                {checking && <span className="text-muted-foreground">Checking availability…</span>}
                {!checking && availability === "same" && (
                  <span className="text-muted-foreground">This is your current username.</span>
                )}
                {!checking && availability === "invalid" && (
                  <span className="text-destructive">Invalid format.</span>
                )}
                {!checking && availability === "taken" && (
                  <span className="text-destructive">Already taken.</span>
                )}
                {!checking && availability === "available" && (
                  <span className="text-emerald-400">Available.</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={
                  saving ||
                  checking ||
                  availability === "taken" ||
                  availability === "invalid" ||
                  availability === "same"
                }
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
