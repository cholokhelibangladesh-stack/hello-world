import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Send, Search, User } from "lucide-react";

interface Scout { user_id: string; full_name: string; username: string | null; }
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  playerId: string;
  playerName: string;
}

const ShareToScoutDialog = ({ open, onOpenChange, playerId, playerName }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data: sp } = await supabase
        .from("scout_profiles")
        .select("user_id")
        .eq("verification_status", "active")
        .eq("is_banned", false);
      const ids = (sp ?? []).map((s: any) => s.user_id);
      if (ids.length === 0) { setScouts([]); setLoading(false); return; }
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", ids);
      setScouts((profs ?? []) as Scout[]);
      setLoading(false);
    })();
  }, [open]);

  const filtered = scouts.filter(s =>
    !q.trim() ||
    (s.full_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (s.username ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const submit = async () => {
    if (!selected || !user) return;
    setBusy(true);
    const { error } = await (supabase as any).from("profile_shares").insert({
      admin_id: user.id,
      scout_id: selected,
      player_id: playerId,
      message: message.trim() || null,
      status: "sent",
    });
    setBusy(false);
    if (error) {
      // Unique-index collision → already shared and not dismissed
      if (error.code === "23505") {
        toast({ title: "Already shared", description: "This scout has already received this player's profile.", variant: "destructive" });
      } else {
        toast({ title: "Share failed", description: error.message, variant: "destructive" });
      }
      return;
    }
    toast({ title: "Profile shared", description: `${playerName} sent to scout inbox.` });
    onOpenChange(false);
    setSelected(null); setMessage(""); setQ("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" /> Share {playerName}
          </DialogTitle>
          <DialogDescription>Send this player's profile to a verified scout's inbox.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search scouts by name or username" className="pl-9" />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {loading ? (
              <div className="p-6 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No verified scouts found.</p>
            ) : filtered.map(s => (
              <button
                key={s.user_id}
                onClick={() => setSelected(s.user_id)}
                className={`w-full text-left flex items-center gap-3 p-3 hover:bg-muted/50 ${selected === s.user_id ? "bg-primary/10" : ""}`}
              >
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><User className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">@{s.username ?? "scout"}</p>
                </div>
                {selected === s.user_id && <span className="text-xs text-primary font-semibold">Selected</span>}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-foreground/70">Note to the scout (optional)</label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Thought this player might fit your program..."
              maxLength={500}
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !selected}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" /> Send</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareToScoutDialog;
