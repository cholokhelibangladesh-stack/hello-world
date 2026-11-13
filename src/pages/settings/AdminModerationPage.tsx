import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SettingsShell from "@/components/settings/SettingsShell";
import { SettingsCard } from "@/components/settings/SettingsControls";
import { Loader2, AlertTriangle, Flag, ShieldCheck, Video } from "lucide-react";

type Alert = {
  id: string;
  kind: "scout_request" | "video" | "scout";
  target_id: string;
  target_user_id: string | null;
  status: "new" | "resolved";
  created_at: string;
  /** Human-readable subject, resolved after load (player/scout name, video title). */
  subject?: string;
};

const kindMeta: Record<Alert["kind"], { label: string; Icon: any }> = {
  scout_request: { label: "Scout request", Icon: ShieldCheck },
  video: { label: "Video", Icon: Video },
  scout: { label: "Scout profile", Icon: Flag },
};

const AdminModerationPage = () => {
  const [rows, setRows] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"new" | "resolved">("new");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("moderation_alerts")
        .select("id, kind, target_id, target_user_id, status, created_at")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(50);
      const alerts = (data ?? []) as Alert[];
      // Show who/what each alert is about instead of a raw UUID.
      const userIds = [...new Set(alerts.map((a) => a.target_user_id).filter(Boolean))] as string[];
      const videoIds = alerts.filter((a) => a.kind === "video").map((a) => a.target_id);
      const [{ data: people }, { data: vids }] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("user_id, full_name, username").in("user_id", userIds)
          : Promise.resolve({ data: [] as { user_id: string; full_name: string; username: string | null }[] }),
        videoIds.length
          ? supabase.from("videos").select("id, title, description").in("id", videoIds)
          : Promise.resolve({ data: [] as { id: string; title: string; description: string }[] }),
      ]);
      const nameOf = new Map((people ?? []).map((p) => [p.user_id, p.username ? `${p.full_name} (@${p.username})` : p.full_name]));
      const videoOf = new Map((vids ?? []).map((v) => [v.id, v.title && v.title !== "Untitled" ? v.title : v.description]));
      setRows(
        alerts.map((a) => {
          const who = a.target_user_id ? nameOf.get(a.target_user_id) : undefined;
          const what = a.kind === "video" ? videoOf.get(a.target_id) : undefined;
          return { ...a, subject: [what && `"${what}"`, who].filter(Boolean).join(" · ") || undefined };
        }),
      );
      setLoading(false);
    })();
  }, [tab]);

  return (
    <SettingsShell title="Moderation queue" description="Flagged content awaiting review">
      <div className="mb-3 inline-flex rounded-2xl border border-border/70 bg-muted/40 dark:border-border dark:bg-card p-1">
        {(["new", "resolved"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/70 hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <SettingsCard>
          <div className="p-8 text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-muted-foreground" />
            <div className="mt-2 text-sm font-medium">Nothing in the {tab} queue</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {tab === "new" ? "All caught up." : "No resolved alerts yet."}
            </div>
          </div>
        </SettingsCard>
      ) : (
        <SettingsCard>
          {rows.map((r) => {
            const m = kindMeta[r.kind];
            const Icon = m.Icon;
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--candy))]/20 text-primary dark:text-[hsl(var(--candy))]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className={`truncate text-xs text-muted-foreground ${r.subject ? "" : "font-mono text-[10px]"}`}>
                    {r.subject ?? r.target_id}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </SettingsCard>
      )}
    </SettingsShell>
  );
};

export default AdminModerationPage;
