import LanguageSwitch from "@/components/i18n/LanguageSwitch";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import CholoKheliMark from "@/components/CholoKheliMark";
import { useLanguage } from "@/i18n/LanguageProvider";
import { publicUrl } from "@/lib/publicUrl";

type Role = "player" | "scout";
type Sport = "football" | "cricket" | "basketball";
type View = "signin" | "signup" | "sent" | "mfa" | "finish";

export type Onboarding = {
  role: Role;
  username: string;
  full_name: string;
  sport: Sport | null;
  gender: string;
  phone: string;
  date_of_birth: string;
  organization: string;
  guardian_name: string;
  guardian_email: string;
  parental_consent: boolean;
};

const EMPTY: Onboarding = {
  role: "player", username: "", full_name: "", sport: "football", gender: "", phone: "",
  date_of_birth: "", organization: "", guardian_name: "", guardian_email: "", parental_consent: false,
};

export function ageFrom(dob: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const now = new Date();
  let age = now.getFullYear() - Number(m[1]);
  if (now.getMonth() + 1 < Number(m[2]) || (now.getMonth() + 1 === Number(m[2]) && now.getDate() < Number(m[3]))) age--;
  return age;
}

const SERVER_ERRORS: Record<string, string> = {
  username_taken: "auth.err.usernameTaken",
  invalid_username: "auth.err.username",
  guardian_consent_required: "auth.err.guardian",
  age_not_eligible: "auth.tooYoung",
  scouts_must_be_adults: "auth.err.scoutAge",
  date_of_birth_required: "auth.err.dob",
  invalid_date_of_birth: "auth.err.dob",
  invalid_phone: "auth.err.phone",
  invalid_guardian_email: "auth.err.guardianEmail",
  invalid_full_name: "auth.err.name",
};

/** Calls the onboarding function; body omitted = use the answers stored on the account. */
async function runOnboarding(body?: Onboarding): Promise<{ ok: true } | { ok: false; code: string }> {
  const { error } = await supabase.functions.invoke("handle-signup-role", { body: body ?? {} });
  if (!error) return { ok: true };
  let code = "internal_error";
  try {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") code = ((await ctx.json()) as { error?: string }).error ?? code;
  } catch { /* keep generic code */ }
  if (code === "already_onboarded") return { ok: true };
  return { ok: false, code };
}

const inputCls =
  "h-12 w-full rounded-2xl bg-white/70 px-4 text-[16px] text-foreground ring-1 ring-black/[0.06] outline-none transition placeholder:text-muted-foreground/80 focus:bg-white focus:ring-2 focus:ring-ring dark:bg-white/10 dark:ring-white/10 dark:focus:bg-white/15";

function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-muted-foreground">{label}</label>
      {children}
      {error ? <p className="mt-1.5 text-[13px] text-destructive" role="alert">{error}</p> : hint ? <p className="mt-1.5 text-[13px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid rounded-2xl bg-[#0E2A33]/[0.07] p-1 dark:bg-white/10" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 rounded-xl text-[15px] font-medium transition-colors ${value === o.value ? "bg-white text-foreground shadow-[0_2px_8px_-2px_rgba(14,42,51,0.25)] dark:bg-white/20" : "text-muted-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Profile questions shared by sign-up and "finish setting up your account". */
export function ProfileFields({ value, onChange, usernameState }: {
  value: Onboarding;
  onChange: (next: Onboarding) => void;
  usernameState: "idle" | "checking" | "ok" | "taken" | "invalid";
}) {
  const { t } = useLanguage();
  const set = <K extends keyof Onboarding>(k: K, v: Onboarding[K]) => onChange({ ...value, [k]: v });
  const age = ageFrom(value.date_of_birth);
  const minor = age !== null && age >= 13 && age < 18;
  const today = new Date().toISOString().slice(0, 10);
  const usernameMsg: Record<string, string | undefined> = {
    checking: t("auth.usernameChecking"), ok: t("auth.usernameOk"), taken: t("auth.err.usernameTaken"), invalid: t("auth.err.username"),
  };

  return (
    <div className="space-y-4">
      <Segmented
        label={t("auth.iAmA")}
        value={value.role}
        onChange={(r) => onChange({ ...value, role: r, sport: r === "player" ? value.sport ?? "football" : null })}
        options={[{ value: "player", label: t("auth.rolePlayer") }, { value: "scout", label: t("auth.roleScout") }]}
      />
      {value.role === "player" && (
        <Field label={t("auth.sportCategory")} htmlFor="sport">
          <Segmented
            label={t("auth.sportCategory")}
            value={(value.sport ?? "football") as Sport}
            onChange={(s) => set("sport", s)}
            options={[{ value: "football", label: t("auth.football") }, { value: "cricket", label: t("auth.cricket") }, { value: "basketball", label: t("auth.basketball") }]}
          />
        </Field>
      )}
      <Field label={t("auth.fullName")} htmlFor="name">
        <input id="name" className={inputCls} autoComplete="name" maxLength={100} required value={value.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder={t("auth.fullNamePh")} />
      </Field>
      <Field
        label={t("auth.username")}
        htmlFor="username"
        hint={usernameState === "ok" || usernameState === "checking" ? usernameMsg[usernameState] : t("auth.usernameHint")}
        error={usernameState === "taken" || usernameState === "invalid" ? usernameMsg[usernameState] : undefined}
      >
        <input
          id="username" className={inputCls} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={24} required
          value={value.username} placeholder="e.g. rafiq_10"
          onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
        />
      </Field>
      {value.role === "scout" && (
        <Field label={t("auth.organization")} htmlFor="org" hint={t("auth.organizationHint")}>
          <input id="org" className={inputCls} maxLength={120} required value={value.organization} onChange={(e) => set("organization", e.target.value)} placeholder={t("auth.organizationPh")} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("auth.dob")} htmlFor="dob">
          <div className="relative">
            <input id="dob" type="date" className={`${inputCls} ck-date ${value.date_of_birth ? "" : "text-transparent focus:text-foreground"}`} required max={today} value={value.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
            {/* iPhones show an empty date box with no hint, so draw one until a date is picked. */}
            {!value.date_of_birth && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 right-10 flex items-center truncate text-[16px] text-muted-foreground/80">{t("auth.dobPlaceholder")}</span>}
          </div>
        </Field>
        <Field label={t("auth.gender")} htmlFor="gender">
          <select id="gender" className={`${inputCls} ck-select`} required value={value.gender} onChange={(e) => set("gender", e.target.value)}>
            <option value="">{t("auth.selectGender")}</option>
            <option value="male">{t("auth.male")}</option>
            <option value="female">{t("auth.female")}</option>
            <option value="other">{t("auth.other")}</option>
          </select>
        </Field>
      </div>
      {age !== null && age < 13 && <p className="text-[13px] text-destructive" role="alert">{t("auth.tooYoung")}</p>}
      {value.role === "scout" && age !== null && age >= 13 && age < 18 && <p className="text-[13px] text-destructive" role="alert">{t("auth.err.scoutAge")}</p>}
      <Field label={t("auth.phone")} htmlFor="phone">
        <input id="phone" type="tel" inputMode="tel" autoComplete="tel" className={inputCls} maxLength={20} required value={value.phone} onChange={(e) => set("phone", e.target.value)} placeholder={t("auth.phonePh")} />
      </Field>
      {minor && value.role === "player" && (
        <div className="space-y-3 rounded-2xl bg-accent p-4">
          <p className="headline">{t("auth.guardianHeading")}</p>
          <p className="footnote">{t("auth.minorNotice")}</p>
          <Field label={t("auth.guardianName")} htmlFor="gname">
            <input id="gname" className={inputCls + " bg-card"} maxLength={100} required value={value.guardian_name} onChange={(e) => set("guardian_name", e.target.value)} placeholder={t("auth.guardianNamePh")} />
          </Field>
          <Field label={t("auth.guardianEmail")} htmlFor="gemail">
            <input id="gemail" type="email" className={inputCls + " bg-card"} maxLength={254} required value={value.guardian_email} onChange={(e) => set("guardian_email", e.target.value)} placeholder={t("auth.guardianEmailPh")} />
          </Field>
          <label className="flex items-start gap-3 text-[14px] leading-snug">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" checked={value.parental_consent} onChange={(e) => set("parental_consent", e.target.checked)} required />
            <span>{t("auth.parentalConsent")} <Link to="/privacy-policy" className="font-medium text-primary underline underline-offset-2">{t("auth.privacyPolicy")}</Link>.</span>
          </label>
        </div>
      )}
    </div>
  );
}

/** Returns a problem with the profile answers (translation key) or null if they look complete. */
export function profileProblem(v: Onboarding, usernameState: string): string | null {
  if (!v.full_name.trim()) return "auth.err.name";
  if (!/^[a-z0-9_]{3,24}$/.test(v.username)) return "auth.err.username";
  if (usernameState === "taken") return "auth.err.usernameTaken";
  if (v.role === "scout" && !v.organization.trim()) return "auth.err.organization";
  const age = ageFrom(v.date_of_birth);
  if (age === null) return "auth.err.dob";
  if (age < 13) return "auth.tooYoung";
  if (v.role === "scout" && age < 18) return "auth.err.scoutAge";
  if (!v.gender) return "auth.err.gender";
  if (!/^[+0-9][0-9 -]{5,19}$/.test(v.phone.trim())) return "auth.err.phone";
  if (v.role === "player" && age < 18 && (!v.guardian_name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.guardian_email.trim()) || !v.parental_consent)) return "auth.err.guardian";
  return null;
}

/** Debounced username availability via the is_username_available RPC (works before sign-in). */
export function useUsernameState(username: string, active: boolean) {
  const [state, setState] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  useEffect(() => {
    if (!active) return;
    if (!username) { setState("idle"); return; }
    if (!/^[a-z0-9_]{3,24}$/.test(username)) { setState("invalid"); return; }
    setState("checking");
    const h = setTimeout(async () => {
      const { data, error } = await supabase.rpc("is_username_available" as never, { _username: username } as never);
      setState(error ? "idle" : data ? "ok" : "taken");
    }, 350);
    return () => clearTimeout(h);
  }, [username, active]);
  return state;
}

const cleanOnboarding = (v: Onboarding): Onboarding => ({
  ...v,
  full_name: v.full_name.trim(), phone: v.phone.trim(), organization: v.role === "scout" ? v.organization.trim() : "",
  sport: v.role === "player" ? v.sport ?? "football" : null,
  guardian_name: v.guardian_name.trim(), guardian_email: v.guardian_email.trim().toLowerCase(),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, role, loading, needsMfa, refreshRole, signOut } = useAuth();
  const { t } = useLanguage();
  // Read from the router (available during SSR too) so server and client render the same view.
  const search = useSearch({ strict: false }) as { mode?: string; role?: string };
  const [view, setView] = useState<View>(search.mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Onboarding>({ ...EMPTY, role: search.role === "scout" ? "scout" : "player" });
  const [agree, setAgree] = useState(false);
  const [code, setCode] = useState("");
  const triedAuto = useRef(false);
  const usernameState = useUsernameState(profile.username, view === "signup" || view === "finish");

  // Email links that failed (expired or already used) come back as #error=…; say so plainly.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = new URLSearchParams(window.location.hash.slice(1));
    if (h.get("error_code") || h.get("error")) {
      setError(t((h.get("error_code") === "otp_expired" ? "auth.err.linkExpired" : "auth.err.generic") as never));
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [t]);

  // Where a signed-in session should end up.
  useEffect(() => {
    if (loading || !user) return;
    if (needsMfa) { setView("mfa"); return; }
    if (role) {
      navigate({ to: (role === "admin" ? "/admin" : role === "scout" ? "/scout" : "/player") as never, replace: true });
      return;
    }
    // Signed in but not onboarded: finish with the answers saved on the account, else ask.
    if (triedAuto.current) return;
    triedAuto.current = true;
    const saved = (user.user_metadata as { onboarding?: Partial<Onboarding> } | undefined)?.onboarding;
    if (saved) setProfile((p) => ({ ...p, ...saved, sport: (saved.sport as Sport) ?? p.sport }));
    setBusy(true);
    runOnboarding().then(async (r) => {
      setBusy(false);
      if (r.ok) { await refreshRole(); return; }
      setView("finish");
      if (saved) setError(t((SERVER_ERRORS[r.code] ?? "auth.err.generic") as never));
    });
  }, [loading, user, role, needsMfa, navigate, refreshRole, t]);

  const fail = (key: string) => { setError(t(key as never)); setBusy(false); };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      const msg = err.message.toLowerCase();
      return fail(msg.includes("confirm") ? "auth.err.unconfirmed" : msg.includes("invalid") ? "auth.err.credentials" : "auth.err.generic");
    }
    await refreshRole();
    setBusy(false);
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    const problem = profileProblem(profile, usernameState);
    if (problem) return fail(problem);
    if (password.length < 8) return fail("auth.err.password");
    if (!agree) return fail("auth.err.agree");
    setBusy(true);
    const onboarding = cleanOnboarding(profile);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: publicUrl("/auth"), data: { full_name: onboarding.full_name, onboarding } },
    });
    if (err) {
      const m = err.message.toLowerCase();
      return fail(m.includes("already") ? "auth.err.exists" : m.includes("password") ? "auth.err.password" : "auth.err.generic");
    }
    // With email confirmation on, an existing address comes back with no identities.
    if (data.user && (data.user.identities?.length ?? 0) === 0) return fail("auth.err.exists");
    setBusy(false);
    if (!data.session) setView("sent");
    // With a session (confirmation off) the effect above finishes onboarding.
  };

  const finish = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    const problem = profileProblem(profile, usernameState);
    if (problem) return fail(problem);
    setBusy(true);
    const r = await runOnboarding(cleanOnboarding(profile));
    if (!r.ok) return fail(SERVER_ERRORS[r.code] ?? "auth.err.generic");
    await refreshRole();
    setBusy(false);
  };

  const verifyMfa = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setBusy(true);
    const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.find((f) => f.status === "verified");
    if (fErr || !factor) return fail("auth.err.generic");
    const { error: vErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    if (vErr) return fail("auth.err.code");
    await refreshRole();
    setBusy(false);
  };

  const forgot = async () => {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return fail("auth.err.emailFirst");
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: publicUrl("/reset-password") });
    setBusy(false);
    if (err) return fail("auth.err.generic");
    toast.success(t("auth.resetSent"));
  };

  const resend = async () => {
    setBusy(true);
    const { error: err } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: publicUrl("/auth") } });
    setBusy(false);
    if (err) toast.error(t("auth.err.generic")); else toast.success(t("auth.resent"));
  };

  const primaryBtn = "press flex h-[52px] w-full items-center justify-center rounded-full bg-primary text-[17px] font-semibold text-primary-foreground disabled:opacity-50";
  const titleKey = { signin: "auth.welcomeBack", signup: "auth.joinTheGame", sent: "auth.checkEmail", mfa: "auth.mfaTitle", finish: "auth.finishTitle" }[view];
  const subKey = { signin: "auth.signInSub", signup: "auth.signUpSub", sent: "auth.confirmSent", mfa: "auth.mfaSub", finish: "auth.finishSub" }[view];

    return (
    <div className="relative min-h-[100dvh]">
      {/* Backdrop: soft colour blobs (no photo) that the glass card picks up */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-24 -top-16 h-80 w-80 rounded-full bg-[#7EC8FF]/55 blur-3xl" />
        <div className="absolute -right-24 top-[22%] h-72 w-72 rounded-full bg-[#5FD3B5]/45 blur-3xl" />
        <div className="absolute -left-16 bottom-[6%] h-80 w-80 rounded-full bg-[#F2C98A]/45 blur-3xl" />
        <div className="absolute -right-10 -bottom-20 h-72 w-72 rounded-full bg-[#13738F]/35 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-md px-4" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))", paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Cholo Kheli home" className="press glass-icon !rounded-[14px]">
            <CholoKheliMark className="h-6 w-7" />
          </Link>
          <LanguageSwitch />
        </div>
        <div className="pb-6 pt-[9dvh]">
          <h1 className="text-[34px] font-extrabold italic leading-[1.02] tracking-[-0.03em]">{t(titleKey as never)}</h1>
          <p className="mt-2 text-[16px] text-muted-foreground">
            {t(subKey as never)}{view === "sent" && <> <span className="font-semibold text-foreground">{email}</span></>}
          </p>
        </div>

        <div className="rounded-[32px] bg-white/55 p-5 shadow-[0_30px_70px_-34px_rgba(14,42,51,0.45)] ring-1 ring-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] dark:bg-white/[0.07] dark:ring-white/10">
        {error && <p role="alert" className="mb-4 rounded-2xl bg-destructive/10 px-4 py-3 text-[14px] text-destructive">{error}</p>}

        {view === "signin" && !user && (
          <form onSubmit={signIn} className="space-y-4" noValidate>
            <Field label={t("auth.email")} htmlFor="email">
              <input id="email" type="email" autoComplete="email" inputMode="email" className={inputCls} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.emailPh")} />
            </Field>
            <Field label={t("auth.password")} htmlFor="password">
              <div className="relative">
                <input id="password" type={showPass ? "text" : "password"} autoComplete="current-password" className={inputCls + " pr-12"} required value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? t("auth.hidePassword") : t("auth.showPassword")} className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-muted-foreground">
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </Field>
            <button type="submit" disabled={busy || !email || !password} className={primaryBtn}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-label={t("common.loading")} /> : t("auth.signIn")}
            </button>
            <div className="flex items-center justify-between pt-1 text-[15px]">
              <button type="button" onClick={forgot} className="py-2 text-primary">{t("auth.forgot")}</button>
              <button type="button" onClick={() => { setView("signup"); setError(null); }} className="py-2 font-medium text-primary">{t("auth.createAccount")}</button>
            </div>
          </form>
        )}

        {view === "signup" && !user && (
          <form onSubmit={signUp} className="space-y-4" noValidate>
            <ProfileFields value={profile} onChange={setProfile} usernameState={usernameState} />
            <Field label={t("auth.email")} htmlFor="email">
              <input id="email" type="email" autoComplete="email" inputMode="email" className={inputCls} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.emailPh")} />
            </Field>
            <Field label={t("auth.password")} htmlFor="password" hint={t("auth.passwordHint")}>
              <div className="relative">
                <input id="password" type={showPass ? "text" : "password"} autoComplete="new-password" minLength={8} className={inputCls + " pr-12"} required value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? t("auth.hidePassword") : t("auth.showPassword")} className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-muted-foreground">
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </Field>
            {profile.role === "scout" && <p className="footnote">{t("auth.scoutDocsLater")}</p>}
            <label className="flex items-start gap-3 text-[14px] leading-snug">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>{t("auth.agreePrivacy")} <Link to="/privacy-policy" className="font-medium text-primary underline underline-offset-2">{t("auth.privacyPolicy")}</Link>.</span>
            </label>
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-label={t("common.loading")} /> : t("auth.createAccount")}
            </button>
            <p className="text-center text-[15px] text-muted-foreground">
              {t("auth.hasAccount")}{" "}
              <button type="button" onClick={() => { setView("signin"); setError(null); }} className="py-2 font-medium text-primary">{t("auth.signIn")}</button>
            </p>
          </form>
        )}

        {view === "sent" && (
          <div className="space-y-4">
            <div className="ios-group flex items-start gap-3 p-4">
              <MailCheck className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-[15px] leading-snug">{t("auth.activateHint")}</p>
            </div>
            <button type="button" onClick={() => { setView("signin"); setError(null); }} className={primaryBtn}>{t("auth.alreadyConfirmed")}</button>
            <button type="button" onClick={resend} disabled={busy} className="w-full py-2 text-[15px] text-primary">{t("auth.resend")}</button>
          </div>
        )}

        {view === "mfa" && (
          <form onSubmit={verifyMfa} className="space-y-4">
            <div className="flex justify-center py-2"><ShieldCheck className="h-10 w-10 text-primary" aria-hidden="true" /></div>
            <Field label={t("auth.mfaCode")} htmlFor="otp">
              <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={inputCls + " text-center text-[22px] "} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t("auth.verify")}
            </button>
            <button type="button" onClick={() => signOut().then(() => setView("signin"))} className="w-full py-2 text-[15px] text-primary">{t("auth.useOtherAccount")}</button>
          </form>
        )}

        {view === "finish" && (
          <form onSubmit={finish} className="space-y-4" noValidate>
            <ProfileFields value={profile} onChange={setProfile} usernameState={usernameState} />
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t("auth.finishCta")}
            </button>
            <button type="button" onClick={() => signOut().then(() => setView("signin"))} className="w-full py-2 text-[15px] text-primary">{t("nav.signOut")}</button>
          </form>
        )}

        {busy && user && !role && view !== "finish" && (
          <div className="mt-10 flex items-center justify-center gap-2 text-muted-foreground" role="status">
            <Loader2 className="h-5 w-5 animate-spin" /> {t("auth.settingUp")}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
