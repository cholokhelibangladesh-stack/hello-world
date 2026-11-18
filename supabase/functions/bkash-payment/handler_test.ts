import { deepStrictEqual as assertEquals } from "node:assert/strict";
import { createHandler } from "./handler.ts";

const BK = { baseUrl: "https://bk.test", username: "u", password: "p", appKey: "k", appSecret: "s" };
const VIDEO = "11111111-2222-3333-4444-555555555555";
const PAY = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function fakeDb(opts: { videoStatus?: string; owner?: string; payment?: Record<string, unknown> } = {}) {
  const calls: string[] = [];
  const payment: Record<string, unknown> = opts.payment ?? { id: PAY, status: "pending", amount: 100, provider_payment_id: "BKP1", return_url: "https://localhost/player/upload" };
  const client = {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u-1" } }, error: null }) },
    rpc: (name: string, args: unknown) => { calls.push(`rpc:${name}:${JSON.stringify(args)}`); return Promise.resolve({ data: name === "upload_fee_bdt" ? 100 : null, error: null }); },
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      const chain = {
        select: () => chain, eq: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === "videos" ? { id: VIDEO, user_id: opts.owner ?? "u-1", status: opts.videoStatus ?? "pending_payment", title: "Goal" } : payment, error: null }),
        single: () => Promise.resolve({ data: { id: PAY, invoice_no: "CK-2026-000001" }, error: null }),
        insert: (row: unknown) => { calls.push(`insert:${table}:${JSON.stringify(row)}`); return chain; },
        update: (row: Record<string, unknown>) => { calls.push(`update:${table}:${JSON.stringify(row)}`); Object.assign(q, row); return chain; },
      };
      return chain;
    },
  };
  return { client, calls };
}

function fakeBkash(exec: Record<string, string>) {
  const hits: string[] = [];
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const path = String(input).replace(BK.baseUrl, "");
    hits.push(path);
    const body = path.endsWith("/token/grant") ? { id_token: "TOKEN" }
      : path.endsWith("/create") ? { paymentID: "BKP1", bkashURL: "https://pay.bka.sh/x", statusCode: "0000", _sent: init?.body }
      : exec;
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  return { f, hits };
}

const make = (db: ReturnType<typeof fakeDb>, bk: ReturnType<typeof fakeBkash> | null) =>
  createHandler({ getClient: () => db.client, allowedOrigins: ["https://localhost"], bkash: bk ? BK : null, selfUrl: "https://fn.test/bkash-payment", fetchImpl: bk?.f });
const create = (h: ReturnType<typeof make>, body: unknown) =>
  h(new Request("https://fn.test/bkash-payment", { method: "POST", headers: { Authorization: "Bearer t", Origin: "https://localhost" }, body: JSON.stringify(body) }));

Deno.test("create returns the bKash page for a video awaiting payment", async () => {
  const db = fakeDb(); const bk = fakeBkash({});
  const res = await create(make(db, bk), { action: "create", video_id: VIDEO, return_url: "https://localhost/player/upload" });
  assertEquals(res.status, 200);
  const j = await res.json();
  assertEquals(j.bkashURL, "https://pay.bka.sh/x");
  assertEquals(bk.hits, ["/tokenized/checkout/token/grant", "/tokenized/checkout/create"]);
});

Deno.test("create refuses someone else's video and live videos", async () => {
  assertEquals((await create(make(fakeDb({ owner: "other" }), fakeBkash({})), { action: "create", video_id: VIDEO, return_url: "https://localhost/" })).status, 404);
  assertEquals((await create(make(fakeDb({ videoStatus: "live" }), fakeBkash({})), { action: "create", video_id: VIDEO, return_url: "https://localhost/" })).status, 409);
});

Deno.test("create refuses a return address outside the app", async () => {
  assertEquals((await create(make(fakeDb(), fakeBkash({})), { action: "create", video_id: VIDEO, return_url: "https://evil.test/" })).status, 400);
});

Deno.test("without bKash secrets the function says payments are not configured", async () => {
  assertEquals((await create(make(fakeDb(), null), { action: "create", video_id: VIDEO, return_url: "https://localhost/" })).status, 503);
});

Deno.test("successful callback executes, publishes and redirects back", async () => {
  const db = fakeDb(); const bk = fakeBkash({ transactionStatus: "Completed", trxID: "TRX9", amount: "100.00", currency: "BDT", customerMsisdn: "01712345689" });
  const res = await make(db, bk)(new Request(`https://fn.test/bkash-payment?pid=${PAY}&paymentID=BKP1&status=success`));
  assertEquals(res.status, 302);
  assertEquals(res.headers.get("Location"), `https://localhost/payments/${PAY}?result=paid`);
  assertEquals(db.calls.some((c) => c.startsWith("rpc:complete_upload_payment") && c.includes("TRX9") && c.includes("017******89")), true);
});

Deno.test("underpaid or incomplete payments are not published", async () => {
  const db = fakeDb(); const bk = fakeBkash({ transactionStatus: "Completed", trxID: "TRX9", amount: "10.00", currency: "BDT" });
  const res = await make(db, bk)(new Request(`https://fn.test/bkash-payment?pid=${PAY}&paymentID=BKP1&status=success`));
  assertEquals(res.headers.get("Location"), `https://localhost/payments/${PAY}?result=failed`);
  assertEquals(db.calls.some((c) => c.startsWith("rpc:complete_upload_payment")), false);
});

Deno.test("a cancelled payment is recorded and nothing is published", async () => {
  const db = fakeDb(); const bk = fakeBkash({});
  const res = await make(db, bk)(new Request(`https://fn.test/bkash-payment?pid=${PAY}&paymentID=BKP1&status=cancel`));
  assertEquals(res.headers.get("Location"), `https://localhost/payments/${PAY}?result=cancelled`);
  assertEquals(bk.hits.length, 0);
});

Deno.test("a callback for a different bKash payment is rejected", async () => {
  const db = fakeDb(); const bk = fakeBkash({ transactionStatus: "Completed", amount: "100", trxID: "T" });
  const res = await make(db, bk)(new Request(`https://fn.test/bkash-payment?pid=${PAY}&paymentID=OTHER&status=success`));
  assertEquals(res.headers.get("Location"), `https://localhost/payments/${PAY}?result=failed`);
  assertEquals(bk.hits.length, 0);
});
