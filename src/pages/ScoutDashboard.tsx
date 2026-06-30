import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Play, ShieldCheck, ShieldAlert, Loader2, User, ClipboardList, Eye, Phone, Calendar, MessageSquare, X } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import ProfileTab from "@/components/ProfileTab";
import ScoutSelectPlayer from "@/components/ScoutSelectPlayer";
import { safeMediaUrl } from "@/lib/sanitize";

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

const ScoutDashboard = () => {
  const { user, role, scoutStatus, loading: authLoading } = useAuth();
  const [players, setPlayers] = useState<PlayerCard[]>([]);
  const [requests, setRequests] = useState<ScoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCard | null>(null);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/auth?role=scout" as any }); return; }

    const fetchData = async () => {
      const [videosRes, requestsRes] = await Promise.all([
        supabase.from("videos").select("id, user_id, video_url, position_tags, trait_tags").eq("status", "live" as any),
        supabase.from("scout_requests").select("*").eq("scout_id", user.id).order("created_at", { ascending: false }),
      ]);

      const videos = videosRes.data || [];
      const reqs = (requestsRes.data || []) as ScoutRequest[];

      const userIds = [...new Set([...videos.map((v) => v.user_id), ...reqs.map((r) => r.player_id)])];
      let profileMap = new Map<string, { full_name: string; sport: string; avatar_url: string }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, sport, avatar_url, bio, gender").in("user_id", userIds);
        (profiles || []).forEach((p) => profileMap.set(p.user_id, { full_name: p.full_name, sport: p.sport || "football", avatar_url: p.avatar_url || "" }));
      }

      setPlayers(videos
        .filter((v) => profileMap.has(v.user_id)) // only include players with known profiles
        .map((v) => ({
          id: v.id, user_id: v.user_id, video_url: v.video_url,
          position_tags: v.position_tags || [], trait_tags: v.trait_tags || [],
          full_name: profileMap.get(v.user_id)?.full_name || "",
          sport: profileMap.get(v.user_id)?.sport || "football",
          avatar_url: profileMap.get(v.user_id)?.avatar_url || "",
        })));

      // For approved requests, fetch player details from notifications metadata
      const approvedReqs = reqs.filter((r) => r.status === "approved");
      let detailsMap = new Map<string, any>();
      if (approvedReqs.length > 0 && user) {
        const { data: notifs } = await supabase
          .from("notifications")
          .select("metadata")
          .eq("user_id", user.id)
          .eq("type", "selection")
          .order("created_at", { ascending: false });
        (notifs || []).forEach((n: any) => {
          if (n.metadata?.player_id) {
            detailsMap.set(n.metadata.player_id, n.metadata);
          }
        });
      }

      setRequests(reqs.map((r) => ({
        ...r,
        player_name: profileMap.get(r.player_id)?.full_name || "Unknown",
        player_details: detailsMap.get(r.player_id) || null,
      })));
      setLoading(false);
    };

    fetchData();
  }, [user, authLoading]);

  const filtered = players.filter((p) => {
    // Don't show unknown players — require a real name
    const matchSearch = !search || p.full_name.toLowerCase().includes(search.toLowerCase()) || p.position_tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchSport = !sportFilter || p.sport === sportFilter;
    return matchSearch && matchSport && p.full_name && p.full_name !== "Unknown";
  });

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pt-16 pb-20 md:pb-8">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1 pt-4">
            <h1 className="font-display text-3xl sm:text-4xl text-foreground">SCOUT DASHBOARD</h1>
            {scoutStatus && (
              <Badge className={`text-xs rounded-full shrink-0 ${scoutStatus === "active" ? "bg-primary/20 text-primary border-primary/30" : scoutStatus === "pending" ? "bg-accent/20 text-accent border-accent/30" : "bg-destructive/20 text-destructive border-destructive/30"}`}>
                {scoutStatus === "active" ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldAlert className="h-3 w-3 mr-1" />}
                {scoutStatus.toUpperCase()}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-5">Browse and select players from across Bangladesh</p>

          {scoutStatus === "pending" && (
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-5 mb-6 text-center">
              <ShieldAlert className="h-7 w-7 text-accent mx-auto mb-2" />
              <h3 className="font-display text-lg text-foreground mb-1">VERIFICATION PENDING</h3>
              <p className="text-sm text-muted-foreground">Your scout account is under review.</p>
            </div>
          )}

          <Tabs defaultValue="talent" className="space-y-4 sm:space-y-6">
            <TabsList className="bg-card border border-border w-full grid grid-cols-4">
              <TabsTrigger value="talent" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm px-1">
                <Search className="h-3.5 w-3.5 shrink-0" /> <span className="hidden sm:inline ml-1">Talent</span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm px-1">
                <ClipboardList className="h-3.5 w-3.5 shrink-0" /> <span className="hidden sm:inline ml-1">Selections</span><span className="sm:hidden ml-0.5 text-[10px]">({requests.length})</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm px-1">
                <MessageSquare className="h-3.5 w-3.5 shrink-0" /> <span className="hidden sm:inline ml-1">Messages</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm px-1">
                <User className="h-3.5 w-3.5 shrink-0" /> <span className="hidden sm:inline ml-1">Profile</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="talent">
              {(scoutStatus === "active" || !scoutStatus) && (
                <>
                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
                    <div className="text-center py-20 text-muted-foreground"><p>No players found yet.</p></div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                      {filtered.map((player, i) => (
                        <motion.div key={player.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                          className="relative aspect-square bg-secondary overflow-hidden group cursor-pointer"
                          onClick={() => setSelectedPlayer(player)}
                        >
                          {player.video_url ? (
                            <video src={safeMediaUrl(player.video_url)} className="w-full h-full object-cover" muted />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          {/* Hover overlay */}
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
                                <img src={safeMediaUrl(selectedPlayer.avatar_url)} alt="" className="w-full h-full object-cover" />
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
                              <video src={safeMediaUrl(selectedPlayer.video_url)} className="w-full h-full object-cover" controls autoPlay muted />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Play className="h-12 w-12 text-muted-foreground" /></div>
                            )}
                          </div>
                          <div className="p-4 space-y-3">
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
                </>
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-3">
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No player selections yet. Browse the talent database and select players.</p>
              ) : (
                requests.map((r) => (
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

                    {/* Expanded player details for approved requests */}
                    <AnimatePresence>
                      {expandedRequest === r.id && r.status === "approved" && r.player_details && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border overflow-hidden">
                          <div className="p-4 bg-secondary/30 space-y-3">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Player Details (Forwarded by Admin)</p>
                            <div className="flex items-center gap-4">
                              {r.player_details.avatar_url && (
                                <img src={safeMediaUrl(r.player_details.avatar_url)} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-border" />
                              )}
                              <div>
                                <p className="font-semibold text-foreground">{r.player_details.player_name || r.player_name}</p>
                                <p className="text-xs text-muted-foreground">{r.player_details.sport}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {r.player_details.phone && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="h-3 w-3 text-primary" /> {r.player_details.phone}
                                </div>
                              )}
                              {r.player_details.gender && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <User className="h-3 w-3 text-primary" /> {r.player_details.gender}
                                </div>
                              )}
                              {r.player_details.dob && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="h-3 w-3 text-primary" /> {new Date(r.player_details.dob).toLocaleDateString()}
                                </div>
                              )}
                              {r.player_details.guardian && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="h-3 w-3 text-primary" /> Guardian: {r.player_details.guardian}
                                </div>
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
                ))
              )}
            </TabsContent>

            <TabsContent value="messages">
              <div className="space-y-4">
                <div className="bg-card/50 border border-border rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground">💬 Use this to communicate with other users. All messages are moderated for safety.</p>
                </div>
                <ChatInterface />
              </div>
            </TabsContent>

            <TabsContent value="profile">
              <ProfileTab />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default ScoutDashboard;
