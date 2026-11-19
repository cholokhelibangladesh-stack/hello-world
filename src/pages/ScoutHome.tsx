import { usePageCache } from "@/lib/pageCache";
import { useEffect } from "react";
import { ClipboardCheck, Inbox, ListFilter, MessageCircle, Search, Sparkles, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import NewsPostsList from "@/components/NewsPostsList";
import { HomeHeader, HomeRow, HomeSection, StatTiles } from "@/components/home/HomeParts";

type Data = { name: string; newThisWeek: number; inbox: number; pending: number; approved: number; unread: number; sport: string | null; tier: "reviewer" | "professional"; work: number };

/** Scout home: fresh talent, profiles shared by admins, and the state of their requests. */
const ScoutHome = () => {
  const { user } = useAuth();
  const [d, setD] = usePageCache<Data>(user ? `scout-home:${user?.id}` : null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [sp, fresh, shares, reqs, unread] = await Promise.all([
        supabase.from("scout_profiles").select("full_name, preferred_sport, scout_tier").eq("user_id", user.id).maybeSingle(),
        supabase.from("videos").select("id", { count: "exact", head: true }).eq("status", "live").gte("created_at", weekAgo),
        supabase.from("profile_shares").select("id", { count: "exact", head: true }).eq("scout_id", user.id).eq("status", "sent"),
        supabase.from("scout_requests").select("status").eq("scout_id", user.id),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("read", false),
      ]);
      const tier = ((sp.data as any)?.scout_tier ?? "professional") as Data["tier"];
      const work = tier === "reviewer"
        ? ((await (supabase as any).rpc("get_review_queue", { _limit: 50, _sport: null })).data ?? []).length
        : ((await (supabase as any).rpc("get_recommended_videos", { _limit: 50, _offset: 0, _sport: null })).data ?? []).length;
      setD({
        tier,
        work,
        name: (sp.data?.full_name ?? "").split(" ")[0] || "there",
        newThisWeek: fresh.count ?? 0,
        inbox: shares.count ?? 0,
        pending: (reqs.data ?? []).filter((r) => r.status === "pending").length,
        approved: (reqs.data ?? []).filter((r) => r.status === "approved").length,
        unread: unread.count ?? 0,
        sport: sp.data?.preferred_sport ?? null,
      });
    })();
  }, [user]);

  return (
    <div className="pb-6">
      <HomeHeader title={d ? `Hi, ${d.name}` : "Home"} subtitle={d?.tier === "reviewer" ? "Intermediate scout" : "Professional scout"} />

      <HomeSection>
        {d ? (
          <StatTiles items={[{ label: "New highlights this week", value: d.newThisWeek }, { label: "Requests in review", value: d.pending }, { label: "Approved", value: d.approved }]} />
        ) : (
          <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <div key={i} className="sk-shimmer h-[88px] rounded-[14px]" />)}</div>
        )}
      </HomeSection>

      <HomeSection>
        <div className="glass-tint-ink">
          {d?.tier === "reviewer"
            ? <HomeRow icon={ClipboardCheck} label="Review queue" detail="Rate new highlights and forward the best" badge={d?.work} to="/scout/review" />
            : <HomeRow icon={Sparkles} label="Recommended" detail="Highlights forwarded by intermediate scouts" badge={d?.work} to="/scout/recommended" />}
          <HomeRow icon={Search} label="Explore highlights" detail={d?.sport ? `Ranked for ${d.sport}` : "Set a sport in preferences to rank results"} to="/scout/explore" />
          <HomeRow icon={Inbox} label="Talent inbox" detail="Profiles admins shared with you" badge={d?.inbox} to="/scout/inbox" />
          <HomeRow icon={Trophy} label="Your picks" detail="Players you requested and the admin's response" to="/scout/selections" />
          <HomeRow icon={ListFilter} label="Scouting preferences" to="/scout/settings/preferences" />
          <HomeRow icon={MessageCircle} label="Messages from Cholo Kheli" badge={d?.unread} to="/player/settings/messages" />
        </div>
      </HomeSection>

      <HomeSection title="News">
        <NewsPostsList empty={<p className="ios-group px-4 py-5 text-[15px] text-muted-foreground">Announcements for scouts will show up here.</p>} />
      </HomeSection>
    </div>
  );
};

export default ScoutHome;
