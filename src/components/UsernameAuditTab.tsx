import { useEffect, useState } from "react";
import { Loader2, History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuditRow {
  id: string;
  user_id: string;
  old_username: string | null;
  new_username: string | null;
  changed_by: string | null;
  changed_at: string;
  user_email: string | null;
  changed_by_email: string | null;
}

const UsernameAuditTab = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("get_username_audit", { _limit: 200 });
    setLoading(false);
    if (error) {
      toast({ title: "Could not load audit log", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data as AuditRow[]) || []);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3" data-testid="username-audit-tab">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4 text-primary" />
          Username change history ({rows.length})
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="rounded-lg text-xs" data-testid="username-audit-refresh">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</>}
        </Button>
      </div>

      {rows.length === 0 && !loading && (
        <p className="text-muted-foreground text-center py-12">No username changes recorded yet.</p>
      )}

      {rows.map((r) => (
        <div
          key={r.id}
          data-testid="username-audit-row"
          data-user-id={r.user_id}
          data-old-username={r.old_username || ""}
          data-new-username={r.new_username || ""}
          className="apple-glass glass-card rounded-xl p-4 space-y-1"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-foreground">
              <span className="font-mono text-muted-foreground">@{r.old_username || "—"}</span>
              <span className="mx-2 text-muted-foreground">→</span>
              <span className="font-mono text-primary">@{r.new_username || "—"}</span>
            </p>
            <span className="text-xs text-muted-foreground">
              {new Date(r.changed_at).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Account: <span className="text-foreground">{r.user_email || r.user_id}</span>
            {" • "}Changed by:{" "}
            <span className="text-foreground">
              {r.changed_by_email || r.changed_by || "system"}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
};

export default UsernameAuditTab;
