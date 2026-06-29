import { useEffect, useRef } from "react";

type Puff = {
  x: number;
  y: number;
  r: number;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  alpha: number;
};

type Props = {
  /** Higher = more puffs per second. Default subtle. */
  density?: number;
  /** Base puff radius in px. */
  puffSize?: number;
  /** Lifespan multiplier — higher = lingers longer. */
  fadeSpeed?: number;
  /** Peak alpha of each puff (0–1). */
  intensity?: number;
};

export default function HeroMistCursor({
  density = 0.35,
  puffSize = 22,
  fadeSpeed = 1,
  intensity = 0.06,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const puffs = useRef<Puff[]>([]);
  const mouse = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const raf = useRef<number | null>(null);
  const lastSpawn = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const parent = canvas.parentElement!;
    const onMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
      mouse.current.active = true;
    };
    const onLeave = () => {
      mouse.current.active = false;
    };
    parent.addEventListener("pointermove", onMove);
    parent.addEventListener("pointerleave", onLeave);

    const spawn = (now: number) => {
      if (!mouse.current.active) return;
      const interval = 90 / Math.max(0.05, density);
      if (now - lastSpawn.current < interval) return;
      lastSpawn.current = now;
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * 8;
      puffs.current.push({
        x: mouse.current.x + Math.cos(angle) * spread,
        y: mouse.current.y + Math.sin(angle) * spread,
        r: puffSize + Math.random() * puffSize * 0.8,
        life: 0,
        maxLife: (1600 + Math.random() * 800) * fadeSpeed,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -0.08 - Math.random() * 0.22,
        alpha: intensity * (0.7 + Math.random() * 0.6),
        });
      }
      if (puffs.current.length > 120) puffs.current.splice(0, puffs.current.length - 120);
    };

    let lastT = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(48, t - lastT);
      lastT = t;
      spawn(t);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";

      for (let i = puffs.current.length - 1; i >= 0; i--) {
        const p = puffs.current[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          puffs.current.splice(i, 1);
          continue;
        }
        const k = p.life / p.maxLife;
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        const r = p.r * (1 + k * 1.6);
        const a = p.alpha * (1 - k) * (k < 0.15 ? k / 0.15 : 1);

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(220, 232, 240, ${a})`);
        g.addColorStop(0.5, `rgba(200, 215, 225, ${a * 0.45})`);
        g.addColorStop(1, "rgba(180, 200, 215, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerleave", onLeave);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[5] mix-blend-screen"
      aria-hidden
    />
  );
}
