import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, Sparkles, Star, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import StorageVideo from "@/components/StorageVideo";
import ScoutSelectPlayer from "@/components/ScoutSelectPlayer";

type Rec = {
  video_id: string; video_url: string; title: string; description: string; created_at: string;
  player_id: string; player_name: string; sport: string | null;
  avg_rating: number; forward_count: number; review_count: number; latest_note: string | null;
};
const PAGE = 20;

/**
 * Step two of scouting. Professional scouts see only highlights that intermediate scouts forwarded,
 * best rated first, and request the players they want to call for trials.
 */
const ScoutRecommended = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [denied, setDenied] = useState(false);
  const [mySport, setMySport] = useState<string | null>(null);
  const [onlyMySport, setOnlyMySport] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);

  const load = useCallback(async (sport: string | null, offset: number) => {
    if (offset === 0) setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_recommended_videos", { _limit: PAGE, _offset: offset, _sport: sport });
    if (error) {
      if (error.code === "42501") setDenied(true);
      else toast({ title: "Couldn't load recommendations", description: error.message, variant: "destructive" });
    } else {
      setRows((r) => (offset === 0 ? data ?? [] : [...r, ...(data ?? [])]));
      setMore((data ?? []).length === PAGE);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("scout_profiles").select("preferred_sport").eq("user_id", user.id).maybeSingle();
      setMySport((data as any)?.preferred_sport ?? null);
    })();
    load(null, 0);
  }, [user, load]);

  const toggleSport = () => {
    const next = !onlyMySport;
    setOnlyMySport(next);
    load(next ? mySport : null, 0);
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4" data-testid="recommended-page">
      <div className="mb-4">
        <p className="text-[11px] text-muted-foreground">Step 2 of 2</p>
        <h1 className="font-display text-2xl text-foreground mt-1 flex items-center gap-2">
          <Sparkles className="h-6 w-6" /> Recommended
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Highlights that intermediate scouts watched, rated and forwarded to you.</p>
      </div>

      {denied ? (
        <div className="ios-group px-4 py-6 text-center" data-testid="recommended-denied">
          <p className="text-[15px] font-semibold">This page is for professional scouts</p>
          <p className="text-sm text-muted-foreground mt-1">Intermediate scouts review new highlights in the Review queue.</p>
        </div>
      ) : (
        <>
          {mySport && (
            <button type="button" onClick={toggleSport} className="press mb-3 rounded-full bg-secondary px-3 py-1.5 text-[13px] font-medium">
              {onlyMySport ? "Showing my sport only" : "Showing all sports"}
            </button>
          )}
          {loading ? (
            <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center" data-testid="recommended-empty">
              <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nothing forwarded yet. Highlights appear here once reviewers recommend them.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.video_id} className="apple-glass glass-card rounded-2xl p-4 space-y-3" data-testid="recommended-row" data-video={r.video_id}>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted grid place-items-center"><User className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" translate="no">{r.player_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{r.sport ?? "Sport not set"}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-[#F2C98A]/25 px-2.5 py-1" aria-label="Average rating">
                      <Star className="h-4 w-4 fill-[#F2C98A] text-[#F2C98A]" />
                      <span className="text-[14px] font-semibold">{Number(r.avg_rating).toFixed(1)}</span>
                    </div>
                  </div>
                  {playing === r.video_id ? (
                    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-xl bg-black aspect-[9/16]">
                      <StorageVideo src={r.video_url} controls autoPlay playsInline className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <button type="button" onClick={() => setPlaying(r.video_id)} className="press w-full rounded-xl bg-secondary px-4 py-3 text-left">
                      <p className="font-semibold" translate="no">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Tap to watch</p>
                    </button>
                  )}
                  {r.latest_note && (
                    <p className="text-sm text-foreground/80 bg-muted/50 rounded-xl p-3 border border-border" translate="no">"{r.latest_note}"</p>
                  )}
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <span>Reviewers who forwarded</span><span className="font-semibold text-foreground">{r.forward_count}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/resume/${r.player_id}` as any} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full rounded-full text-xs"><ExternalLink className="h-3 w-3 mr-1" /> View profile</Button>
                    </Link>
                    <ScoutSelectPlayer playerId={r.player_id} playerName={r.player_name} />
                  </div>
                </div>
              ))}
              {more && (
                <Button variant="outline" className="w-full rounded-full" onClick={() => load(onlyMySport ? mySport : null, rows.length)}>Load more</Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ScoutRecommended;
