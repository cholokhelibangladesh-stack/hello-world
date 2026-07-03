import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Phone, User, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { safeMediaUrl } from "@/lib/sanitize";

interface ScoutRequest {
  id: string;
  player_id: string;
  status: string;
  notes: string | null;
  admin_response: string | null;
  created_at: string;
  player_name?: string;
  player_details?: any;
}

const ScoutSelections = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ScoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth?role=scout" as any });
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      const { data: reqs } = await supabase
        .from("scout_requests")
        .select("*")
        .eq("scout_id", user.id)
        .order("created_at", { ascending: false });

      const rawReqs = (reqs || []) as ScoutRequest[];
      const playerIds = [...new Set(rawReqs.map((r) => r.player_id))];

      let profileMap = new Map<string, string>();
      if (playerIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", playerIds);
        (profiles || []).forEach((p) => profileMap.set(p.user_id, p.full_name));
      }

      const approvedReqs = rawReqs.filter((r) => r.status === "approved");
      let detailsMap = new Map<string, any>();
      if (approvedReqs.length > 0) {
        const { data: notifs } = await supabase
          .from("notifications")
          .select("metadata")
          .eq("user_id", user.id)
          .eq("type", "selection")
          .order("created_at", { ascending: false });
        (notifs || []).forEach((n: any) => {
          if (n.metadata?.player_id) detailsMap.set(n.metadata.player_id, n.metadata);
        });
      }

      setRequests(rawReqs.map((r) => ({
        ...r,
        player_name: profileMap.get(r.player_id) || "Unknown",
        player_details: detailsMap.get(r.player_id) || null,
      })));
      setLoading(false);
    };
    fetchRequests();
  }, [user]);

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
          <div className="mb-5">
            <h1 className="font-display text-3xl text-foreground">SELECTIONS</h1>
            <p className="text-sm text-muted-foreground">Your player selection requests and their status</p>
          </div>

          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No player selections yet. Browse the talent and select players.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <motion.div key={r.id} layout className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="p-4 flex items-center justify-between gap-4 cursor-pointer" onClick={() => setExpandedRequest(expandedRequest === r.id ? null : r.id)}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{r.player_name}</p>
                      <p className="text-xs text-muted-foreground">{r.notes || "No notes"} • {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge className={`rounded-full ${r.status === "approved" ? "bg-primary/20 text-primary border-primary/30" : r.status === "rejected" ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-muted text-muted-foreground border-border"}`}>
                      {r.status}
                    </Badge>
                  </div>

                  <AnimatePresence>
                    {expandedRequest === r.id && r.status === "approved" && r.player_details && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border overflow-hidden">
                        <div className="p-4 bg-secondary/30 space-y-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Player Details (Forwarded by Admin)</p>
                          <div className="flex items-center gap-4">
                            {r.player_details.avatar_url && (
                              <img src={safeMediaUrl(r.player_details.avatar_url)} alt="" loading="lazy" decoding="async" className="w-14 h-14 rounded-full object-cover border-2 border-border" />
                            )}
                            <div>
                              <p className="font-semibold text-foreground">{r.player_details.player_name || r.player_name}</p>
                              <p className="text-xs text-muted-foreground">{r.player_details.sport}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {/* Phone hidden — only admins can view contact info */}
                            {r.player_details.gender && (
                              <div className="flex items-center gap-2 text-muted-foreground"><User className="h-3 w-3 text-primary" /> {r.player_details.gender}</div>
                            )}
                            {r.player_details.dob && (
                              <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-3 w-3 text-primary" /> {new Date(r.player_details.dob).toLocaleDateString()}</div>
                            )}
                            {r.player_details.guardian && (
                              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3 w-3 text-primary" /> Guardian: {r.player_details.guardian}</div>
                            )}
                          </div>
                          {r.player_details.bio && (
                            <p className="text-sm text-muted-foreground italic">"{r.player_details.bio}"</p>
                          )}
                          <Button size="sm" variant="outline" onClick={() => navigate({ to: `/resume/${r.player_id}` as any })}
                            className="text-primary border-primary/30 rounded-full text-xs">
                            View Full Profile →
                          </Button>
                        </div>
                      </motion.div>
                    )}
                    {expandedRequest === r.id && r.status === "pending" && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border overflow-hidden">
                        <div className="p-4 bg-secondary/30 text-center">
                          <p className="text-sm text-muted-foreground">⏳ Awaiting admin review. Details will appear here once approved.</p>
                        </div>
                      </motion.div>
                    )}
                    {expandedRequest === r.id && r.status === "rejected" && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border overflow-hidden">
                        <div className="p-4 bg-secondary/30 text-center">
                          <p className="text-sm text-muted-foreground">❌ This request was not approved by the admin.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ScoutSelections;
