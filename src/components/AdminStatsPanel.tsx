import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Video, Eye, Heart, Share2, TrendingUp, AlertTriangle,
  Ban, Shield, UserCheck, Clock, Loader2,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

type DayPoint = { day: string; views: number; likes: number; shares: number };
type SportSlice = { name: string; value: number };

interface AdminStats {
  totalUsers: number;
  totalPlayers: number;
  totalScouts: number;
  totalAdmins: number;
  bannedUsers: number;
  activeScouts: number;
  pendingScouts: number;
  newSignups7d: number;
  newSignups30d: number;
  signupGrowthPct: number;
  totalVideos: number;
  liveVideos: number;
  flaggedVideos: number;
  uploads7d: number;
  uploads30d: number;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  avgViewsPerVideo: number;
  flaggedMessages: number;
  totalMessages: number;
  pendingRequests: number;
  totalRequests: number;
  unreadContacts: number;
  totalContacts: number;
  engagement: DayPoint[];
  sports: SportSlice[];
  topVideos: { id: string; title: string; views: number; likes: number }[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))", "hsl(var(--destructive))"];

const ProgressBar = ({ value, max, tone = "primary" }: { value: number; max: number; tone?: "primary" | "destructive" | "accent" }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const toneClass = tone === "destructive" ? "bg-destructive" : tone === "accent" ? "bg-accent" : "bg-primary";
  return (
    <div className="w-full">
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={`h-full ${toneClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{value} / {max} ({pct}%)</p>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, tone = "primary" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="apple-glass glass-card rounded-2xl p-4 flex flex-col gap-1"
  >
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className={`h-4 w-4 ${tone === "destructive" ? "text-destructive" : "text-primary"}`} />
      <span className="text-[11px] uppercase tracking-wider">{label}</span>
    </div>
    <p className="font-display text-2xl text-foreground leading-tight">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
  </motion.div>
);

const AdminStatsPanel = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const now = new Date();
        const d7 = new Date(now.getTime() - 7 * 86400_000).toISOString();
        const d30 = new Date(now.getTime() - 30 * 86400_000).toISOString();
        const d60 = new Date(now.getTime() - 60 * 86400_000).toISOString();

        const [rolesRes, profilesRes, scoutRes, videosRes, likesRes, sharesRes, eventsRes, msgRes, reqRes, contactsRes] = await Promise.all([
          supabase.from("user_roles").select("user_id, role"),
          supabase.from("profiles").select("user_id, sport, is_banned, created_at"),
          supabase.from("scout_profiles").select("verification_status"),
          supabase.from("videos").select("id, description, status, flagged, created_at, view_count, like_count, share_count"),
          supabase.from("video_likes").select("created_at").gte("created_at", d30),
          supabase.from("video_shares").select("created_at").gte("created_at", d30),
          supabase.from("video_events").select("created_at").gte("created_at", d30),
          supabase.from("messages").select("flagged"),
          supabase.from("scout_requests").select("status"),
          supabase.from("contact_messages" as any).select("is_read"),
        ]);

        const roles = rolesRes.data || [];
        const profiles = profilesRes.data || [];
        const scouts = scoutRes.data || [];
        const videos = (videosRes.data || []) as any[];
        const likes = likesRes.data || [];
        const shares = sharesRes.data || [];
        const events = eventsRes.data || [];
        const msgs = msgRes.data || [];
        const reqs = reqRes.data || [];
        const contacts = (contactsRes.data as any[]) || [];

        // Signups (last 7 vs previous 7 for growth)
        const in7 = profiles.filter((p) => p.created_at && p.created_at >= d7).length;
        const in30 = profiles.filter((p) => p.created_at && p.created_at >= d30).length;
        const inPrev7 = profiles.filter((p) => p.created_at && p.created_at >= d30 && p.created_at < d7).length;
        const growth = inPrev7 === 0 ? (in7 > 0 ? 100 : 0) : Math.round(((in7 - inPrev7) / inPrev7) * 100);

        // 30-day engagement series
        const dayMap: Record<string, DayPoint> = {};
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 86400_000);
          const key = d.toISOString().slice(5, 10); // MM-DD
          dayMap[key] = { day: key, views: 0, likes: 0, shares: 0 };
        }
        const bumpDay = (created: string | null | undefined, kind: "views" | "likes" | "shares") => {
          if (!created) return;
          const key = created.slice(5, 10);
          if (dayMap[key]) dayMap[key][kind] += 1;
        };
        events.forEach((e) => bumpDay(e.created_at, "views"));
        likes.forEach((l) => bumpDay(l.created_at, "likes"));
        shares.forEach((s) => bumpDay(s.created_at, "shares"));

        // Sport distribution among players
        const playerIds = new Set(roles.filter((r) => r.role === "player").map((r) => r.user_id));
        const sportCounts: Record<string, number> = {};
        profiles.filter((p) => playerIds.has(p.user_id) && p.sport).forEach((p) => {
          sportCounts[p.sport!] = (sportCounts[p.sport!] || 0) + 1;
        });
        const sports = Object.entries(sportCounts).map(([name, value]) => ({ name, value }));

        const topVideos = [...videos]
          .filter((v) => v.status === "live")
          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
          .slice(0, 5)
          .map((v) => ({ id: v.id, title: v.description?.slice(0, 40) || "Untitled", views: v.view_count || 0, likes: v.like_count || 0 }));

        const totalViews = videos.reduce((s, v) => s + (v.view_count || 0), 0);
        const totalLikes = videos.reduce((s, v) => s + (v.like_count || 0), 0);
        const totalShares = videos.reduce((s, v) => s + (v.share_count || 0), 0);
        const liveVideos = videos.filter((v) => v.status === "live").length;

        setStats({
          totalUsers: roles.length,
          totalPlayers: roles.filter((r) => r.role === "player").length,
          totalScouts: roles.filter((r) => r.role === "scout").length,
          totalAdmins: roles.filter((r) => r.role === "admin").length,
          bannedUsers: profiles.filter((p) => p.is_banned).length,
          activeScouts: scouts.filter((s) => s.verification_status === "active").length,
          pendingScouts: scouts.filter((s) => s.verification_status === "pending").length,
          newSignups7d: in7,
          newSignups30d: in30,
          signupGrowthPct: growth,
          totalVideos: videos.length,
          liveVideos,
          flaggedVideos: videos.filter((v) => v.flagged).length,
          uploads7d: videos.filter((v) => v.created_at >= d7).length,
          uploads30d: videos.filter((v) => v.created_at >= d30).length,
          totalViews,
          totalLikes,
          totalShares,
          avgViewsPerVideo: liveVideos > 0 ? Math.round(totalViews / liveVideos) : 0,
          flaggedMessages: msgs.filter((m) => m.flagged).length,
          totalMessages: msgs.length,
          pendingRequests: reqs.filter((r) => r.status === "pending").length,
          totalRequests: reqs.length,
          unreadContacts: contacts.filter((c) => !c.is_read).length,
          totalContacts: contacts.length,
          engagement: Object.values(dayMap),
          sports,
          topVideos,
        });
        // suppress unused-var warning
        void d60;
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon={Users} label="Total users" value={stats.totalUsers}
          sub={`${stats.totalPlayers} players · ${stats.totalScouts} scouts · ${stats.totalAdmins} admins`} />
        <StatCard icon={UserCheck} label="Signups (7d)" value={stats.newSignups7d}
          sub={`${stats.signupGrowthPct >= 0 ? "+" : ""}${stats.signupGrowthPct}% vs prev 7d`} />
        <StatCard icon={Video} label="Live videos" value={stats.liveVideos}
          sub={`${stats.uploads7d} uploads in 7d`} />
        <StatCard icon={Eye} label="Total views" value={stats.totalViews.toLocaleString()}
          sub={`avg ${stats.avgViewsPerVideo}/video`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Engagement chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="apple-glass glass-card rounded-2xl p-4 lg:col-span-2"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Engagement — last 30 days</h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.engagement} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={32} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#gv)" strokeWidth={2} />
                <Area type="monotone" dataKey="likes" stroke="hsl(var(--accent))" fill="url(#gl)" strokeWidth={2} />
                <Area type="monotone" dataKey="shares" stroke="hsl(var(--muted-foreground))" fill="transparent" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-2">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {stats.totalViews.toLocaleString()} views</span>
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {stats.totalLikes.toLocaleString()} likes</span>
            <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {stats.totalShares.toLocaleString()} shares</span>
          </div>
        </motion.div>

        {/* Scout verification donut */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="apple-glass glass-card rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Scout verification</h3>
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Active", value: stats.activeScouts },
                    { name: "Pending", value: stats.pendingScouts },
                  ]}
                  dataKey="value" innerRadius={38} outerRadius={60} paddingAngle={3}
                >
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--muted-foreground))" />
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around text-[11px] text-muted-foreground pt-1">
            <span><span className="inline-block h-2 w-2 rounded-full bg-primary mr-1" /> Active {stats.activeScouts}</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-muted-foreground mr-1" /> Pending {stats.pendingScouts}</span>
          </div>
        </motion.div>
      </div>

      {/* Moderation queue + sport mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="apple-glass glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold text-foreground">Moderation queue</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Pending scout requests</span>
                <span className="text-muted-foreground">{stats.pendingRequests} open</span>
              </div>
              <ProgressBar value={stats.pendingRequests} max={Math.max(stats.totalRequests, 1)} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Flagged messages</span>
                <span className="text-muted-foreground">{stats.flaggedMessages} flagged</span>
              </div>
              <ProgressBar value={stats.flaggedMessages} max={Math.max(stats.totalMessages, 1)} tone="destructive" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground flex items-center gap-1"><Video className="h-3 w-3" /> Flagged videos</span>
                <span className="text-muted-foreground">{stats.flaggedVideos} of {stats.totalVideos}</span>
              </div>
              <ProgressBar value={stats.flaggedVideos} max={Math.max(stats.totalVideos, 1)} tone="destructive" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground flex items-center gap-1"><Ban className="h-3 w-3" /> Banned users</span>
                <span className="text-muted-foreground">{stats.bannedUsers} of {stats.totalUsers}</span>
              </div>
              <ProgressBar value={stats.bannedUsers} max={Math.max(stats.totalUsers, 1)} tone="destructive" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground">Unread contact messages</span>
                <span className="text-muted-foreground">{stats.unreadContacts} of {stats.totalContacts}</span>
              </div>
              <ProgressBar value={stats.unreadContacts} max={Math.max(stats.totalContacts, 1)} tone="accent" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="apple-glass glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Video className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Top videos by views</h3>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topVideos} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="title" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={110} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="views" radius={[0, 6, 6, 0]}>
                  {stats.topVideos.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {stats.sports.length > 0 && (
            <div className="pt-3 border-t border-border mt-2">
              <p className="text-[11px] text-muted-foreground mb-2">Player sport mix</p>
              <div className="flex flex-wrap gap-2">
                {stats.sports.map((s, i) => {
                  const total = stats.sports.reduce((sum, x) => sum + x.value, 0) || 1;
                  const pct = Math.round((s.value / total) * 100);
                  return (
                    <div key={s.name} className="flex-1 min-w-[110px]">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-foreground capitalize">{s.name}</span>
                        <span className="text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          className="h-full"
                          style={{ background: COLORS[i % COLORS.length] }}
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminStatsPanel;
