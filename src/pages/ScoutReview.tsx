import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Loader2, Send, SkipForward, Star, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StorageVideo from "@/components/StorageVideo";

type QueueItem = {
  video_id: string; video_url: string; title: string; description: string; position_tags: string[];
  created_at: string; player_id: string; player_name: string; sport: string | null;
};
type Stats = { reviews: number; forwarded: number; today: number };

/**
 * Step one of scouting. Intermediate scouts watch each new highlight once, rate it,
 * and forward the promising ones to professional scouts.
 */
const ScoutReview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [mySport, setMySport] = useState<string | null>(null);
  const [onlyMySport, setOnlyMySport] = useState(false);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<Stats>({ reviews: 0, forwarded: 0, today: 0 });

  const loadStats = useCallback(async () => {
    const { data } = await (supabase as any).rpc("get_reviewer_stats", { _since: null });
    const mine = (data ?? []).find((r: any) => r.reviewer_id === user?.id);
    if (mine) setStats({ reviews: mine.reviews, forwarded: mine.forwarded, today: mine.today });
  }, [user?.id]);

  const loadQueue = useCallback(async (sport: string | null) => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_review_queue", { _limit: 10, _sport: sport });
    if (error) {
      if (error.code === "42501") setDenied(true);
      else toast({ title: "Couldn't load the queue", description: error.message, variant: "destructive" });
      setQueue([]);
    } else {
      setQueue(data ?? []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("scout_profiles").select("preferred_sport").eq("user_id", user.id).maybeSingle();
      setMySport((data as any)?.preferred_sport ?? null);
    })();
    loadQueue(null);
    loadStats();
  }, [user, loadQueue, loadStats]);

  const current = queue[0];

  const submit = async (decision: "forward" | "pass") => {
    if (!current || busy) return;
    if (rating < 1) { toast({ title: "Pick a rating first", description: "Give the highlight 1 to 5 stars." }); return; }
    setBusy(true);
    const { error } = await (supabase as any).rpc("submit_video_review", {
      _video_id: current.video_id, _rating: rating, _decision: decision, _notes: notes.trim(),
    });
    setBusy(false);
    if (error) { toast({ title: "Review not saved", description: error.message, variant: "destructive" }); return; }
    toast({ title: decision === "forward" ? "Forwarded to professional scouts" : "Review saved" });
    setRating(0); setNotes("");
    setStats((s) => ({ reviews: s.reviews + 1, today: s.today + 1, forwarded: s.forwarded + (decision === "forward" ? 1 : 0) }));
    const rest = queue.slice(1);
    setQueue(rest);
    if (rest.length < 2) loadQueue(onlyMySport ? mySport : null);
  };

  const toggleSport = () => {
    const next = !onlyMySport;
    setOnlyMySport(next);
    loadQueue(next ? mySport : null);
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4" data-testid="review-page">
      <div className="mb-4">
        <p className="text-[11px] text-muted-foreground">Step 1 of 2</p>
        <h1 className="font-display text-2xl text-foreground mt-1 flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6" /> Review queue
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Watch each highlight, rate it, and forward the best to professional scouts.</p>
      </div>

      {denied ? (
        <div className="ios-group px-4 py-6 text-center" data-testid="review-denied">
          <p className="text-[15px] font-semibold">This page is for intermediate scouts</p>
          <p className="text-sm text-muted-foreground mt-1">Professional scouts see the forwarded highlights under Recommended.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="ios-group px-3 py-3 text-center"><p className="text-xl font-semibold" data-testid="review-today">{stats.today}</p><p className="text-[11px] text-muted-foreground">Today</p></div>
            <div className="ios-group px-3 py-3 text-center"><p className="text-xl font-semibold">{stats.reviews}</p><p className="text-[11px] text-muted-foreground">This month</p></div>
            <div className="ios-group px-3 py-3 text-center"><p className="text-xl font-semibold">{stats.forwarded}</p><p className="text-[11px] text-muted-foreground">Forwarded</p></div>
          </div>

          {mySport && (
            <button type="button" onClick={toggleSport} className="press mb-3 rounded-full bg-secondary px-3 py-1.5 text-[13px] font-medium" data-testid="review-sport-toggle">
              {onlyMySport ? "Showing my sport only" : "Showing all sports"}
            </button>
          )}

          {loading ? (
            <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
          ) : !current ? (
            <div className="py-16 text-center" data-testid="review-empty">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No highlights are waiting. New uploads will appear here.</p>
            </div>
          ) : (
            <div className="apple-glass glass-card rounded-2xl p-4 space-y-4" data-testid="review-card" data-video={current.video_id}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted grid place-items-center"><User className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="font-semibold truncate" translate="no">{current.player_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{current.sport ?? "Sport not set"}</p>
                </div>
              </div>
              <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-xl bg-black aspect-[9/16]">
                <StorageVideo key={current.video_id} src={current.video_url} controls playsInline className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="font-semibold" translate="no">{current.title}</p>
                {current.description && <p className="text-sm text-muted-foreground mt-1" translate="no">{current.description}</p>}
              </div>

              <div>
                <p className="text-[13px] font-medium mb-2">Your rating</p>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`}
                      onClick={() => setRating(n)} className="press p-1" data-testid={`review-star-${n}`}>
                      <Star className={`h-8 w-8 ${n <= rating ? "fill-[#F2C98A] text-[#F2C98A]" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[13px] font-medium mb-2">Note for professional scouts (optional)</p>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))} rows={3}
                  placeholder="What stood out: technique, speed, decisions" data-testid="review-notes" />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-full" disabled={busy} onClick={() => submit("pass")} data-testid="review-pass">
                  <SkipForward className="h-4 w-4 mr-1" /> Pass
                </Button>
                <Button className="flex-[1.6] rounded-full" disabled={busy} onClick={() => submit("forward")} data-testid="review-forward">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" /> Forward to professionals</>}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ScoutReview;
