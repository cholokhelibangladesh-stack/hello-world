// Request handler for handle-signup-role, split from index.ts so it can be
// tested with a fake Supabase client (see handler_test.ts).
import { validateSignupPayload } from "./validate.ts";
import { isAllowedOrigin } from "../_shared/origins.ts";

// deno-lint-ignore no-explicit-any
type Client = any;

export interface HandlerDeps {
  /** Returns a service-role Supabase client. */
  getClient: () => Client;
  allowedOrigins: string[];
}

export function createHandler({ getClient, allowedOrigins }: HandlerDeps) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get("Origin");
    const cors: Record<string, string> = {
      "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin, allowedOrigins) ? origin : "null",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    };
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

    // Browser requests must come from an allowed origin; server-to-server calls send no Origin.
    if (origin && !isAllowedOrigin(origin, allowedOrigins)) return json({ error: "Forbidden origin" }, 403);
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    try {
      const supabase = getClient();

      const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (!token) return json({ error: "Unauthorized" }, 401);
      const { data: { user } = { user: null }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return json({ error: "Unauthorized" }, 401);

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        body = {};
      }
      // The sign-up form also stores these answers in the account's user_metadata.onboarding,
      // so onboarding can finish on another device/tab (e.g. after the confirmation email)
      // where the original form state no longer exists. An explicit body wins.
      const fromMeta = (user.user_metadata as Record<string, unknown> | undefined)?.onboarding;
      const source = body && typeof body === "object" && (body as Record<string, unknown>).role
        ? body
        : fromMeta && typeof fromMeta === "object" ? fromMeta : body;
      const parsed = validateSignupPayload(source);
      if (!parsed.ok) return json({ error: parsed.error }, 400);
      const input = parsed.value;

      // Onboarding runs once. A user who already has any role can't pick another.
      const { data: existingRoles, error: rolesErr } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      if (rolesErr) return json({ error: "lookup_failed" }, 500);
      if (existingRoles && existingRoles.length > 0) return json({ error: "already_onboarded" }, 409);

      // Username must be unique (case-insensitive; also enforced by a DB index).
      // Usernames are stored lower-case (exact match; ilike would treat "_" as a wildcard).
      const { data: taken } = await supabase
        .from("profiles").select("user_id").eq("username", input.username)
        .neq("user_id", user.id).maybeSingle();
      if (taken) return json({ error: "username_taken" }, 409);

      // Upsert, not update: the profile row may not exist yet.
      const { error: profErr } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          full_name: input.full_name,
          username: input.username,
          gender: input.gender,
          sport: input.role === "player" ? input.sport : null,
        },
        { onConflict: "user_id" },
      );
      if (profErr) {
        // The case-insensitive unique index is the source of truth if two sign-ups race.
        if ((profErr as { code?: string }).code === "23505") return json({ error: "username_taken" }, 409);
        return json({ error: "profile_update_failed" }, 400);
      }

      // Contact details, birth date and guardian consent go to the private table.
      if (input.phone || input.date_of_birth || input.guardian_name) {
        const { error: privErr } = await supabase.from("profile_private").upsert(
          {
            user_id: user.id,
            phone: input.phone,
            date_of_birth: input.date_of_birth,
            guardian_name: input.guardian_name,
            guardian_email: input.guardian_email,
            parental_consent_at: input.parental_consent ? new Date().toISOString() : null,
          },
          { onConflict: "user_id" },
        );
        if (privErr) return json({ error: "profile_update_failed" }, 400);
      }

      const { error: roleError } = await supabase
        .from("user_roles").insert({ user_id: user.id, role: input.role });
      if (roleError) return json({ error: "role_assignment_failed" }, 400);

      if (input.role === "scout") {
        // verification_status defaults to 'pending'; only admins can change it.
        const { error: scoutErr } = await supabase.from("scout_profiles").upsert(
          { user_id: user.id, full_name: input.full_name, organization: input.organization },
          { onConflict: "user_id", ignoreDuplicates: true },
        );
        if (scoutErr) return json({ error: "scout_profile_failed" }, 400);
        await supabase.from("notifications").insert({
          user_id: user.id,
          title: "Account pending verification",
          message: "Upload your organisation ID and CV from the verification screen so an admin can review your account.",
          type: "scout_verification",
        });
      }

      return json({ success: true });
    } catch (_err) {
      // Don't leak internal error details to the client.
      return json({ error: "internal_error" }, 500);
    }
  };
}
