import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Film, Loader2, PauseCircle, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StorageVideo from "@/components/StorageVideo";
import { removeStoredObject, storageUrl } from "@/lib/media";
import { haptic } from "@/lib/native";
import { POSITIONS, TRAITS, MAX_VIDEO_MB, VIDEO_TYPES, isSport, type Sport } from "@/lib/taxonomy";

const MAX_MB = MAX_VIDEO_MB;
const TYPES = VIDEO_TYPES;

type Video = { id: string; title: string | null; status: string; video_url: string; created_at: string; view_count: number; flagged: boolean | null };

const Chip = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
  <button type="button" aria-pressed={on} onClick={onClick}
    className={`press rounded-full px-3.5 py-1.5 text-[15px] ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
    {label}
  </button>
);

const statusLabel = (v: Video) =>
  v.flagged ? { text: "Under review", cls: "is-pending" }
  : v.status === "live" ? { text: "Live", cls: "is-approved" }
  : v.status === "rejected" ? { text: "Removed", cls: "is-declined" }
  : { text: "Processing", cls: "is-pending" };

const PlayerUpload = () => {
  const { user } = useAuth();
  const [sport, setSport] = useState<Sport>("football");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [positions, setPositions] = useState<string[]>([]);
  const [traits, setTraits] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [uploading, setUploading] = useState(false);
  const [halted, setHalted] = useState(false);
  const [videos, setVideos] = useState<Video[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const load = async () => {
    if (!user) return;
    const [{ data: prof }, { data: vids }, { data: setting }] = await Promise.all([
      supabase.from("profiles").select("sport").eq("user_id", user.id).maybeSingle(),
      supabase.from("videos").select("id, title, status, video_url, created_at, view_count, flagged").eq("user_id", user.id).neq("status", "draft").order("created_at", { ascending: false }),
      supabase.from("app_settings").select("value").eq("key", "video_uploads_halted").maybeSingle(),
    ]);
    if (isSport(prof?.sport)) setSport(prof.sport);
    setVideos((vids ?? []) as Video[]);
    const v = setting?.value as unknown;
    setHalted(v === true || v === "true");
  };
  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!TYPES.includes(f.type)) { toast.error("Choose an MP4, MOV or WebM video."); return; }
    if (f.size > MAX_MB * 1024 * 1024) { toast.error(`That video is over ${MAX_MB} MB. Trim it to your best moments and try again.`); return; }
    setFile(f);
  };

  const changeSport = async (s: Sport) => {
    if (!user || s === sport) return;
    setSport(s); setPositions([]); setTraits([]);
    const { error } = await supabase.from("profiles").update({ sport: s }).eq("user_id", user.id);
    if (error) toast.error("Couldn't update your sport");
  };

  const toggle = (list: string[], set: (v: string[]) => void, tag: string, max: number) => {
    if (list.includes(tag)) set(list.filter((t) => t !== tag));
    else if (list.length < max) set([...list, tag]);
    else toast(`Choose up to ${max}.`);
  };

  const reset = () => { setFile(null); setTitle(""); setDescription(""); setPositions([]); setTraits([]); setCustom(""); };

  const upload = async () => {
    if (!user || !file) return;
    setUploading(true);
    let createdId: string | null = null;
    let path: string | null = null;
    try {
      const { data: video, error: dbError } = await supabase.from("videos").insert({
        user_id: user.id, title: title.trim().slice(0, 120) || `${sport[0].toUpperCase()}${sport.slice(1)} highlight`,
        description: description.trim().slice(0, 1000) || undefined, video_url: "", status: "draft",
        position_tags: positions, trait_tags: traits,
      }).select("id").single();
      if (dbError) throw dbError;
      createdId = video.id;
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      path = `${user.id}/${video.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("player-videos").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: liveErr } = await supabase.from("videos").update({ video_url: storageUrl("player-videos", path), status: "live" }).eq("id", video.id);
      if (liveErr) throw liveErr;
      haptic("medium");
      toast.success("Highlight published", { description: "It's live in Explore for verified scouts." });
      reset(); load();
    } catch (e) {
      if (path) await supabase.storage.from("player-videos").remove([path]);
      if (createdId) await supabase.from("videos").delete().eq("id", createdId);
      const msg = (e as { message?: string }).message ?? "";
      toast.error("Upload failed", { description: msg.includes("paused") ? "Uploads are paused right now. Try again later." : "Check your connection and try again." });
    } finally { setUploading(false); }
  };

  const remove = async (v: Video) => {
    if (!confirm(`Delete “${v.title ?? "this highlight"}”? This can't be undone.`)) return;
    const { error } = await supabase.from("videos").delete().eq("id", v.id);
    if (error) { toast.error("Couldn't delete that highlight"); return; }
    await removeStoredObject(v.video_url, "player-videos");
    setVideos((list) => (list ?? []).filter((x) => x.id !== v.id));
    toast.success("Highlight deleted");
  };

  const ready = !!file && !uploading && !halted;

  return (
    <div className="pb-6">
      <header className="px-4 pt-4">
        <h1 className="large-title">Upload</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Share a clip of your best play. Up to {MAX_MB} MB.</p>
      </header>

      {halted && (
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-[14px] bg-accent px-4 py-3">
          <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[15px]">Uploads are paused by the Cholo Kheli team for now. Your existing highlights are still live.</p>
        </div>
      )}

      <section className="px-4 pt-5">
        <input ref={fileRef} type="file" accept={TYPES.join(",")} className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        {file && preview ? (
          <div className="relative overflow-hidden rounded-[18px] bg-black">
            <video src={preview} className="aspect-[9/16] max-h-[52dvh] w-full object-contain" controls playsInline muted />
            <button type="button" onClick={() => setFile(null)} aria-label="Remove video" className="press absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white">
              <X className="h-5 w-5" />
            </button>
            <p className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[12px] text-white">{(file.size / 1048576).toFixed(1)} MB</p>
          </div>
        ) : (
          <button type="button" disabled={halted} onClick={() => fileRef.current?.click()}
            className="press flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-border bg-card text-primary disabled:opacity-50">
            <Film className="h-9 w-9" strokeWidth={1.6} aria-hidden="true" />
            <span className="headline">Choose a video</span>
            <span className="footnote">MP4, MOV or WebM</span>
          </button>
        )}
      </section>

      <section className="space-y-5 px-4 pt-6">
        <div>
          <h2 className="ios-group-label !px-0">Sport</h2>
          <div className="grid grid-cols-3 rounded-xl bg-secondary p-1" role="radiogroup" aria-label="Sport">
            {(["football", "cricket", "basketball"] as Sport[]).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={sport === s} onClick={() => changeSport(s)}
                className={`h-9 rounded-[9px] text-[15px] font-medium capitalize ${sport === s ? "bg-card shadow-[0_1px_3px_hsl(var(--foreground)/0.12)]" : "text-muted-foreground"}`}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="title" className="ios-group-label !px-0 block">Title</label>
          <input id="title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Solo goal vs Uttara Youth"
            className="h-12 w-full rounded-xl bg-card px-4 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <h2 className="ios-group-label !px-0">Positions <span className="font-normal">(up to 3)</span></h2>
          <div className="flex flex-wrap gap-2">
            {[...POSITIONS[sport], ...positions.filter((p) => !POSITIONS[sport].includes(p))].map((p) => (
              <Chip key={p} label={p} on={positions.includes(p)} onClick={() => toggle(positions, setPositions, p, 3)} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="ios-group-label !px-0">What it shows <span className="font-normal">(up to 5)</span></h2>
          <div className="flex flex-wrap gap-2">
            {[...TRAITS[sport], ...traits.filter((t) => !TRAITS[sport].includes(t))].map((t) => (
              <Chip key={t} label={t} on={traits.includes(t)} onClick={() => toggle(traits, setTraits, t, 5)} />
            ))}
            <form className="flex items-center" onSubmit={(e) => { e.preventDefault(); const v = custom.trim().slice(0, 30); if (v) { toggle(traits, setTraits, v, 5); setCustom(""); } }}>
              <label htmlFor="custom-trait" className="sr-only">Add your own</label>
              <input id="custom-trait" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add your own" maxLength={30}
                className="h-[34px] w-32 rounded-full bg-secondary px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-ring" />
              <button type="submit" aria-label="Add" className="ml-1 grid h-[34px] w-[34px] place-items-center rounded-full text-primary"><Plus className="h-5 w-5" /></button>
            </form>
          </div>
        </div>
        <div>
          <label htmlFor="desc" className="ios-group-label !px-0 block">Description</label>
          <textarea id="desc" value={description} maxLength={1000} rows={3} onChange={(e) => setDescription(e.target.value)}
            placeholder="Match, opponent, what scouts should watch for"
            className="w-full resize-none rounded-xl bg-card px-4 py-3 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button type="button" disabled={!ready} onClick={upload}
          className="press flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary text-[17px] font-semibold text-primary-foreground disabled:opacity-40">
          {uploading ? <><Loader2 className="h-5 w-5 animate-spin" /> Uploading…</> : "Publish highlight"}
        </button>
        <p className="footnote text-center">Highlights go live straight away. Admins review flagged clips.</p>
      </section>

      <section className="px-4 pt-8">
        <h2 className="title-2 pb-2">Your highlights</h2>
        {videos === null ? (
          <div className="sk-shimmer h-20 rounded-[14px]" />
        ) : videos.length === 0 ? (
          <p className="ios-group px-4 py-5 text-[15px] text-muted-foreground">Nothing yet. Your published highlights will appear here.</p>
        ) : (
          <ul className="ios-group">
            {videos.map((v) => {
              const s = statusLabel(v);
              return (
                <li key={v.id} className="ios-row">
                  <StorageVideo src={v.video_url} fragment="#t=1" muted playsInline preload="metadata" className="h-14 w-10 shrink-0 rounded-md bg-muted object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px]">{v.title ?? "Highlight"}</p>
                    <p className="footnote">{new Date(v.created_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })} · {v.view_count} views</p>
                  </div>
                  <span className={`status-pill ${s.cls}`}>{s.text}</span>
                  <button type="button" onClick={() => remove(v)} aria-label={`Delete ${v.title ?? "highlight"}`} className="grid h-9 w-9 place-items-center rounded-full text-destructive">
                    <Trash2 className="h-[18px] w-[18px]" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default PlayerUpload;
