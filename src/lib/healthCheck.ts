import { supabase } from "@/integrations/supabase/client";

export type HealthStatus = {
  healthy: boolean;
  latencyMs: number;
  checkedAt: string;
  reason?: string;
};

/**
 * Client-side DB connectivity ping. Performs a HEAD count against `app_settings`
 * (no rows returned, minimal payload). Use to gate features behind a healthy DB.
 */
export async function pingDatabase(timeoutMs = 5000): Promise<HealthStatus> {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  try {
    const result = await Promise.race([
      supabase.from("app_settings").select("*", { count: "exact", head: true }),
      new Promise<{ error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ error: { message: "timeout" } }), timeoutMs),
      ),
    ]);
    const latencyMs = Date.now() - started;
    if ("error" in result && result.error) {
      return { healthy: false, latencyMs, checkedAt, reason: result.error.message };
    }
    return { healthy: true, latencyMs, checkedAt };
  } catch (err) {
    return {
      healthy: false,
      latencyMs: Date.now() - started,
      checkedAt,
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}

/**
 * Hit the server-side /api/health route. Useful for uptime monitors and
 * pre-deploy smoke checks.
 */
export async function fetchHealthEndpoint(): Promise<HealthStatus> {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    const body = (await res.json()) as { status: string; db: string; latency_ms: number };
    return {
      healthy: res.ok && body.status === "ok",
      latencyMs: body.latency_ms ?? Date.now() - started,
      checkedAt,
      reason: res.ok ? undefined : body.db,
    };
  } catch (err) {
    return {
      healthy: false,
      latencyMs: Date.now() - started,
      checkedAt,
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}
