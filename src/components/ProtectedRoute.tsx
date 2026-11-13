import { ReactNode, useEffect, useState } from "react";
import { Navigate, Link } from "@tanstack/react-router";
import { Check, Clock, FileUp, Loader2, MessageCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: ("player" | "scout" | "admin")[];
  /** Let scouts who aren't verified yet in (settings, verification, account deletion). */
  allowPendingScout?: boolean;
}

const ProtectedRoute = ({ children, allowedRoles, allowPendingScout = false }: ProtectedRouteProps) => {
  const { user, role, loading, scoutStatus, needsMfa } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }
  // No session, unfinished onboarding or a pending second factor are all handled on /auth.
  if (!user || !role || needsMfa) return <Navigate to="/auth" replace />;
  if (!allowedRoles.includes(role)) {
    return <Navigate to={(role === "admin" ? "/admin" : role === "scout" ? "/scout" : "/player") as never} replace />;
  }
  if (role === "scout" && scoutStatus !== "active" && !allowPendingScout) {
    return <ScoutVerificationGate rejected={scoutStatus === "rejected"} />;
  }
  return <>{children}</>;
};

function ScoutVerificationGate({ rejected }: { rejected: boolean }) {
  const { user, refreshRole, signOut } = useAuth();
  const [docs, setDocs] = useState<{ org: boolean; cv: boolean } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("documents").select("type").eq("user_id", user.id).then(({ data }) => {
      const types = new Set((data ?? []).map((d) => d.type));
      setDocs({ org: types.has("scout_org_id"), cv: types.has("scout_cv") });
    });
  }, [user]);

  const docsDone = !!docs?.org && !!docs?.cv;
  const steps = [
    { label: "Account created", done: true },
    { label: "Organisation ID and CV uploaded", done: docsDone },
    { label: rejected ? "Application not approved" : "Admin review", done: false, failed: rejected },
  ];

  return (
    <div className="mx-auto max-w-md px-5 pt-8 pb-10">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-accent text-primary">
        {rejected ? <XCircle className="h-7 w-7" aria-hidden="true" /> : <Clock className="h-7 w-7" aria-hidden="true" />}
      </div>
      <h1 className="large-title mt-4">{rejected ? "Not approved" : "Verification in progress"}</h1>
      <p className="mt-2 text-[16px] text-muted-foreground">
        {rejected
          ? "An admin couldn't verify your scout application. Message the team if you think this is a mistake or want to send new documents."
          : docsDone
            ? "Thanks. An admin is checking your documents. You'll get a notification when you're approved, usually within two working days."
            : "Scouts are verified before they can see any player. Upload your organisation ID and CV to start the review."}
      </p>

      <ol className="ios-group mt-6">
        {steps.map((s) => (
          <li key={s.label} className="ios-row">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${s.done ? "bg-success text-white" : s.failed ? "bg-destructive text-white" : "border-2 border-border"}`}>
              {s.done ? <Check className="h-4 w-4" strokeWidth={3} /> : s.failed ? <XCircle className="h-4 w-4" /> : null}
            </span>
            <span className="text-[16px]">{s.label}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6 space-y-3">
        {!docsDone && (
          <Link to="/scout/settings/verification" className="press flex h-[52px] items-center justify-center gap-2 rounded-full bg-primary text-[17px] font-semibold text-primary-foreground">
            <FileUp className="h-5 w-5" aria-hidden="true" /> Upload documents
          </Link>
        )}
        <Link to="/player/settings/messages" className="press flex h-[52px] items-center justify-center gap-2 rounded-full bg-secondary text-[17px] font-semibold">
          <MessageCircle className="h-5 w-5" aria-hidden="true" /> Message the team
        </Link>
        <button
          type="button"
          disabled={checking}
          onClick={async () => { setChecking(true); await refreshRole(); setChecking(false); }}
          className="w-full py-2 text-[16px] text-primary"
        >
          {checking ? "Checking…" : "Check status"}
        </button>
        <div className="flex justify-center gap-6 text-[15px]">
          <Link to="/player/settings" className="py-2 text-primary">Settings</Link>
          <button type="button" onClick={() => signOut()} className="py-2 text-primary">Log out</button>
        </div>
      </div>
    </div>
  );
}

export default ProtectedRoute;
