import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "@tanstack/react-router";
import { Ban, ChevronLeft, Loader2, MoreHorizontal, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReportUserButton from "@/components/ReportUserButton";
import ScoutSelectPlayer from "@/components/ScoutSelectPlayer";
import FollowButton, { useFollowStats } from "@/components/social/FollowButton";
import MessageButton from "@/pages/messages/MessageButton";
import FollowListSheet from "@/components/social/FollowListSheet";
import BottomSheet from "@/components/social/BottomSheet";
import HighlightGrid, { type Highlight } from "@/components/profile/HighlightGrid";
import { AboutSection, AchievementsSection } from "@/components/profile/ProfileSections";
import ProfileCard, { HeroIconButton, ProfileSurface } from "@/components/profile/ProfileCard";
import { safeMediaUrl } from "@/lib/sanitize";
import { publicUrl } from "@/lib/publicUrl";
import { SPORT_LABEL, formatCount, isSport } from "@/lib/taxonomy";

type Profile = { full_name: string | null; username: string | null; bio: string | null; sport: string | null; avatar_url: string | null };
type Achievement = { id: string; title: string; description: string | null; year: number | null };

const PlayerResume = () => {
  const { userId } = useParams({ strict: false }) as { userId: string };
  const navigate = useNavigate();
  const { user, role, loading: authLoading, needsMfa } = useAuth();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [videos, setVideos] = useState<Highlight[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [age, setAge] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [list, setList] = useState<"followers" | "following" | null>(null);
  const [menu, setMenu] = useState(false);
  const { stats, setStats } = useFollowStats(user ? userId : undefined);
  const isMe = user?.id === userId;

  useEffect(() => {
    if (!userId || !user) return;
    if (isMe) { navigate({ to: (role === "scout" ? "/scout/profile" : "/player/profile") as never, replace: true }); return; }
    (async () => {
      const [p, v, a, ag, b] = await Promise.all([
        supabase.from("profiles").select("full_name, username, bio, sport, avatar_url").eq("user_id", userId).maybeSingle(),
        supabase.from("videos").select("id, title, description, video_url, status, view_count, like_count, created_at").eq("user_id", userId).eq("status", "live").order("created_at", { ascending: false }),
        supabase.from("achievements").select("id, title, description, year").eq("user_id", userId).order("year", { ascending: false }),
        supabase.rpc("get_player_age", { _user_id: userId }),
        supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id).eq("blocked_id", userId).maybeSingle(),
      ]);
      setProfile((p.data as Profile | null) ?? null);
      setVideos((v.data ?? []) as Highlight[]);
      setAchievements((a.data ?? []) as Achievement[]);
      setAge(typeof ag.data === "number" ? ag.data : null);
      setBlocked(!!b.data);
    })();
  }, [userId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authLoading && user && needsMfa) return <Navigate to="/auth" replace />;
  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="title-2">Sign in to view this player</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">To keep young athletes safe, player profiles are only visible to signed-in players and verified scouts.</p>
        <Link to="/auth" className="press mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-[17px] font-semibold text-primary-foreground">Sign in</Link>
      </div>
    );
  }
  if (profile === undefined || authLoading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" /></div>;
  if (!profile) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="title-2">Profile unavailable</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">This player may have deleted their account, or your scout verification is still in progress.</p>
      </div>
    );
  }

  const name = profile.full_name || (profile.username ? `@${profile.username}` : "Player");
  const share = async () => {
    const url = publicUrl(`/resume/${userId}`);
    try {
      if (navigator.share) await navigator.share({ title: `${name} on Cholo Kheli`, url });
      else { await navigator.clipboard.writeText(url); toast.success("Profile link copied"); }
    } catch { /* cancelled */ }
  };
  const toggleBlock = async () => {
    if (!user) return;
    setMenu(false);
    if (blocked) {
      await supabase.from("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_id", userId);
      setBlocked(false); toast.success(`${name} unblocked`);
      return;
    }
    if (!confirm(`Block ${name}? They won't see your highlights or be able to comment, and you won't see theirs.`)) return;
    const { error } = await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: userId });
    if (error) { toast.error("Couldn't block"); return; }
    await supabase.from("follows" as never).delete().eq("follower_id", user.id).eq("followee_id", userId);
    setBlocked(true); setStats((s) => (s ? { ...s, i_follow: false } : s));
    toast.success(`${name} blocked`);
  };

  const totalViews = videos.reduce((n, v) => n + (v.view_count ?? 0), 0);

  return (
    <ProfileSurface avatarUrl={profile.avatar_url}>
    <div className="pb-6">
      <ProfileCard
        name={name}
        subtitle={[profile.username && `@${profile.username}`, isSport(profile.sport) && SPORT_LABEL[profile.sport], age !== null && `${age} years`].filter(Boolean).join("  ·  ")}
        avatarUrl={profile.avatar_url}
        counts={[{ label: "Highlights", value: videos.length },
          { label: "Followers", value: stats?.followers ?? 0, onClick: () => setList("followers") },
          { label: totalViews > 0 ? "Views" : "Following", value: totalViews > 0 ? totalViews : stats?.following ?? 0, onClick: totalViews > 0 ? undefined : () => setList("following") }]}
        topLeft={<HeroIconButton label="Back" onClick={() => (window.history.length > 1 ? window.history.back() : navigate({ to: "/" }))}><ChevronLeft className="h-5 w-5" /></HeroIconButton>}
        topRight={!blocked ? <>
          <HeroIconButton label="Share profile" onClick={share}><Share2 className="h-5 w-5" /></HeroIconButton>
          <HeroIconButton label="More" onClick={() => setMenu(true)}><MoreHorizontal className="h-5 w-5" /></HeroIconButton>
        </> : undefined}
      >
        {stats?.follows_me && <p className="mt-3 text-center text-[13px] text-white/60">Follows you</p>}
        {!blocked && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 [&>button]:h-12 [&>button]:w-full [&>button]:text-[16px]">
              <FollowButton userId={userId} following={!!stats?.i_follow} tone="dark"
                onChange={(on) => setStats((s) => (s ? { ...s, i_follow: on, followers: Math.max(0, s.followers + (on ? 1 : -1)) } : s))} />
            </div>
            <MessageButton otherId={userId} round />
          </div>
        )}
        {!blocked && role === "scout" && <div className="mt-3 flex justify-center"><ScoutSelectPlayer playerId={userId} playerName={name} /></div>}
      </ProfileCard>

      {blocked ? (
        <div className="mx-4 mt-6 rounded-[22px] bg-card p-5 text-center">
          <Ban className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="headline mt-2">You blocked {name}</p>
          <button type="button" onClick={toggleBlock} className="press mt-3 h-10 rounded-full bg-secondary px-5 text-[15px] font-semibold">Unblock</button>
        </div>
      ) : (
        <>
          <AboutSection bio={profile.bio ?? ""} />
          <AchievementsSection items={achievements} />
          <section className="mt-6 pt-[2px]">
            <HighlightGrid items={videos} emptyText={`${name.split(" ")[0]} hasn't shared a highlight yet.`} />
          </section>
        </>
      )}

      <FollowListSheet userId={userId} kind={list} onClose={() => setList(null)} />
      <BottomSheet open={menu} onClose={() => setMenu(false)} title={name} height="auto">
        <div className="ios-group m-3">
          <button type="button" onClick={toggleBlock} className="ios-row w-full text-left text-[16px] text-destructive"><Ban className="h-5 w-5" /> <span className="flex-1">Block</span></button>
          <div className="ios-row"><ReportUserButton userId={userId} name={name.split(" ")[0]} /></div>
        </div>
      </BottomSheet>
    </div>
    </ProfileSurface>
  );
};

export default PlayerResume;
