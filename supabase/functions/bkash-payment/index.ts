import { createClient } from "npm:@supabase/supabase-js@2";
import { createHandler } from "./handler.ts";
import { allowedOrigins } from "../_shared/origins.ts";

// Secrets: BKASH_BASE_URL (sandbox https://tokenized.sandbox.bka.sh/v1.2.0-beta, live https://tokenized.pay.bka.sh/v1.2.0-beta),
// BKASH_USERNAME, BKASH_PASSWORD, BKASH_APP_KEY, BKASH_APP_SECRET. Until they are set the function answers 503.
const env = (k: string) => Deno.env.get(k) ?? "";
const configured = ["BKASH_BASE_URL", "BKASH_USERNAME", "BKASH_PASSWORD", "BKASH_APP_KEY", "BKASH_APP_SECRET"].every((k) => env(k));

Deno.serve(
  createHandler({
    allowedOrigins: allowedOrigins(),
    bkash: configured
      ? { baseUrl: env("BKASH_BASE_URL").replace(/\/$/, ""), username: env("BKASH_USERNAME"), password: env("BKASH_PASSWORD"), appKey: env("BKASH_APP_KEY"), appSecret: env("BKASH_APP_SECRET") }
      : null,
    selfUrl: `${env("SUPABASE_URL")}/functions/v1/bkash-payment`,
    getClient: () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } }),
  }),
);
