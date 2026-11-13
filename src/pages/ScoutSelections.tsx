import { useCallback, useEffect, useState } from "react";
import MessageButton from "@/pages/messages/MessageButton";
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
    <div className="min-h-screen pt-16 pb-24">
      <div className="container max-w-2xl">
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
            <div className="space-y-3">
              {requests.map((r) => {
                const meta = statusMeta(r.status);
                const StatusIcon = meta.Icon;
                const open = expanded === r.id;
                const busy = actioning === r.id;
                return (
                  <motion.div key={r.id} layout className="selections-panel">
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : r.id)}
                      aria-expanded={open}
                      className="w-full grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-border shrink-0">
                        {r.player_avatar ? (
                          <img
                            src={safeMediaUrl(r.player_avatar)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
                            {r.player_name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{r.player_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {new Date(r.created_at).toLocaleDateString()}
                          {r.notes ? ` • ${r.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={meta.className}>
                          <StatusIcon className="h-3 w-3" />
                          {meta.label}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="overflow-hidden border-t border-border/60"
                        >
                          <div className="p-4 space-y-3 bg-muted/20">
                            {r.status === "approved" && (
                              <MessageButton otherId={r.player_id}
                                className="press flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-primary-foreground" />
                            )}
                            {r.status === "approved" && r.player_details ? (
                              <>
                                <p className="text-[10px] text-muted-foreground   font-semibold">
                                  Player details (forwarded by admin)
                                </p>
                                <div className="flex items-center gap-3">
                                  {r.player_details.avatar_url && (
                                    <img
                                      src={safeMediaUrl(r.player_details.avatar_url)}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-semibold text-foreground text-sm truncate">
                                      {r.player_details.player_name || r.player_name}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground capitalize truncate">
                                      {r.player_details.sport || r.player_sport}
                                    </p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                  {r.player_details.gender && (
                                    <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                                      <User className="h-3 w-3 text-primary shrink-0" />
                                      <span className="truncate">{r.player_details.gender}</span>
                                    </div>
                                  )}
                                  {r.player_details.dob && (
                                    <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                                      <Calendar className="h-3 w-3 text-primary shrink-0" />
                                      <span className="truncate">
                                        {new Date(r.player_details.dob).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                  {r.player_details.phone && (
                                    <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                                      <Phone className="h-3 w-3 text-primary shrink-0" />
                                      <span className="truncate">{r.player_details.phone}</span>
                                    </div>
                                  )}
                                  {r.player_details.guardian && (
                                    <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                                      <Phone className="h-3 w-3 text-primary shrink-0" />
                                      <span className="truncate">
                                        Guardian: {r.player_details.guardian}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {r.player_details.bio && (
                                  <p className="text-sm text-muted-foreground italic">
                                    "{r.player_details.bio}"
                                  </p>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    navigate({ to: `/resume/${r.player_id}` as any })
                                  }
                                  className="text-primary border-primary/30 rounded-full text-xs"
                                >
                                  View full profile →
                                </Button>
                              </>
                            ) : r.status === "approved" ? (
                              <div className="py-3 space-y-3">
                                <p className="text-[10px] text-muted-foreground   font-semibold">
                                  Player details (forwarded by admin)
                                </p>
                                <div className="flex items-start gap-3">
                                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary shrink-0">
                                    <Sparkles className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground">
                                      Approved — preparing details
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      The admin approved your request. The player's contact
                                      details will land here in a moment.
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2" aria-hidden="true">
                                  <div className="h-3 w-1/2 sk-shimmer rounded" />
                                  <div className="h-3 w-2/3 sk-shimmer rounded" />
                                  <div className="h-3 w-1/3 sk-shimmer rounded" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={refreshingId === r.id}
                                    onClick={() => manualRefresh(r.id)}
                                    className="rounded-full text-xs border-border"
                                  >
                                    {refreshingId === r.id ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                    )}
                                    Check again
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      navigate({ to: `/resume/${r.player_id}` as any })
                                    }
                                    className="rounded-full text-xs text-primary hover:text-primary"
                                  >
                                    View public profile →
                                  </Button>
                                </div>
                              </div>
                            ) : r.status === "pending" ? (
                              <div className="space-y-3">
                                <p className="text-sm text-muted-foreground text-center py-1">
                                  Awaiting admin review. Details will appear here once approved.
                                </p>
                                <div className="flex justify-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => setConfirmRescind(r)}
                                    className="rounded-full text-xs border-border text-muted-foreground hover:text-destructive hover:border-destructive/40"
                                  >
                                    {busy ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <X className="h-3 w-3 mr-1" />
                                    )}
                                    Rescind request
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <p className="text-sm text-muted-foreground text-center py-1">
                                  {r.admin_response ||
                                    "This request was not approved by the admin."}
                                </p>
                                <div className="flex justify-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => retry(r)}
                                    className="rounded-full text-xs border-border hover:border-primary/40 hover:text-primary"
                                  >
                                    {busy ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <RotateCcw className="h-3 w-3 mr-1" />
                                    )}
                                    Retry
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <AlertDialog
        open={!!confirmRescind}
        onOpenChange={(v) => !v && setConfirmRescind(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rescind request?</AlertDialogTitle>
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
              Rescind
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ScoutSelections;
