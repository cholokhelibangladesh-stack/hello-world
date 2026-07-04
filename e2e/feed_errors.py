#!/usr/bin/env python3
"""
Ranked-feed ERROR-path regression.

For each scenario, invoke get_ranked_feed under conditions that must fail
and assert the failure shape. Raw payloads are saved to
e2e/screenshots/feed_error_<name>.json for debugging.

Scenarios:
  1. bad_session       — expired/garbage bearer token → PostgREST 401
                         OR RPC error `not_authenticated` (42501).
  2. no_session        — anon caller (no JWT) → 401 or `not_authenticated`.
  3. invalid_limit     — signed-in player, _limit=-5 → RPC returns clamped
                         results (function LEASTs to [1,50]); we assert the
                         call succeeds AND the returned row count fits [0,50].
  4. sport_gibberish   — signed-in player, _sport="__nope__" → 0 rows, no error.

Note: `no_role` and `scout_not_active` were originally intended, but the
seeded scout accounts are both `active`, and every seeded user has a role.
Skipped here to keep the suite hermetic; documented in the script.

Usage:
    python3 e2e/feed_errors.py
"""
import asyncio
import json
import os
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

results = []
def record(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))

async def sign_in(page, email, password):
    await page.goto(BASE + "/auth", wait_until="domcontentloaded")
    await page.wait_for_timeout(500)
    await page.get_by_label(re.compile("email", re.I)).first.fill(email)
    await page.get_by_label(re.compile("password", re.I)).first.fill(password)
    try:
        await page.get_by_role("button", name=re.compile(r"^\s*sign in\s*$", re.I)).first.click()
    except Exception:
        await page.evaluate("() => { const f=document.querySelector('form'); if(f) f.requestSubmit(); }")
    for _ in range(24):
        await page.wait_for_timeout(500)
        if await page.evaluate("() => Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'))"):
            return True
    return False

async def rpc(page, params_json, override_token=None):
    """Call get_ranked_feed. If override_token is not None (including ""), force a raw fetch."""
    return await page.evaluate(
        """
        async ({ params, overrideToken, useOverride }) => {
          try {
            const mod = await import('/src/integrations/supabase/client.ts');
            const supabase = mod.supabase;
            if (useOverride) {
              const url = supabase.supabaseUrl + '/rest/v1/rpc/get_ranked_feed';
              const key = supabase.supabaseKey;
              const headers = { 'apikey': key, 'Content-Type': 'application/json' };
              if (overrideToken) headers['Authorization'] = 'Bearer ' + overrideToken;
              const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(params) });
              const text = await resp.text();
              let body; try { body = JSON.parse(text); } catch { body = text; }
              return { transport: 'fetch', status: resp.status, body };
            }
            const { data, error } = await supabase.rpc('get_ranked_feed', params);
            const { data: userData } = await supabase.auth.getUser();
            return { transport: 'sdk', userId: userData?.user?.id ?? null, data,
                     error: error ? { message: error.message, code: error.code, details: error.details } : null };
          } catch (e) {
            return { fatal: String(e) };
          }
        }
        """,
        {"params": params_json, "overrideToken": override_token or "", "useOverride": override_token is not None},
    )

def save(name, payload):
    (OUT / f"feed_error_{name}.json").write_text(json.dumps(payload, indent=2, default=str))

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        page.on("pageerror", lambda err: print(f"  [pageerror] {err}"))

        await page.goto(BASE + "/", wait_until="domcontentloaded")
        await page.wait_for_timeout(800)

        # --- 2. no_session: hit the RPC anonymously (no JWT, only apikey) ---
        print("\n== no_session ==")
        payload = await rpc(page, {"_limit": 5, "_offset": 0}, override_token="")
        save("no_session", payload)
        # Anon apikey + no auth: PostgREST runs as `anon` → RPC raises not_authenticated.
        status = payload.get("status")
        body_msg = (payload.get("body") or {}).get("message", "") if isinstance(payload.get("body"), dict) else ""
        ok = status in (401, 403) or "not_authenticated" in body_msg or "JWT" in body_msg
        record("no_session:rejected", ok, f"status={status} msg={body_msg[:120]}")

        # --- 1. bad_session: signed in first, then swap bearer for garbage ---
        print("\n== bad_session ==")
        signed = await sign_in(page, "player@cholokheli.test", "Player123!")
        if not signed:
            record("bad_session:signin", False, "could not sign in as player")
        else:
            payload = await rpc(page, {"_limit": 5, "_offset": 0},
                                override_token="eyJhbGciOiJIUzI1NiJ9.invalid.signature")
            save("bad_session", payload)
            status = payload.get("status")
            body = payload.get("body")
            body_msg = body.get("message", "") if isinstance(body, dict) else str(body)[:200]
            ok = status in (401, 403) or "JWT" in body_msg or "not_authenticated" in body_msg or "invalid" in body_msg.lower()
            record("bad_session:rejected", ok, f"status={status} msg={body_msg[:120]}")

        # --- 3. invalid_limit: negative and huge values must be clamped, not crash ---
        print("\n== invalid_limit ==")
        payload_neg = await rpc(page, {"_limit": -5, "_offset": 0})
        save("invalid_limit_negative", payload_neg)
        ok_neg = payload_neg.get("error") is None and isinstance(payload_neg.get("data"), list) and len(payload_neg["data"]) <= 50
        record("invalid_limit:negative_clamped", ok_neg,
               f"rows={len(payload_neg.get('data') or [])} err={payload_neg.get('error')}")

        payload_huge = await rpc(page, {"_limit": 9999, "_offset": 0})
        save("invalid_limit_huge", payload_huge)
        ok_huge = payload_huge.get("error") is None and isinstance(payload_huge.get("data"), list) and len(payload_huge["data"]) <= 50
        record("invalid_limit:huge_clamped", ok_huge,
               f"rows={len(payload_huge.get('data') or [])} err={payload_huge.get('error')}")

        # --- 4. sport_gibberish: unknown sport filter → empty result, no error ---
        print("\n== sport_gibberish ==")
        payload = await rpc(page, {"_limit": 10, "_offset": 0, "_sport": "__nope__"})
        save("sport_gibberish", payload)
        ok = payload.get("error") is None and (payload.get("data") in (None, []))
        record("sport_gibberish:empty", ok,
               f"rows={len(payload.get('data') or [])} err={payload.get('error')}")

        await browser.close()

    failed = [r for r in results if not r[1]]
    print("\n========== FEED ERRORS SUMMARY ==========")
    print(f"Total:  {len(results)}")
    print(f"Passed: {len(results) - len(failed)}")
    print(f"Failed: {len(failed)}")
    if failed:
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
        sys.exit(1)

asyncio.run(main())
