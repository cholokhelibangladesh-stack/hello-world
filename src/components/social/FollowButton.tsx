import { useEffect, useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { haptic } from "@/lib/native";

export type FollowStats = { followers: number; following: number; i_follow: boolean; follows_me: boolean };

/** Followers / following counts for a profile, refreshed after you follow or unfollow. */
export function useFollowStats(userId: string | undefined) {
  const [stats, setStats] = useState<FollowStats | null>(null);
  const load = async () => {
    if (!userId) return;
    const { data } = await supabase.rpc("get_follow_stats" as never, { _user_id: userId } as never);
    const row = (data as unknown as FollowStats[] | null)?.[0];
    setStats(row ? { followers: Number(row.followers), following: Number(row.following), i_follow: row.i_follow, follows_me: row.follows_me } : null);
  };
  useEffect(() => { load(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
  return { stats, setStats, reload: load };
}

/** Follow / unfollow. Scouts see it as "Watchlist", which is what it means for them. */
export async function setFollowing(me: string, target: string, follow: boolean): Promise<boolean> {
  const { error } = follow
    ? await supabase.from("follows" as never).insert({ follower_id: me, followee_id: target } as never)
    : await supabase.from("follows" as never).delete().eq("follower_id", me).eq("followee_id", target);
  if (error && !(follow && error.code === "23505")) {
    toast.error(follow ? "Couldn't follow" : "Couldn't unfollow", {
      description: error.code === "42501" ? "This account isn't available to follow." : "Check your connection and try again.",
    });
    return false;
  }
  return true;
}

type Props = {
  userId: string;
  following: boolean;
  onChange?: (following: boolean) => void;
  size?: "sm" | "md";
  tone?: "light" | "dark";
};

const FollowButton = ({ userId, following, onChange, size = "md", tone = "light" }: Props) => {
  const { user, role } = useAuth();
  const [on, setOn] = useState(following);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOn(following), [following]);
  if (!user || user.id === userId || role === "admin") return null;

  const scout = role === "scout";
  const label = on ? (scout ? "On watchlist" : "Following") : (scout ? "Watchlist" : "Follow");
  const toggle = async () => {
    setBusy(true);
    const next = !on;
    setOn(next); onChange?.(next);
    const ok = await setFollowing(user.id, userId, next);
    if (!ok) { setOn(!next); onChange?.(!next); } else haptic("light");
    setBusy(false);
  };

  const h = size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-5 text-[15px]";
  const style = on
    ? tone === "dark" ? "bg-white/15 text-white border border-white/30" : "bg-secondary text-foreground"
    : tone === "dark" ? "bg-white text-black" : "bg-primary text-primary-foreground";
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={on}
      className={`press inline-flex items-center justify-center gap-1.5 rounded-full font-semibold ${h} ${style}`}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : on ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {label}
    </button>
  );
};

export default FollowButton;
