import { createClient } from "npm:@supabase/supabase-js@2";
import { createHandler, fcmPusher, resendMailer } from "./handler.ts";
import { allowedOrigins, isAllowedOrigin } from "../_shared/origins.ts";

// Secrets (Supabase dashboard, Edge Functions, Secrets):
//   NOTIFY_WEBHOOK_SECRET   optional; if unset the database verifies the caller's secret itself
//   FCM_SERVICE_ACCOUNT     optional; Firebase service-account JSON, turns on push
//   RESEND_API_KEY, EMAIL_FROM   optional; turn on email (EMAIL_FROM like "Cholo Kheli <hello@yourdomain>")
//   PUBLIC_APP_URL          optional; link in emails
const fcm = Deno.env.get("FCM_SERVICE_ACCOUNT");
const resend = Deno.env.get("RESEND_API_KEY");
const from = Deno.env.get("EMAIL_FROM");

Deno.serve(
  createHandler({
    secret: Deno.env.get("NOTIFY_WEBHOOK_SECRET"),
    pusher: fcm ? fcmPusher(fcm) : null,
    mailer: resend && from ? resendMailer(resend, from) : null,
    appUrl: Deno.env.get("PUBLIC_APP_URL") ?? "https://cholokheli.lovable.app",
    signingKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    selfUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`,
    isAllowedOrigin: (o) => isAllowedOrigin(o, allowedOrigins()),
    getClient: () =>
      createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { persistSession: false },
      }),
  }),
);
