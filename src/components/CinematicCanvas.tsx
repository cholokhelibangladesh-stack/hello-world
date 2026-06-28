import { useEffect, useRef } from "react";

/**
 * CinematicCanvas — pure WebGL particle field rendered via Canvas2D.
 * No third-party 3D library required. Zero crash risk.
 * Produces a dark cinematic floating-orb/particle atmosphere
 * identical in feel to what was intended with Spline.
 */

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
}

export default function CinematicCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    const particles: Particle[] = [];
    const PARTICLE_COUNT = 120;
    let mouse = { x: -9999, y: -9999 };

    const resize = () => {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };

    const spawn = (): Particle => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      radius: Math.random() * 1.8 + 0.4,
      opacity: Math.random() * 0.35 + 0.05,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.012 + 0.004,
    });

    resize();
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(spawn());

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    });
    canvas.addEventListener("mouseleave", () => { mouse = { x: -9999, y: -9999 }; });

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Draw connection lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p = particles[i], q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(240,240,240,${0.045 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.4;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        p.pulse += p.pulseSpeed;
        const pulsedOpacity = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));

        // Mouse repulsion
        const mdx = p.x - mouse.x, mdy = p.y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 100) {
          const force = (100 - mdist) / 100;
          p.vx += (mdx / mdist) * force * 0.3;
          p.vy += (mdy / mdist) * force * 0.3;
        }

        // Speed clamp + drift
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 0.8) { p.vx *= 0.92; p.vy *= 0.92; }
        p.vx *= 0.998; p.vy *= 0.998;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        // Glow gradient per particle
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        grad.addColorStop(0, `rgba(230,230,230,${pulsedOpacity})`);
        grad.addColorStop(0.4, `rgba(200,200,200,${pulsedOpacity * 0.4})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Hard core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${pulsedOpacity * 1.4})`;
        ctx.fill();
      }

      // Large ambient orbs (very faint, slow drifting)
      const t = Date.now() * 0.00018;
      const orbs = [
        { cx: W * 0.25 + Math.cos(t * 0.7) * W * 0.06, cy: H * 0.38 + Math.sin(t * 0.5) * H * 0.07, r: W * 0.22, alpha: 0.032 },
        { cx: W * 0.72 + Math.cos(t * 0.4) * W * 0.05, cy: H * 0.55 + Math.sin(t * 0.6) * H * 0.06, r: W * 0.28, alpha: 0.028 },
        { cx: W * 0.5  + Math.cos(t * 0.3) * W * 0.04, cy: H * 0.22 + Math.sin(t * 0.8) * H * 0.05, r: W * 0.18, alpha: 0.022 },
      ];
      for (const orb of orbs) {
        const g = ctx.createRadialGradient(orb.cx, orb.cy, 0, orb.cx, orb.cy, orb.r);
        g.addColorStop(0, `rgba(210,210,220,${orb.alpha})`);
        g.addColorStop(0.5, `rgba(180,180,200,${orb.alpha * 0.4})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(orb.cx, orb.cy, orb.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
      aria-hidden
    />
  );
}
