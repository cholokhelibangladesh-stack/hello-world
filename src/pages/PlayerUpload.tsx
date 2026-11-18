import { payUploadFee, takaFmt } from "@/lib/payments";
import BottomSheet from "@/components/social/BottomSheet";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Film, Loader2, PauseCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import VideoEditor, { type EditorState } from "@/components/upload/VideoEditor";
import { MAX_SECONDS, MAX_SOURCE_MB, fmtTime } from "@/lib/video/edit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StorageVideo from "@/components/StorageVideo";
import { removeStoredObject, storageUrl } from "@/lib/media";
import { haptic } from "@/lib/native";
import { POSITIONS, TRAITS, MAX_VIDEO_MB, VIDEO_TYPES, isSport, type Sport } from "@/lib/taxonomy";

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
  : v.status === "pending_payment" ? { text: "Awaiting payment", cls: "is-pending" }
  : v.status === "rejected" ? { text: "Removed", cls: "is-declined" }
  : { text: "Processing", cls: "is-pending" };

const PlayerUpload = () => {
  const { user } = useAuth();
  const [sport, setSport] = useState<Sport>("football");
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);
  const [editState, setEditState] = useState<EditorState | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [positions, setPositions] = useState<string[]>([]);
  const [traits, setTraits] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [uploading, setUploading] = useState(false);
  const [halted, setHalted] = useState(false);
  const [feeOn, setFeeOn] = useState(false);
  const [fee, setFee] = useState(100);
  const [payFor, setPayFor] = useState<{ id: string; title: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const [videos, setVideos] = useState<Video[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u);
  }, [file]);

  const load = async () => {
    if (!user) return;
    const [{ data: prof }, { data: vids }, { data: setting }, { data: feeRows }] = await Promise.all([
      supabase.from("profiles").select("sport").eq("user_id", user.id).maybeSingle(),
      supabase.from("videos").select("id, title, status, video_url, created_at, view_count, flagged").eq("user_id", user.id).neq("status", "draft").order("created_at", { ascending: false }),
      supabase.from("app_settings").select("value").eq("key", "video_uploads_halted").maybeSingle(),
      supabase.from("app_settings").select("key, value").in("key", ["upload_fee_enabled", "upload_fee_bdt"]),
    ]);
    const fv = (k: string) => (feeRows ?? []).find((r: { key: string }) => r.key === k)?.value as unknown;
    setFeeOn(fv("upload_fee_enabled") === true || fv("upload_fee_enabled") === "true");
    if (Number(fv("upload_fee_bdt")) > 0) setFee(Number(fv("upload_fee_bdt")));
    if (isSport(prof?.sport)) setSport(prof.sport);
    setVideos((vids ?? []) as Video[]);
    const v = setting?.value as unknown;
    setHalted(v === true || v === "true");
  };
  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("video/") && !TYPES.includes(f.type)) { toast.error("Choose a video."); return; }
    if (f.size > MAX_SOURCE_MB * 1024 * 1024) { toast.error("That video is too large to open. Pick a shorter clip."); return; }
    // Every clip opens in the editor first: trim to the best moments, crop, add text and sounds.
    setSource(f); setEditState(null); setFile(null); setDuration(null); setEditing(true);
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

  const reset = () => { setFile(null); setSource(null); setEditState(null); setDuration(null); setTitle(""); setDescription(""); setPositions([]); setTraits([]); setCustom(""); };

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
        duration_seconds: duration != null ? Math.round(duration * 10) / 10 : null,
      }).select("id").single();
      if (dbError) throw dbError;
      createdId = video.id;
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      path = `${user.id}/${video.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("player-videos").upload(path, file, { contentType: file.type || "video/mp4" });
      if (upErr) throw upErr;
      const { data: after, error: liveErr } = await supabase.from("videos").update({ video_url: storageUrl("player-videos", path), status: "live" }).eq("id", video.id).select("status").single();
      if (liveErr) throw liveErr;
      haptic("medium");
      reset(); load();
      if (after?.status === "pending_payment") {
        // The upload fee is on: the clip is saved and goes live once the bKash payment succeeds.
        setPayFor({ id: video.id, title: title.trim() || "Your highlight" });
      } else {
        toast.success("Highlight published", { description: "It's live in Explore for verified scouts." });
      }
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

  const startPay = async (id: string) => {
    setPaying(true);
    const r = await payUploadFee(id);
    if (!r.ok) {
      setPaying(false);
      if (r.reason === "not_configured") toast.error("bKash payments aren't switched on yet", { description: "The Cholo Kheli team is setting them up. Your highlight is saved." });
      else if (r.reason === "not_due") { toast.success("This highlight is already paid for"); setPayFor(null); load(); }
      else toast.error("Couldn't open bKash", { description: "Check your connection and try again." });
    }
  };

  const ready = !!file && !uploading && !halted;

  return (
    <div className="pb-6">
      <BottomSheet open={!!payFor} onClose={() => { if (!paying) setPayFor(null); }} title="Pay to publish" height="auto">
        {payFor && (
          <div className="space-y-4 px-5 pb-6 pt-1">
            <div className="flex items-center gap-3 rounded-[20px] bg-secondary p-4">
              <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[#E2136E] text-[15px] font-bold text-white">bKash</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-semibold">{payFor.title}</p>
                <p className="text-[14px] text-muted-foreground">Upload fee</p>
              </div>
              <p className="text-[22px] font-bold tabular-nums">{takaFmt(fee)}</p>
            </div>
            <ul className="space-y-1.5 text-[14px] text-muted-foreground">
              <li>· Your highlight goes live the moment the payment succeeds.</li>
              <li>· You get an invoice and a certificate of participation in your notifications.</li>
              <li>· Players under 18: ask a parent or guardian to pay.</li>
            </ul>
            <button type="button" onClick={() => startPay(payFor.id)} disabled={paying}
              className="press flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#E2136E] text-[17px] font-semibold text-white disabled:opacity-60">
              {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : null}{`Pay ${takaFmt(fee)} with bKash`}
            </button>
            <button type="button" onClick={() => setPayFor(null)} disabled={paying} className="press h-11 w-full rounded-full text-[15px] font-medium text-muted-foreground">Pay later</button>
          </div>
        )}
      </BottomSheet>
      {editing && source && (
        <VideoEditor file={source} initial={editState}
          onCancel={() => { setEditing(false); if (!file) setSource(null); }}
          onDone={(r) => { setFile(r.file); setDuration(r.duration); setEditState(r.plan); setEditing(false); }} />
      )}
      <header className="px-4 pt-4">
        <h1 className="large-title">Upload</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Share a clip of your best play, up to {MAX_SECONDS} seconds. Trim, crop, add text and sounds before you post.</p>
        {feeOn && <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#E2136E]/12 px-3 py-1.5 text-[14px] font-medium text-[#B0105A] dark:text-[#FF8CC0]">{`Upload fee ${takaFmt(fee)} per highlight, paid with bKash`}</p>}
      </header>

      {halted && (
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-[14px] bg-accent px-4 py-3">
          <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[15px]">Uploads are paused by the Cholo Kheli team for now. Your existing highlights are still live.</p>
        </div>
      )}

      <section className="px-4 pt-5">
        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        {file && preview ? (
          <div className="relative overflow-hidden rounded-[18px] bg-black">
            <video src={preview} className="aspect-[9/16] max-h-[52dvh] w-full object-contain" controls playsInline />
            <button type="button" onClick={() => setEditing(true)} className="press absolute left-3 top-3 flex h-9 items-center gap-1.5 rounded-full bg-black/60 px-3.5 text-[14px] font-semibold text-white">
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <button type="button" onClick={reset} aria-label="Remove video" className="press absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white">
              <X className="h-5 w-5" />
            </button>
            <p className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[12px] text-white">{duration != null ? `${fmtTime(duration)} · ` : ""}{(file.size / 1048576).toFixed(1)} MB</p>
          </div>
        ) : (
          <button type="button" disabled={halted} onClick={() => fileRef.current?.click()}
            className="press flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-border bg-card text-primary disabled:opacity-50">
            <Film className="h-9 w-9" strokeWidth={1.6} aria-hidden="true" />
            <span className="headline">Choose a video</span>
            <span className="footnote">Up to {MAX_SECONDS} seconds</span>
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
                  {v.status === "pending_payment" ? (
                    <button type="button" onClick={() => setPayFor({ id: v.id, title: v.title ?? "Highlight" })}
                      className="press h-8 shrink-0 rounded-full bg-[#E2136E] px-3 text-[13px] font-semibold text-white">{`Pay ${takaFmt(fee)}`}</button>
                  ) : <span className={`status-pill ${s.cls}`}>{s.text}</span>}
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
