import { useCallback, useEffect, useState } from "react";
import PickCard from "@/components/scout/PickCard";
import BottomSheet from "@/components/social/BottomSheet";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  User,
  Calendar,
  Phone,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  RotateCcw,
  X,
  Inbox,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useToast } from "@/hooks/use-toast";
import { safeMediaUrl } from "@/lib/sanitize";
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

type Status = "pending" | "approved" | "rejected";

interface ScoutRequest {
  id: string;
  player_id: string;
  status: Status;
  notes: string | null;
  admin_response: string | null;
  created_at: string;
  player_name?: string;
  player_avatar?: string;
  player_sport?: string;
  player_details?: any;
}

const statusMeta = (status: Status) => {
  if (status === "approved")
    return { label: "Approved", Icon: CheckCircle2, className: "status-pill is-approved" };
  if (status === "rejected")
    return { label: "Declined", Icon: XCircle, className: "status-pill is-declined" };
  return { label: "Pending", Icon: Clock, className: "status-pill is-pending" };
};

const SkeletonRow = () => (
  <div className="selections-panel p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-full sk-shimmer shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <div className="h-3 w-1/2 sk-shimmer" />
      <div className="h-2.5 w-1/3 sk-shimmer" />
    </div>
    <div className="h-6 w-20 sk-shimmer rounded-full" />
  </div>
);

const ScoutSelections = () => {
  const [detailsFor, setDetailsFor] = useState<ScoutRequest | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ScoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [confirmRescind, setConfirmRescind] = useState<ScoutRequest | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth?role=scout" as any });
  }, [user, authLoading]);

  const enrich = useCallback(
    async (rawReqs: ScoutRequest[]): Promise<ScoutRequest[]> => {
      if (!user || rawReqs.length === 0) return [];
      const playerIds = [...new Set(rawReqs.map((r) => r.player_id))];

      const profileMap = new Map<string, { name: string; avatar: string; sport: string }>();
      if (playerIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, sport")
          .in("user_id", playerIds);
        (profiles || []).forEach((p) =>
          profileMap.set(p.user_id, {
            name: p.full_name || "Unknown",
            avatar: p.avatar_url || "",
            sport: p.sport || "",
          }),
        );
      }

      const approvedIds = rawReqs.filter((r) => r.status === "approved").map((r) => r.player_id);
      const detailsMap = new Map<string, any>();
      if (approvedIds.length) {
        const { data: notifs } = await supabase
          .from("notifications")
          .select("metadata")
          .eq("user_id", user.id)
          .eq("type", "selection")
          .order("created_at", { ascending: false });
        (notifs || []).forEach((n: any) => {
          if (n.metadata?.player_id && !detailsMap.has(n.metadata.player_id)) {
            detailsMap.set(n.metadata.player_id, n.metadata);
          }
        });
      }

      return rawReqs.map((r) => ({
        ...r,
        player_name: profileMap.get(r.player_id)?.name || "Unknown",
        player_avatar: profileMap.get(r.player_id)?.avatar || "",
        player_sport: profileMap.get(r.player_id)?.sport || "",
        player_details: detailsMap.get(r.player_id) || null,
      }));
    },
    [user],
  );

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("scout_requests")
      .select("*")
      .eq("scout_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({
        title: "Couldn't load selections",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    const enriched = await enrich((data || []) as ScoutRequest[]);
    setRequests(enriched);
    setLoading(false);
  }, [user, enrich, toast]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    refetch();
  }, [user, refetch]);

  // Realtime — pick up admin decisions instantly
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`scout-selections-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scout_requests",
          filter: `scout_id=eq.${user.id}`,
        },
        () => {
          refetch();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          // Selection notifications carry the approved player details payload
          if (payload.new?.type === "selection") refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  // Auto-poll when a request is approved but the details payload hasn't arrived yet
  useEffect(() => {
    const pendingDetails = requests.some(
      (r) => r.status === "approved" && !r.player_details,
    );
    if (!pendingDetails) return;
    const t = setInterval(() => {
      refetch();
    }, 4000);
    return () => clearInterval(t);
  }, [requests, refetch]);

  const manualRefresh = async (id: string) => {
    setRefreshingId(id);
    await refetch();
    setRefreshingId(null);
  };

  const rescind = async (r: ScoutRequest) => {
    setActioning(r.id);
    const snapshot = requests;
    setRequests((prev) => prev.filter((x) => x.id !== r.id)); // optimistic
    const { error } = await supabase.from("scout_requests").delete().eq("id", r.id);
    if (error) {
      setRequests(snapshot);
      toast({
        title: "Couldn't rescind",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Request rescinded" });
    }
    setActioning(null);
    setConfirmRescind(null);
  };

  const retry = async (r: ScoutRequest) => {
    setActioning(r.id);
    setRequests((prev) =>
      prev.map((x) =>
        x.id === r.id ? { ...x, status: "pending", admin_response: null } : x,
      ),
    );
    const { error } = await supabase
      .from("scout_requests")
      .update({ status: "pending", admin_response: null } as any)
      .eq("id", r.id);
    if (error) {
      await refetch();
      toast({
        title: "Couldn't retry",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Request re-opened", description: "Admin will review again." });
    }
    setActioning(null);
  };

  const isLoading = authLoading || loading;

  return (
    <div className="pb-8">
      <div className="mx-auto max-w-2xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4"
        >
          <div className="mb-5">
            <h1 className="large-title">Your picks</h1>
            <p className="text-sm text-muted-foreground">
              Your player requests and the admin's response
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading selections">
              {[0, 1, 2].map((i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="selections-panel p-8 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Inbox className="h-6 w-6" />
              </div>
              <p className="text-sm text-foreground/90 font-medium">No selections yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Head to Explore and request details on players you like.
              </p>
              <Button
                size="sm"
                onClick={() => navigate({ to: "/scout/explore" as any })}
                className="mt-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Go to Explore
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {requests.map((r) => (
                <PickCard key={r.id}
                  name={r.player_name ?? "Player"} avatar={r.player_avatar} sport={r.player_sport}
                  status={r.status} open={expanded === r.id} busy={actioning === r.id}
                  onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                  playerId={r.player_id}
                  onView={() => navigate({ to: `/resume/${r.player_id}` as any })}
                  onDetails={r.status === "approved" ? () => setDetailsFor(r) : undefined}
                  onCancel={() => setConfirmRescind(r)}
                  onRetry={() => retry(r)} />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <BottomSheet open={!!detailsFor} onClose={() => setDetailsFor(null)} title={detailsFor?.player_name ?? "Player details"} height="auto">
        {detailsFor && (
          <div className="space-y-3 p-4">
            {detailsFor.player_details ? (
              <>
                <p className="text-[13px] text-muted-foreground">Forwarded by the Cholo Kheli team after approving your request.</p>
                <ul className="ios-group">
                  {detailsFor.player_details.sport && <li className="ios-row"><User className="h-5 w-5 text-primary" /><span className="flex-1 capitalize">{detailsFor.player_details.sport}</span></li>}
                  {detailsFor.player_details.gender && <li className="ios-row"><User className="h-5 w-5 text-primary" /><span className="flex-1">{detailsFor.player_details.gender}</span></li>}
                  {detailsFor.player_details.dob && <li className="ios-row"><Calendar className="h-5 w-5 text-primary" /><span className="flex-1">{new Date(detailsFor.player_details.dob).toLocaleDateString()}</span></li>}
                  {detailsFor.player_details.phone && <li className="ios-row"><Phone className="h-5 w-5 text-primary" /><a href={`tel:${detailsFor.player_details.phone}`} className="flex-1 text-primary">{detailsFor.player_details.phone}</a></li>}
                  {detailsFor.player_details.guardian && <li className="ios-row"><Phone className="h-5 w-5 text-primary" /><span className="flex-1">Guardian: {detailsFor.player_details.guardian}</span></li>}
                </ul>
                {detailsFor.player_details.bio && <p className="rounded-[16px] bg-secondary px-4 py-3 text-[15px] text-muted-foreground">{detailsFor.player_details.bio}</p>}
              </>
            ) : (
              <div className="space-y-3 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-primary" />
                <p className="text-[15px]">Approved. The player's details are on their way.</p>
                <button type="button" disabled={refreshingId === detailsFor.id} onClick={() => manualRefresh(detailsFor.id)}
                  className="press inline-flex h-11 items-center gap-2 rounded-full bg-secondary px-5 text-[15px] font-semibold">
                  {refreshingId === detailsFor.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Check again
                </button>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      <AlertDialog
        open={!!confirmRescind}
        onOpenChange={(v) => !v && setConfirmRescind(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel request?</AlertDialogTitle>
            <AlertDialogDescription>
              Your pending request for {confirmRescind?.player_name} will be removed. You can send
              a new one anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actioning}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRescind && rescind(confirmRescind)}
              disabled={!!actioning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actioning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Cancel request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ScoutSelections;
