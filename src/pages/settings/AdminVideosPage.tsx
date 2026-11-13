import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsCard } from "@/components/settings/SettingsControls";
import { Loader2, Video as VideoIcon, Flag, Play } from "lucide-react";
import StorageVideo from "@/components/StorageVideo";

type V = {
  id: string;
  title: string;
  status: string;
  flagged: boolean;
  view_count: number;
  like_count: number;
  created_at: string;
  video_url: string;
};

const AdminVideosPage = () => {
  const [rows, setRows] = useState<V[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("videos")
        .select("id, title, status, flagged, view_count, like_count, created_at, video_url")
        .order("created_at", { ascending: false })
        .limit(50);
      setRows((data ?? []) as V[]);
      setLoading(false);
    })();
  }, []);

  const live = rows.filter((r) => r.status === "live" && !r.flagged).length;
  const flagged = rows.filter((r) => r.flagged).length;

  return (
    <SettingsShell title="Video oversight" description={`${live} live · ${flagged} flagged`}>
      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <SettingsCard>
          {rows.map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-4 py-3">
              <div className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted dark:bg-black/40">
                <StorageVideo src={v.video_url} className="h-full w-full object-cover" muted preload="metadata" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{v.title || "Untitled"}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5">
                    <Play className="h-2.5 w-2.5" /> {v.view_count}
                  </span>
                  <span>·</span>
                  <span>{v.like_count} likes</span>
                  <span>·</span>
                  <span>{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {v.flagged ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--candy))]/50 bg-[hsl(var(--candy))]/10 px-2 py-0.5 text-[10px] font-semibold text-primary dark:text-[hsl(var(--candy))]">
                  <Flag className="h-3 w-3" /> Flag
                </span>
              ) : (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold  ${
                    v.status === "live"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {v.status.replace("_", " ")}
                </span>
              )}
            </div>
          ))}
          {rows.length === 0 && (
            <div className="p-8 text-center">
              <VideoIcon className="mx-auto h-6 w-6 text-muted-foreground" />
              <div className="mt-2 text-sm text-foreground/70">No videos yet.</div>
            </div>
          )}
        </SettingsCard>
      )}
    </SettingsShell>
  );
};

export default AdminVideosPage;
