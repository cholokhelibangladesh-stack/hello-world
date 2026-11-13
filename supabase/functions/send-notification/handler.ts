// Delivers one notification row as a push (Firebase Cloud Messaging) and/or an email (Resend).
// Called by the database (trigger trg_deliver_notification via pg_net), never by the app.
// Each channel is optional: with no FCM/Resend secrets configured it simply does nothing.

// deno-lint-ignore no-explicit-any
type Client = any;

export interface Mailer {
  send(to: string, subject: string, html: string, text: string): Promise<boolean>;
}
export interface Pusher {
  /** Returns the tokens that are no longer valid and should be deleted. */
  send(tokens: string[], title: string, body: string, data: Record<string, string>): Promise<string[]>;
}

export interface Deps {
  getClient: () => Client;
  secret: string | undefined;
  mailer: Mailer | null;
  pusher: Pusher | null;
  appUrl: string;
}

/** Notification types important enough to email. Likes, follows and comments are push-only. */
export const EMAIL_TYPES = new Set([
  "message", "video_removed", "video_restored", "account_notice", "notice",
  "scout_request", "scout_verification", "request_update", "verification",
]);

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function emailHtml(title: string, message: string, appUrl: string) {
  const body = escapeHtml(message).replace(/\n/g, "<br>");
  return `<!doctype html><html><body style="margin:0;background:#F2F4F6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0E2A33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td style="font-size:13px;color:#13738F;font-weight:600;padding-bottom:12px">Cholo Kheli</td></tr>
<tr><td style="font-size:20px;font-weight:700;line-height:1.3;padding-bottom:12px">${escapeHtml(title)}</td></tr>
<tr><td style="font-size:16px;line-height:1.5;padding-bottom:24px">${body}</td></tr>
<tr><td><a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#13738F;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600">Open Cholo Kheli</a></td></tr>
<tr><td style="font-size:12px;color:#6b7c85;padding-top:24px">You can turn off email notifications in Settings, Notifications.</td></tr>
</table></td></tr></table></body></html>`;
}

export function createHandler({ getClient, secret, mailer, pusher, appUrl }: Deps) {
  return async (req: Request): Promise<Response> => {
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    // The caller must present the database's shared secret. With NOTIFY_WEBHOOK_SECRET set it is
    // compared directly; otherwise the database itself confirms it (verify_notify_secret).
    const given = req.headers.get("x-ck-secret");
    if (!given) return json({ error: "Unauthorized" }, 401);
    try {
      const ok = secret ? given === secret
        : (await getClient().rpc("verify_notify_secret", { _secret: given })).data === true;
      if (!ok) return json({ error: "Unauthorized" }, 401);
    } catch { return json({ error: "Unauthorized" }, 401); }

    let id: unknown;
    try { id = (await req.json())?.notification_id; } catch { /* handled below */ }
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "invalid_body" }, 400);

    try {
      const supabase = getClient();
      const { data: n } = await supabase.from("notifications")
        .select("id, user_id, title, message, type, read, metadata").eq("id", id).maybeSingle();
      if (!n) return json({ error: "not_found" }, 404);

      const { data: prefs } = await supabase.from("notification_preferences")
        .select("push_notifications, email_notifications, pause_all_until").eq("user_id", n.user_id).maybeSingle();
      const paused = prefs?.pause_all_until && new Date(prefs.pause_all_until) > new Date()
        && n.metadata?.category !== "system";
      const result = { push: 0, email: false, pruned: 0 };
      if (paused) return json({ ...result, skipped: "paused" });

      if (pusher && prefs?.push_notifications !== false) {
        const { data: rows } = await supabase.from("push_tokens").select("token").eq("user_id", n.user_id);
        const tokens = (rows ?? []).map((r: { token: string }) => r.token);
        if (tokens.length) {
          const data: Record<string, string> = { notification_id: n.id, type: n.type ?? "" };
          for (const k of ["video_id", "actor_id"]) if (n.metadata?.[k]) data[k] = String(n.metadata[k]);
          const dead = await pusher.send(tokens, n.title, n.message ?? "", data);
          result.push = tokens.length - dead.length;
          if (dead.length) {
            await supabase.from("push_tokens").delete().in("token", dead);
            result.pruned = dead.length;
          }
        }
      }

      if (mailer && prefs?.email_notifications !== false && EMAIL_TYPES.has(n.type ?? "")) {
        const { data: u } = await supabase.auth.admin.getUserById(n.user_id);
        const email = u?.user?.email;
        if (email) {
          result.email = await mailer.send(email, n.title, emailHtml(n.title, n.message ?? "", appUrl),
            `${n.title}\n\n${n.message ?? ""}\n\n${appUrl}`);
        }
      }
      return json(result);
    } catch (_e) {
      return json({ error: "internal_error" }, 500);
    }
  };
}

// ───────────── channel implementations (used by index.ts) ─────────────

export function resendMailer(apiKey: string, from: string): Mailer {
  return {
    async send(to, subject, html, text) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });
      return r.ok;
    },
  };
}

type ServiceAccount = { client_email: string; private_key: string; project_id: string };

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function googleAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${b64url(sig)}` }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("fcm_auth_failed");
  return j.access_token;
}

export function fcmPusher(serviceAccountJson: string): Pusher {
  const sa = JSON.parse(serviceAccountJson) as ServiceAccount;
  return {
    async send(tokens, title, body, data) {
      const access = await googleAccessToken(sa);
      const dead: string[] = [];
      await Promise.all(tokens.map(async (token) => {
        const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              token, notification: { title, body: body.slice(0, 240) }, data,
              android: { priority: "high", notification: { channel_id: "default", color: "#13738F" } },
            },
          }),
        });
        if (r.status === 404 || r.status === 400) {
          const txt = await r.text();
          if (/UNREGISTERED|INVALID_ARGUMENT|registration-token-not-registered/i.test(txt)) dead.push(token);
        }
      }));
      return dead;
    },
  };
}
