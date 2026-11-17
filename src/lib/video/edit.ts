import { fontStack, type TextFontId } from "./fonts";
import { sfxBuffer, type SfxId } from "./sfx";

/**
 * Highlight limits. Sized so 100,000 players with one highlight each stay inside a USD 20,000 to 30,000
 * monthly budget on Supabase Storage (see docs in the upload screen):
 *  - at most 60 seconds, at most 1080p (the long edge at most 1920 px)
 *  - video at most 5 Mbps (scaled down for smaller frames) and audio at 128 kbps
 *  => at most about 39 MB per highlight, under the 50 MB storage limit.
 */
export const MAX_SECONDS = 60;
export const MIN_SECONDS = 1;
export const MAX_LONG_EDGE = 1920;
export const MAX_SHORT_EDGE = 1080;
export const MAX_VIDEO_BITRATE = 5_000_000;
export const AUDIO_BITRATE = 128_000;
/** Largest file a phone may pick for editing (it is re-encoded before upload). */
export const MAX_SOURCE_MB = 2048;

export type Crop = { x: number; y: number; w: number; h: number };
export type TextStyle = "shadow" | "box";
export type TextItem = {
  id: string; text: string; font: TextFontId; color: string; style: TextStyle;
  /** Height of a line as a share of the frame height. */
  size: number;
  /** Centre of the text as a share of frame width and height. */
  x: number; y: number;
  /** Seconds on the edited timeline (0 = start of the trim). */
  from: number; to: number;
};
export type SfxItem = { id: string; sfx: SfxId; at: number; volume: number };
export type EditPlan = {
  start: number; end: number; crop: Crop | null; texts: TextItem[]; sfx: SfxItem[]; originalVolume: number;
  srcW: number; srcH: number;
};

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** Output frame size for a crop: keeps the aspect ratio and caps the frame at 1080p. */
export const outputSize = (w: number, h: number) => {
  const s = Math.min(1, MAX_LONG_EDGE / Math.max(w, h), MAX_SHORT_EDGE / Math.min(w, h));
  return { width: even(w * s), height: even(h * s) };
};

/** 5 Mbps for a full 1080p frame, less for smaller frames. */
export const videoBitrate = (width: number, height: number) =>
  Math.round(Math.min(MAX_VIDEO_BITRATE, Math.max(1_500_000, (width * height) / (1920 * 1080) * MAX_VIDEO_BITRATE)));

export const isEdited = (p: EditPlan, duration: number) =>
  p.start > 0.05 || p.end < duration - 0.05 || !!p.crop || p.texts.some((t) => t.text.trim()) || p.sfx.length > 0 || p.originalVolume < 0.999;

/** Whether this device can edit and re-encode video (WebCodecs). */
export const canEditVideo = async () => {
  if (typeof window === "undefined" || typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined") return false;
  try {
    const { getFirstEncodableVideoCodec } = await import("mediabunny");
    return !!(await getFirstEncodableVideoCodec(["avc", "vp9", "av1"], { width: 1280, height: 720 }));
  } catch { return false; }
};

export type TextBounds = { id: string; x: number; y: number; w: number; h: number };

/** Draws the text overlays for time t onto a frame of size W x H. Used by both the preview and the export. */
export const drawTexts = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, texts: TextItem[], t: number, W: number, H: number): TextBounds[] => {
  const bounds: TextBounds[] = [];
  for (const item of texts) {
    if (!item.text.trim() || t < item.from || t > item.to) continue;
    const { family, weight } = fontStack(item.font);
    const px = Math.max(8, item.size * H);
    ctx.save();
    ctx.font = `${weight} ${px}px ${family}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lines = item.text.split("\n").slice(0, 4);
    const lh = px * 1.18;
    const widths = lines.map((l) => ctx.measureText(l).width);
    const bw = Math.max(...widths) + px * 0.9;
    const bh = lines.length * lh + px * 0.45;
    const cx = item.x * W, cy = item.y * H;
    if (item.style === "box") {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      const r = Math.min(bh / 2, px * 0.5);
      ctx.beginPath(); ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, r); ctx.fill();
    } else {
      ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = px * 0.25; ctx.shadowOffsetY = px * 0.05;
    }
    ctx.fillStyle = item.color;
    lines.forEach((l, i) => ctx.fillText(l, cx, cy - ((lines.length - 1) * lh) / 2 + i * lh));
    ctx.restore();
    bounds.push({ id: item.id, x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh });
  }
  return bounds;
};

/** Mixes the original sound (trimmed, at its volume) with the sound effects into one track. */
const mixAudio = async (audioTrack: import("mediabunny").InputAudioTrack | null, plan: EditPlan, signal?: AbortSignal) => {
  const { AudioBufferSink } = await import("mediabunny");
  const dur = plan.end - plan.start;
  const rate = 48000;
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * rate), rate);
  let any = false;
  if (audioTrack && plan.originalVolume > 0) {
    const gain = ctx.createGain(); gain.gain.value = plan.originalVolume; gain.connect(ctx.destination);
    for await (const { buffer, timestamp } of new AudioBufferSink(audioTrack).buffers(plan.start, plan.end)) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      const src = ctx.createBufferSource(); src.buffer = buffer; src.connect(gain);
      const when = timestamp - plan.start;
      if (when < 0) { if (-when < buffer.duration) src.start(0, -when); } else src.start(when);
      any = true;
    }
  }
  for (const s of plan.sfx) {
    if (s.at >= dur) continue;
    const src = ctx.createBufferSource(); src.buffer = await sfxBuffer(s.sfx);
    const g = ctx.createGain(); g.gain.value = s.volume; src.connect(g).connect(ctx.destination);
    src.start(Math.max(0, s.at)); any = true;
  }
  return any ? ctx.startRendering() : null;
};

/**
 * Applies the edit (trim, crop, text, sound) and encodes a new MP4 in the browser with WebCodecs.
 * Calls onProgress with 0..1.
 */
export const renderEdit = async (file: File, plan: EditPlan, onProgress: (p: number) => void, signal?: AbortSignal): Promise<File> => {
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) throw new Error("This file has no video.");
    const audioTrack = await input.getPrimaryAudioTrack();
    const crop = plan.crop ?? { x: 0, y: 0, w: plan.srcW, h: plan.srcH };
    const { width, height } = outputSize(crop.w, crop.h);
    const bitrate = videoBitrate(width, height);

    const vCodec = await mb.getFirstEncodableVideoCodec(["avc", "vp9", "av1"], { width, height, bitrate });
    if (!vCodec) throw new Error("This phone can't encode video.");
    const audio = await mixAudio(audioTrack, plan, signal);
    const aCodec = audio ? await mb.getFirstEncodableAudioCodec(["aac", "opus"], { numberOfChannels: 2, sampleRate: 48000, bitrate: AUDIO_BITRATE }) : null;

    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
    const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(width, height) : Object.assign(document.createElement("canvas"), { width, height });
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    const videoSource = new mb.CanvasSource(canvas, { codec: vCodec, bitrate, keyFrameInterval: 2 });
    output.addVideoTrack(videoSource);
    let audioSource: InstanceType<typeof mb.AudioBufferSource> | null = null;
    if (audio && aCodec) { audioSource = new mb.AudioBufferSource({ codec: aCodec, bitrate: AUDIO_BITRATE }); output.addAudioTrack(audioSource); }
    await output.start();

    if (audioSource && audio) { await audioSource.add(audio); audioSource.close(); }

    const dur = plan.end - plan.start;
    const sink = new mb.CanvasSink(videoTrack, {
      crop: { left: crop.x, top: crop.y, width: crop.w, height: crop.h }, width, height, fit: "fill", poolSize: 2,
    });
    for await (const frame of sink.canvases(plan.start, plan.end)) {
      if (signal?.aborted) { await output.cancel(); throw new DOMException("Cancelled", "AbortError"); }
      const t = Math.max(0, frame.timestamp - plan.start);
      ctx.drawImage(frame.canvas, 0, 0, width, height);
      drawTexts(ctx, plan.texts, t, width, height);
      await videoSource.add(t, Math.min(frame.duration, Math.max(0.001, dur - t)));
      onProgress(Math.min(0.99, t / dur));
    }
    videoSource.close();
    await output.finalize();
    onProgress(1);
    const buffer = (output.target as InstanceType<typeof mb.BufferTarget>).buffer;
    if (!buffer) throw new Error("Nothing was encoded.");
    return new File([buffer], "highlight.mp4", { type: "video/mp4" });
  } finally {
    input.dispose?.();
  }
};

export const fmtTime = (s: number) => {
  const v = Math.max(0, s);
  const m = Math.floor(v / 60);
  const sec = Math.floor(v % 60);
  const ds = Math.floor((v * 10) % 10);
  return `${m}:${String(sec).padStart(2, "0")}${m === 0 && v < 10 ? `.${ds}` : ""}`;
};
