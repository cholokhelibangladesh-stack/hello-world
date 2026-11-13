import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Ban, Eye, Flag, Heart, Loader2, RotateCcw, Search, ShieldAlert, Trash2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { safeMediaUrl } from "@/lib/sanitize";
import { removeStoredObject } from "@/lib/media";
import { SPORTS, SPORT_LABEL, formatCount, timeAgo } from "@/lib/taxonomy";
import StorageVideo from "@/components/StorageVideo";
import BottomSheet from "@/components/social/BottomSheet";
import BanDialog from "@/components/admin/BanDialog";
import RemoveVideoDialog from "@/components/admin/RemoveVideoDialog";

type Row = {
  id: string; user_id: string; video_url: string | null; title: string | null; description: string | null;
  status: string; flagged: boolean; flag_reason: string | null; view_count: number; like_count: number; created_at: string;
  full_name: string; username: string | null; sport: string | null; avatar_url: string | null; is_banned: boolean; reports: number;
};
type Status = "all" | "live" | "review" | "removed";
type Sort = "newest" | "views" | "reports";
const PAGE = 60;

/** Every highlight on the platform, with filters and one-tap moderation. */
const AdminExplore = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [status, setStatus] = useState<Status>("all");
  const [sport, setSport] = useState<string>("any");
  const [sort, setSort] = useState<Sort>("newest");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Row | null>(null);
  const [removeFor, setRemoveFor] = useState<Row | null>(null);
  const [moderate, setModerate] = useState<Row | null>(null);

  const load = useCallback(async () => {
    let q = supabase.from("videos")
      .select("id, user_id, video_url, title, description, status, flagged, flag_reason, view_count, like_count, created_at")
      .neq("status", "draft").limit(limit);
    if (status === "live") q = q.eq("status", "live").eq("flagged", false);
    if (status === "review") q = q.eq("flagged", true).neq("status", "rejected");
    if (status === "removed") q = q.eq("status", "rejected");
    q = sort === "views" ? q.order("view_count", { ascending: false }) : q.order("created_at", { ascending: false });
    const { data: vids, error } = await q;
    if (error) { toast.error("Couldn't load highlights"); setRows([]); return; }
    const ids = [...new Set((vids ?? []).map((v) => v.user_id))];
    const vidIds = (vids ?? []).map((v) => v.id);
    const [{ data: profs }, { data: reps }] = await Promise.all([
      ids.length ? supabase.from("profiles").select("user_id, full_name, username, sport, avatar_url, is_banned").in("user_id", ids) : Promise.resolve({ data: [] }),
      vidIds.length ? supabase.from("user_reports").select("video_id").in("video_id" as never, vidIds as never).in("status", ["new", "reviewing"]) : Promise.resolve({ data: [] }),
    ]);
    const pm = new Map((profs ?? []).map((p) => [p.user_id, p]));
    const rc = new Map<string, number>();
    ((reps ?? []) as { video_id: string }[]).forEach((r) => rc.set(r.video_id, (rc.get(r.video_id) ?? 0) + 1));
    setRows((vids ?? []).map((v) => {
      const p = pm.get(v.user_id) as Partial<Row> | undefined;
      return { ...(v as unknown as Row), full_name: p?.full_name ?? "Unknown", username: p?.username ?? null, sport: p?.sport ?? null,
        avatar_url: p?.avatar_url ?? null, is_banned: !!p?.is_banned, reports: rc.get(v.id) ?? 0 };
    }));
  }, [status, sort, limit]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = (rows ?? []).filter((r) => (sport === "any" || r.sport === sport)
      && (!q || [r.title, r.description, r.full_name, r.username].some((x) => x?.toLowerCase().includes(q))));
    if (sort === "reports") list = [...list].sort((a, b) => b.reports - a.reports);
    return list;
  }, [rows, query, sport, sort]);

  const patch = (id: string, p: Partial<Row>) => {
    setRows((list) => list?.map((r) => (r.id === id ? { ...r, ...p } : r)) ?? list);
    setSelected((s) => (s && s.id === id ? { ...s, ...p } : s));
  };

  const restore = async (r: Row) => {
    const { error } = await supabase.rpc("admin_restore_video" as never, { _video_id: r.id, _note: null } as never);
    if (error) { toast.error("Couldn't restore", { description: error.message }); return; }
    patch(r.id, { status: "live", flagged: false, flag_reason: null });
    toast.success("Highlight restored", { description: "The player has been told." });
  };
  const markReview = async (r: Row, on: boolean) => {
    const { error } = await supabase.from("videos").update({ flagged: on, flag_reason: on ? "Held for review by an admin" : null }).eq("id", r.id);
    if (error) { toast.error("Couldn't update"); return; }
    patch(r.id, { flagged: on });
    toast.success(on ? "Hidden while you review it" : "Back in Explore");
  };
  const destroy = async (r: Row) => {
    if (!confirm("Delete this highlight and its file for good? Use Remove instead if you might restore it.")) return;
    const { error } = await supabase.from("videos").delete().eq("id", r.id);
    if (error) { toast.error("Couldn't delete"); return; }
    await removeStoredObject(r.video_url, "player-videos");
    setRows((list) => list?.filter((x) => x.id !== r.id) ?? list);
    setSelected(null);
    toast.success("Deleted");
  };

  const pill = (r: Row) => r.status === "rejected" ? <span className="status-pill is-declined">Removed</span>
    : r.flagged ? <span className="status-pill is-pending">In review</span> : <span className="status-pill is-approved">Live</span>;

  return (
    <div className="pb-6">
      <header className="px-4 pt-4">
        <h1 className="large-title">Content</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Review, remove and restore highlights.</p>
      </header>

      <div className="ios-bar sticky top-14 z-10 space-y-2 px-4 pb-2 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="admin-content-search" className="sr-only">Search</label>
          <input id="admin-content-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Title, player or @username"
            className="h-10 w-full rounded-xl bg-secondary pl-9 pr-3 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="grid grid-cols-4 rounded-xl bg-secondary p-1" role="radiogroup" aria-label="Status">
          {([["all", "All"], ["live", "Live"], ["review", "Review"], ["removed", "Removed"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={status === v} onClick={() => setStatus(v)}
              className={`h-8 rounded-[9px] text-[14px] font-medium ${status === v ? "bg-card shadow-[0_1px_3px_hsl(var(--foreground)/0.12)]" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {[["any", "All sports"], ...SPORTS.map((s) => [s, SPORT_LABEL[s]])].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setSport(v)} aria-pressed={sport === v}
              className={`press shrink-0 rounded-full px-3 py-1 text-[14px] ${sport === v ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{l}</button>
          ))}
          <span className="mx-1 w-px shrink-0 bg-border" aria-hidden="true" />
          {([["newest", "Newest"], ["views", "Most viewed"], ["reports", "Most reported"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setSort(v)} aria-pressed={sort === v}
              className={`press shrink-0 rounded-full px-3 py-1 text-[14px] ${sort === v ? "bg-foreground text-background" : "bg-secondary"}`}>{l}</button>
          ))}
        </div>
      </div>

      {rows === null ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : shown.length === 0 ? (
        <p className="px-4 py-16 text-center text-[15px] text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="ios-group mx-4 mt-2">
          {shown.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setSelected(r)} className="ios-row w-full text-left">
                <StorageVideo src={r.video_url} fragment="#t=1" muted playsInline preload="metadata" className="h-16 w-12 shrink-0 rounded-md bg-muted object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{r.title ?? "Highlight"}</span>
                  <span className="block truncate text-[13px] text-muted-foreground">{r.username ? `@${r.username}` : r.full_name} · {timeAgo(r.created_at)}</span>
                  <span className="mt-0.5 flex items-center gap-3 text-[12px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{formatCount(r.view_count)}</span>
                    <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{formatCount(r.like_count)}</span>
                    {r.reports > 0 && <span className="inline-flex items-center gap-1 font-semibold text-destructive"><Flag className="h-3.5 w-3.5" />{r.reports}</span>}
                    {r.is_banned && <span className="inline-flex items-center gap-1 text-destructive"><Ban className="h-3.5 w-3.5" />Banned</span>}
                  </span>
                </span>
                {pill(r)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {rows && rows.length >= limit && (
        <div className="px-4 pt-3"><button type="button" onClick={() => setLimit((l) => l + PAGE)} className="press h-11 w-full rounded-full bg-secondary text-[15px] font-semibold">Load more</button></div>
      )}

      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? "Highlight"} height="90dvh">
        {selected && (
          <div className="flex h-full flex-col overflow-y-auto">
            <div className="relative aspect-[9/12] w-full shrink-0 bg-black">
              <StorageVideo key={selected.id} src={selected.video_url} controls playsInline className="absolute inset-0 h-full w-full object-contain" />
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 overflow-hidden rounded-full bg-secondary">{selected.avatar_url && <img src={safeMediaUrl(selected.avatar_url)} alt="" className="h-full w-full object-cover" />}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-semibold">{selected.full_name}</p><p className="text-[13px] text-muted-foreground">{selected.username ? `@${selected.username} · ` : ""}{selected.sport ?? ""}</p></div>
                {pill(selected)}
              </div>
              {selected.description && <p className="text-[15px]">{selected.description}</p>}
              {selected.flag_reason && <p className="rounded-xl bg-secondary px-3 py-2 text-[14px]"><ShieldAlert className="mr-1 inline h-4 w-4" />{selected.flag_reason}</p>}
              {selected.reports > 0 && <Link to="/admin/reports" className="block text-[14px] font-semibold text-destructive">{selected.reports} open report{selected.reports > 1 ? "s" : ""}, review them</Link>}
              <div className="ios-group">
                {selected.status === "rejected" ? (
                  <button type="button" onClick={() => restore(selected)} className="ios-row w-full text-left text-[16px]"><RotateCcw className="h-5 w-5 text-primary" /><span className="flex-1">Restore and tell the player</span></button>
                ) : (
                  <>
                    <button type="button" onClick={() => setRemoveFor(selected)} className="ios-row w-full text-left text-[16px] text-destructive"><ShieldAlert className="h-5 w-5" /><span className="flex-1">Remove with notice</span></button>
                    <button type="button" onClick={() => markReview(selected, !selected.flagged)} className="ios-row w-full text-left text-[16px]"><Flag className="h-5 w-5 text-primary" /><span className="flex-1">{selected.flagged ? "Finish review, show in Explore" : "Hide while reviewing"}</span></button>
                  </>
                )}
                <button type="button" onClick={() => setModerate(selected)} className="ios-row w-full text-left text-[16px]"><Ban className="h-5 w-5 text-primary" /><span className="flex-1">{selected.is_banned ? "Lift restriction on player" : "Warn, suspend or ban player"}</span></button>
                <Link to={`/resume/${selected.user_id}` as never} className="ios-row text-[16px]"><UserIcon className="h-5 w-5 text-primary" /><span className="flex-1">Open profile</span></Link>
                <button type="button" onClick={() => destroy(selected)} className="ios-row w-full text-left text-[16px] text-destructive"><Trash2 className="h-5 w-5" /><span className="flex-1">Delete permanently</span></button>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      {removeFor && <RemoveVideoDialog videoId={removeFor.id} title={removeFor.title ?? "Highlight"} open onOpenChange={(o) => !o && setRemoveFor(null)}
        onDone={() => patch(removeFor.id, { status: "rejected", flagged: true })} />}
      {moderate && <BanDialog open onOpenChange={(o) => !o && setModerate(null)} targetUserId={moderate.user_id} targetName={moderate.full_name}
        initialAction={moderate.is_banned ? "unban" : "suspend"}
        onDone={(a) => { if (a === "warn") return; const banned = a !== "unban"; setRows((list) => list?.map((r) => (r.user_id === moderate.user_id ? { ...r, is_banned: banned } : r)) ?? list); setSelected((s) => (s ? { ...s, is_banned: banned } : s)); }} />}
    </div>
  );
};

export default AdminExplore;
