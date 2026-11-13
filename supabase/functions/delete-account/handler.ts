// Deletes the calling user's account and data (Google Play account-deletion policy).
// Split from index.ts so it can be tested with a fake client (handler_test.ts).

// deno-lint-ignore no-explicit-any
type Client = any;

export interface HandlerDeps {
  getClient: () => Client;
  allowedOrigins: string[];
}

export const USER_BUCKETS = ["player-videos", "avatars", "documents"];

export function createHandler({ getClient, allowedOrigins }: HandlerDeps) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get("Origin");
    const cors: Record<string, string> = {
      "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "null",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    };
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (origin && !allowedOrigins.includes(origin)) return json({ error: "Forbidden origin" }, 403);
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    try {
      const supabase = getClient();
      const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (!token) return json({ error: "Unauthorized" }, 401);
      const { data: { user } = { user: null }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return json({ error: "Unauthorized" }, 401);

      let body: Record<string, unknown> = {};
      try { body = await req.json(); } catch { /* handled below */ }
      if (body.confirm !== "DELETE") return json({ error: "confirmation_required" }, 400);

      const { data: roles, error: rolesErr } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (rolesErr) return json({ error: "lookup_failed" }, 500);
      if ((roles ?? []).some((r: { role: string }) => r.role === "admin")) {
        // Avoid an admin team locking itself out; another owner removes admins.
        return json({ error: "admin_accounts_cannot_self_delete" }, 403);
      }

      // 1. Files the user uploaded (stored under "<user id>/..." in each bucket).
      for (const bucket of USER_BUCKETS) {
        for (let round = 0; round < 20; round++) {
          const { data: files, error } = await supabase.storage.from(bucket).list(user.id, { limit: 1000 });
          if (error || !files || files.length === 0) break;
          const paths = files.map((f: { name: string }) => `${user.id}/${f.name}`);
          const { error: rmErr } = await supabase.storage.from(bucket).remove(paths);
          if (rmErr) return json({ error: "storage_cleanup_failed" }, 500);
          if (files.length < 1000) break;
        }
      }

      // 2. Rows that don't cascade from auth.users (audit trail, alerts, rate limits).
      const { error: prepErr } = await supabase.rpc("prepare_account_deletion", { _user_id: user.id });
      if (prepErr) return json({ error: "cleanup_failed" }, 500);

      // 3. The auth user; profiles, videos, messages etc. cascade from it.
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) return json({ error: "delete_failed" }, 500);

      return json({ success: true });
    } catch (_err) {
      return json({ error: "internal_error" }, 500);
    }
  };
}
