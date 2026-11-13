import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsCard } from "@/components/settings/SettingsControls";
import { useAuth } from "@/hooks/useAuth";
import { publicUrl, publicOrigin } from "@/lib/publicUrl";

const inputClass =
  "h-12 w-full rounded-xl bg-secondary px-4 pr-12 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring disabled:opacity-60";

const PwField = ({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium   text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-card"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
};

const PasswordPage = () => {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const save = async () => {
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (next !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (!user?.email) {
      toast.error("Missing email on account");
      return;
    }
    setSaving(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signInErr) {
      setSaving(false);
      toast.error("Current password is incorrect");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setSaving(false);
    if (error) {
      toast.error("Couldn't update password", { description: error.message });
      return;
    }
    reset();
    toast.success("Password updated");
  };

  const sendReset = async () => {
    if (!user?.email) return;
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: publicUrl("/reset-password"),
    });
    setSending(false);
    if (error) {
      toast.error("Couldn't send reset link", { description: error.message });
      return;
    }
    toast.success("Reset link sent to your email");
  };

  const dirty = current || next || confirm;

  return (
    <SettingsShell title="Password" description="Change your account password">
      <SettingsCard>
        <div className="space-y-3 p-4">
          <PwField label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
          <PwField label="New password" value={next} onChange={setNext} autoComplete="new-password" />
          <PwField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </div>
      </SettingsCard>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={!dirty || saving}
          className="flex-1 rounded-xl bg-card py-2.5 text-[15px] font-medium text-foreground/80  disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!current || !next || !confirm || saving}
          className="flex-1 rounded-xl bg-primary py-2.5 text-[15px] font-semibold text-white shadow-lg shadow-[hsl(var(--teal-deep))]/25 disabled:opacity-40"
        >
          {saving ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Updating
            </span>
          ) : (
            <span className="inline-flex items-center justify-center gap-2">
              <Save className="h-4 w-4" /> Update password
            </span>
          )}
        </button>
      </div>

      <div className="mt-8">
        <SettingsCard>
          <button
            type="button"
            onClick={sendReset}
            disabled={sending}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-card"
          >
            <span className="min-w-0">
              <span className="block text-[15px] font-medium">Forgot your current password?</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                We'll email a secure reset link to {user?.email}
              </span>
            </span>
            {sending ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <span className="shrink-0 text-xs font-medium text-primary">Send link</span>
            )}
          </button>
        </SettingsCard>
      </div>
    </SettingsShell>
  );
};

export default PasswordPage;
