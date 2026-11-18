// bKash Tokenized Checkout for paid highlight uploads. Two entry points:
//   POST {action:"create", video_id, return_url}  (signed-in player) -> { bkashURL } to open
//   GET  ?pid=<payment id>&paymentID=..&status=success|failure|cancel  (bKash redirect) -> executes the
//        payment, publishes the video, sends invoice + certificate, then redirects back to the app.
// Split from index.ts so it can be tested with a fake bKash server and a fake Supabase client.
import { isAllowedOrigin } from "../_shared/origins.ts";

// deno-lint-ignore no-explicit-any
type Client = any;

export interface BkashConfig { baseUrl: string; username: string; password: string; appKey: string; appSecret: string }

export interface HandlerDeps {
  getClient: () => Client;
  allowedOrigins: string[];
  /** null when the bKash secrets are not set yet. */
  bkash: BkashConfig | null;
  /** Public URL of this function, used as bKash's callback. */
  selfUrl: string;
  fetchImpl?: typeof fetch;
}

const mask = (msisdn?: string | null) => (msisdn && msisdn.length >= 6 ? `${msisdn.slice(0, 3)}${"*".repeat(Math.max(0, msisdn.length - 5))}${msisdn.slice(-2)}` : null);

export function createHandler({ getClient, allowedOrigins, bkash, selfUrl, fetchImpl = fetch }: HandlerDeps) {
  const bk = async (path: string, body: unknown, token?: string) => {
    const res = await fetchImpl(`${bkash!.baseUrl}${path}`, {
      method: "POST",
      headers: token
        ? { "Content-Type": "application/json", Accept: "application/json", Authorization: token, "X-App-Key": bkash!.appKey }
        : { "Content-Type": "application/json", Accept: "application/json", username: bkash!.username, password: bkash!.password },
      body: JSON.stringify(body),
    });
    return (await res.json().catch(() => ({}))) as Record<string, string>;
  };
  const grant = async () => {
    const r = await bk("/tokenized/checkout/token/grant", { app_key: bkash!.appKey, app_secret: bkash!.appSecret });
    if (!r.id_token) throw new Error("bkash_auth_failed");
    return r.id_token;
  };

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin");
    const cors: Record<string, string> = {
      "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin, allowedOrigins) ? origin : "null",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Vary": "Origin",
    };
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

    // ── bKash sends the player back here after they pay, cancel or fail ──
    if (req.method === "GET") {
      const pid = url.searchParams.get("pid");
      const paymentID = url.searchParams.get("paymentID");
      const status = url.searchParams.get("status");
      if (!pid || !/^[0-9a-f-]{36}$/i.test(pid)) return new Response("Bad request", { status: 400 });
      const supabase = getClient();
      const { data: p } = await supabase.from("payments").select("id, status, amount, provider_payment_id, return_url").eq("id", pid).maybeSingle();
      if (!p) return new Response("Not found", { status: 404 });
      const back = (result: string) => {
        const base = p.return_url && isAllowedOrigin(new URL(p.return_url).origin, allowedOrigins) ? p.return_url : null;
        const to = base ? `${new URL(p.return_url).origin}/payments/${p.id}?result=${result}` : null;
        return to ? Response.redirect(to, 302) : new Response(`Payment ${result}. You can return to Cholo Kheli.`, { status: 200 });
      };
      if (p.status === "paid") return back("paid");
      if (!bkash || !paymentID || paymentID !== p.provider_payment_id) return back("failed");
      if (status !== "success") {
        await supabase.from("payments").update({ status: status === "cancel" ? "cancelled" : "failed", failure_reason: status }).eq("id", p.id).eq("status", "pending");
        return back(status === "cancel" ? "cancelled" : "failed");
      }
      try {
        const token = await grant();
        let r = await bk("/tokenized/checkout/execute", { paymentID }, token);
        // Execute can time out after the money moved; ask bKash for the final state before giving up.
        if (r.transactionStatus !== "Completed") r = { ...r, ...(await bk("/tokenized/checkout/payment/status", { paymentID }, token)) };
        const paidEnough = Number(r.amount) >= Number(p.amount) && (r.currency ?? "BDT") === "BDT";
        if (r.transactionStatus === "Completed" && paidEnough) {
          const { error } = await supabase.rpc("complete_upload_payment", { _payment_id: p.id, _trx_id: r.trxID ?? null, _payer: mask(r.customerMsisdn) });
          if (error) return back("failed");
          return back("paid");
        }
        await supabase.from("payments").update({ status: "failed", failure_reason: r.statusMessage ?? r.transactionStatus ?? "not_completed" }).eq("id", p.id).eq("status", "pending");
        return back("failed");
      } catch {
        return back("failed");
      }
    }

    if (origin && !isAllowedOrigin(origin, allowedOrigins)) return json({ error: "Forbidden origin" }, 403);
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    try {
      const supabase = getClient();
      const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (!token) return json({ error: "Unauthorized" }, 401);
      const { data: { user } = { user: null }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return json({ error: "Unauthorized" }, 401);

      let body: Record<string, unknown> = {};
      try { body = await req.json(); } catch { /* handled below */ }
      if (body.action !== "create") return json({ error: "unknown_action" }, 400);
      const videoId = typeof body.video_id === "string" ? body.video_id : "";
      const returnUrl = typeof body.return_url === "string" ? body.return_url : "";
      if (!/^[0-9a-f-]{36}$/i.test(videoId)) return json({ error: "invalid_video" }, 400);
      let returnOk = false; try { returnOk = isAllowedOrigin(new URL(returnUrl).origin, allowedOrigins); } catch { /* invalid */ }
      if (!returnOk) return json({ error: "invalid_return_url" }, 400);

      const { data: v } = await supabase.from("videos").select("id, user_id, status, title").eq("id", videoId).maybeSingle();
      if (!v || v.user_id !== user.id) return json({ error: "invalid_video" }, 404);
      if (v.status !== "pending_payment") return json({ error: "not_awaiting_payment" }, 409);
      if (!bkash) return json({ error: "payments_not_configured" }, 503);

      const { data: fee } = await supabase.rpc("upload_fee_bdt");
      const amount = Number(fee ?? 100);
      const { data: pay, error: payErr } = await supabase.from("payments")
        .insert({ user_id: user.id, video_id: v.id, amount, return_url: returnUrl, video_title: v.title })
        .select("id, invoice_no").single();
      if (payErr || !pay) return json({ error: "payment_record_failed" }, 500);

      const idToken = await grant();
      const created = await bk("/tokenized/checkout/create", {
        mode: "0011", payerReference: user.id.slice(0, 20), callbackURL: `${selfUrl}?pid=${pay.id}`,
        amount: amount.toFixed(2), currency: "BDT", intent: "sale", merchantInvoiceNumber: pay.invoice_no,
      }, idToken);
      if (!created.paymentID || !created.bkashURL) {
        await supabase.from("payments").update({ status: "failed", failure_reason: created.statusMessage ?? "create_failed" }).eq("id", pay.id);
        return json({ error: "bkash_create_failed", message: created.statusMessage ?? null }, 502);
      }
      await supabase.from("payments").update({ provider_payment_id: created.paymentID }).eq("id", pay.id);
      return json({ payment_id: pay.id, bkashURL: created.bkashURL, amount });
    } catch (_err) {
      return json({ error: "internal_error" }, 500);
    }
  };
}
