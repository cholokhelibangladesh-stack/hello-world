import { deepStrictEqual as assertEquals, ok as assert } from "node:assert/strict";
import { validateSignupPayload } from "./validate.ts";

const base = { role: "player", username: "rafiq_10", full_name: "Rafiq", sport: "football", date_of_birth: "2000-01-01" };

Deno.test("rejects admin role", () => {
  assertEquals(validateSignupPayload({ ...base, role: "admin" }), { ok: false, error: "invalid_role" });
});
Deno.test("rejects admin role with odd casing/whitespace", () => {
  assertEquals(validateSignupPayload({ ...base, role: " ADMIN " }), { ok: false, error: "invalid_role" });
});
Deno.test("rejects unknown and missing roles", () => {
  assertEquals(validateSignupPayload({ ...base, role: "superuser" }).ok, false);
  assertEquals(validateSignupPayload({ ...base, role: undefined }).ok, false);
  assertEquals(validateSignupPayload({ ...base, role: ["player"] }).ok, false);
});
Deno.test("accepts player and scout", () => {
  const p = validateSignupPayload(base);
  assertEquals(p.ok && p.value.role, "player");
  const s = validateSignupPayload({ ...base, role: "scout" });
  assertEquals(s.ok && s.value.role, "scout");
  assertEquals(s.ok && s.value.sport, null, "scouts don't get a sport");
});
Deno.test("validates username", () => {
  assertEquals(validateSignupPayload({ ...base, username: "ab" }).ok, false);
  assertEquals(validateSignupPayload({ ...base, username: "bad handle!" }).ok, false);
  const ok = validateSignupPayload({ ...base, username: "  Rafiq_10 " });
  assertEquals(ok.ok && ok.value.username, "rafiq_10");
});
Deno.test("validates sport, name and phone", () => {
  assertEquals(validateSignupPayload({ ...base, sport: "chess" }), { ok: false, error: "invalid_sport" });
  assertEquals(validateSignupPayload({ ...base, full_name: "  " }), { ok: false, error: "invalid_full_name" });
  assertEquals(validateSignupPayload({ ...base, phone: "<script>" }), { ok: false, error: "invalid_phone" });
  const ok = validateSignupPayload({ ...base, phone: "+880 1711-000000" });
  assertEquals(ok.ok && ok.value.phone, "+880 1711-000000");
});
Deno.test("rejects non-object bodies", () => {
  assertEquals(validateSignupPayload(null).ok, false);
  assertEquals(validateSignupPayload("player").ok, false);
});

const TODAY = new Date(Date.UTC(2026, 10, 2)); // 2026-11-02
const kid = { ...base, date_of_birth: "2012-05-05" }; // 14

Deno.test("under-13s are rejected", () => {
  assertEquals(validateSignupPayload({ ...base, date_of_birth: "2015-01-01" }, TODAY), { ok: false, error: "age_not_eligible" });
});
Deno.test("minors need guardian name, email and consent", () => {
  assertEquals(validateSignupPayload(kid, TODAY), { ok: false, error: "guardian_consent_required" });
  assertEquals(validateSignupPayload({ ...kid, guardian_name: "Mum", guardian_email: "mum@x.com" }, TODAY).ok, false);
  const ok = validateSignupPayload({ ...kid, guardian_name: "Mum", guardian_email: "Mum@X.com", parental_consent: true }, TODAY);
  assertEquals(ok.ok && [ok.value.guardian_email, ok.value.parental_consent], ["mum@x.com", true]);
});
Deno.test("adults don't need (and don't store) guardian data", () => {
  const ok = validateSignupPayload({ ...base, date_of_birth: "2000-01-01", guardian_name: "x" }, TODAY);
  assertEquals(ok.ok && [ok.value.guardian_name, ok.value.parental_consent], [null, false]);
});
Deno.test("birthday boundary: turns 18 today = adult", () => {
  const ok = validateSignupPayload({ ...base, date_of_birth: "2008-11-02" }, TODAY);
  assertEquals(ok.ok, true);
  assertEquals(validateSignupPayload({ ...base, date_of_birth: "2008-11-03" }, TODAY).ok, false, "still 17");
});
Deno.test("malformed dates are rejected", () => {
  assertEquals(validateSignupPayload({ ...base, date_of_birth: "05/05/2012" }, TODAY).ok, false);
  assertEquals(validateSignupPayload({ ...base, date_of_birth: 20120505 }, TODAY).ok, false);
});

Deno.test("date of birth is required (no way around the age and consent rules)", () => {
  const { date_of_birth: _omit, ...noDob } = base;
  assertEquals(validateSignupPayload(noDob, TODAY), { ok: false, error: "date_of_birth_required" });
  assertEquals(validateSignupPayload({ ...base, date_of_birth: "" }, TODAY), { ok: false, error: "date_of_birth_required" });
});

Deno.test("scouts must be adults and may give an organisation", () => {
  assertEquals(validateSignupPayload({ ...base, role: "scout", date_of_birth: "2012-05-05" }, TODAY), { ok: false, error: "scouts_must_be_adults" });
  const ok = validateSignupPayload({ ...base, role: "scout", organization: "  Abahani Academy " }, TODAY);
  assert(ok.ok && ok.value.organization === "Abahani Academy");
  const p = validateSignupPayload({ ...base, organization: "ignored" }, TODAY);
  assert(p.ok && p.value.organization === null, "players don't get an organisation");
});
