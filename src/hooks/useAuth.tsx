import { clearPageCache } from "@/lib/pageCache";
import { syncLanguage } from "@/i18n/syncLanguage";
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { disablePushForThisDevice } from "@/lib/push";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/publicUrl";

export type AppRole = "player" | "scout" | "admin";
export type ScoutStatus = "pending" | "active" | "rejected" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  scoutStatus: ScoutStatus;
  /** Signed in with a password but a verified authenticator code is still required. */
  needsMfa: boolean;
  /** Session assurance: "aal2" once this session passed two-factor. Admin tools need it. */
  aal: string | null;
  signUp: (email: string, password: string, meta: Record<string, unknown>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  /** Re-reads role, scout status and MFA level (after onboarding, verification or step-up). */
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [scoutStatus, setScoutStatus] = useState<ScoutStatus>(null);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [aal, setAal] = useState<string | null>(null);
  const lastUserId = useRef<string | null>(null);

  const loadAccess = useCallback(async (userId: string) => {
    try {
      const [{ data: roleRows }, aal] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel().catch(() => ({ data: null })),
      ]);
      // An account can hold more than one role (e.g. a player later promoted to admin);
      // the most privileged one decides which app they see.
      const held = new Set((roleRows ?? []).map((r) => r.role as AppRole));
      const nextRole: AppRole | null = held.has("admin") ? "admin" : held.has("scout") ? "scout" : held.has("player") ? "player" : null;
      let status: ScoutStatus = null;
      if (nextRole === "scout") {
        const { data: sp } = await supabase
          .from("scout_profiles").select("verification_status").eq("user_id", userId).maybeSingle();
        status = (sp?.verification_status as ScoutStatus) ?? "pending";
      }
      const a = aal?.data as { currentLevel?: string | null; nextLevel?: string | null } | null;
      setNeedsMfa(!!a && a.nextLevel === "aal2" && a.currentLevel !== "aal2");
      setAal(a?.currentLevel ?? null);
      setRole(nextRole);
      setScoutStatus(status);
    } catch (error) {
      console.warn("role fetch failed", error);
      setRole(null);
      setScoutStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const apply = (next: Session | null) => {
      setSession(next);
      setUser(next?.user ?? null);
      // Remember that this device has signed in, so the welcome intro is shown only once.
      if (next?.user) { try { localStorage.setItem("ck:returning", "1"); } catch { /* storage off */ } }
      if (next?.user) {
        // Token refreshes fire this too; only re-resolve access when the account changes.
        if (lastUserId.current !== next.user.id) {
          lastUserId.current = next.user.id;
          setLoading(true);
          setTimeout(() => loadAccess(next.user.id), 0);
          setTimeout(() => { void syncLanguage(next.user.id); }, 0);
        }
      } else {
        lastUserId.current = null;
        setRole(null);
        setScoutStatus(null);
        setNeedsMfa(false);
        setLoading(false);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "MFA_CHALLENGE_VERIFIED" && next?.user) {
        setTimeout(() => loadAccess(next.user.id), 0);
      }
      apply(next);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => apply(s));
    return () => subscription.unsubscribe();
  }, [loadAccess]);

  const refreshRole = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setLoading(true);
      await loadAccess(data.user.id);
    }
  }, [loadAccess]);

  const signUp = async (email: string, password: string, meta: Record<string, unknown>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: publicUrl("/auth"), data: meta },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    clearPageCache();
    await disablePushForThisDevice().catch(() => {});
    await supabase.auth.signOut();
    lastUserId.current = null;
    setRole(null);
    setScoutStatus(null);
    setNeedsMfa(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, scoutStatus, needsMfa, aal, signUp, signIn, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
