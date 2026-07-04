#!/usr/bin/env python3
"""
CholoKheli end-to-end smoke test.

Signs in as each seeded test account and walks the feature pages that role
should reach. Writes screenshots to e2e/screenshots/ and prints a pass/fail
summary. Exits non-zero if any check fails.

Usage:
    python3 e2e/run.py
    BASE_URL=https://your-preview.lovable.app python3 e2e/run.py

Requires Playwright (python). In the Lovable sandbox this is preinstalled.
Elsewhere:
    pip install playwright && playwright install chromium
"""
import asyncio
import os
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

PUBLIC_ROUTES = [
    ("/",                r"bangladesh|football|cricket|scout|player", "public_root"),
    ("/mission",         r"digitise|grassroots|cholo kheli",          "public_mission"),
    ("/safe-scouting",   r"safe\s*scouting",                          "public_safe"),
    ("/faq",             r"frequently asked|faq|helpline|contact",    "public_faq"),
    ("/privacy-policy",  r"privacy",                                  "public_privacy"),
    ("/auth",            r"welcome back|sign in|sign up|email",       "public_auth"),
]

ACCOUNTS = [
    dict(role="admin",           email="admin@cholokheli.test",         password="Admin123!",  dashboard="/admin",  heading=r"admin"),
    dict(role="scout_pending",   email="scout@cholokheli.test",         password="Scout123!",  dashboard="/scout",  heading=r"scout|pending|authenticated|verified|wait|approved|explore|feed"),
    dict(role="scout_verified",  email="scout.verified@cholokheli.test",password="Scout123!",  dashboard="/scout",  heading=r"scout"),
    dict(role="player",          email="player@cholokheli.test",        password="Player123!", dashboard="/player", heading=r"report|upload|profile|dashboard"),
]

results = []

def record(name, ok, detail=""):
    results.append((name, ok, detail))
    tag = "PASS" if ok else "FAIL"
    print(f"[{tag}] {name}" + (f" — {detail}" if detail else ""))

async def goto_and_check(page, path, pattern, label):
    try:
        resp = await page.goto(BASE + path, wait_until="domcontentloaded", timeout=20000)
        status = resp.status if resp else 0
        # Poll for the expected content — client-side guards may bounce briefly.
        matched = False
        for _ in range(16):
            await page.wait_for_timeout(500)
            body = (await page.locator("body").inner_text())[:6000]
            if re.search(pattern, body, re.I):
                matched = True
                break
        ok = status < 400 and matched
        await page.screenshot(path=str(SHOTS / f"{label}.png"))
        detail = f"status={status} match={matched} url={page.url}"
        record(label, ok, detail)
        return ok
    except Exception as e:
        record(label, False, str(e))
        return False

async def sign_in(page, email, password):
    await page.goto(BASE + "/auth", wait_until="domcontentloaded")
    await page.wait_for_timeout(600)
    try:
        await page.get_by_label(re.compile("email", re.I)).first.fill(email)
        await page.get_by_label(re.compile("password", re.I)).first.fill(password)
    except Exception as e:
        record("signin:fill", False, str(e))
        return
    # Click the Sign In submit button.
    try:
        await page.get_by_role("button", name=re.compile(r"^\s*sign in\s*$", re.I)).first.click()
    except Exception:
        await page.evaluate("() => { const f = document.querySelector('form'); if (f) f.requestSubmit(); }")
    # Poll for a Supabase session in localStorage (up to 10s).
    for _ in range(20):
        await page.wait_for_timeout(500)
        has_session = await page.evaluate(
            "() => Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'))"
        )
        if has_session:
            break
    await page.wait_for_timeout(800)

async def sign_out(page, context):
    try:
        menu = page.get_by_role("button", name=re.compile("menu", re.I)).first
        if await menu.is_visible(timeout=800):
            await menu.click()
            await page.wait_for_timeout(300)
        btn = page.get_by_role("button", name=re.compile("sign out|log out", re.I)).first
        if await btn.is_visible(timeout=800):
            await btn.click()
            await page.wait_for_timeout(900)
    except Exception:
        pass
    try:
        await context.clear_cookies()
        await page.evaluate("() => { try { localStorage.clear(); sessionStorage.clear(); } catch(e){} }")
    except Exception:
        pass

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        page.on("pageerror", lambda err: print(f"  [pageerror] {err}"))

        print(f"\n== Public routes @ {BASE} ==")
        for path, pattern, label in PUBLIC_ROUTES:
            await goto_and_check(page, path, pattern, label)

        for acc in ACCOUNTS:
            print(f"\n== {acc['role']} ({acc['email']}) ==")
            await sign_out(page, context)
            await sign_in(page, acc["email"], acc["password"])
            landed = await goto_and_check(page, acc["dashboard"], acc["heading"], f"{acc['role']}_dashboard")
            record(f"{acc['role']}:login", landed, "" if landed else "did not reach dashboard")
            await sign_out(page, context)

        await browser.close()

    failed = [r for r in results if not r[1]]
    print("\n========== SUMMARY ==========")
    print(f"Total:  {len(results)}")
    print(f"Passed: {len(results) - len(failed)}")
    print(f"Failed: {len(failed)}")
    if failed:
        print("\nFailures:")
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
        sys.exit(1)

asyncio.run(main())
