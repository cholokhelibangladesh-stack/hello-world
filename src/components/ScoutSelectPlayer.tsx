import { useState } from "react";
import { UserPlus, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  playerId: string;
  playerName: string;
}

const ScoutSelectPlayer = ({ playerId, playerName }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    // Get scout's name
    const { data: scoutProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const scoutName = scoutProfile?.full_name || "A scout";

    const { error } = await supabase.from("scout_requests").insert({
      scout_id: user.id,
      player_id: playerId,
      notes,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Notify all admins about the new request
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin" as any);

      if (adminRoles && adminRoles.length > 0) {
        const adminNotifs = adminRoles.map((a) => ({
          user_id: a.user_id,
          title: "🔔 New Scout Request",
          message: `${scoutName} has requested details for player ${playerName}. Review it in the Requests tab.`,
          type: "info",
        }));
        await supabase.from("notifications").insert(adminNotifs as any);
      }

      toast({ title: "Request sent!", description: `Details for ${playerName} requested. Admin will review.` });
      setSubmitted(true);
      setOpen(false);
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <Button size="sm" variant="outline" disabled className="border-primary/40 text-primary rounded-full text-xs">
        <UserPlus className="h-3 w-3 mr-1" /> Requested
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-xs">
          <UserPlus className="h-3 w-3 mr-1" /> Select
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">REQUEST PLAYER DETAILS</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Request further details about <span className="text-foreground font-medium">{playerName}</span>. The admin will review and forward the player's information.
        </p>
        <Textarea
          placeholder="Why are you interested in this player? (optional)"
          className="bg-secondary border-border resize-none"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Send Request to Admin
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ScoutSelectPlayer;
