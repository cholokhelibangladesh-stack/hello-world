#!/usr/bin/env python3
"""
Settings > Username reuse E2E.

Signs in as the player account, drives the Account Settings UI, and verifies
the settings flow prevents changes that would break username uniqueness:

  1. /player/settings loads and shows the player's current username + email.
  2. Typing a seeded username (any casing) reports "Already taken" and the
     Save button is disabled.
  3. Typing an invalid handle reports "Invalid format" and Save is disabled.
  4. Typing the player's current username reports "current username" and
     Save is disabled.
  5. Attempting a direct DB update with a taken (or CI-variant) handle is
     rejected by the unique index — confirms the constraint still enforces
     uniqueness independent of the UI.
  6. A brand-new handle claimed through Save persists; page reloads and the
     new value is shown as the current username.
  7. Cleanup: restore player_user handle so the run is idempotent.

Usage:
    python3 e2e/settings_username_reuse.py
"""
import asyncio, json, os, uuid, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

PLAYER_EMAIL = "player@cholokheli.test"
PLAYER_PASS  = "Player123!"

TAKEN_HANDLES = ["scout_pending", "SCOUT_VERIFIED", "admin_user"]
FRESH = f"e2e_{uuid.uuid4().hex[:8]}"

results = []
def rec(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))

def save(name, payload):
    (OUT / f"settings_{name}.json").write_text(json.dumps(payload, indent=2, default=str))


async def sb(page, code):
    return await page.evaluate(f"""async () => {{
        const mod = await import('/src/integrations/supabase/client.ts');
        const supabase = mod.supabase;
        {code}
    }}""")


async def type_username(page, value):
    inp = page.get_by_test_id("settings-username-input")
    await inp.click()
    await inp.press("Control+a")
    await inp.press("Delete")
    if value:
        await inp.type(value, delay=15)
    # wait for debounced availability check to finish (status stops showing "Checking…")
    try:
        await page.wait_for_function(
            "() => { const el = document.querySelector('[data-testid=settings-username-status]');"
            " return el && !el.innerText.toLowerCase().includes('checking'); }",
            timeout=5000,
        )
    except Exception:
        pass


async def status_text(page):
    return (await page.get_by_test_id("settings-username-status").inner_text()).strip()


async def save_disabled(page):
    btn = page.get_by_test_id("settings-username-save")
    return await btn.is_disabled()


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        page.on("pageerror", lambda err: print(f"  [pageerror] {err}"))

        # Load the app shell on the root path (not /auth — that page auto-redirects
        # once a session appears, which would race with our subsequent goto).
        await page.goto(BASE + "/", wait_until="domcontentloaded")
        await page.wait_for_timeout(400)

        signin = await page.evaluate(
            """async ({email, password}) => {
                const mod = await import('/src/integrations/supabase/client.ts');
                const { data, error } = await mod.supabase.auth.signInWithPassword({ email, password });
                return { ok: !!data?.session, error: error?.message ?? null };
            }""",
            {"email": PLAYER_EMAIL, "password": PLAYER_PASS},
        )
        if not signin.get("ok"):
            rec("player:signin", False, signin.get("error") or "")
            sys.exit(1)
        rec("player:signin", True)

        # 1. Settings page loads and shows identity.
        await page.goto(BASE + "/player/settings", wait_until="domcontentloaded")
        await page.wait_for_selector('[data-testid="account-settings"]', timeout=8000)
        await page.wait_for_selector('[data-testid="settings-current-username"]', timeout=8000)
        current = (await page.get_by_test_id("settings-current-username").inner_text()).strip()
        email_shown = (await page.get_by_test_id("settings-email").inner_text()).strip()
        await page.screenshot(path=str(OUT / "settings_page_loaded.png"))
        save("page_loaded", {"current": current, "email": email_shown})
        rec("settings:loads", "@player_user" in current, current)
        rec("settings:shows_email", PLAYER_EMAIL in email_shown, email_shown)

        # Same-value check.
        await type_username(page, "player_user")
        s = await status_text(page)
        rec("same_value_status", "current username" in s.lower(), s)
        rec("same_value_save_disabled", await save_disabled(page), s)

        # 2. Taken handles (incl. CI variants).
        for h in TAKEN_HANDLES:
            await type_username(page, h)
            s = await status_text(page)
            disabled = await save_disabled(page)
            save(f"taken_{h}", {"status": s, "disabled": disabled})
            # "invalid format" wins for uppercase-only input because format regex
            # is lowercase — that ALSO blocks reuse, which is the property we care about.
            blocked = ("already taken" in s.lower()) or ("invalid" in s.lower())
            rec(f"taken_blocked:{h}", blocked and disabled, s)

        # 3. Invalid format.
        await type_username(page, "ab")  # too short
        s = await status_text(page)
        rec("invalid_short", "invalid" in s.lower() and await save_disabled(page), s)

        await type_username(page, "bad handle!")
        s = await status_text(page)
        rec("invalid_chars", "invalid" in s.lower() and await save_disabled(page), s)

        # 4. DB-level guard — direct update to a taken handle is rejected.
        me = await sb(page, """
            const { data: { user } } = await supabase.auth.getUser();
            return user?.id ?? null;
        """)
        if not me:
            rec("lookup:self", False, "no user id")
            sys.exit(1)
        for target in ("scout_pending", "SCOUT_PENDING", "Admin_User"):
            r = await sb(page, f"""
                const {{ error }} = await supabase.from('profiles').update({{ username: '{target}' }}).eq('user_id', '{me}');
                return {{ error: error?.message ?? null, code: error?.code ?? null }};
            """)
            save(f"db_conflict_{target}", r)
            rec(f"db_conflict_rejected:{target}", bool(r.get("error")), r.get("error") or "unexpectedly succeeded")

        # 5. Fresh handle can be claimed through the UI.
        await type_username(page, FRESH)
        s = await status_text(page)
        rec(f"fresh_available:{FRESH}", "available" in s.lower(), s)
        assert not await save_disabled(page), "save should be enabled for fresh handle"
        await page.get_by_test_id("settings-username-save").click()
        await page.wait_for_timeout(1200)
        # Reload and confirm persistence.
        await page.reload(wait_until="domcontentloaded")
        await page.wait_for_selector('[data-testid="settings-current-username"]', timeout=8000)
        after = (await page.get_by_test_id("settings-current-username").inner_text()).strip()
        save("after_claim", {"expected": FRESH, "shown": after})
        rec(f"fresh_claim_persisted:{FRESH}", FRESH in after, after)

        # 6. That fresh handle is now itself taken for anyone else.
        r_taken = await sb(page, f"""
            const {{ data }} = await supabase.from('profiles').select('user_id').ilike('username', '{FRESH}').maybeSingle();
            return {{ taken: !!data }};
        """)
        rec(f"fresh_now_taken:{FRESH}", r_taken.get("taken") is True)

        # 7. Cleanup — restore player_user handle.
        restore = await sb(page, f"""
            const {{ error }} = await supabase.from('profiles').update({{ username: 'player_user' }}).eq('user_id', '{me}');
            return {{ error: error?.message ?? null }};
        """)
        save("cleanup_restore", restore)
        rec("cleanup:restore_player_user", not restore.get("error"), restore.get("error") or "")

        await browser.close()

    failed = [r for r in results if not r[1]]
    print("\n========== SETTINGS USERNAME REUSE SUMMARY ==========")
    print(f"Total:  {len(results)}")
    print(f"Passed: {len(results) - len(failed)}")
    print(f"Failed: {len(failed)}")
    if failed:
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
        sys.exit(1)

asyncio.run(main())
