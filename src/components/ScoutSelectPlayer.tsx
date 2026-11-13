import { useEffect, useRef, useState } from "react";
import { UserPlus, Loader2, Send, Check, RotateCcw, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { uniqueChannel } from "@/lib/realtime";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  playerId: string;
  playerName: string;
}

type RequestState = {
  id: string;
  status: "pending" | "approved" | "rejected";
} | null;

const ScoutSelectPlayer = ({ playerId, playerName }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmRescind, setConfirmRescind] = useState(false);
  const [existing, setExisting] = useState<RequestState>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const lastActionRef = useRef(0);

  // Simple 800ms debounce guard against double-clicks / duplicate submits.
  const throttle = () => {
    const now = Date.now();
    if (now - lastActionRef.current < 800) return false;
    lastActionRef.current = now;
    return true;
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("scout_requests")
        .select("id, status")
        .eq("scout_id", user.id)
        .eq("player_id", playerId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setLoadedOnce(true);
        return;
      }
      setExisting((data as RequestState) ?? null);
      setLoadedOnce(true);
    };
    load();

    // Realtime — instantly reflect admin approval/rejection here too.
    const channel = supabase
      .channel(uniqueChannel(`scout-req-${user.id}-${playerId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scout_requests",
          filter: `scout_id=eq.${user.id}`,
        },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (!row || row.player_id !== playerId) return;
          if (payload.eventType === "DELETE") setExisting(null);
          else setExisting({ id: row.id, status: row.status });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, playerId]);



  const sendRequest = async () => {
    if (!user || busy || !throttle()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("scout_requests")
        .insert({ scout_id: user.id, player_id: playerId, notes } as any)
        .select("id, status")
        .single();
      if (error) {
        // Handle race with unique index
        if ((error as any).code === "23505") {
          toast({ title: "Already requested", description: "A request for this player already exists." });
          const { data: row } = await supabase
            .from("scout_requests")
            .select("id, status")
            .eq("scout_id", user.id)
            .eq("player_id", playerId)
            .maybeSingle();
          if (row) setExisting(row as RequestState);
        } else {
          toast({
            title: "Couldn't send request",
            description: error.message || "Please check your connection and try again.",
            variant: "destructive",
          });
        }
        return;
      }
      setExisting({ id: (data as any).id, status: (data as any).status });
      // Admins are alerted by the trg_alert_scout_request DB trigger.
      toast({ title: "Request sent", description: `Details for ${playerName} requested.` });
      setOpen(false);
      setNotes("");
    } finally {
      setBusy(false);
    }
  };

  const rescindRequest = async () => {
    if (!user || !existing || existing.status !== "pending" || busy || !throttle()) return;
    setBusy(true);
    const snapshot = existing;
    setExisting(null); // optimistic
    setConfirmRescind(false);
    const { error } = await supabase.from("scout_requests").delete().eq("id", snapshot.id);
    if (error) {
      setExisting(snapshot);
      toast({
        title: "Couldn't rescind",
        description: error.message || "Try again in a moment.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Request rescinded" });
    }
    setBusy(false);
  };

  const retryRejected = async () => {
    if (!user || !existing || existing.status !== "rejected" || busy || !throttle()) return;
    setBusy(true);
    const snapshot = existing;
    setExisting({ id: snapshot.id, status: "pending" }); // optimistic
    const { error } = await supabase
      .from("scout_requests")
      .update({ status: "pending", admin_response: null } as any)
      .eq("id", snapshot.id);
    if (error) {
      setExisting(snapshot);
      toast({
        title: "Couldn't retry",
        description: error.message || "Try again in a moment.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Request re-opened", description: "Admin will review again." });
    }
    setBusy(false);
  };

  // ─── UI states ─────────────────────────────────────────────
  if (!loadedOnce) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        className="rounded-full text-xs border-border text-muted-foreground"
      >
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      </Button>
    );
  }

  if (existing?.status === "approved") {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        className="rounded-full text-xs border-primary/40 text-primary bg-primary/10"
      >
        <Check className="h-3 w-3 mr-1" /> Approved
      </Button>
    );
  }

  if (existing?.status === "pending") {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmRescind(true)}
          disabled={busy}
          className="rounded-full text-xs border-border text-muted-foreground hover:text-destructive hover:border-destructive/40"
          aria-label="Rescind request"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Clock className="h-3 w-3 mr-1" />
          )}
          Pending
        </Button>
        <AlertDialog open={confirmRescind} onOpenChange={setConfirmRescind}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rescind request?</AlertDialogTitle>
              <AlertDialogDescription>
                Your pending request for {playerName} will be removed. You can send a new one anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={rescindRequest}
                disabled={busy}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Rescind
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  if (existing?.status === "rejected") {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={retryRejected}
        disabled={busy}
        className="rounded-full text-xs border-border text-foreground/80 hover:border-primary/40 hover:text-primary"
      >
        {busy ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <RotateCcw className="h-3 w-3 mr-1" />
        )}
        Retry
      </Button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (busy) return; // don't allow closing mid-submit
        setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-xs"
        >
          <UserPlus className="h-3 w-3 mr-1" /> Select
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">
            Request player details
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Request further details about{" "}
          <span className="text-foreground font-medium">{playerName}</span>. The admin will review
          and forward the player's information.
        </p>
        <Textarea
          placeholder="Why are you interested in this player? (optional)"
          className="bg-secondary border-border resize-none"
          rows={3}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
        />
        <Button
          onClick={sendRequest}
          disabled={busy}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {busy ? "Sending…" : "Send request to admin"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ScoutSelectPlayer;
