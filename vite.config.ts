import type { Plugin } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * Images and videos uploaded in Lovable live at /__l5e/assets-v1/... and only exist on Lovable's
 * hosting. When the site runs on your own computer, this fetches each one from the Lovable-hosted
 * site instead, so the 3D scroll video, photos and logos load locally too. Dev only; Lovable's own
 * hosting serves them directly. Set LOVABLE_SITE_URL to your published address to try it first.
 */
function lovableAssets(): Plugin {
  const hosts = [
    process.env.LOVABLE_SITE_URL,
    "https://cholokheli.lovable.app",
    "https://id-preview--be579631-1dac-4942-9680-4157262d2c84.lovable.app",
    "https://id-preview--74d5d86b-6428-4e07-8c5b-c663d82fd606.lovable.app",
  ].filter(Boolean).map((h) => (h as string).replace(/\/+$/, ""));
  const cache = new Map<string, { type: string; body: Buffer }>();
  let working: string | null = null;

  return {
    name: "cholo-kheli:lovable-assets",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/__l5e/")) return next();
        const url = req.url.split("?")[0];
        try {
          let hit = cache.get(url);
          if (!hit) {
            for (const host of working ? [working, ...hosts.filter((h) => h !== working)] : hosts) {
              const r = await fetch(host + url).catch(() => null);
              if (r?.ok) {
                hit = { type: r.headers.get("content-type") ?? "application/octet-stream", body: Buffer.from(await r.arrayBuffer()) };
                working = host;
                cache.set(url, hit);
                break;
              }
            }
          }
          if (!hit) {
            res.statusCode = 404;
            return res.end("Lovable asset not reachable. Set LOVABLE_SITE_URL to the published site address.");
          }
          // Byte ranges, so the hero video can seek and scrub
          const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
          res.setHeader("Content-Type", hit.type);
          res.setHeader("Accept-Ranges", "bytes");
          res.setHeader("Cache-Control", "public, max-age=3600");
          if (range) {
            const size = hit.body.length;
            const start = range[1] ? Number(range[1]) : size - Number(range[2]);
            const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
            res.statusCode = 206;
            res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
            res.setHeader("Content-Length", String(end - start + 1));
            return res.end(hit.body.subarray(start, end + 1));
          }
          res.setHeader("Content-Length", String(hit.body.length));
          res.end(hit.body);
        } catch (e) {
          next(e);
        }
      });
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [lovableAssets()],
    server: {
      host: "::",
      port: 8080,
      // Allow Cloudflare quick-tunnel links (npm run tunnel) so testers elsewhere can open the dev server.
      allowedHosts: [".trycloudflare.com"],
    },
  },
});
