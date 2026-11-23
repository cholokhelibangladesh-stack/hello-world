// Browser origins allowed to call our edge functions. A "*." entry allows exactly one subdomain label.
// Override per function with the ALLOWED_ORIGINS secret (comma-separated).
export const DEFAULT_ALLOWED_ORIGINS = [
  "https://cholokheli.lovable.app",
  "https://id-preview--74d5d86b-6428-4e07-8c5b-c663d82fd606.lovable.app",
  "https://id-preview--be579631-1dac-4942-9680-4157262d2c84.lovable.app",
  "https://localhost", // Android app (Capacitor WebView)
  "capacitor://localhost", // iOS app (Capacitor WebView)
  "http://localhost:8080", // local dev: app
  "http://localhost:8081", // local dev: website (run alongside the app)
  // Never add a wildcard for a public tunnel service: anyone can create a subdomain there.
];

export function allowedOrigins(): string[] {
  const fromEnv = Deno.env.get("ALLOWED_ORIGINS")?.split(",").map((o) => o.trim()).filter(Boolean);
  return fromEnv && fromEnv.length ? fromEnv : DEFAULT_ALLOWED_ORIGINS;
}

/** Exact match, or a "scheme://*.domain" entry matching one subdomain label (e.g. a tunnel link). */
export function isAllowedOrigin(origin: string, allowed: string[]): boolean {
  return allowed.some((entry) => {
    if (!entry.includes("*.")) return entry === origin;
    const [scheme, host] = entry.split("://*.");
    const m = /^([a-z]+):\/\/([a-z0-9-]{1,63})\.(.+)$/.exec(origin);
    return !!m && m[1] === scheme && m[3] === host;
  });
}
