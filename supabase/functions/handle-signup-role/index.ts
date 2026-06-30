import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Explicit origin allowlist — no wildcards. Override via ALLOWED_ORIGINS secret (comma-separated).
const DEFAULT_ALLOWED_ORIGINS = [
  "https://cholokheli.lovable.app",
  "https://id-preview--be579631-1dac-4942-9680-4157262d2c84.lovable.app",
  "http://localhost:8080",
];
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS")?.split(",").map((o) => o.trim()).filter(Boolean)) || DEFAULT_ALLOWED_ORIGINS;

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  const origin = req.headers.get("Origin");
  // Enforce origin allowlist for browser requests. Same-origin / server-to-server (no Origin header) are allowed.
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden origin" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { role, sport, phone, gender, full_name } = await req.json();

    // Assign role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role });

    if (roleError) {
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile
    await supabase
      .from("profiles")
      .update({ full_name, phone, gender, sport: role === "player" ? sport : null })
      .eq("user_id", user.id);

    // Create scout profile if scout
    if (role === "scout") {
      await supabase
        .from("scout_profiles")
        .insert({ user_id: user.id });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
