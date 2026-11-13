import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, Flag, Inbox, LayoutDashboard, Plus, UserSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import NewsPostsList from "@/components/NewsPostsList";
import PostNewsDialog from "@/components/PostNewsDialog";
import { HomeHeader, HomeRow, HomeSection, StatTiles } from "@/components/home/HomeParts";

type Counts = { scouts: number; requests: number; reports: number; alerts: number; contacts: number; players: number; verified: number; live: number };

/** Admin home: the queue first, then headline numbers, then the news the community sees. */
const AdminHome = () => {
  const [c, setC] = useState<Counts | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const head = { count: "exact" as const, head: true };
    Promise.all([
      supabase.from("scout_profiles").select("id", head).eq("verification_status", "pending"),
      supabase.from("scout_requests").select("id", head).eq("status", "pending"),
      supabase.from("user_reports").select("id", head).in("status", ["new", "reviewing"]),
      supabase.from("moderation_alerts").select("id", head).eq("status", "new"),
      supabase.from("contact_messages").select("id", head).eq("is_read", false),
      supabase.from("user_roles").select("id", head).eq("role", "player"),
      supabase.from("scout_profiles").select("id", head).eq("verification_status", "active"),
      supabase.from("videos").select("id", head).eq("status", "live"),
    ]).then(([s, r, rep, a, ct, p, v, l]) => setC({
      scouts: s.count ?? 0, requests: r.count ?? 0, reports: rep.count ?? 0, alerts: a.count ?? 0,
      contacts: ct.count ?? 0, players: p.count ?? 0, verified: v.count ?? 0, live: l.count ?? 0,
    }));
  }, [refreshKey]);

  return (
    <div className="pb-6">
      <HomeHeader title="Admin" subtitle="Keep scouting safe and moving." />

      <HomeSection title="Needs attention">
        <div className="ios-group">
          <HomeRow icon={BadgeCheck} label="Scouts to verify" badge={c?.scouts} to="/admin/panel" />
          <HomeRow icon={UserSearch} label="Scout requests" badge={c?.requests} to="/admin/panel" />
          <HomeRow icon={Flag} label="User reports" badge={c?.reports} to="/admin/reports" />
          <HomeRow icon={AlertTriangle} label="Moderation queue" badge={c?.alerts} to="/admin/moderation" />
          <HomeRow icon={Inbox} label="Contact messages" badge={c?.contacts} to="/admin/panel" />
          <HomeRow icon={LayoutDashboard} label="Open full admin panel" to="/admin/panel" />
        </div>
      </HomeSection>

      <HomeSection>
        <StatTiles items={[{ label: "Players", value: c?.players ?? "–" }, { label: "Verified scouts", value: c?.verified ?? "–" }, { label: "Live videos", value: c?.live ?? "–" }]} />
      </HomeSection>

      <HomeSection
        title="News"
        action={
          <PostNewsDialog
            onPosted={() => setRefreshKey((k) => k + 1)}
            trigger={<button className="press inline-flex items-center gap-1 text-[17px] text-primary"><Plus className="h-5 w-5" aria-hidden="true" />Post</button>}
          />
        }
      >
        <NewsPostsList adminControls refreshKey={refreshKey} empty={<p className="ios-group px-4 py-5 text-[15px] text-muted-foreground">No news yet. Posts appear on every player's and scout's home.</p>} />
      </HomeSection>
    </div>
  );
};

export default AdminHome;
