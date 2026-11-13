import { deepStrictEqual as assertEquals, ok } from "node:assert/strict";
import { createHandler, emailHtml, escapeHtml, type Mailer, type Pusher } from "./handler.ts";

const N = "11111111-2222-3333-4444-555555555555";

function fake(opts: {
  type?: string; prefs?: Record<string, unknown> | null; tokens?: string[]; email?: string | null; category?: string;
} = {}) {
  const calls: string[] = [];
  const notification = {
    id: N, user_id: "u-1", title: "Your highlight was removed", message: "Reason: <b>spam</b>",
    type: opts.type ?? "video_removed", read: false, metadata: { video_id: "v-1", category: opts.category ?? "system" },
  };
  const table = (name: string) => {
    const q: Record<string, unknown> = {};
    const chain = {
      select: () => chain,
      eq: (_k: string, v: unknown) => { q.eq = v; return chain; },
      in: (_k: string, v: string[]) => { calls.push(`delete:${name}:${v.join(",")}`); return Promise.resolve({ error: null }); },
      delete: () => chain,
      maybeSingle: () => Promise.resolve({
        data: name === "notifications" ? notification
          : name === "notification_preferences" ? (opts.prefs === undefined ? { push_notifications: true, email_notifications: true } : opts.prefs)
          : null,
      }),
      then: (res: (v: unknown) => unknown) =>
        res({ data: name === "push_tokens" ? (opts.tokens ?? []).map((token) => ({ token })) : [] }),
    };
    return chain;
  };
  const client = {
    from: table,
    auth: { admin: { getUserById: () => Promise.resolve({ data: { user: opts.email === null ? null : { email: opts.email ?? "p@x.test" } } }) } },
  };
  const mailer: Mailer = { send: (to, subject) => { calls.push(`mail:${to}:${subject}`); return Promise.resolve(true); } };
  const pusher: Pusher = {
    send: (tokens, title) => { calls.push(`push:${tokens.join(",")}:${title}`); return Promise.resolve(tokens.filter((t) => t.startsWith("dead"))); },
  };
  return { client, calls, mailer, pusher };
}

const call = (f: ReturnType<typeof fake>, body: unknown = { notification_id: N }, secret = "s3cret", channels = true) =>
  createHandler({
    getClient: () => f.client, secret: "s3cret", appUrl: "https://app.test",
    mailer: channels ? f.mailer : null, pusher: channels ? f.pusher : null,
  })(new Request("http://x", { method: "POST", headers: { "x-ck-secret": secret }, body: JSON.stringify(body) }));

Deno.test("rejects calls without the shared secret", async () => {
  const f = fake();
  assertEquals((await call(f, undefined, "wrong")).status, 401);
  assertEquals(f.calls, []);
});
Deno.test("with no env secret, the database decides whether the caller is genuine", async () => {
  const f = fake({ tokens: ["tok-a"] });
  (f.client as Record<string, unknown>).rpc = (_n: string, a: { _secret: string }) => Promise.resolve({ data: a._secret === "db-secret" });
  const run = (given: string) => createHandler({ getClient: () => f.client, secret: undefined, appUrl: "https://app.test", mailer: null, pusher: f.pusher })(
    new Request("http://x", { method: "POST", headers: { "x-ck-secret": given }, body: JSON.stringify({ notification_id: N }) }));
  assertEquals((await run("guess")).status, 401);
  assertEquals((await run("db-secret")).status, 200);
});
Deno.test("rejects a malformed notification id", async () => {
  assertEquals((await call(fake(), { notification_id: "x; drop" })).status, 400);
});
Deno.test("sends push to every device and email for important notices", async () => {
  const f = fake({ tokens: ["tok-a", "tok-b"] });
  const res = await call(f);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { push: 2, email: true, pruned: 0 });
  assertEquals(f.calls, ["push:tok-a,tok-b:Your highlight was removed", "mail:p@x.test:Your highlight was removed"]);
});
Deno.test("likes are push-only, never emailed", async () => {
  const f = fake({ type: "like", tokens: ["tok-a"], category: "likes" });
  await call(f);
  assertEquals(f.calls, ["push:tok-a:Your highlight was removed"]);
});
Deno.test("respects the user's push and email switches", async () => {
  const f = fake({ tokens: ["tok-a"], prefs: { push_notifications: false, email_notifications: false } });
  assertEquals(await (await call(f)).json(), { push: 0, email: false, pruned: 0 });
  assertEquals(f.calls, []);
});
Deno.test("pause-all holds back activity but not system notices", async () => {
  const later = new Date(Date.now() + 3600_000).toISOString();
  const a = fake({ type: "like", category: "likes", tokens: ["t1"], prefs: { push_notifications: true, pause_all_until: later } });
  assertEquals((await (await call(a)).json()).skipped, "paused");
  const b = fake({ tokens: ["t1"], prefs: { push_notifications: true, email_notifications: true, pause_all_until: later } });
  assertEquals((await (await call(b)).json()).push, 1);
});
Deno.test("dead device tokens are deleted", async () => {
  const f = fake({ tokens: ["tok-a", "dead-1"] });
  assertEquals((await (await call(f)).json()).pruned, 1);
  ok(f.calls.includes("delete:push_tokens:dead-1"));
});
Deno.test("does nothing when no channel is configured", async () => {
  const f = fake({ tokens: ["tok-a"] });
  assertEquals(await (await call(f, undefined, "s3cret", false)).json(), { push: 0, email: false, pruned: 0 });
});
Deno.test("email content is escaped", () => {
  assertEquals(escapeHtml(`<script>"x"</script>`), "&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
  const html = emailHtml("Hi <b>", "line1\n<img src=x onerror=1>", "https://app.test");
  ok(!html.includes("<img src=x"));
  ok(html.includes("line1<br>"));
});
