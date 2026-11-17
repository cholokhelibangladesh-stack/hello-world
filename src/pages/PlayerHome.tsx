import { usePageCache } from "@/lib/pageCache";
import { useEffect } from "react";
import { Camera, CheckCircle2, Circle, MessageCircle, PenLine, Tag, Upload, UserSearch, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import NewsPostsList from "@/components/NewsPostsList";
import { HomeHeader, HomeRow, HomeSection, StatTiles, compact } from "@/components/home/HomeParts";

type Data = {
  name: string;
  hasPhoto: boolean;
  hasBio: boolean;
  hasPositions: boolean;
  liveVideos: number;
  views: number;
  likes: number;
  shares: number;
  requests: { pending: number; approved: number };
  unread: number;
  isPrivate: boolean;
};

/** Player home: what to do next to get scouted, how highlights are doing, and news. */
const PlayerHome = () => {
  const { user } = useAuth();
  const [d, setD] = usePageCache<Data>(user ? `player-home:${user?.id}` : null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [prof, vids, reqs, unread, priv] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, bio, position_tags").eq("user_id", user.id).maybeSingle(),
        supabase.from("videos").select("status, view_count, like_count, share_count").eq("user_id", user.id),
        supabase.from("scout_requests").select("status").eq("player_id", user.id),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("read", false),
        supabase.from("privacy_settings").select("is_private").eq("user_id", user.id).maybeSingle(),
      ]);
      const v = vids.data ?? [];
      const live = v.filter((x) => x.status === "live");
      setD({
        name: (prof.data?.full_name ?? "").split(" ")[0] || "there",
        hasPhoto: !!prof.data?.avatar_url,
        hasBio: !!prof.data?.bio?.trim(),
        hasPositions: (prof.data?.position_tags?.length ?? 0) > 0,
        liveVideos: live.length,
        views: v.reduce((a, x) => a + (x.view_count ?? 0), 0),
        likes: v.reduce((a, x) => a + (x.like_count ?? 0), 0),
        shares: v.reduce((a, x) => a + (x.share_count ?? 0), 0),
        requests: {
          pending: (reqs.data ?? []).filter((r) => r.status === "pending").length,
          approved: (reqs.data ?? []).filter((r) => r.status === "approved").length,
        },
        unread: unread.count ?? 0,
        isPrivate: !!priv.data?.is_private,
      });
    })();
  }, [user]);

  const steps = d ? [
    { done: d.liveVideos > 0, label: "Upload your first highlight", icon: Upload, to: "/player/upload" },
    { done: d.hasPhoto, label: "Add a profile photo", icon: Camera, to: "/player/profile" },
    { done: d.hasBio, label: "Write a short bio", icon: PenLine, to: "/player/profile" },
    { done: d.hasPositions, label: "Add your positions", icon: Tag, to: "/player/profile" },
  ] : [];
  const remaining = steps.filter((s) => !s.done);

  return (
    <div className="pb-6">
      <HomeHeader title={d ? `Hi, ${d.name}` : "Home"} subtitle="Here's how your profile is doing." />

      {d && remaining.length > 0 && (
        <HomeSection title="Get scout-ready">
          <div className="glass-tint-ink">
            {steps.map((s) => (
              <Link key={s.label} to={s.to as never} className="ios-row active:bg-white/10">
                {s.done
                  ? <CheckCircle2 className="h-6 w-6 shrink-0 text-success" aria-label="Done" />
                  : <Circle className="h-6 w-6 shrink-0 text-muted-foreground/50" aria-label="To do" />}
                <span className={`flex-1 text-[16px] ${s.done ? "text-muted-foreground line-through" : ""}`}>{s.label}</span>
              </Link>
            ))}
          </div>
          <p className="footnote px-4 pt-2">{remaining.length} of {steps.length} left. Complete profiles get more attention from scouts.</p>
        </HomeSection>
      )}

      <HomeSection title="Your highlights">
        {d ? (
          <StatTiles items={[{ label: "Views", value: compact(d.views) }, { label: "Likes", value: compact(d.likes) }, { label: "Shares", value: compact(d.shares) }]} />
        ) : (
          <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <div key={i} className="sk-shimmer h-[72px] rounded-[14px]" />)}</div>
        )}
        {d && d.isPrivate && (
          <Link to="/player/settings/privacy" className="ios-group mt-3 flex items-center gap-3 px-4 py-3 active:bg-muted">
            <Lock className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="flex-1 text-[15px]">Your account is private, so scouts can't find your videos.</span>
          </Link>
        )}
      </HomeSection>

      <HomeSection>
        <div className="ios-group">
          <HomeRow
            icon={UserSearch}
            tone={d?.requests.approved ? "success" : "primary"}
            label="Scout interest"
            detail={!d ? "Loading…" : d.requests.approved ? `${d.requests.approved} scout request${d.requests.approved > 1 ? "s" : ""} approved. The team will be in touch.` : d.requests.pending ? `${d.requests.pending} request${d.requests.pending > 1 ? "s" : ""} being reviewed by admins` : "No scout requests yet"}
          />
          <HomeRow icon={MessageCircle} label="Messages from Cholo Kheli" detail={d?.unread ? "You have new messages" : "Ask the team anything"} badge={d?.unread} to="/player/settings/messages" />
        </div>
      </HomeSection>

      <HomeSection title="News">
        <NewsPostsList empty={<p className="ios-group px-4 py-5 text-[15px] text-muted-foreground">News, trials and announcements from Cholo Kheli will show up here.</p>} />
      </HomeSection>
    </div>
  );
};

export default PlayerHome;
