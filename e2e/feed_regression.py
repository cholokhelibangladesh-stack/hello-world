#!/usr/bin/env python3
"""
Ranked-feed regression test.

Signs in as each seeded account, invokes the `get_ranked_feed` RPC through
the authenticated Supabase browser client, and asserts the expected shape:

  - admin           → RPC succeeds, returns an array (may be empty).
  - scout_verified  → RPC succeeds, returns an array (>= 0 rows).
  - player          → RPC succeeds, returns an array, and none of the rows
                      belong to the signed-in player (own videos excluded).
  - scout_pending   → RPC intentionally rejects with `scout_not_active`
                      (PostgreSQL code 42501). This is the contract.

Exits non-zero on any deviation. Screenshots + raw RPC payloads land in
e2e/screenshots/feed_*.json for inspection.

Usage:
    python3 e2e/feed_regression.py
    BASE_URL=https://your-preview.lovable.app python3 e2e/feed_regression.py
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

ACCOUNTS = [
    dict(role="admin",          email="admin@cholokheli.test",          password="Admin123!",  expect="ok"),
    dict(role="scout_verified", email="scout.verified@cholokheli.test", password="Scout123!",  expect="ok"),
    dict(role="player",         email="player@cholokheli.test",         password="Player123!", expect="ok_exclude_own"),
    dict(role="scout_pending",  email="scout@cholokheli.test",          password="Scout123!",  expect="err_not_active"),
]

results = []

def record(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))

async def sign_in(page, email, password):
    await page.goto(BASE + "/auth", wait_until="domcontentloaded")
    await page.wait_for_timeout(600)
    await page.get_by_label(re.compile("email", re.I)).first.fill(email)
    await page.get_by_label(re.compile("password", re.I)).first.fill(password)
    try:
        await page.get_by_role("button", name=re.compile(r"^\s*sign in\s*$", re.I)).first.click()
    except Exception:
        await page.evaluate("() => { const f = document.querySelector('form'); if (f) f.requestSubmit(); }")
    for _ in range(24):
        await page.wait_for_timeout(500)
        has_session = await page.evaluate(
            "() => Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'))"
        )
        if has_session:
            return True
    return False

async def sign_out(page, context):
    try:
        await context.clear_cookies()
        await page.evaluate("() => { try { localStorage.clear(); sessionStorage.clear(); } catch(e){} }")
    except Exception:
        pass

async def call_feed(page):
    """Invoke get_ranked_feed via the app's own Supabase client (uses the signed-in JWT)."""
    return await page.evaluate("""
        async () => {
          try {
            const mod = await import('/src/integrations/supabase/client.ts');
            const supabase = mod.supabase;
            const { data: userData } = await supabase.auth.getUser();
            const { data, error } = await supabase.rpc('get_ranked_feed', { _limit: 10, _offset: 0 });
            return {
              userId: userData?.user?.id ?? null,
              data,
              error: error ? { message: error.message, code: error.code, details: error.details } : null,
            };
          } catch (e) {
            return { fatal: String(e) };
          }
        }
    """)

def evaluate_expectation(role, expect, payload):
    if payload.get("fatal"):
        return False, f"fatal: {payload['fatal']}"
    err = payload.get("error")
    data = payload.get("data")
    uid = payload.get("userId")

    if expect == "err_not_active":
        if err and "scout_not_active" in (err.get("message") or ""):
            return True, "rejected as expected (scout_not_active)"
        return False, f"expected scout_not_active, got err={err} data_len={len(data) if isinstance(data, list) else 'n/a'}"

    if err:
        return False, f"unexpected RPC error: {err}"
    if not isinstance(data, list):
        return False, f"expected list, got {type(data).__name__}: {str(data)[:200]}"
    if expect == "ok_exclude_own":
        own = [row for row in data if row.get("user_id") == uid]
        if own:
            return False, f"player feed leaked own videos: {len(own)} row(s)"
        return True, f"{len(data)} rows, own excluded (uid={uid})"
    return True, f"{len(data)} rows"

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        page.on("pageerror", lambda err: print(f"  [pageerror] {err}"))

        for acc in ACCOUNTS:
            print(f"\n== {acc['role']} ({acc['email']}) ==")
            await sign_out(page, context)
            signed = await sign_in(page, acc["email"], acc["password"])
            if not signed:
                record(f"{acc['role']}:signin", False, "no supabase session in localStorage")
                continue
            record(f"{acc['role']}:signin", True)

            payload = await call_feed(page)
            (OUT / f"feed_{acc['role']}.json").write_text(json.dumps(payload, indent=2, default=str))
            ok, detail = evaluate_expectation(acc["role"], acc["expect"], payload)
            record(f"{acc['role']}:get_ranked_feed", ok, detail)

        await browser.close()

    failed = [r for r in results if not r[1]]
    print("\n========== FEED SUMMARY ==========")
    print(f"Total:  {len(results)}")
    print(f"Passed: {len(results) - len(failed)}")
    print(f"Failed: {len(failed)}")
    if failed:
        print("\nFailures:")
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
        sys.exit(1)

asyncio.run(main())
