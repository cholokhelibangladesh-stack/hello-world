import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Users, Video, DollarSign, CheckCircle, XCircle, Clock, Loader2, Eye, AlertTriangle, MessageSquare, UserPlus, Send, User, Search, Filter, Ban, Power, Mail, Trash2 } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useToast } from "@/hooks/use-toast";
import ProfileTab from "@/components/ProfileTab";
import AdminNoticeForm from "@/components/AdminNoticeForm";
import AdminStatsPanel from "@/components/AdminStatsPanel";

interface ScoutRow { id: string; user_id: string; organization: string | null; verification_status: string; created_at: string; full_name?: string; is_banned?: boolean; }
interface PlayerRow { user_id: string; full_name: string; is_banned?: boolean; sport?: string | null; }
interface VideoRow { id: string; user_id: string; title: string | null; description: string | null; video_url: string | null; status: string; created_at: string; full_name?: string; }
interface MessageRow { id: string; sender_id: string; receiver_id: string; content: string; flagged: boolean; flag_reason: string | null; created_at: string; sender_name?: string; receiver_name?: string; }
interface ScoutRequestRow { id: string; scout_id: string; player_id: string; status: string; notes: string | null; admin_response: string | null; created_at: string; scout_name?: string; player_name?: string; }
interface ContactMessageRow { id: string; name: string; email: string; subject: string | null; message: string; is_read: boolean; created_at: string; }
interface Stats { totalPlayers: number; totalScouts: number; activeScouts: number; pendingScouts: number; liveVideos: number; totalRevenue: number; flaggedMessages: number; pendingRequests: number; unreadContacts: number; }

const AdminDashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [scouts, setScouts] = useState<ScoutRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [scoutRequests, setScoutRequests] = useState<ScoutRequestRow[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessageRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
  const [uploadsHalted, setUploadsHalted] = useState(false);
  const [haltLoading, setHaltLoading] = useState(false);
  // Search & filter states
  const [scoutSearch, setScoutSearch] = useState("");
  const [scoutFilter, setScoutFilter] = useState<string>("all");
  const [scoutSort, setScoutSort] = useState<string>("date_desc");
  const [videoSearch, setVideoSearch] = useState("");
  const [videoFilter, setVideoFilter] = useState<string>("all");
  const [videoSort, setVideoSort] = useState<string>("date_desc");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState<string>("all");
  const [requestSort, setRequestSort] = useState<string>("date_desc");
  const [messageSearch, setMessageSearch] = useState("");
  const [messageFilter, setMessageFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== "admin") { navigate({ to: "/" as any }); return; }
    fetchAll();
  }, [user, role, authLoading]);

  const fetchAll = async () => {
    setLoading(true);
    const [scoutRes, videoRes, roleRes, paymentRes, msgRes, reqRes, settingsRes, contactRes] = await Promise.all([
      supabase.from("scout_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("videos").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("role, user_id"),
      supabase.from("payments").select("amount, status"),
      supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("scout_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("app_settings" as any).select("key, value"),
      supabase.from("contact_messages" as any).select("*").order("created_at", { ascending: false }),
    ]);

    const scoutData = scoutRes.data || [];
    const videoData = videoRes.data || [];
    const roles = roleRes.data || [];
    const payments = paymentRes.data || [];
    const msgData = msgRes.data || [];
    const reqData = (reqRes.data || []) as ScoutRequestRow[];

    // Parse settings
    const settingsData = (settingsRes.data || []) as any[];
    const haltSetting = settingsData.find((s: any) => s.key === "video_uploads_halted");
    setUploadsHalted(haltSetting?.value === "true");

    const playerUserIds = roles.filter((r) => r.role === "player").map((r) => r.user_id);

    const allUserIds = [...new Set([
      ...scoutData.map((s) => s.user_id),
      ...videoData.map((v) => v.user_id),
      ...msgData.flatMap((m) => [m.sender_id, m.receiver_id]),
      ...reqData.flatMap((r) => [r.scout_id, r.player_id]),
      ...playerUserIds,
    ])];

    let profileMap = new Map<string, { name: string; is_banned: boolean; sport?: string | null }>();
    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, is_banned, sport").in("user_id", allUserIds);
      (profiles || []).forEach((p) => profileMap.set(p.user_id, { name: p.full_name, is_banned: (p as any).is_banned || false, sport: (p as any).sport }));
    }

    setScouts(scoutData.map((s) => ({ ...s, full_name: profileMap.get(s.user_id)?.name || "Unknown", is_banned: (s as any).is_banned || false })));
    setPlayers(playerUserIds.map((uid) => ({
      user_id: uid,
      full_name: profileMap.get(uid)?.name || "Unknown",
      is_banned: profileMap.get(uid)?.is_banned || false,
      sport: profileMap.get(uid)?.sport,
    })));
    setVideos(videoData.map((v) => ({ ...v, full_name: profileMap.get(v.user_id)?.name || "Unknown" })));
    setMessages(msgData.map((m) => ({ ...m, sender_name: profileMap.get(m.sender_id)?.name || "Unknown", receiver_name: profileMap.get(m.receiver_id)?.name || "Unknown" })));
    setScoutRequests(reqData.map((r) => ({ ...r, scout_name: profileMap.get(r.scout_id)?.name || "Unknown", player_name: profileMap.get(r.player_id)?.name || "Unknown" })));

    const contactData = ((contactRes.data as unknown) as ContactMessageRow[]) || [];
    setContactMessages(contactData);

    setStats({
      totalPlayers: roles.filter((r) => r.role === "player").length,
      totalScouts: roles.filter((r) => r.role === "scout").length,
      activeScouts: scoutData.filter((s) => s.verification_status === "active").length,
      pendingScouts: scoutData.filter((s) => s.verification_status === "pending").length,
      liveVideos: videoData.filter((v) => v.status === "live").length,
      totalRevenue: payments.filter((p) => p.status === "success").reduce((sum, p) => sum + Number(p.amount), 0),
      flaggedMessages: msgData.filter((m) => m.flagged).length,
      pendingRequests: reqData.filter((r) => r.status === "pending").length,
      unreadContacts: contactData.filter((c) => !c.is_read).length,
    });
    setLoading(false);
  };

  const toggleContactRead = async (id: string, isRead: boolean) => {
    const { error } = await supabase.from("contact_messages" as any).update({ is_read: !isRead } as any).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase.from("contact_messages" as any).delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Message deleted" }); fetchAll(); }
  };

  const updateScoutStatus = async (scoutId: string, status: "active" | "rejected") => {
    const { error } = await supabase.from("scout_profiles").update({ verification_status: status }).eq("id", scoutId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: `Scout ${status === "active" ? "approved" : "rejected"}` }); fetchAll(); }
  };

  const banScout = async (scoutUserId: string, banned: boolean) => {
    const { error } = await supabase.from("scout_profiles").update({ is_banned: !banned } as any).eq("user_id", scoutUserId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: !banned ? "Scout banned" : "Scout unbanned" }); fetchAll(); }
  };

  const banPlayer = async (playerUserId: string, banned: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_banned: !banned } as any).eq("user_id", playerUserId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: !banned ? "Player banned" : "Player unbanned" }); fetchAll(); }
  };

  const toggleUploadsHalt = async () => {
    setHaltLoading(true);
    const newVal = !uploadsHalted ? "true" : "false";
    const { error } = await supabase.from("app_settings" as any).update({ value: newVal, updated_by: user?.id } as any).eq("key", "video_uploads_halted");
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setUploadsHalted(!uploadsHalted); toast({ title: !uploadsHalted ? "Video uploads halted" : "Video uploads resumed" }); }
    setHaltLoading(false);
  };

  const updateVideoStatus = async (videoId: string, status: "live" | "rejected") => {
    const { error } = await supabase.from("videos").update({ status }).eq("id", videoId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: `Video ${status === "live" ? "approved" : "rejected"}` }); fetchAll(); }
  };

  const toggleFlag = async (msgId: string, currentlyFlagged: boolean) => {
    const { error } = await supabase.from("messages").update({ flagged: !currentlyFlagged, flag_reason: !currentlyFlagged ? "Flagged by admin for review" : null }).eq("id", msgId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: !currentlyFlagged ? "Message flagged" : "Flag removed" }); fetchAll(); }
  };

  const handleScoutRequest = async (reqId: string, status: "approved" | "rejected", playerId: string, playerName: string, scoutName: string, scoutId: string) => {
    const { error } = await supabase.from("scout_requests").update({ status, admin_response: status === "approved" ? "Player details forwarded" : "Request denied" } as any).eq("id", reqId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    if (status === "approved") {
      // Get full player details to forward to scout
      const { data: playerProfile } = await supabase.from("profiles").select("*").eq("user_id", playerId).maybeSingle();
      const playerDetails = playerProfile
        ? `Name: ${playerProfile.full_name}\nPhone: ${playerProfile.phone || "N/A"}\nSport: ${playerProfile.sport || "N/A"}\nGender: ${playerProfile.gender || "N/A"}\nDOB: ${playerProfile.date_of_birth || "N/A"}\nGuardian: ${playerProfile.guardian_contact || "N/A"}\nBio: ${playerProfile.bio || "N/A"}`
        : "Player details unavailable";

      // Notify SCOUT with full player details (scout-only, not visible to players)
      await supabase.from("notifications").insert({
        user_id: scoutId,
        title: `✅ Player Details: ${playerName}`,
        message: playerDetails,
        type: "selection",
        metadata: {
          player_id: playerId,
          player_name: playerName,
          phone: playerProfile?.phone,
          sport: playerProfile?.sport,
          gender: playerProfile?.gender,
          dob: playerProfile?.date_of_birth,
          guardian: playerProfile?.guardian_contact,
          bio: playerProfile?.bio,
          avatar_url: playerProfile?.avatar_url,
        },
      } as any);

      // Notify PLAYER (congratulations only — no private details exposed)
      await supabase.from("notifications").insert({
        user_id: playerId,
        title: "🎉 Congratulations! You've been selected!",
        message: `A scout (${scoutName}) has shown interest in you! Your details have been shared. Keep up the great work!`,
        type: "selection",
      } as any);
    } else {
      // Rejected: only notify player — scouts see status change in their dashboard
      await supabase.from("notifications").insert({
        user_id: playerId,
        title: "📋 Scouting Update",
        message: `A scout reviewed your profile but decided not to proceed at this time. Keep improving and uploading new highlights!`,
        type: "feedback",
      } as any);
    }

    toast({ title: `Request ${status}.`, description: status === "approved" ? "Player details forwarded to scout. Player notified." : "Player notified." });
    fetchAll();
  };

  const sendPersonalizedFeedback = async (reqId: string, scoutId: string, scoutName: string, playerId: string, playerName: string) => {
    const feedback = feedbackInputs[reqId];
    if (!feedback?.trim()) return;

    // Send feedback to PLAYER
    await supabase.from("notifications").insert({
      user_id: playerId,
      title: "📝 Personalized Feedback from Admin",
      message: feedback,
      type: "feedback",
    } as any);

    // Also send feedback context to SCOUT so they know admin responded
    await supabase.from("notifications").insert({
      user_id: scoutId,
      title: `📋 Admin Note on ${playerName}`,
      message: `Admin feedback regarding your request for ${playerName}: "${feedback}"`,
      type: "feedback",
    } as any);

    toast({ title: `Feedback sent to ${playerName} and noted to ${scoutName}` });
    setFeedbackInputs((prev) => ({ ...prev, [reqId]: "" }));
  };

  // Sort helpers
  const sortByDate = (a: any, b: any, dir: "asc" | "desc") => {
    const da = new Date(a.created_at).getTime();
    const db = new Date(b.created_at).getTime();
    return dir === "asc" ? da - db : db - da;
  };
  const sortByStr = (a: string, b: string, dir: "asc" | "desc") =>
    dir === "asc" ? (a || "").localeCompare(b || "") : (b || "").localeCompare(a || "");
  const statusRank: Record<string, number> = { pending: 0, pending_payment: 0, draft: 1, live: 2, approved: 2, active: 2, rejected: 3 };
  const sortByStatus = (a: string, b: string, dir: "asc" | "desc") => {
    const ra = statusRank[a] ?? 99; const rb = statusRank[b] ?? 99;
    return dir === "asc" ? ra - rb : rb - ra;
  };
  const applySort = <T extends any>(rows: T[], sort: string, statusKey: keyof T, targetKey: keyof T): T[] => {
    const [field, dir] = sort.split("_") as [string, "asc" | "desc"];
    const arr = [...rows];
    if (field === "date") arr.sort((a: any, b: any) => sortByDate(a, b, dir));
    else if (field === "status") arr.sort((a: any, b: any) => sortByStatus(a[statusKey], b[statusKey], dir) || sortByDate(a, b, "desc"));
    else if (field === "target") arr.sort((a: any, b: any) => sortByStr(a[targetKey], b[targetKey], dir) || sortByDate(a, b, "desc"));
    return arr;
  };

  // Filtered + sorted data
  const filteredScouts = applySort(
    scouts.filter((s) => {
      const matchSearch = !scoutSearch || s.full_name?.toLowerCase().includes(scoutSearch.toLowerCase()) || s.organization?.toLowerCase().includes(scoutSearch.toLowerCase());
      const matchFilter = scoutFilter === "all" || s.verification_status === scoutFilter;
      return matchSearch && matchFilter;
    }),
    scoutSort, "verification_status" as any, "full_name" as any,
  );

  const filteredVideos = applySort(
    videos.filter((v) => {
      const matchSearch = !videoSearch || v.full_name?.toLowerCase().includes(videoSearch.toLowerCase()) || v.description?.toLowerCase().includes(videoSearch.toLowerCase());
      const matchFilter = videoFilter === "all" || v.status === videoFilter;
      return matchSearch && matchFilter;
    }),
    videoSort, "status" as any, "full_name" as any,
  );

  const filteredRequests = applySort(
    scoutRequests.filter((r) => {
      const matchSearch = !requestSearch || r.scout_name?.toLowerCase().includes(requestSearch.toLowerCase()) || r.player_name?.toLowerCase().includes(requestSearch.toLowerCase());
      const matchFilter = requestFilter === "all" || r.status === requestFilter;
      return matchSearch && matchFilter;
    }),
    requestSort, "status" as any, "player_name" as any,
  );

  const filteredMessages = messages.filter((m) => {
    const matchSearch = !messageSearch || m.sender_name?.toLowerCase().includes(messageSearch.toLowerCase()) || m.receiver_name?.toLowerCase().includes(messageSearch.toLowerCase()) || m.content.toLowerCase().includes(messageSearch.toLowerCase());
    const matchFilter = messageFilter === "all" || (messageFilter === "flagged" && m.flagged) || (messageFilter === "clean" && !m.flagged);
    return matchSearch && matchFilter;
  });

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const SORT_OPTIONS = [
    { value: "date_desc", label: "Newest first" },
    { value: "date_asc", label: "Oldest first" },
    { value: "status_asc", label: "Status (pending first)" },
    { value: "status_desc", label: "Status (resolved first)" },
    { value: "target_asc", label: "Account A–Z" },
    { value: "target_desc", label: "Account Z–A" },
  ];

  const SearchFilterBar = ({ search, setSearch, filter, setFilter, filters, placeholder, sort, setSort }: { search: string; setSearch: (v: string) => void; filter: string; setFilter: (v: string) => void; filters: { value: string; label: string }[]; placeholder: string; sort?: string; setSort?: (v: string) => void }) => (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={placeholder} className="pl-10 bg-secondary border-border rounded-xl text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="flex gap-1.5 flex-wrap items-center">
        {filters.map((f) => (
          <Button key={f.value} size="sm" variant="outline"
            onClick={() => setFilter(filter === f.value ? "all" : f.value)}
            className={`text-xs rounded-full border-border ${filter === f.value ? "border-primary text-primary bg-primary/10" : "text-muted-foreground"}`}>
            <Filter className="h-3 w-3 mr-1" /> {f.label}
          </Button>
        ))}
        {setSort && (
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-8 rounded-full border border-border bg-secondary text-xs px-3 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-16 pb-20 md:pb-8">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-4 pt-4">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
            <h1 className="font-display text-3xl sm:text-4xl text-foreground">ADMIN PANEL</h1>
          </div>

          {stats && (
            <div className="glass-stagger grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-5">
              {[
                { label: "Players", value: stats.totalPlayers, icon: Users },
                { label: "Scouts", value: `${stats.activeScouts}/${stats.totalScouts}`, icon: Shield },
                { label: "Videos", value: stats.liveVideos, icon: Video },
                { label: "Revenue", value: `৳${stats.totalRevenue}`, icon: DollarSign },
                { label: "Flagged", value: stats.flaggedMessages, icon: AlertTriangle },
                { label: "Requests", value: stats.pendingRequests, icon: UserPlus },
              ].map((s) => (
                <div key={s.label} className="apple-glass glass-card rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider truncate">{s.label}</span>
                  </div>
                  <p className="font-display text-2xl sm:text-3xl text-foreground">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mb-5">
            <AdminStatsPanel />
          </div>

          <Tabs defaultValue="scouts" className="space-y-4">
            {/* Mobile: horizontally scrollable tab row */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="bg-card border border-border flex w-max sm:w-full sm:flex-wrap min-w-full">
                <TabsTrigger value="scouts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs whitespace-nowrap px-3">Scouts {stats?.pendingScouts ? `(${stats.pendingScouts})` : ""}</TabsTrigger>
                <TabsTrigger value="players" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs whitespace-nowrap px-3">Players</TabsTrigger>
                <TabsTrigger value="videos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs whitespace-nowrap px-3">Videos</TabsTrigger>
                <TabsTrigger value="requests" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs whitespace-nowrap px-3">Requests {stats?.pendingRequests ? `(${stats.pendingRequests})` : ""}</TabsTrigger>
                <TabsTrigger value="safety" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs whitespace-nowrap px-3">Safety {stats?.flaggedMessages ? `(${stats.flaggedMessages})` : ""}</TabsTrigger>
                <TabsTrigger value="controls" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs whitespace-nowrap px-3">Controls</TabsTrigger>
                <TabsTrigger value="notices" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs whitespace-nowrap px-3">Notices</TabsTrigger>
                <TabsTrigger value="contact" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs whitespace-nowrap px-3">Contact {stats?.unreadContacts ? `(${stats.unreadContacts})` : ""}</TabsTrigger>
                <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs whitespace-nowrap px-3">Profile</TabsTrigger>
              </TabsList>
            </div>

            {/* Scouts Tab */}
            <TabsContent value="scouts" className="space-y-3">
              <SearchFilterBar search={scoutSearch} setSearch={setScoutSearch} filter={scoutFilter} setFilter={setScoutFilter} placeholder="Search scouts..."
                sort={scoutSort} setSort={setScoutSort}
                filters={[{ value: "pending", label: "Pending" }, { value: "active", label: "Active" }, { value: "rejected", label: "Rejected" }]} />
              {filteredScouts.length === 0 ? <p className="text-muted-foreground text-center py-12">No scouts found.</p> : filteredScouts.map((s) => (
                <div key={s.id} className="apple-glass glass-card rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${s.is_banned ? "line-through text-muted-foreground" : "text-foreground"}`}>{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">{s.organization || "No organization"} • {new Date(s.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge className={`rounded-full shrink-0 ${s.verification_status === "active" ? "bg-primary/20 text-primary border-primary/30" : s.verification_status === "pending" ? "bg-accent/20 text-accent-foreground border-accent/30" : "bg-destructive/20 text-destructive border-destructive/30"}`}>
                      {s.verification_status === "active" && <CheckCircle className="h-3 w-3 mr-1" />}
                      {s.verification_status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                      {s.verification_status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                      {s.verification_status}
                    </Badge>
                  </div>
                  {s.is_banned && <Badge className="text-[10px] bg-destructive/20 text-destructive border-destructive/30 rounded-full">Banned</Badge>}
                  <div className="flex gap-2 flex-wrap">
                    {s.verification_status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => updateScoutStatus(s.id, "active")} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-xs">Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => updateScoutStatus(s.id, "rejected")} className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 rounded-full text-xs">Reject</Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => banScout(s.user_id, s.is_banned || false)}
                      className={`flex-1 rounded-full text-xs ${s.is_banned ? "border-primary/40 text-primary hover:bg-primary/10" : "border-destructive/40 text-destructive hover:bg-destructive/10"}`}>
                      <Ban className="h-3 w-3 mr-1" />{s.is_banned ? "Unban" : "Ban"}
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Players Tab */}
            <TabsContent value="players" className="space-y-3">
              <p className="text-xs text-muted-foreground mb-2">{players.length} registered players</p>
              {players.length === 0 ? <p className="text-muted-foreground text-center py-12">No players found.</p> : players.map((p) => (
                <div key={p.user_id} className="apple-glass glass-card rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${p.is_banned ? "line-through text-muted-foreground" : "text-foreground"}`}>{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.sport || "No sport"}</p>
                    {p.is_banned && <Badge className="mt-1 text-[10px] bg-destructive/20 text-destructive border-destructive/30 rounded-full">Banned</Badge>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => banPlayer(p.user_id, p.is_banned || false)}
                    className={`rounded-full text-xs shrink-0 ${p.is_banned ? "border-primary/40 text-primary hover:bg-primary/10" : "border-destructive/40 text-destructive hover:bg-destructive/10"}`}>
                    <Ban className="h-3 w-3 mr-1" />{p.is_banned ? "Unban" : "Ban"}
                  </Button>
                </div>
              ))}
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="space-y-3">
              <SearchFilterBar search={videoSearch} setSearch={setVideoSearch} filter={videoFilter} setFilter={setVideoFilter} placeholder="Search videos..."
                sort={videoSort} setSort={setVideoSort}
                filters={[{ value: "pending_payment", label: "Pending" }, { value: "live", label: "Live" }, { value: "rejected", label: "Rejected" }, { value: "draft", label: "Draft" }]} />
              {filteredVideos.length === 0 ? <p className="text-muted-foreground text-center py-12">No videos found.</p> : filteredVideos.map((v) => (
                <div key={v.id} className="apple-glass glass-card rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{v.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.description || "No description"} • {new Date(v.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge className={`rounded-full shrink-0 ${v.status === "live" ? "bg-primary/20 text-primary border-primary/30" : v.status === "rejected" ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-muted text-muted-foreground border-border"}`}>{v.status}</Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {v.video_url && <Button size="sm" variant="outline" onClick={() => navigate({ to: `/resume/${v.user_id}` as any })} className="rounded-full text-xs border-border text-muted-foreground"><Eye className="h-3.5 w-3.5 mr-1" />View</Button>}
                    {(v.status === "pending_payment" || v.status === "draft") && (
                      <>
                        <Button size="sm" onClick={() => updateVideoStatus(v.id, "live")} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-xs">Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => updateVideoStatus(v.id, "rejected")} className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 rounded-full text-xs">Reject</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Scout Requests Tab */}
            <TabsContent value="requests" className="space-y-3">
              <SearchFilterBar search={requestSearch} setSearch={setRequestSearch} filter={requestFilter} setFilter={setRequestFilter} placeholder="Search requests..."
                sort={requestSort} setSort={setRequestSort}
                filters={[{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }]} />
              {filteredRequests.length === 0 ? <p className="text-muted-foreground text-center py-12">No requests found.</p> : filteredRequests.map((r) => (
                <div key={r.id} className="apple-glass glass-card rounded-xl p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground leading-tight">
                        <span className="text-primary">{r.scout_name}</span> → <span className="text-primary">{r.player_name}</span>
                      </p>
                      <Badge className={`rounded-full shrink-0 text-xs ${r.status === "approved" ? "bg-primary/20 text-primary border-primary/30" : r.status === "rejected" ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-muted text-muted-foreground border-border"}`}>{r.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.notes || "No notes"} • {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleScoutRequest(r.id, "approved", r.player_id, r.player_name || "", r.scout_name || "", r.scout_id)} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-xs">Approve & Forward</Button>
                      <Button size="sm" variant="outline" onClick={() => handleScoutRequest(r.id, "rejected", r.player_id, r.player_name || "", r.scout_name || "", r.scout_id)} className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 rounded-full text-xs">Reject</Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input placeholder={`Feedback to ${r.player_name}...`} className="bg-secondary border-border text-sm rounded-xl" value={feedbackInputs[r.id] || ""} onChange={(e) => setFeedbackInputs((prev) => ({ ...prev, [r.id]: e.target.value }))} />
                    <Button size="sm" variant="outline" onClick={() => sendPersonalizedFeedback(r.id, r.scout_id, r.scout_name || "", r.player_id, r.player_name || "")} className="border-primary/40 text-primary shrink-0 rounded-full">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="safety" className="space-y-4">
              <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-accent" />
                  <p className="text-sm text-muted-foreground">All scout-player messages are logged here for safety monitoring. Use the chat view below to inspect and flag conversations.</p>
                </div>
              </div>
              <ChatInterface adminView={true} />
            </TabsContent>

            {/* Controls Tab */}
            <TabsContent value="controls" className="space-y-4">
              <div className="apple-glass glass-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Power className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl text-foreground">PLATFORM CONTROLS</h2>
                </div>
                <div className="flex items-center justify-between bg-secondary rounded-xl p-4">
                  <div>
                    <p className="font-semibold text-foreground">Video Uploads</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {uploadsHalted ? "Currently halted — players see monthly limit message" : "Currently accepting video uploads"}
                    </p>
                  </div>
                  <Button
                    onClick={toggleUploadsHalt}
                    disabled={haltLoading}
                    variant="outline"
                    className={uploadsHalted ? "border-primary/40 text-primary hover:bg-primary/10 rounded-full" : "border-destructive/40 text-destructive hover:bg-destructive/10 rounded-full"}
                  >
                    {haltLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Power className="h-4 w-4 mr-2" />}
                    {uploadsHalted ? "Resume Uploads" : "Halt Uploads"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Notices Tab */}
            <TabsContent value="notices">
              <AdminNoticeForm />
            </TabsContent>

            {/* Contact Messages Tab */}
            <TabsContent value="contact" className="space-y-3">
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-2">
                <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Messages submitted through the public Contact Us form. Click the email address to reply directly from your mail client.
                </p>
              </div>
              {contactMessages.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">No contact messages yet.</p>
              ) : (
                contactMessages.map((c) => (
                  <div key={c.id} className={`bg-card border rounded-xl p-4 space-y-3 ${c.is_read ? "border-border" : "border-primary/40"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground truncate">{c.name}</p>
                          {!c.is_read && <Badge className="bg-primary/20 text-primary border-primary/30 rounded-full text-[10px]">New</Badge>}
                        </div>
                        <a href={`mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject || "Your message to Cholo Kheli")}`}
                          className="text-xs text-primary hover:underline break-all">
                          {c.email}
                        </a>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(c.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    {c.subject && <p className="text-sm font-medium text-foreground">{c.subject}</p>}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.message}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" asChild
                        className="rounded-full text-xs border-primary/40 text-primary hover:bg-primary/10">
                        <a href={`mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject || "Your message to Cholo Kheli")}`}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Reply by email
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleContactRead(c.id, c.is_read)}
                        className="rounded-full text-xs border-border text-muted-foreground">
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark as {c.is_read ? "unread" : "read"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteContact(c.id)}
                        className="rounded-full text-xs border-destructive/40 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <ProfileTab />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
