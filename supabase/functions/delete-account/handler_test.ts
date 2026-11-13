import { deepStrictEqual as assertEquals } from "node:assert/strict";
import { createHandler, USER_BUCKETS } from "./handler.ts";

function fake(opts: { roles?: string[]; files?: Record<string, string[]>; user?: { id: string } | null } = {}) {
  const calls: string[] = [];
  const user = opts.user === undefined ? { id: "u-1" } : opts.user;
  const files = { ...(opts.files ?? {}) };
  const client = {
    auth: {
      getUser: () => Promise.resolve({ data: { user }, error: user ? null : new Error("bad") }),
      admin: { deleteUser: (id: string) => { calls.push(`deleteUser:${id}`); return Promise.resolve({ error: null }); } },
    },
    from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: (opts.roles ?? ["player"]).map((role) => ({ role })), error: null }) }) }),
    rpc: (name: string, args: { _user_id: string }) => { calls.push(`rpc:${name}:${args._user_id}`); return Promise.resolve({ error: null }); },
    storage: {
      from: (bucket: string) => ({
        list: () => Promise.resolve({ data: (files[bucket] ?? []).map((name) => ({ name })), error: null }),
        remove: (paths: string[]) => { calls.push(`remove:${bucket}:${paths.join(",")}`); files[bucket] = []; return Promise.resolve({ error: null }); },
      }),
    },
  };
  return { client, calls };
}
const call = (f: ReturnType<typeof fake>, body: unknown, origin = "https://localhost") =>
  createHandler({ getClient: () => f.client, allowedOrigins: ["https://localhost"] })(
    new Request("http://x", { method: "POST", headers: { Authorization: "Bearer t", Origin: origin }, body: JSON.stringify(body) }),
  );

Deno.test("requires explicit confirmation", async () => {
  const f = fake();
  assertEquals((await call(f, {})).status, 400);
  assertEquals(f.calls, []);
});
Deno.test("deletes files, extra rows, then the auth user — in that order", async () => {
  const f = fake({ files: { "player-videos": ["a.mp4", "b.mp4"], avatars: ["me.png"] } });
  const res = await call(f, { confirm: "DELETE" });
  assertEquals(res.status, 200);
  assertEquals(f.calls, [
    "remove:player-videos:u-1/a.mp4,u-1/b.mp4",
    "remove:avatars:u-1/me.png",
    "rpc:prepare_account_deletion:u-1",
    "deleteUser:u-1",
  ]);
});
Deno.test("covers every user bucket", () => {
  assertEquals(USER_BUCKETS, ["player-videos", "avatars", "documents"]);
});
Deno.test("admins cannot self-delete", async () => {
  const f = fake({ roles: ["admin"] });
  assertEquals((await call(f, { confirm: "DELETE" })).status, 403);
  assertEquals(f.calls, []);
});
Deno.test("unauthenticated requests are rejected", async () => {
  assertEquals((await call(fake({ user: null }), { confirm: "DELETE" })).status, 401);
});
Deno.test("the Android app origin is accepted and others are not", async () => {
  assertEquals((await call(fake(), { confirm: "DELETE" }, "https://localhost")).status, 200);
  assertEquals((await call(fake(), { confirm: "DELETE" }, "https://evil.example")).status, 403);
});
