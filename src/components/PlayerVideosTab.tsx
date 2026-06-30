import { useState, useEffect, useRef } from "react";
import { Play, Loader2, Search, UserPlus, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import ScoutSelectPlayer from "@/components/ScoutSelectPlayer";
import { safeMediaUrl } from "@/lib/sanitize";

interface PlayerVideo {
  id: string;
  user_id: string;
  video_url: string | null;
  description: string | null;
  position_tags: string[];
  trait_tags: string[];
  full_name: string;
  sport: string;
  avatar_url: string;
}

// ──────────────────────────────────────────────────────────────
// Reel item — full-screen slide with overlay
// ──────────────────────────────────────────────────────────────
const ReelItem = ({
  video,
  isActive,
  isScout,
}: {
  video: PlayerVideo;
  isActive: boolean;
  isScout: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isActive]);

  return (
    <div className="relative w-full h-full bg-black snap-start snap-always flex-shrink-0">
      {video.video_url ? (
        <video
          ref={videoRef}
          src={safeMediaUrl(video.video_url)}
          className="w-full h-full object-cover"
          loop
          muted
          playsInline
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Play className="h-16 w-16 text-white/40" />
        </div>
      )}

      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

      {/* Player info — bottom left */}
      <div className="absolute bottom-20 left-4 right-16 pointer-events-none">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden border border-white/30 pointer-events-none">
            {video.avatar_url ? (
              <img src={safeMediaUrl(video.avatar_url)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                {video.full_name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight drop-shadow">{video.full_name}</p>
            <p className="text-white/70 text-xs">{video.sport}</p>
          </div>
        </div>
        {video.description && (
          <p className="text-white/80 text-xs leading-relaxed line-clamp-2">{video.description}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {video.position_tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5 backdrop-blur-sm">{t}</span>
          ))}
        </div>
      </div>

      {/* Right side action buttons */}
      <div className="absolute bottom-20 right-3 flex flex-col items-center gap-4 pointer-events-auto">
        {/* View profile */}
        <button
          onClick={() => navigate({ to: `/resume/${video.user_id}` as any })}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-white/80 text-[10px]">Profile</span>
        </button>

        {/* Scout select button */}
        {isScout && (
          <div className="flex flex-col items-center gap-1">
            <ScoutSelectPlayer playerId={video.user_id} playerName={video.full_name} />
          </div>
        )}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────
const PlayerVideosTab = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<PlayerVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<PlayerVideo | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data: vids } = await supabase
        .from("videos")
        .select("id, user_id, video_url, description, position_tags, trait_tags")
        .eq("status", "live" as any);

      if (!vids || vids.length === 0) { setVideos([]); setLoading(false); return; }

      const filtered = role === "player" ? vids.filter((v) => v.user_id !== user?.id) : vids;
      const userIds = [...new Set(filtered.map((v) => v.user_id))];

      let profileMap = new Map<string, { full_name: string; sport: string; avatar_url: string }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, sport, avatar_url")
          .in("user_id", userIds);
        (profiles || []).forEach((p) =>
          profileMap.set(p.user_id, {
            full_name: p.full_name,
            sport: p.sport || "football",
            avatar_url: p.avatar_url || "",
          })
        );
      }

      setVideos(
        filtered
          .filter((v) => profileMap.has(v.user_id))
          .map((v) => ({
            ...v,
            position_tags: v.position_tags || [],
            trait_tags: v.trait_tags || [],
            full_name: profileMap.get(v.user_id)?.full_name || "Unknown",
            sport: profileMap.get(v.user_id)?.sport || "football",
            avatar_url: profileMap.get(v.user_id)?.avatar_url || "",
          }))
          .filter((v) => v.full_name && v.full_name !== "Unknown")
      );
      setLoading(false);
    };
    fetchVideos();
  }, [user, role]);

  // Track active reel on scroll
  useEffect(() => {
    if (!mobile || !containerRef.current) return;
    const el = containerRef.current;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setActiveIndex(idx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [mobile, videos]);

  const filteredVideos = videos.filter((v) =>
    !search ||
    v.full_name.toLowerCase().includes(search.toLowerCase()) ||
    v.position_tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const scrollTo = (dir: "up" | "down") => {
    if (!containerRef.current) return;
    const h = containerRef.current.clientHeight;
    containerRef.current.scrollBy({ top: dir === "down" ? h : -h, behavior: "smooth" });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // ── MOBILE: Reels/TikTok-style ──────────────────────────────
  if (mobile) {
    if (filteredVideos.length === 0)
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-3">
          <p className="text-muted-foreground text-sm">No player videos available yet.</p>
        </div>
      );

    return (
      <div className="fixed inset-0 top-0 bg-black z-40">
        {/* Search bar overlaid at top */}
        <div className="absolute top-0 left-0 right-0 z-50 px-4 pt-safe-top" style={{ paddingTop: "env(safe-area-inset-top, 16px)" }}>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <Input
              placeholder="Search players, positions..."
              className="pl-10 bg-black/40 border-white/20 text-white placeholder:text-white/50 rounded-full backdrop-blur-md"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Reel scroll container */}
        <div
          ref={containerRef}
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {filteredVideos.map((v, i) => (
            <div key={v.id} className="w-full snap-start snap-always" style={{ height: "100dvh" }}>
              <ReelItem video={v} isActive={i === activeIndex} isScout={role === "scout"} />
            </div>
          ))}
        </div>

        {/* Scroll hint arrows */}
        {activeIndex > 0 && (
          <button onClick={() => scrollTo("up")} className="absolute top-20 right-4 z-50 text-white/60 hover:text-white">
            <ChevronUp className="h-6 w-6" />
          </button>
        )}
        {activeIndex < filteredVideos.length - 1 && (
          <button onClick={() => scrollTo("down")} className="absolute bottom-24 right-4 z-50 text-white/60 hover:text-white animate-bounce">
            <ChevronDown className="h-6 w-6" />
          </button>
        )}
      </div>
    );
  }

  // ── DESKTOP: Grid view ───────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search players, positions..."
          className="pl-10 bg-card border-border rounded-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredVideos.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No player videos available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
          {filteredVideos.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="relative aspect-square bg-secondary overflow-hidden cursor-pointer group"
              onClick={() => setSelectedVideo(v)}
            >
              {v.video_url ? (
                <video src={safeMediaUrl(v.video_url)} className="w-full h-full object-cover" muted />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {/* Hover overlay with name */}
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end justify-end p-3 gap-2">
                <p className="text-foreground font-semibold text-sm w-full">{v.full_name}</p>
              </div>
              {/* Sport badge */}
              <Badge className="absolute top-2 left-2 bg-background/70 text-foreground border-0 text-[10px] backdrop-blur-sm">
                {v.sport}
              </Badge>
              {/* Player name at bottom left always visible */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pointer-events-none">
                <p className="text-white text-xs font-medium truncate">{v.full_name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Video detail modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl overflow-hidden max-w-lg w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <div className="w-9 h-9 rounded-full bg-secondary overflow-hidden border border-border">
                  {selectedVideo.avatar_url ? (
                    <img src={safeMediaUrl(selectedVideo.avatar_url)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
                      {selectedVideo.full_name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedVideo.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedVideo.sport}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {role === "scout" && (
                    <ScoutSelectPlayer playerId={selectedVideo.user_id} playerName={selectedVideo.full_name} />
                  )}
                  <button onClick={() => setSelectedVideo(null)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
                </div>
              </div>

              <div className="aspect-video bg-secondary">
                {selectedVideo.video_url ? (
                  <video src={safeMediaUrl(selectedVideo.video_url)} className="w-full h-full object-cover" controls autoPlay muted />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3 overflow-y-auto">
                <button
                  onClick={() => navigate({ to: `/resume/${selectedVideo.user_id}` as any })}
                  className="text-sm text-primary font-medium hover:underline"
                >
                  View Full Profile →
                </button>
                {selectedVideo.description && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground mr-1">{selectedVideo.full_name}</span>
                    {selectedVideo.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {selectedVideo.position_tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs border-primary/30 text-primary rounded-full">{t}</Badge>
                  ))}
                  {selectedVideo.trait_tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs border-border text-muted-foreground rounded-full">{t}</Badge>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlayerVideosTab;
