import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SettingsShell from "@/components/settings/SettingsShell";
import { Heart, Share2, Eye, Loader2 } from "lucide-react";

const ActivityPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ likes: number; shares: number; views: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [likes, shares, views] = await Promise.all([
        supabase.from("video_likes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("video_shares").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("video_events").select("*", { count: "exact", head: true }).eq("viewer_id", user.id),
      ]);
      setStats({ likes: likes.count ?? 0, shares: shares.count ?? 0, views: views.count ?? 0 });
    })();
  }, [user]);

  if (!stats) {
    return (
      <SettingsShell title="Your activity">
        <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin" /></div>
      </SettingsShell>
    );
  }

  const tiles = [
    { icon: Heart, label: "Likes", value: stats.likes, tint: "text-rose-400" },
    { icon: Share2, label: "Shares", value: stats.shares, tint: "text-sky-400" },
    { icon: Eye, label: "Views", value: stats.views, tint: "text-emerald-400" },
  ];

  return (
    <SettingsShell title="Your activity" description="Everything you've done on Cholo Kheli">
      <div className="grid grid-cols-3 gap-2">
        {tiles.map(({ icon: Icon, label, value, tint }) => (
          <div key={label} className="ios-group p-4 text-center">
            <Icon className={`mx-auto h-5 w-5 ${tint}`} />
            <div className="mt-2 text-xl font-semibold tabular-nums">{value}</div>
            <div className="text-[11px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Interactions across every video you've watched, liked or shared.
      </p>
    </SettingsShell>
  );
};

export default ActivityPage;
