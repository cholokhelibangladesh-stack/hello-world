import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "player" | "scout" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  scoutStatus: "pending" | "active" | "rejected" | null;
  signUp: (email: string, password: string, meta: Record<string, string>) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [scoutStatus, setScoutStatus] = useState<"pending" | "active" | "rejected" | null>(null);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    const nextRole = (data?.role as AppRole) ?? null;
    setRole(nextRole);

    if (nextRole === "scout") {
      const { data: sp } = await supabase
        .from("scout_profiles")
        .select("verification_status")
        .eq("user_id", userId)
        .maybeSingle();
      setScoutStatus((sp?.verification_status as any) ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Keep loading=true until role is resolved to avoid a
          // brief `user && !role` window that would trip ProtectedRoute.
          setTimeout(() => fetchRole(session.user.id), 0);
        } else {
          setRole(null);
          setScoutStatus(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, meta: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: meta,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setScoutStatus(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, scoutStatus, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
