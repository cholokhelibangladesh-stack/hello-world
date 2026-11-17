/**
 * Sound effects for highlights. Every effect is synthesised here with the Web Audio API, so there are
 * no audio files to download and no licensing to worry about.
 */
export const SFX = [
  { id: "whistle", label: "Whistle", emoji: "📯" },
  { id: "cheer", label: "Crowd cheer", emoji: "🏟️" },
  { id: "applause", label: "Applause", emoji: "👏" },
  { id: "kick", label: "Kick", emoji: "⚽" },
  { id: "horn", label: "Air horn", emoji: "📣" },
  { id: "swoosh", label: "Swoosh", emoji: "💨" },
  { id: "boom", label: "Boom", emoji: "💥" },
  { id: "ding", label: "Ding", emoji: "🔔" },
] as const;
export type SfxId = (typeof SFX)[number]["id"];

const RATE = 48000;
const cache = new Map<SfxId, Promise<AudioBuffer>>();

const noise = (ctx: BaseAudioContext, seconds: number) => {
  const b = ctx.createBuffer(1, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = b; return src;
};

const env = (ctx: BaseAudioContext, points: [number, number][]) => {
  const g = ctx.createGain(); g.gain.setValueAtTime(points[0][1], points[0][0]);
  for (const [t, v] of points.slice(1)) g.gain.linearRampToValueAtTime(v, t);
  return g;
};

const LENGTH: Record<SfxId, number> = { whistle: 0.9, cheer: 2.8, applause: 2.4, kick: 0.35, horn: 1.3, swoosh: 0.6, boom: 1.4, ding: 1.2 };

const build = (id: SfxId, ctx: OfflineAudioContext) => {
  const out = ctx.destination;
  switch (id) {
    case "whistle": {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 2900;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 38; const depth = ctx.createGain(); depth.gain.value = 180;
      lfo.connect(depth).connect(o.frequency);
      const g = env(ctx, [[0, 0], [0.03, 0.5], [0.75, 0.45], [0.88, 0]]);
      o.connect(g).connect(out); o.start(); lfo.start(); break;
    }
    case "cheer": {
      const n = noise(ctx, 2.8); const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1100; bp.Q.value = 0.6;
      const wobble = ctx.createGain(); const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5; const d = ctx.createGain(); d.gain.value = 0.15;
      lfo.connect(d).connect(wobble.gain); wobble.gain.value = 0.85;
      const g = env(ctx, [[0, 0], [0.5, 0.9], [2.0, 0.8], [2.8, 0]]);
      n.connect(bp).connect(wobble).connect(g).connect(out); n.start(); lfo.start(); break;
    }
    case "applause": {
      for (let i = 0; i < 90; i++) {
        const t = Math.random() * 2.1; const n = noise(ctx, 0.06);
        const hp = ctx.createBiquadFilter(); hp.type = "bandpass"; hp.frequency.value = 1500 + Math.random() * 2500; hp.Q.value = 1.2;
        const g = env(ctx, [[t, 0], [t + 0.004, 0.5 + Math.random() * 0.4], [t + 0.06, 0]]);
        n.connect(hp).connect(g).connect(out); n.start(t);
      }
      break;
    }
    case "kick": {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(150, 0); o.frequency.exponentialRampToValueAtTime(45, 0.18);
      const g = env(ctx, [[0, 1], [0.3, 0]]); o.connect(g).connect(out); o.start();
      const n = noise(ctx, 0.03); const g2 = env(ctx, [[0, 0.6], [0.03, 0]]); n.connect(g2).connect(out); n.start(); break;
    }
    case "horn": {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
      const g = env(ctx, [[0, 0], [0.04, 0.32], [1.1, 0.3], [1.3, 0]]); lp.connect(g).connect(out);
      for (const f of [466, 587, 698]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(); }
      break;
    }
    case "swoosh": {
      const n = noise(ctx, 0.6); const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 2.5;
      bp.frequency.setValueAtTime(300, 0); bp.frequency.exponentialRampToValueAtTime(4000, 0.45);
      const g = env(ctx, [[0, 0], [0.25, 0.9], [0.6, 0]]); n.connect(bp).connect(g).connect(out); n.start(); break;
    }
    case "boom": {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(90, 0); o.frequency.exponentialRampToValueAtTime(30, 1.0);
      const g = env(ctx, [[0, 1], [1.4, 0]]); o.connect(g).connect(out); o.start();
      const n = noise(ctx, 1.2); const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 400;
      const g2 = env(ctx, [[0, 0.7], [1.2, 0]]); n.connect(lp).connect(g2).connect(out); n.start(); break;
    }
    case "ding": {
      for (const [f, v] of [[880, 0.4], [1320, 0.2], [2640, 0.08]] as const) {
        const o = ctx.createOscillator(); o.frequency.value = f; const g = env(ctx, [[0, v], [1.2, 0]]); o.connect(g).connect(out); o.start();
      }
      break;
    }
  }
};

/** Renders (once) and returns the effect as an AudioBuffer. */
export const sfxBuffer = (id: SfxId): Promise<AudioBuffer> => {
  let p = cache.get(id);
  if (!p) {
    const ctx = new OfflineAudioContext(1, Math.ceil(LENGTH[id] * RATE), RATE);
    build(id, ctx);
    p = ctx.startRendering();
    cache.set(id, p);
  }
  return p;
};

let live: AudioContext | null = null;
/** Plays an effect straight away (preview). */
export const playSfx = async (id: SfxId, volume = 1) => {
  live ??= new AudioContext();
  if (live.state === "suspended") await live.resume();
  const src = live.createBufferSource(); src.buffer = await sfxBuffer(id);
  const g = live.createGain(); g.gain.value = volume; src.connect(g).connect(live.destination); src.start();
};
