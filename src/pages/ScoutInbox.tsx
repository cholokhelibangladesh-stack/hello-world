import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Inbox, Check, X, User, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Share {
  id: string;
  player_id: string;
  message: string | null;
  status: string;
  created_at: string;
  viewed_at: string | null;
  player_name?: string;
  player_username?: string | null;
  player_sport?: string | null;
  player_avatar?: string | null;
}

const ScoutInbox = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const { data: shares, error } = await (supabase as any)
      .from("profile_shares")
      .select("*")
      .eq("scout_id", user.id)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false });
    if (error) { toast({ title: "Load failed", description: error.message, variant: "destructive" }); setLoading(false); return; }
    const ids = (shares ?? []).map((s: any) => s.player_id);
    let profileMap = new Map<string, any>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, sport, avatar_url")
        .in("user_id", ids);
      (profs ?? []).forEach((p: any) => profileMap.set(p.user_id, p));
    }
    setRows((shares ?? []).map((s: any) => {
      const p = profileMap.get(s.player_id);
      return { ...s, player_name: p?.full_name ?? "Unknown", player_username: p?.username, player_sport: p?.sport, player_avatar: p?.avatar_url };
    }));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [user?.id]);

  const markViewed = async (id: string) => {
    await (supabase as any).from("profile_shares").update({ status: "viewed", viewed_at: new Date().toISOString() }).eq("id", id);
    setRows(rs => rs.map(r => r.id === id ? { ...r, status: "viewed" } : r));
  };

  const dismiss = async (id: string) => {
    const { error } = await (supabase as any).from("profile_shares").update({ status: "dismissed" }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setRows(rs => rs.filter(r => r.id !== id));
    toast({ title: "Dismissed" });
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      <div className="mb-5">
        <p className="text-[11px]   text-muted-foreground">Inbox</p>
        <h1 className="font-display text-2xl text-foreground mt-1 flex items-center gap-2">
          <Inbox className="h-6 w-6" /> Shared talent profiles
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Players sent to you by Cholo Kheli admins.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Your inbox is empty.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="apple-glass glass-card rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {r.player_avatar ? <img src={r.player_avatar} alt="" className="h-full w-full object-cover" /> : <User className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">{r.player_name}</p>
                    {r.status === "sent" && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] rounded-full">New</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    @{r.player_username ?? "player"}{r.player_sport ? ` • ${r.player_sport}` : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleString()}</p>
                </div>
              </div>
              {r.message && (
                <p className="text-sm text-foreground/80 bg-muted/50 rounded-xl p-3 border border-border">
                  "{r.message}"
                </p>
              )}
              <div className="flex gap-2">
                <a
                  href={`/resume/${r.player_id}`}
                  onClick={() => r.status === "sent" && markViewed(r.id)}
                  className="flex-1"
                >
                  <Button size="sm" className="w-full rounded-full text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" /> View profile
                  </Button>
                </a>
                {r.status === "sent" && (
                  <Button size="sm" variant="outline" onClick={() => markViewed(r.id)} className="rounded-full text-xs">
                    <Check className="h-3 w-3 mr-1" /> Mark read
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => dismiss(r.id)} className="rounded-full text-xs border-destructive/40 text-destructive hover:bg-destructive/10">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScoutInbox;
