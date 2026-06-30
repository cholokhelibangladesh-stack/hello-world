import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Lightweight DB health check.
 * Performs a HEAD count ping against a public table (`app_settings`) using the
 * publishable key. Returns { status: "ok" | "degraded", db, latency_ms, ts }.
 * No user data is read or returned.
 */
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;

        if (!url || !key) {
          return Response.json(
            { status: "degraded", db: "unconfigured", latency_ms: 0, ts: new Date().toISOString() },
            { status: 503 },
          );
        }

        try {
          const supabase = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          });
          // HEAD + count = no row payload, minimal cost.
          const { error } = await supabase
            .from("app_settings")
            .select("*", { count: "exact", head: true });

          const latency_ms = Date.now() - started;
          if (error) {
            return Response.json(
              { status: "degraded", db: "error", latency_ms, ts: new Date().toISOString() },
              { status: 503 },
            );
          }
          return Response.json(
            { status: "ok", db: "up", latency_ms, ts: new Date().toISOString() },
            { status: 200, headers: { "Cache-Control": "no-store" } },
          );
        } catch {
          return Response.json(
            {
              status: "degraded",
              db: "unreachable",
              latency_ms: Date.now() - started,
              ts: new Date().toISOString(),
            },
            { status: 503 },
          );
        }
      },
    },
  },
});
