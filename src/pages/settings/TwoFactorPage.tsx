import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsCard } from "@/components/settings/SettingsControls";

type Factor = { id: string; friendly_name?: string | null; factor_type: string; status: string };

const inputClass =
  "w-full h-12 w-full rounded-xl bg-secondary px-3.5 text-center text-[22px] font-mono  text-foreground outline-none focus:ring-2 focus:ring-ring";

/** Turns the SVG QR from supabase-js into a safe, properly encoded image URL. */
export function qrImageSrc(qr: string): string {
  const svg = qr.replace(/^data:image\/svg\+xml;(?:charset=)?utf-?8,/i, "");
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const TwoFactorPage = ({ onVerified }: { onVerified?: () => void } = {}) => {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [pending, setPending] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const refresh = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error("Couldn't load two-step verification", { description: error.message });
      setLoading(false);
      return;
    }
    setFactors((data?.totp ?? []) as Factor[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const startEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${new Date().toLocaleDateString()}`,
    });
    setEnrolling(false);
    if (error) {
      toast.error("Couldn't start enrollment", { description: error.message });
      return;
    }
    setPending({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verify = async () => {
    if (!pending) return;
    if (code.length < 6) {
      toast.error("Enter the 6-digit code from your app");
      return;
    }
    setVerifying(true);
    const { data: chal, error: challErr } = await supabase.auth.mfa.challenge({ factorId: pending.id });
    if (challErr || !chal) {
      setVerifying(false);
      toast.error("Couldn't create challenge", { description: challErr?.message });
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: pending.id,
      challengeId: chal.id,
      code,
    });
    setVerifying(false);
    if (error) {
      toast.error("Invalid code — try again");
      return;
    }
    toast.success("Two-step verification enabled");
    setPending(null);
    setCode("");
    refresh();
    onVerified?.();
  };

  const cancelEnroll = async () => {
    if (!pending) return;
    await supabase.auth.mfa.unenroll({ factorId: pending.id });
    setPending(null);
    setCode("");
  };

  const removeFactor = async (id: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) {
      toast.error("Couldn't remove factor", { description: error.message });
      return;
    }
    toast.success("Two-step verification removed");
    refresh();
  };

  return (
    <SettingsShell title="Two-step verification" description="Extra sign-in security via an authenticator app">
      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : pending ? (
        <>
          <SettingsCard>
            <div className="p-5 text-center">
              <div className="text-[15px] font-semibold">Scan this QR in your authenticator app</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Google Authenticator, Microsoft Authenticator or any authenticator app works.
              </p>
              {/* supabase-js returns "data:image/svg+xml;utf-8,<svg…>"; render it as an image
                  (it used to be injected as HTML, which printed the data-URL prefix as text). */}
              <img
                src={qrImageSrc(pending.qr)}
                alt="QR code for your authenticator app"
                width={176}
                height={176}
                className="mx-auto mt-4 rounded-2xl bg-white p-3"
              />
              <div className="mt-3 text-[11px] text-muted-foreground">
                Or enter this key manually:{" "}
                <span className="font-mono text-foreground/85">{pending.secret}</span>
              </div>
            </div>
          </SettingsCard>

          <div className="mt-4">
            <SettingsCard>
              <div className="space-y-3 p-4">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                    6-digit code
                  </span>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className={inputClass}
                    placeholder="000000"
                    autoFocus
                  />
                </label>
              </div>
            </SettingsCard>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={cancelEnroll}
              className="flex-1 rounded-xl bg-secondary py-2.5 text-[15px] font-medium text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={verify}
              disabled={code.length < 6 || verifying}
              className="flex-1 rounded-xl bg-primary py-2.5 text-[15px] font-semibold text-primary-foreground disabled:opacity-40"
            >
              {verifying ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying
                </span>
              ) : (
                "Verify and enable"
              )}
            </button>
          </div>
        </>
      ) : factors.length === 0 ? (
        <SettingsCard>
          <div className="p-6 text-center">
            <ShieldOff className="mx-auto h-10 w-10 text-foreground/40" />
            <div className="mt-3 text-[16px] font-semibold">Not enabled</div>
            <p className="mx-auto mt-1 max-w-[300px] text-sm text-muted-foreground">
              Add an authenticator app and we'll ask for a 6-digit code whenever you sign in. Recommended for admins.
            </p>
            <button
              type="button"
              onClick={startEnroll}
              disabled={enrolling}
              className="mt-4 press rounded-full bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground disabled:opacity-40"
            >
              {enrolling ? "Preparing…" : "Set up authenticator"}
            </button>
          </div>
        </SettingsCard>
      ) : (
        <>
          <SettingsCard>
            <div className="flex items-center gap-3 p-4">
              <ShieldCheck className="h-5 w-5 text-success" />
              <div className="text-sm">
                <div className="font-medium">Two-step verification is on</div>
                <div className="text-xs text-muted-foreground">
                  You'll be asked for a code from your authenticator each time you sign in.
                </div>
              </div>
            </div>
          </SettingsCard>

          <div className="mt-4">
            <SettingsCard>
              {factors.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">
                      {f.friendly_name || "Authenticator"}
                    </div>
                    <div className="footnote">
                      Authenticator app · {f.status === "verified" ? "on" : f.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFactor(f.id)}
                    className="grid h-9 w-9 place-items-center rounded-full text-[hsl(var(--destructive))] hover:bg-card"
                    aria-label="Remove factor"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </SettingsCard>
          </div>
        </>
      )}
    </SettingsShell>
  );
};

export default TwoFactorPage;
