import { ReactNode } from "react";
import { Navigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: ("player" | "scout" | "admin")[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading, scoutStatus } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!role) return <Navigate to="/auth" replace />;
  if (!allowedRoles.includes(role)) {
    const redirect = role === "admin" ? "/admin" : role === "scout" ? "/scout" : "/player";
    return <Navigate to={redirect as any} replace />;
  }

  // Scout pending verification gate — no emojis, plain message
  if (role === "scout" && scoutStatus !== "active") {
    const rejected = scoutStatus === "rejected";
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-gradient-to-b from-[hsl(var(--paper))] via-[hsl(var(--paper))] to-[hsl(var(--teal-deep)/0.08)]">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-10 shadow-2xl text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center">
              <Clock className="h-8 w-8 text-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-foreground">
              {rejected ? "Account not approved" : "Account pending verification"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {rejected
                ? "Your scout application was not approved. Please contact support if you believe this is a mistake."
                : "Your request is being authenticated. Please wait until your account is verified."}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full border-border"
            >
              Check status
            </Button>
            <Button
              variant="ghost"
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
              className="w-full text-muted-foreground"
            >
              Sign out
            </Button>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 mt-1">
              Return home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
