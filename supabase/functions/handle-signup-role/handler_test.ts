import { deepStrictEqual as assertEquals, ok as assert } from "node:assert/strict";
import { createHandler } from "./handler.ts";

// --- tiny fake of the supabase-js query builder ------------------------------
type Op = { table: string; op: string; payload?: unknown };
function fakeClient(opts: { user?: { id: string; user_metadata?: Record<string, unknown> } | null; existingRoles?: string[]; usernameTaken?: boolean } = {}) {
  const ops: Op[] = [];
  const user = opts.user === undefined ? { id: "u-1" } : opts.user;
  const builder = (table: string) => {
    let op = "select";
    let payload: unknown;
    let isUsernameCheck = false;
    const result = () => {
      if (op === "select" && table === "user_roles") {
        return { data: (opts.existingRoles ?? []).map((role) => ({ role })), error: null };
      }
      if (op === "select" && table === "profiles" && isUsernameCheck) {
        return { data: opts.usernameTaken ? { user_id: "other" } : null, error: null };
      }
      return { data: null, error: null };
    };
    const b: Record<string, unknown> = {
      select: () => b,
      eq: (col: string) => { if (col === "username") isUsernameCheck = true; return b; },
      neq: () => b,
      ilike: (col: string) => { if (col === "username") isUsernameCheck = true; return b; },
      maybeSingle: () => Promise.resolve(result()),
      insert: (p: unknown) => { op = "insert"; payload = p; ops.push({ table, op, payload }); return b; },
      upsert: (p: unknown) => { op = "upsert"; payload = p; ops.push({ table, op, payload }); return b; },
      update: (p: unknown) => { op = "update"; payload = p; ops.push({ table, op, payload }); return b; },
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result()).then(res, rej),
    };
    return b;
  };
  return {
    ops,
    client: {
      auth: { getUser: () => Promise.resolve({ data: { user }, error: user ? null : new Error("bad jwt") }) },
      from: builder,
    },
  };
}

const ORIGIN = "http://localhost:8080";
function call(fake: ReturnType<typeof fakeClient>, body: unknown, headers: Record<string, string> = {}) {
  const handler = createHandler({ getClient: () => fake.client, allowedOrigins: [ORIGIN] });
  return handler(new Request("http://x/handle-signup-role", {
    method: "POST",
    headers: { Authorization: "Bearer jwt", Origin: ORIGIN, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  }));
}
const good = { role: "player", username: "rafiq_10", full_name: "Rafiq", sport: "football", date_of_birth: "2000-01-01" };
const writesTo = (f: ReturnType<typeof fakeClient>, table: string) => f.ops.filter((o) => o.table === table);

Deno.test("role=admin is rejected and nothing is written", async () => {
  const f = fakeClient();
  const res = await call(f, { ...good, role: "admin" });
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error, "invalid_role");
  assertEquals(f.ops.length, 0);
});

Deno.test("a user who already has a role cannot onboard again (e.g. player -> scout)", async () => {
  const f = fakeClient({ existingRoles: ["player"] });
  const res = await call(f, { ...good, role: "scout" });
  assertEquals(res.status, 409);
  assertEquals(f.ops.length, 0);
});

Deno.test("valid player signup upserts the profile and assigns the player role", async () => {
  const f = fakeClient();
  const res = await call(f, good);
  assertEquals(res.status, 200);
  assertEquals(writesTo(f, "user_roles"), [{ table: "user_roles", op: "insert", payload: { user_id: "u-1", role: "player" } }]);
  assertEquals(writesTo(f, "profiles")[0].op, "upsert");
  assertEquals(writesTo(f, "scout_profiles").length, 0);
});

Deno.test("valid scout signup creates a pending scout profile without setting verification", async () => {
  const f = fakeClient();
  const res = await call(f, { ...good, role: "scout" });
  assertEquals(res.status, 200);
  const sp = writesTo(f, "scout_profiles")[0].payload as Record<string, unknown>;
  assert(!("verification_status" in sp), "must not set verification_status");
});

Deno.test("taken username returns 409", async () => {
  const f = fakeClient({ usernameTaken: true });
  assertEquals((await call(f, good)).status, 409);
  assertEquals(writesTo(f, "user_roles").length, 0);
});

Deno.test("missing or invalid JWT returns 401", async () => {
  assertEquals((await call(fakeClient({ user: null }), good)).status, 401);
  assertEquals((await call(fakeClient(), good, { Authorization: "" })).status, 401);
});

Deno.test("disallowed browser origin returns 403", async () => {
  assertEquals((await call(fakeClient(), good, { Origin: "https://evil.example" })).status, 403);
});

Deno.test("phone, DOB and guardian consent go to profile_private, not profiles", async () => {
  const f = fakeClient();
  const res = await call(f, { ...good, phone: "01711000000", date_of_birth: "2012-05-05",
    guardian_name: "Mum", guardian_email: "mum@x.com", parental_consent: true });
  assertEquals(res.status, 200);
  const prof = writesTo(f, "profiles")[0].payload as Record<string, unknown>;
  assert(!("phone" in prof) && !("date_of_birth" in prof), "no PII on public profile");
  const priv = writesTo(f, "profile_private")[0].payload as Record<string, unknown>;
  assertEquals([priv.phone, priv.date_of_birth, priv.guardian_email], ["01711000000", "2012-05-05", "mum@x.com"]);
  assert(typeof priv.parental_consent_at === "string", "consent timestamp recorded");
});

Deno.test("minor without parental consent is rejected before any write", async () => {
  const f = fakeClient();
  const res = await call(f, { ...good, date_of_birth: "2012-05-05" });
  assertEquals(res.status, 400);
  assertEquals(f.ops.length, 0);
});

Deno.test("onboarding can finish from user_metadata when the form state is gone (other device)", async () => {
  const f = fakeClient({ user: { id: "u-1", user_metadata: { onboarding: { ...good, role: "scout", organization: "Abahani" } } } });
  const res = await call(f, {});
  assertEquals(res.status, 200);
  assertEquals((writesTo(f, "user_roles")[0].payload as { role: string }).role, "scout");
  assertEquals((writesTo(f, "scout_profiles")[0].payload as { organization: string }).organization, "Abahani");
});

Deno.test("an explicit body wins over user_metadata", async () => {
  const f = fakeClient({ user: { id: "u-1", user_metadata: { onboarding: { ...good, role: "scout" } } } });
  const res = await call(f, good);
  assertEquals(res.status, 200);
  assertEquals((writesTo(f, "user_roles")[0].payload as { role: string }).role, "player");
});
