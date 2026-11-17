import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark, EyeOff, Flag, Heart, Loader2, MessageCircle, MoreHorizontal, Play, Plus, Search, Send, SlidersHorizontal,
  User as UserIcon, Volume2, VolumeX, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { safeMediaUrl } from "@/lib/sanitize";
import { publicUrl } from "@/lib/publicUrl";
import { haptic } from "@/lib/native";
import { SPORTS, SPORT_LABEL, POSITIONS, ALL_TRAITS, TRAITS, formatCount, isSport, type Sport } from "@/lib/taxonomy";
import StorageVideo from "@/components/StorageVideo";
import ScoutSelectPlayer from "@/components/ScoutSelectPlayer";
import BottomSheet from "@/components/social/BottomSheet";
import CommentsSheet from "@/components/social/CommentsSheet";
import ReportVideoDialog from "@/components/social/ReportVideoDialog";
import { setFollowing } from "@/components/social/FollowButton";

export interface FeedVideo {
  id: string; user_id: string; video_url: string | null; title: string | null; description: string | null;
  position_tags: string[]; trait_tags: string[]; full_name: string; username: string | null; sport: string; avatar_url: string;
  like_count: number; share_count: number; view_count: number; comment_count: number;
  liked_by_me: boolean; following: boolean; comments_enabled: boolean; created_at: string;
}

type Filters = { sport: Sport | null; positions: string[]; traits: string[] };
const NO_FILTERS: Filters = { sport: null, positions: [], traits: [] };
const PAGE = 10;

async function fetchPage(offset: number, f: Filters, q: string, followingOnly: boolean) {
  const { data, error } = await supabase.rpc("get_ranked_feed" as never, {
    _limit: PAGE, _offset: offset, _sport: f.sport,
    _positions: f.positions.length ? f.positions : null,
    _traits: f.traits.length ? f.traits : null,
    _query: q.trim() || null,
    _following_only: followingOnly,
  } as never);
  if (error) throw error;
  return ((data ?? []) as unknown as FeedVideo[]).map((r) => ({
    ...r, position_tags: r.position_tags ?? [], trait_tags: r.trait_tags ?? [],
    like_count: r.like_count ?? 0, share_count: r.share_count ?? 0, view_count: r.view_count ?? 0, comment_count: r.comment_count ?? 0,
  }));
}

/** Records one view with watch time when a reel stops being the active one (deduped server-side). */
function useWatchTracker(videoId: string, active: boolean, userId?: string) {
  const start = useRef<number | null>(null);
  useEffect(() => {
    if (!userId || !active) return;
    start.current = Date.now();
    const flush = () => {
      if (start.current == null) return;
      const ms = Date.now() - start.current;
      start.current = null;
      if (ms < 1500) return;
      supabase.from("video_events").insert({ video_id: videoId, viewer_id: userId, watch_ms: Math.min(ms, 600_000), completed: ms > 15_000 }).then(() => {});
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => { document.removeEventListener("visibilitychange", onHide); flush(); };
  }, [active, videoId, userId]);
}

const RailButton = ({ label, count, onClick, children, active }: { label: string; count?: string; onClick: () => void; children: React.ReactNode; active?: boolean }) => (
  <button type="button" onClick={onClick} aria-label={label} aria-pressed={active} className="press flex flex-col items-center gap-1 text-white">
    <span className="grid h-11 w-11 place-items-center drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">{children}</span>
    {count !== undefined && <span className="text-[12px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{count}</span>}
  </button>
);

const Reel = memo(({ v, active, near, muted, onToggleMute, onLike, onShare, onComments, onMore, onFollow, isScout, userId }: {
  v: FeedVideo; active: boolean; near: boolean; muted: boolean; isScout: boolean; userId?: string;
  onToggleMute: () => void; onLike: (v: FeedVideo, force?: boolean) => void; onShare: (v: FeedVideo) => void;
  onComments: (v: FeedVideo) => void; onMore: (v: FeedVideo) => void; onFollow: (v: FeedVideo) => void;
}) => {
  const ref = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [burst, setBurst] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const lastTap = useRef(0);
  const tapTimer = useRef<number | undefined>(undefined);
  useWatchTracker(v.id, active, userId);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active && !paused) el.play().catch(() => {});
    else el.pause();
    if (!active) { el.currentTime = 0; setPaused(false); setExpanded(false); }
  }, [active, paused, near]);

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      window.clearTimeout(tapTimer.current);
      lastTap.current = 0;
      setBurst((b) => b + 1);
      if (!v.liked_by_me) onLike(v, true);
      haptic("light");
      return;
    }
    lastTap.current = now;
    tapTimer.current = window.setTimeout(() => setPaused((p) => !p), 280);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {v.video_url && near ? (
        <StorageVideo ref={ref} src={v.video_url} className="absolute inset-0 h-full w-full object-cover"
          loop muted={muted} playsInline preload={active ? "auto" : "metadata"}
          onTimeUpdate={(e) => { const t = e.currentTarget; if (t.duration) setProgress(t.currentTime / t.duration); }} />
      ) : (
        <div className="absolute inset-0 grid place-items-center"><Play className="h-14 w-14 text-white/30" /></div>
      )}

      <button type="button" className="absolute inset-0 z-[1]" aria-label={paused ? "Play" : "Pause"} onClick={onTap} />
      <AnimatePresence>
        {paused && active && (
          <motion.div key="p" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-[2] grid place-items-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-black/40 backdrop-blur-sm"><Play className="ml-1 h-8 w-8 fill-white text-white" /></span>
          </motion.div>
        )}
        {burst > 0 && (
          <motion.div key={`b${burst}`} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.15, 1, 1.1] }}
            transition={{ duration: 0.8, times: [0, 0.2, 0.7, 1] }} onAnimationComplete={() => setBurst(0)}
            className="pointer-events-none absolute inset-0 z-[2] grid place-items-center">
            <Heart className="h-28 w-28 fill-white text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)]" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-2/5 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

      <button type="button" onClick={onToggleMute} aria-label={muted ? "Turn sound on" : "Mute"}
        className="press absolute right-3 z-[3] grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md"
        style={{ top: "calc(env(safe-area-inset-top) + 64px)" }}>
        {muted ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}
      </button>

      {/* right rail */}
      <div className="absolute bottom-6 right-2 z-[3] flex flex-col items-center gap-3">
        <div className="relative mb-2">
          <button type="button" onClick={() => navigate({ to: `/resume/${v.user_id}` as never })} aria-label={`${v.full_name}'s profile`}
            className="press block h-11 w-11 overflow-hidden rounded-full border-2 border-white bg-white/20">
            {v.avatar_url
              ? <img src={safeMediaUrl(v.avatar_url)} alt="" className="h-full w-full object-cover" loading="lazy" />
              : <span className="grid h-full w-full place-items-center text-[15px] font-bold text-white">{v.full_name.charAt(0)}</span>}
          </button>
          {!v.following && (
            <button type="button" onClick={() => onFollow(v)} aria-label={isScout ? "Add to watchlist" : `Follow ${v.full_name}`}
              className="press absolute -bottom-2 left-1/2 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full bg-primary text-primary-foreground">
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
          )}
        </div>
        <RailButton label={v.liked_by_me ? "Unlike" : "Like"} active={v.liked_by_me} count={formatCount(v.like_count)} onClick={() => onLike(v)}>
          <Heart className={`h-8 w-8 transition-transform ${v.liked_by_me ? "scale-110 fill-[#FF3B5C] text-[#FF3B5C]" : ""}`} />
        </RailButton>
        <RailButton label="Comments" count={formatCount(v.comment_count)} onClick={() => onComments(v)}>
          <MessageCircle className="h-8 w-8" />
        </RailButton>
        <RailButton label="Share" count={formatCount(v.share_count)} onClick={() => onShare(v)}>
          <Send className="h-7 w-7" />
        </RailButton>
        {isScout && <div className="text-white"><ScoutSelectPlayer playerId={v.user_id} playerName={v.full_name} /></div>}
        <RailButton label="More" onClick={() => onMore(v)}><MoreHorizontal className="h-7 w-7" /></RailButton>
      </div>

      {/* caption */}
      <div className="absolute bottom-5 left-3 right-16 z-[3] text-white">
        <button type="button" onClick={() => navigate({ to: `/resume/${v.user_id}` as never })} className="flex items-center gap-2 text-left">
          <span className="text-[15px] font-semibold drop-shadow">{v.username ? `@${v.username}` : v.full_name}</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] backdrop-blur-sm">{isSport(v.sport) ? SPORT_LABEL[v.sport] : v.sport}</span>
        </button>
        {v.title && <p translate="no" className="mt-1 text-[15px] font-medium leading-snug drop-shadow">{v.title}</p>}
        {v.description && (
          <button type="button" onClick={() => setExpanded((e) => !e)} translate="no" className={`mt-0.5 block text-left text-[14px] leading-snug text-white/90 ${expanded ? "" : "line-clamp-2"}`}>
            {v.description}
          </button>
        )}
        {(v.position_tags.length > 0 || v.trait_tags.length > 0) && (
          <p className="mt-1.5 flex flex-wrap gap-x-2 text-[13px] font-medium text-white/85">
            {[...v.position_tags.slice(0, 2), ...v.trait_tags.slice(0, 3)].map((t) => <span key={t}>#{t.replace(/\s+/g, "")}</span>)}
          </p>
        )}
        <p className="mt-1 text-[12px] text-white/70">{formatCount(v.view_count)} views</p>
      </div>

      {active && <div className="absolute inset-x-0 bottom-0 z-[3] h-[2px] bg-white/20"><div className="h-full bg-white" style={{ width: `${progress * 100}%` }} /></div>}
    </div>
  );
});
Reel.displayName = "Reel";

const Chip = ({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button type="button" aria-pressed={on} onClick={onClick}
    className={`press rounded-full px-3.5 py-1.5 text-[15px] ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>{children}</button>
);

const PlayerVideosTab = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const isScout = role === "scout";

  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "locked">("loading");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [tab, setTab] = useState<"for_you" | "following">("for_you");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [draft, setDraft] = useState<Filters>(NO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [commentsFor, setCommentsFor] = useState<FeedVideo | null>(null);
  const [moreFor, setMoreFor] = useState<FeedVideo | null>(null);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase.from("saved_videos").select("video_id").eq("user_id", user.id).limit(1000)
      .then(({ data }) => setSaved(new Set((data ?? []).map((r) => r.video_id))));
  }, [user?.id]);

  const toggleSave = async (v: FeedVideo) => {
    if (!user) return;
    const on = !saved.has(v.id);
    setSaved((prev) => { const n = new Set(prev); if (on) n.add(v.id); else n.delete(v.id); return n; });
    const { error } = on
      ? await supabase.from("saved_videos").insert({ user_id: user.id, video_id: v.id })
      : await supabase.from("saved_videos").delete().eq("user_id", user.id).eq("video_id", v.id);
    if (error && error.code !== "23505") { toast.error("Couldn't update your saved list"); return; }
    toast.success(on ? "Saved" : "Removed from saved", { description: on ? "Find it under Saved on your profile." : undefined });
  };

  const notInterested = async (v: FeedVideo) => {
    if (!user) return;
    const { error } = await supabase.from("muted_users").insert({ user_id: user.id, muted_id: v.user_id });
    if (error && error.code !== "23505") { toast.error("Couldn't hide this player"); return; }
    setVideos((list) => list.filter((x) => x.user_id !== v.user_id));
    toast.success(`You won't see ${v.full_name}'s highlights`, { description: "Undo this under Settings, Privacy." });
  };

  const scroller = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const busy = useRef(false);
  const generation = useRef(0);

  useEffect(() => { const t = window.setTimeout(() => setDebounced(query), 350); return () => window.clearTimeout(t); }, [query]);

  const loadMore = useCallback(async (reset = false) => {
    if (!user || (busy.current && !reset) || (!reset && !hasMore)) return;
    const gen = reset ? ++generation.current : generation.current;
    busy.current = true;
    if (reset) { offset.current = 0; setStatus("loading"); setHasMore(true); } else setLoadingMore(true);
    try {
      const page = await fetchPage(offset.current, filters, debounced, tab === "following");
      if (gen !== generation.current) return;
      offset.current += PAGE;
      setHasMore(page.length > 0);
      setVideos((prev) => {
        const base = reset ? [] : prev;
        const seen = new Set(base.map((x) => x.id));
        return [...base, ...page.filter((x) => !seen.has(x.id))];
      });
      setStatus("ready");
    } catch (e) {
      if (gen !== generation.current) return;
      const msg = (e as { message?: string }).message ?? "";
      if (msg.includes("scout_not_active")) setStatus("locked");
      else if (msg.includes("rate_limited")) { toast("Slow down a little", { description: "Try again in a minute." }); setStatus((s) => (s === "loading" ? "error" : s)); }
      else setStatus((s) => (s === "loading" ? "error" : s));
    } finally {
      if (gen === generation.current) { busy.current = false; setLoadingMore(false); }
    }
  }, [user, hasMore, filters, debounced, tab]);

  // Reload from the top whenever what we're asking for changes.
  useEffect(() => {
    if (!user) return;
    setVideos([]); setActive(0);
    scroller.current?.scrollTo({ top: 0 });
    loadMore(true);
  }, [user?.id, role, filters, debounced, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Which reel is on screen: the one nearest the scroll position.
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    if (i !== active) setActive(i);
    if (i >= videos.length - 3) loadMore();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (commentsFor || filtersOpen || (e.target as HTMLElement)?.closest("input,textarea")) return;
      const el = scroller.current;
      if (!el) return;
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); el.scrollBy({ top: el.clientHeight, behavior: "smooth" }); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); el.scrollBy({ top: -el.clientHeight, behavior: "smooth" }); }
      if (e.key === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commentsFor, filtersOpen]);

  const patch = (id: string, p: Partial<FeedVideo>) => setVideos((list) => list.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const refreshCounts = async (id: string) => {
    const { data } = await supabase.rpc("get_video_counts" as never, { _video_id: id } as never);
    const row = (data as unknown as Partial<FeedVideo>[] | null)?.[0];
    if (row) patch(id, row);
  };

  const onLike = useCallback(async (v: FeedVideo, force = false) => {
    if (!user) return;
    const next = force ? true : !v.liked_by_me;
    if (next === v.liked_by_me) return;
    patch(v.id, { liked_by_me: next, like_count: Math.max(0, v.like_count + (next ? 1 : -1)) });
    const { error } = next
      ? await supabase.from("video_likes").insert({ video_id: v.id, user_id: user.id })
      : await supabase.from("video_likes").delete().eq("video_id", v.id).eq("user_id", user.id);
    if (error && error.code !== "23505") toast.error("Couldn't save that like");
    refreshCounts(v.id);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const onShare = useCallback(async (v: FeedVideo) => {
    if (!user) return;
    const url = publicUrl(`/resume/${v.user_id}`);
    try {
      if (navigator.share) await navigator.share({ title: `${v.full_name} on Cholo Kheli`, text: v.title ?? undefined, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { return; /* cancelled */ }
    await supabase.from("video_shares").insert({ video_id: v.id, user_id: user.id });
    refreshCounts(v.id);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFollow = useCallback(async (v: FeedVideo) => {
    if (!user) return;
    setVideos((list) => list.map((x) => (x.user_id === v.user_id ? { ...x, following: !v.following } : x)));
    const ok = await setFollowing(user.id, v.user_id, !v.following);
    if (!ok) setVideos((list) => list.map((x) => (x.user_id === v.user_id ? { ...x, following: v.following } : x)));
    else if (!v.following) { haptic("light"); toast.success(isScout ? `${v.full_name} added to your watchlist` : `Following ${v.full_name}`); }
  }, [user, isScout]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);
  const openComments = useCallback((v: FeedVideo) => setCommentsFor(v), []);
  const openMore = useCallback((v: FeedVideo) => setMoreFor(v), []);

  const filterCount = (filters.sport ? 1 : 0) + filters.positions.length + filters.traits.length;
  const draftPositions = draft.sport ? POSITIONS[draft.sport] : SPORTS.flatMap((s) => POSITIONS[s]);
  const draftTraits = draft.sport ? TRAITS[draft.sport] : ALL_TRAITS;
  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const emptyText = useMemo(() => {
    if (debounced.trim()) return { title: "No results", body: `Nothing matches “${debounced.trim()}”.` };
    if (filterCount) return { title: "No highlights match", body: "Try fewer filters." };
    if (tab === "following") return { title: isScout ? "Your watchlist is empty" : "You're not following anyone yet", body: "Tap + on a player's picture to see their new highlights here." };
    return { title: "No highlights yet", body: "Check back soon, new players upload every day." };
  }, [debounced, filterCount, tab, isScout]);

  return (
    <div className="fixed inset-x-0 top-0 z-[35] mx-auto w-full max-w-[430px] bg-black md:rounded-b-[28px] md:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
      style={{ bottom: "calc(52px + env(safe-area-inset-bottom))" }}>
      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/60 to-transparent px-3 pb-6" style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
        {searchOpen ? (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
              <label htmlFor="feed-search" className="sr-only">Search players and highlights</label>
              <input id="feed-search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Players, positions, skills"
                className="h-10 w-full rounded-full bg-white/15 pl-9 pr-3 text-[16px] text-white placeholder:text-white/60 outline-none backdrop-blur-md focus:ring-2 focus:ring-white/40" />
            </div>
            <button type="button" onClick={() => { setSearchOpen(false); setQuery(""); }} className="press px-2 text-[16px] font-medium text-white">Cancel</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search" className="press grid h-10 w-10 place-items-center text-white"><Search className="h-[22px] w-[22px]" /></button>
            <div className="flex items-center gap-5" role="tablist" aria-label="Feed">
              {([["for_you", "For you"], ["following", isScout ? "Watchlist" : "Following"]] as const).map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`press relative pb-1 text-[16px] font-semibold ${tab === k ? "text-white" : "text-white/60"}`}>
                  {label}
                  {tab === k && <motion.span layoutId="feed-tab" className="absolute inset-x-1 -bottom-0.5 h-[2px] rounded-full bg-white" />}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { setDraft(filters); setFiltersOpen(true); }} aria-label={filterCount ? `Filters, ${filterCount} on` : "Filters"}
              className="press relative grid h-10 w-10 place-items-center text-white">
              <SlidersHorizontal className="h-[22px] w-[22px]" />
              {filterCount > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{filterCount}</span>}
            </button>
          </div>
        )}
      </div>

      {status === "loading" && <div className="absolute inset-0 grid place-items-center"><Loader2 className="h-7 w-7 animate-spin text-white/70" /></div>}
      {status === "locked" && (
        <div className="absolute inset-0 grid place-items-center px-8 text-center text-white">
          <div><p className="title-3">Explore opens after verification</p><p className="mt-2 text-[15px] text-white/70">An admin is reviewing your scout documents. You'll get a notification when you're approved.</p>
            <button type="button" onClick={() => navigate({ to: "/scout/settings/verification" as never })} className="press mt-5 h-11 rounded-full bg-white px-5 text-[15px] font-semibold text-black">Check verification</button></div>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center px-8 text-center text-white">
          <div><p className="title-3">Couldn't load highlights</p><p className="mt-2 text-[15px] text-white/70">Check your connection.</p>
            <button type="button" onClick={() => loadMore(true)} className="press mt-5 h-11 rounded-full bg-white px-5 text-[15px] font-semibold text-black">Try again</button></div>
        </div>
      )}
      {status === "ready" && videos.length === 0 && (
        <div className="absolute inset-0 grid place-items-center px-8 text-center text-white">
          <div><p className="title-3">{emptyText.title}</p><p className="mt-2 text-[15px] text-white/70">{emptyText.body}</p>
            {(filterCount > 0 || debounced) && <button type="button" onClick={() => { setFilters(NO_FILTERS); setQuery(""); }} className="press mt-5 h-11 rounded-full bg-white px-5 text-[15px] font-semibold text-black">Clear search and filters</button>}
            {tab === "following" && !filterCount && !debounced && <button type="button" onClick={() => setTab("for_you")} className="press mt-5 h-11 rounded-full bg-white px-5 text-[15px] font-semibold text-black">Browse For you</button>}
          </div>
        </div>
      )}

      <div ref={scroller} onScroll={onScroll}
        className="h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {videos.map((v, i) => (
          <div key={v.id} className="h-full w-full snap-start snap-always">
            <Reel v={v} active={i === active} near={Math.abs(i - active) <= 1} muted={muted} isScout={isScout} userId={user?.id}
              onToggleMute={toggleMute} onLike={onLike} onShare={onShare} onComments={openComments} onMore={openMore} onFollow={onFollow} />
          </div>
        ))}
        {loadingMore && <div className="grid h-24 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-white/60" /></div>}
      </div>

      {/* filters */}
      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" height="78dvh">
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
            <section>
              <h3 className="ios-group-label !px-0">Sport</h3>
              <div className="flex flex-wrap gap-2">
                <Chip on={!draft.sport} onClick={() => setDraft({ ...draft, sport: null, positions: [], traits: [] })}>Any</Chip>
                {SPORTS.map((s) => <Chip key={s} on={draft.sport === s} onClick={() => setDraft({ sport: s, positions: [], traits: [] })}>{SPORT_LABEL[s]}</Chip>)}
              </div>
            </section>
            <section>
              <h3 className="ios-group-label !px-0">Position</h3>
              <div className="flex flex-wrap gap-2">
                {draftPositions.map((p) => <Chip key={p} on={draft.positions.includes(p)} onClick={() => setDraft({ ...draft, positions: toggleIn(draft.positions, p) })}>{p}</Chip>)}
              </div>
            </section>
            <section>
              <h3 className="ios-group-label !px-0">Shows</h3>
              <div className="flex flex-wrap gap-2">
                {draftTraits.map((t) => <Chip key={t} on={draft.traits.includes(t)} onClick={() => setDraft({ ...draft, traits: toggleIn(draft.traits, t) })}>{t}</Chip>)}
              </div>
            </section>
          </div>
          <div className="flex shrink-0 gap-2 border-t border-border/70 p-3">
            <button type="button" onClick={() => setDraft(NO_FILTERS)} className="press h-12 flex-1 rounded-full bg-secondary text-[16px] font-semibold">Clear</button>
            <button type="button" onClick={() => { setFilters(draft); setFiltersOpen(false); }} className="press h-12 flex-[2] rounded-full bg-primary text-[16px] font-semibold text-primary-foreground">Show highlights</button>
          </div>
        </div>
      </BottomSheet>

      {/* more actions */}
      <BottomSheet open={!!moreFor} onClose={() => setMoreFor(null)} title={moreFor?.full_name ?? ""} height="auto">
        {moreFor && (
          <div className="ios-group m-3">
            <button type="button" className="ios-row w-full text-left text-[16px]" onClick={() => { const id = moreFor.user_id; setMoreFor(null); navigate({ to: `/resume/${id}` as never }); }}>
              <UserIcon className="h-5 w-5 text-primary" /> <span className="flex-1">View profile</span>
            </button>
            <button type="button" className="ios-row w-full text-left text-[16px]" onClick={() => { onFollow(moreFor); setMoreFor(null); }}>
              {moreFor.following ? <X className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
              <span className="flex-1">{moreFor.following ? (isScout ? "Remove from watchlist" : "Unfollow") : (isScout ? "Add to watchlist" : "Follow")}</span>
            </button>
            <button type="button" className="ios-row w-full text-left text-[16px]" onClick={() => { toggleSave(moreFor); setMoreFor(null); }}>
              <Bookmark className={`h-5 w-5 text-primary ${saved.has(moreFor.id) ? "fill-primary" : ""}`} /> <span className="flex-1">{saved.has(moreFor.id) ? "Remove from saved" : "Save"}</span>
            </button>
            <button type="button" className="ios-row w-full text-left text-[16px]" onClick={() => { onShare(moreFor); setMoreFor(null); }}>
              <Send className="h-5 w-5 text-primary" /> <span className="flex-1">Share</span>
            </button>
            <button type="button" className="ios-row w-full text-left text-[16px]" onClick={() => { notInterested(moreFor); setMoreFor(null); }}>
              <EyeOff className="h-5 w-5 text-primary" /> <span className="flex-1">Not interested</span>
            </button>
            <button type="button" className="ios-row w-full text-left text-[16px] text-destructive" onClick={() => { setReportFor(moreFor.id); setMoreFor(null); }}>
              <Flag className="h-5 w-5" /> <span className="flex-1">Report</span>
            </button>
          </div>
        )}
      </BottomSheet>

      {commentsFor && (
        <CommentsSheet open onClose={() => setCommentsFor(null)} videoId={commentsFor.id} videoOwnerId={commentsFor.user_id}
          enabled={commentsFor.comments_enabled}
          onCountChange={(d) => setVideos((list) => list.map((x) => (x.id === commentsFor.id ? { ...x, comment_count: Math.max(0, x.comment_count + d) } : x)))} />
      )}
      {reportFor && <ReportVideoDialog videoId={reportFor} open onOpenChange={(o) => !o && setReportFor(null)} />}
    </div>
  );
};

export default PlayerVideosTab;
