import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Play, Eye, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import ScoutSelectPlayer from "@/components/ScoutSelectPlayer";

interface PlayerCard {
  id: string;
  user_id: string;
  full_name: string;
  sport: string;
  video_url: string | null;
  position_tags: string[];
  trait_tags: string[];
  avatar_url: string;
}

const ScoutExplore = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCard | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth?role=scout" as any });
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    const fetchPlayers = async () => {
      const { data: videos } = await supabase
        .from("videos")
        .select("id, user_id, video_url, position_tags, trait_tags")
        .eq("status", "live" as any);

      if (!videos || videos.length === 0) { setLoading(false); return; }

      const userIds = [...new Set(videos.map((v) => v.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, sport, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [
        p.user_id,
        { full_name: p.full_name, sport: p.sport || "football", avatar_url: p.avatar_url || "" },
      ]));

      setPlayers(videos
        .filter((v) => profileMap.has(v.user_id))
        .map((v) => ({
          id: v.id,
          user_id: v.user_id,
          video_url: v.video_url,
          position_tags: v.position_tags || [],
          trait_tags: v.trait_tags || [],
          full_name: profileMap.get(v.user_id)?.full_name || "",
          sport: profileMap.get(v.user_id)?.sport || "football",
          avatar_url: profileMap.get(v.user_id)?.avatar_url || "",
        }))
        .filter((p) => p.full_name && p.full_name !== "Unknown")
      );
      setLoading(false);
    };
    fetchPlayers();
  }, [user]);

  const filtered = players.filter((p) => {
    const matchSearch = !search || p.full_name.toLowerCase().includes(search.toLowerCase()) || p.position_tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchSport = !sportFilter || p.sport === sportFilter;
    return matchSearch && matchSport;
  });

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="container max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
          <div className="mb-5">
            <h1 className="font-display text-3xl text-foreground">EXPLORE TALENT</h1>
            <p className="text-sm text-muted-foreground">Discover talented players across Bangladesh</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or position..." className="pl-10 bg-card border-border rounded-full" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              {["football", "cricket"].map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => setSportFilter(sportFilter === s ? null : s)}
                  className={`border-border text-muted-foreground hover:border-primary/40 rounded-full capitalize ${sportFilter === s ? "border-primary text-primary bg-primary/10" : ""}`}>
                  <Filter className="h-3 w-3 mr-1" /> {s}
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No players found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
              {filtered.map((player, i) => (
                <motion.div key={player.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                  className="relative aspect-square bg-secondary overflow-hidden group cursor-pointer"
                  onClick={() => setSelectedPlayer(player)}
                >
                  {player.video_url ? (
                    <video src={player.video_url} className="w-full h-full object-cover" muted />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <p className="text-foreground font-semibold text-sm">{player.full_name}</p>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-foreground" />
                      <span className="text-foreground text-xs">View</span>
                    </div>
                  </div>
                  <Badge className="absolute top-2 left-2 bg-background/70 text-foreground border-0 text-[10px] backdrop-blur-sm">{player.sport}</Badge>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Player detail modal */}
      <AnimatePresence>
        {selectedPlayer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedPlayer(null)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded-2xl overflow-hidden max-w-lg w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <div className="w-9 h-9 rounded-full bg-secondary overflow-hidden border border-border">
                  {selectedPlayer.avatar_url ? (
                    <img src={selectedPlayer.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">{selectedPlayer.full_name.charAt(0)}</div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedPlayer.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedPlayer.sport}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <ScoutSelectPlayer playerId={selectedPlayer.user_id} playerName={selectedPlayer.full_name} />
                  <button onClick={() => setSelectedPlayer(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
              </div>
              <div className="aspect-video bg-secondary">
                {selectedPlayer.video_url ? (
                  <video src={selectedPlayer.video_url} className="w-full h-full object-cover" controls autoPlay muted />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Play className="h-12 w-12 text-muted-foreground" /></div>
                )}
              </div>
              <div className="p-4 space-y-3 overflow-y-auto">
                <div className="flex flex-wrap gap-1.5">
                  {selectedPlayer.position_tags.map((t) => <Badge key={t} variant="outline" className="text-xs border-primary/30 text-primary rounded-full">{t}</Badge>)}
                  {selectedPlayer.trait_tags.map((t) => <Badge key={t} variant="outline" className="text-xs border-border text-muted-foreground rounded-full">{t}</Badge>)}
                </div>
                <Button variant="outline" size="sm" onClick={() => { setSelectedPlayer(null); navigate({ to: `/resume/${selectedPlayer.user_id}` as any }); }}
                  className="text-primary border-primary/30 rounded-full text-xs">
                  View Full Profile →
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScoutExplore;
