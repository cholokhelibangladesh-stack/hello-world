import { createClient } from "npm:@supabase/supabase-js@2";
import { createHandler } from "./handler.ts";
import { allowedOrigins } from "../_shared/origins.ts";

Deno.serve(
  createHandler({
    allowedOrigins: allowedOrigins(),
    getClient: () =>
      createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { persistSession: false },
      }),
  }),
);
