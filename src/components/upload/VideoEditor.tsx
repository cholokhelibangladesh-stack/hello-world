import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { toast } from "sonner";
import { Crop as CropIcon, Loader2, Music2, Pause, Play, Plus, Scissors, Trash2, Type, X } from "lucide-react";
import { TEXT_FONTS, fontStack, loadEditorFonts, type TextFontId } from "@/lib/video/fonts";
import { SFX, playSfx, type SfxId } from "@/lib/video/sfx";
import {
  MAX_SECONDS, MIN_SECONDS, canEditVideo, drawTexts, fmtTime, isEdited, renderEdit,
  type Crop, type EditPlan, type SfxItem, type TextBounds, type TextItem,
} from "@/lib/video/edit";
import { MAX_VIDEO_MB } from "@/lib/taxonomy";

export type EditResult = { file: File; duration: number; edited: boolean; plan: EditorState };
/** Everything needed to reopen the editor where the player left it. */
export type EditorState = {
  start: number; end: number; aspect: AspectId; zoom: number; cx: number | null; cy: number | null;
  texts: TextItem[]; sfx: SfxItem[]; originalVolume: number;
};

type AspectId = "original" | "9:16" | "4:5" | "1:1" | "16:9";
const ASPECTS: { id: AspectId; label: string; r: number | null }[] = [
  { id: "original", label: "Original", r: null },
  { id: "9:16", label: "9:16", r: 9 / 16 },
  { id: "4:5", label: "4:5", r: 4 / 5 },
  { id: "1:1", label: "1:1", r: 1 },
  { id: "16:9", label: "16:9", r: 16 / 9 },
];
const COLORS = ["#FFFFFF", "#7EC8FF", "#5FD3B5", "#FFD43B", "#FF6B6B", "#0E2A33"];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const uid = () => Math.random().toString(36).slice(2, 9);

const cropRect = (W: number, H: number, aspect: AspectId, zoom: number, cx: number | null, cy: number | null): Crop | null => {
  const r = ASPECTS.find((a) => a.id === aspect)?.r ?? null;
  if (!r && zoom <= 1.001) return null;
  const ar = r ?? W / H;
  let w = W, h = W / ar;
  if (h > H) { h = H; w = H * ar; }
  w = Math.round(w / zoom / 2) * 2; h = Math.round(h / zoom / 2) * 2;
  const x = clamp((cx ?? W / 2) - w / 2, 0, W - w);
  const y = clamp((cy ?? H / 2) - h / 2, 0, H - h);
  return { x: Math.round(x), y: Math.round(y), w, h };
};

/** Two-thumb slider built from two native range inputs (keyboard and screen-reader friendly). */
const DualRange = ({ min, max, step = 0.1, a, b, onChange, labelA, labelB, marker }: {
  min: number; max: number; step?: number; a: number; b: number; onChange: (a: number, b: number, moved: "a" | "b") => void;
  labelA: string; labelB: string; marker?: number;
}) => {
  const pct = (v: number) => (max > min ? ((v - min) / (max - min)) * 100 : 0);
  return (
    <div className="dual-range relative h-11">
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/15" />
      <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#7EC8FF]" style={{ left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%` }} />
      {marker !== undefined && <div className="absolute top-1 bottom-1 w-0.5 rounded bg-white" style={{ left: `${pct(clamp(marker, min, max))}%` }} />}
      <input type="range" aria-label={labelA} min={min} max={max} step={step} value={a} onChange={(e) => onChange(Math.min(+e.target.value, b - step), b, "a")} />
      <input type="range" aria-label={labelB} min={min} max={max} step={step} value={b} onChange={(e) => onChange(a, Math.max(+e.target.value, a + step), "b")} />
    </div>
  );
};

const Tab = ({ on, onClick, Icon, label }: { on: boolean; onClick: () => void; Icon: typeof Scissors; label: string }) => (
  <button type="button" onClick={onClick} aria-pressed={on}
    className={`press flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[12px] font-medium ${on ? "bg-white text-[#0E2A33]" : "text-white/75"}`}>
    <Icon className="h-5 w-5" />{label}
  </button>
);

const VideoEditor = ({ file, initial, onCancel, onDone }: {
  file: File; initial?: EditorState | null; onCancel: () => void; onDone: (r: EditResult) => void;
}) => {
  const [src, setSrc] = useState<string>();
  useEffect(() => { const u = URL.createObjectURL(file); setSrc(u); return () => URL.revokeObjectURL(u); }, [file]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<TextBounds[]>([]);

  const [meta, setMeta] = useState<{ duration: number; w: number; h: number } | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"trim" | "crop" | "text" | "sound">("trim");
  const [stage, setStage] = useState({ w: 360, h: 480 });
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [s, setS] = useState<EditorState>(() => initial ?? { start: 0, end: 0, aspect: "original", zoom: 1, cx: null, cy: null, texts: [], sfx: [], originalVolume: 1 });
  const set = (patch: Partial<EditorState>) => setS((p) => ({ ...p, ...patch }));

  useEffect(() => { loadEditorFonts(); canEditVideo().then(setSupported); }, []);

  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  const onMeta = () => {
    const v = videoRef.current; if (!v) return;
    const duration = Number.isFinite(v.duration) ? v.duration : 0;
    setMeta({ duration, w: v.videoWidth, h: v.videoHeight });
    if (!initial) setS((p) => ({ ...p, start: 0, end: Math.min(duration, MAX_SECONDS) }));
  };

  // Filmstrip for the trim bar (only where the device can decode with WebCodecs).
  useEffect(() => {
    if (!meta || !supported) return;
    let alive = true;
    (async () => {
      try {
        const mb = await import("mediabunny");
        const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
        const track = await input.getPrimaryVideoTrack(); if (!track) return;
        const sink = new mb.CanvasSink(track, { height: 96 });
        const n = 8; const ts = Array.from({ length: n }, (_, i) => (meta.duration * (i + 0.5)) / n);
        const out: string[] = [];
        for await (const c of sink.canvasesAtTimestamps(ts)) {
          if (!alive) break;
          if (!c) { out.push(""); continue; }
          const cv = c.canvas;
          const blob = "convertToBlob" in cv ? await (cv as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality: 0.6 }) : await new Promise<Blob | null>((r) => (cv as HTMLCanvasElement).toBlob(r, "image/jpeg", 0.6));
          out.push(blob ? URL.createObjectURL(blob) : "");
        }
        input.dispose?.();
        if (alive) setThumbs(out);
      } catch { /* filmstrip is decoration */ }
    })();
    return () => { alive = false; };
  }, [meta, supported, file]);
  useEffect(() => () => thumbs.forEach((u) => u && URL.revokeObjectURL(u)), [thumbs]);

  const crop = meta ? cropRect(meta.w, meta.h, s.aspect, s.zoom, s.cx, s.cy) : null;
  const view = crop ?? (meta ? { x: 0, y: 0, w: meta.w, h: meta.h } : { x: 0, y: 0, w: 9, h: 16 });
  const ar = view.w / view.h;
  const frameW = Math.max(1, Math.min(stage.w, stage.h * ar));
  const frameH = frameW / ar;
  const scale = frameW / view.w;
  const dur = Math.max(0, s.end - s.start);

  // Draw text overlays on top of the preview.
  const drawOverlay = useCallback((t: number) => {
    const c = overlayRef.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(frameW * dpr)) { c.width = Math.round(frameW * dpr); c.height = Math.round(frameH * dpr); }
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, frameW, frameH);
    boundsRef.current = drawTexts(ctx, s.texts, t, frameW, frameH);
    if (tab === "text" && selected) {
      const b = boundsRef.current.find((x) => x.id === selected);
      if (b) { ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.5; ctx.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8); ctx.restore(); }
    }
  }, [frameW, frameH, s.texts, tab, selected]);

  // Playback loop: stays inside the trim, fires sound effects in the preview, keeps the overlay in sync.
  const lastT = useRef(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        if (v.currentTime >= s.end - 0.03 || v.currentTime < s.start - 0.3) { v.currentTime = s.start; lastT.current = 0; }
        const t = v.currentTime - s.start;
        if (!v.paused) for (const fx of s.sfx) if (fx.at > lastT.current && fx.at <= t) playSfx(fx.sfx, fx.volume);
        lastT.current = t;
        setNow(v.currentTime);
        drawOverlay(t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [s.start, s.end, s.sfx, drawOverlay]);

  useEffect(() => { if (videoRef.current) videoRef.current.volume = clamp(s.originalVolume, 0, 1); }, [s.originalVolume]);

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { if (v.currentTime < s.start || v.currentTime >= s.end) v.currentTime = s.start; v.play().then(() => setPlaying(true)).catch(() => {}); }
    else { v.pause(); setPlaying(false); }
  };
  const seek = (abs: number) => { const v = videoRef.current; if (v) v.currentTime = clamp(abs, 0, meta?.duration ?? 0); };

  // Drag on the frame: move a text (Text tab) or pan the crop (Crop tab).
  const drag = useRef<{ kind: "text" | "pan"; id?: string; x: number; y: number; cx: number; cy: number } | null>(null);
  const onDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    if (tab === "text") {
      const hit = [...boundsRef.current].reverse().find((b) => px >= b.x - 8 && px <= b.x + b.w + 8 && py >= b.y - 8 && py <= b.y + b.h + 8);
      if (!hit) { setSelected(null); return; }
      setSelected(hit.id);
      drag.current = { kind: "text", id: hit.id, x: px, y: py, cx: 0, cy: 0 };
    } else if (tab === "crop" && crop && meta) {
      drag.current = { kind: "pan", x: e.clientX, y: e.clientY, cx: crop.x + crop.w / 2, cy: crop.y + crop.h / 2 };
    } else return;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current; if (!d) return;
    if (d.kind === "text") {
      const r = e.currentTarget.getBoundingClientRect();
      const x = clamp((e.clientX - r.left) / frameW, 0.02, 0.98), y = clamp((e.clientY - r.top) / frameH, 0.02, 0.98);
      setS((p) => ({ ...p, texts: p.texts.map((t) => (t.id === d.id ? { ...t, x, y } : t)) }));
    } else if (meta && crop) {
      const cx = clamp(d.cx - (e.clientX - d.x) / scale, crop.w / 2, meta.w - crop.w / 2);
      const cy = clamp(d.cy - (e.clientY - d.y) / scale, crop.h / 2, meta.h - crop.h / 2);
      set({ cx, cy });
    }
  };
  const onUp = () => { drag.current = null; };

  const addText = () => {
    const t: TextItem = { id: uid(), text: "", font: "sport", color: "#FFFFFF", style: "shadow", size: 0.08, x: 0.5, y: 0.2 + (s.texts.length % 4) * 0.15, from: 0, to: dur };
    set({ texts: [...s.texts, t] }); setSelected(t.id);
  };
  const patchText = (id: string, p: Partial<TextItem>) => set({ texts: s.texts.map((t) => (t.id === id ? { ...t, ...p } : t)) });
  const sel = s.texts.find((t) => t.id === selected) ?? null;

  const playhead = clamp(now - s.start, 0, dur);
  const addSfx = (id: SfxId) => { playSfx(id); set({ sfx: [...s.sfx, { id: uid(), sfx: id, at: Math.round(playhead * 10) / 10, volume: 1 }].sort((a, b) => a.at - b.at) }); };

  const finish = async () => {
    if (!meta) return;
    if (dur < MIN_SECONDS) { toast.error("Keep at least 1 second."); return; }
    const plan: EditPlan = { start: s.start, end: s.end, crop, texts: s.texts.filter((t) => t.text.trim()).map((t) => ({ ...t, to: Math.min(t.to, dur) })), sfx: s.sfx, originalVolume: s.originalVolume, srcW: meta.w, srcH: meta.h };
    const edited = isEdited(plan, meta.duration);
    const fits = meta.duration <= MAX_SECONDS + 0.5 && file.size <= MAX_VIDEO_MB * 1048576;
    // Untouched clips inside the limits go up exactly as recorded, for the best quality.
    if (!edited && fits) { onDone({ file, duration: meta.duration, edited: false, plan: s }); return; }
    if (!supported) {
      toast.error("This phone can't edit video here", { description: `Trim the clip in your gallery to under ${MAX_SECONDS} seconds and ${MAX_VIDEO_MB} MB, then pick it again.` });
      return;
    }
    videoRef.current?.pause(); setPlaying(false);
    const ac = new AbortController(); abortRef.current = ac;
    setProgress(0);
    try {
      await loadEditorFonts();
      const out = await renderEdit(file, plan, setProgress, ac.signal);
      if (out.size > MAX_VIDEO_MB * 1048576) throw new Error("too-big");
      onDone({ file: out, duration: dur, edited: true, plan: s });
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Couldn't prepare the video", { description: (e as Error).message === "too-big" ? "It came out too large. Trim it a little shorter." : "Try again, or pick a different clip." });
    } finally { setProgress(null); abortRef.current = null; }
  };

  const tooLong = meta ? meta.duration > MAX_SECONDS : false;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#05141A] text-white" role="dialog" aria-modal="true" aria-label="Edit video" data-no-swipe>
      <header className="flex shrink-0 items-center justify-between px-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
        <button type="button" onClick={onCancel} aria-label="Cancel editing" className="press grid h-11 w-11 place-items-center rounded-full bg-white/10"><X className="h-5 w-5" /></button>
        <p className="text-[15px] font-semibold tabular-nums">{fmtTime(dur)} <span className="font-normal text-white/55">/ {fmtTime(MAX_SECONDS)} max</span></p>
        <button type="button" onClick={finish} disabled={!meta || progress !== null}
          className="press h-11 rounded-full bg-white px-5 text-[15px] font-semibold text-[#0E2A33] disabled:opacity-50">Next</button>
      </header>

      <div ref={stageRef} className="relative mx-3 my-3 min-h-0 flex-1">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[22px] bg-black" style={{ width: frameW, height: frameH }}>
          <video ref={videoRef} src={src} playsInline preload="auto" onLoadedMetadata={onMeta}
            onError={() => { toast.error("Couldn't open that video", { description: "Pick an MP4 or MOV clip from your phone." }); onCancel(); }}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            className="absolute max-w-none" style={{ width: (meta?.w ?? view.w) * scale, height: (meta?.h ?? view.h) * scale, left: -view.x * scale, top: -view.y * scale }} />
          <canvas ref={overlayRef} className={`absolute inset-0 h-full w-full touch-none ${tab === "crop" && crop ? "cursor-move" : ""}`}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onClick={() => { if (tab === "trim" || tab === "sound") togglePlay(); }} />
          {tab === "crop" && crop && (
            <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }, (_, i) => <span key={i} className="border border-white/20" />)}
            </div>
          )}
        </div>
        {!meta && <div className="absolute inset-0 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-white/70" /></div>}
      </div>

      <div className="shrink-0 px-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/12">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <input type="range" aria-label="Playhead" min={s.start} max={Math.max(s.start + 0.1, s.end)} step={0.05} value={clamp(now, s.start, s.end)}
            onChange={(e) => seek(+e.target.value)} className="ck-range flex-1" />
          <span className="w-11 text-right text-[13px] tabular-nums text-white/70">{fmtTime(playhead)}</span>
        </div>
      </div>

      <section className="shrink-0 px-4 pt-3" style={{ minHeight: 168 }}>
        {tab === "trim" && meta && (
          <div>
            <div className="relative h-14 overflow-hidden rounded-xl bg-white/8">
              <div className="absolute inset-0 flex">{thumbs.map((u, i) => <div key={i} className="h-full flex-1 bg-cover bg-center opacity-70" style={u ? { backgroundImage: `url(${u})` } : undefined} />)}</div>
              <div className="absolute inset-y-0 left-0 bg-black/60" style={{ width: `${(s.start / meta.duration) * 100}%` }} />
              <div className="absolute inset-y-0 right-0 bg-black/60" style={{ width: `${100 - (s.end / meta.duration) * 100}%` }} />
              <div className="absolute inset-y-0 rounded-lg border-[3px] border-[#7EC8FF]" style={{ left: `${(s.start / meta.duration) * 100}%`, right: `${100 - (s.end / meta.duration) * 100}%` }} />
            </div>
            <DualRange min={0} max={meta.duration} a={s.start} b={s.end} marker={now} labelA="Trim start" labelB="Trim end"
              onChange={(a, b, moved) => {
                if (b - a > MAX_SECONDS) { if (moved === "a") b = a + MAX_SECONDS; else a = b - MAX_SECONDS; }
                set({ start: a, end: b }); seek(moved === "a" ? a : Math.max(a, b - 1));
              }} />
            <p className="text-[13px] text-white/60">
              {tooLong ? `Highlights can be up to ${MAX_SECONDS} seconds. Drag the ends to choose your best moments.` : "Drag the ends to cut the start and finish."}
            </p>
          </div>
        )}

        {tab === "crop" && (
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {ASPECTS.map((a) => (
                <button key={a.id} type="button" aria-pressed={s.aspect === a.id} onClick={() => set({ aspect: a.id, cx: null, cy: null, zoom: a.id === "original" ? 1 : s.zoom })}
                  className={`press h-9 shrink-0 rounded-full px-4 text-[14px] font-medium ${s.aspect === a.id ? "bg-white text-[#0E2A33]" : "bg-white/10"}`}>{a.label}</button>
              ))}
            </div>
            <label className="flex items-center gap-3 text-[14px] text-white/75">
              Zoom
              <input type="range" min={1} max={3} step={0.01} value={s.zoom} onChange={(e) => set({ zoom: +e.target.value })} className="ck-range flex-1" />
            </label>
            <p className="text-[13px] text-white/60">{crop ? "Drag the picture to choose what stays in frame." : "Pick a shape or zoom in to crop."}</p>
          </div>
        )}

        {tab === "text" && (
          <div className="space-y-3">
            {!sel ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={addText} className="press flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-[#0E2A33]"><Plus className="h-4 w-4" /> Add text</button>
                <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto no-scrollbar">
                  {s.texts.map((t) => (
                    <button key={t.id} type="button" onClick={() => setSelected(t.id)} className="press h-10 max-w-[140px] shrink-0 truncate rounded-full bg-white/10 px-3.5 text-[14px]">{t.text || "Empty text"}</button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input autoFocus value={sel.text} maxLength={80} onChange={(e) => patchText(sel.id, { text: e.target.value })} placeholder="Type your text"
                    aria-label="Text" className="h-10 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-[16px] outline-none focus:ring-2 focus:ring-[#7EC8FF]" />
                  <button type="button" onClick={() => { set({ texts: s.texts.filter((t) => t.id !== sel.id) }); setSelected(null); }} aria-label="Delete text" className="press grid h-10 w-10 place-items-center rounded-full bg-white/10 text-[#FF8A8A]"><Trash2 className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setSelected(null)} className="press h-10 rounded-full bg-white/10 px-3.5 text-[14px] font-semibold">Done</button>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {TEXT_FONTS.map((f) => (
                    <button key={f.id} type="button" aria-pressed={sel.font === f.id} onClick={() => patchText(sel.id, { font: f.id as TextFontId })}
                      className={`press h-9 shrink-0 rounded-full px-4 text-[15px] ${sel.font === f.id ? "bg-white text-[#0E2A33]" : "bg-white/10"}`}
                      style={{ fontFamily: fontStack(f.id).family, fontWeight: f.weight }}>{f.label}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {COLORS.map((c) => (
                    <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={sel.color === c} onClick={() => patchText(sel.id, { color: c })}
                      className={`h-8 w-8 shrink-0 rounded-full ring-2 ${sel.color === c ? "ring-white" : "ring-white/20"}`} style={{ background: c }} />
                  ))}
                  <button type="button" onClick={() => patchText(sel.id, { style: sel.style === "box" ? "shadow" : "box" })} aria-pressed={sel.style === "box"}
                    className={`press ml-auto h-8 rounded-full px-3 text-[13px] font-semibold ${sel.style === "box" ? "bg-white text-[#0E2A33]" : "bg-white/10"}`}>Box</button>
                </div>
                <label className="flex items-center gap-3 text-[13px] text-white/70">
                  Size <input type="range" min={0.035} max={0.16} step={0.005} value={sel.size} onChange={(e) => patchText(sel.id, { size: +e.target.value })} className="ck-range flex-1" />
                </label>
                <div>
                  <p className="text-[13px] text-white/70">Shows {fmtTime(sel.from)} to {fmtTime(Math.min(sel.to, dur))}</p>
                  <DualRange min={0} max={Math.max(0.2, dur)} a={sel.from} b={Math.min(sel.to, dur)} marker={playhead} labelA="Text appears" labelB="Text disappears"
                    onChange={(a, b) => patchText(sel.id, { from: a, to: b })} />
                </div>
              </>
            )}
            {!sel && <p className="text-[13px] text-white/60">{s.texts.length ? "Tap a text on the video to edit it, drag it to move." : "Add a title, your name or the score."}</p>}
          </div>
        )}

        {tab === "sound" && (
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-[14px] text-white/75">
              Original sound
              <input type="range" min={0} max={1} step={0.05} value={s.originalVolume} onChange={(e) => set({ originalVolume: +e.target.value })} className="ck-range flex-1" />
              <span className="w-10 text-right tabular-nums">{Math.round(s.originalVolume * 100)}%</span>
            </label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {SFX.map((fx) => (
                <button key={fx.id} type="button" onClick={() => addSfx(fx.id)} aria-label={`Add ${fx.label} at ${fmtTime(playhead)}`}
                  className="press flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[14px]"><span aria-hidden>{fx.emoji}</span>{fx.label}</button>
              ))}
            </div>
            {s.sfx.length > 0 ? (
              <ul className="flex gap-2 overflow-x-auto no-scrollbar">
                {s.sfx.map((fx) => (
                  <li key={fx.id} className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#7EC8FF]/20 pl-3 pr-1 text-[13px]">
                    <button type="button" onClick={() => seek(s.start + fx.at)} className="tabular-nums">{SFX.find((x) => x.id === fx.sfx)?.emoji} {fmtTime(fx.at)}</button>
                    <button type="button" onClick={() => set({ sfx: s.sfx.filter((x) => x.id !== fx.id) })} aria-label="Remove sound" className="grid h-7 w-7 place-items-center rounded-full"><X className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[13px] text-white/60">Move the playhead, then tap a sound to drop it there.</p>}
          </div>
        )}
      </section>

      <nav className="mx-3 mt-2 flex shrink-0 gap-1 rounded-[22px] bg-white/8 p-1" style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 10px)" }} aria-label="Editing tools">
        <Tab on={tab === "trim"} onClick={() => setTab("trim")} Icon={Scissors} label="Trim" />
        <Tab on={tab === "crop"} onClick={() => setTab("crop")} Icon={CropIcon} label="Crop" />
        <Tab on={tab === "text"} onClick={() => { setTab("text"); videoRef.current?.pause(); }} Icon={Type} label="Text" />
        <Tab on={tab === "sound"} onClick={() => setTab("sound")} Icon={Music2} label="Sound" />
      </nav>

      {supported === false && (
        <p className="absolute inset-x-4 top-[calc(env(safe-area-inset-top)+64px)] rounded-2xl bg-[#FFD43B] px-4 py-2.5 text-[13px] text-[#0E2A33]">
          This phone can't edit video in the app. Clips under {MAX_SECONDS} seconds and {MAX_VIDEO_MB} MB still upload as they are.
        </p>
      )}

      {progress !== null && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/70 backdrop-blur-sm">
          <div className="w-64 rounded-[24px] bg-[#0E2A33] p-5 text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#7EC8FF]" />
            <p className="mt-3 text-[16px] font-semibold">Preparing your highlight</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-[#7EC8FF] transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            <p className="mt-2 text-[13px] text-white/60">{Math.round(progress * 100)}%. Keep the app open.</p>
            <button type="button" onClick={() => abortRef.current?.abort()} className="press mt-3 h-10 rounded-full bg-white/10 px-5 text-[14px] font-semibold">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoEditor;
