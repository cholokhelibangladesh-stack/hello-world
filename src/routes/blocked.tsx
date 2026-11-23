import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Ban, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/blocked")({
  ssr: false,
  component: BlockedPage,
});

interface BanStatus {
  is_banned: boolean;
  ban_reason: string | null;
  ban_message: string | null;
  banned_until: string | null;
  banned_at: string | null;
  scope: string;
}

function BlockedPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<BanStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Signed-out visitors have nothing to show here.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/" }); return; }
      const { data } = await (supabase as any).rpc("get_my_ban_status");
      const row = (data && data[0]) || null;
      if (!row || !row.is_banned) {
        // Not actually banned → send home
        navigate({ to: "/" });
        return;
      }
      setStatus(row);
      setLoading(false);
    })();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" as any });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const until = status?.banned_until ? new Date(status.banned_until) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-destructive/15 flex items-center justify-center border border-destructive/30">
          <Ban className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{until ? "Account suspended" : "Account banned"}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Your Cholo Kheli account has been {until ? "temporarily suspended" : "banned"} by our moderation team.
          </p>
        </div>
        {status?.ban_reason && (
          <p className="rounded-2xl bg-card p-4 text-left text-[15px] text-foreground"><span className="font-semibold">Reason:</span> {status.ban_reason}</p>
        )}
        {status?.ban_message && (
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-left">
            <p className="text-[10px]   text-muted-foreground font-semibold mb-2">
              Message from moderation
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{status.ban_message}</p>
          </div>
        )}
        {until && (
          <p className="text-xs text-muted-foreground">
            Suspension lifts on <strong className="text-foreground">{until.toLocaleString()}</strong>
          </p>
        )}
        {!until && (
          <p className="text-xs text-muted-foreground">
            This ban stays until the team lifts it. Contact <a className="underline" href="mailto:cholokhelibangladesh@gmail.com">cholokhelibangladesh@gmail.com</a> to appeal.
          </p>
        )}
        <Button variant="outline" onClick={signOut} className="rounded-full">
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );
}
