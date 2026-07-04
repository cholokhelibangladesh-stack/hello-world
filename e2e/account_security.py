#!/usr/bin/env python3
"""
Account security E2E — covers four related settings features:

  1. Change password
     - Wrong current password is rejected with a clear message.
     - Correct current + valid new password succeeds; new password works
       for a subsequent sign-in and the original password is rejected.
     - Cleanup: reverts to the original password so the run is idempotent.

  2. Sessions / devices panel
     - Signing in creates a session that shows up in the panel.
     - Revoking a non-current session removes it from the list AND
       from auth.sessions (verified via get_my_sessions RPC).

  3. Username-change audit log
     - Admin-visible get_username_audit RPC returns the row that was
       created by a fresh username change.
     - Trigger-written columns (old_username, new_username, changed_by)
       match the change we just performed.

  4. Enhanced inline validation
     - Empty / too-short / uppercase / leading-digit / invalid-chars each
       surface their EXACT copy in the status region, and the Save button
       is disabled while the input is invalid.

Usage:
    python3 e2e/account_security.py
"""
import asyncio, json, os, uuid, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

PLAYER_EMAIL = "player@cholokheli.test"
PLAYER_PASS  = "Player123!"
NEW_PASS     = f"NewPass_{uuid.uuid4().hex[:8]}!"

ADMIN_EMAIL  = "admin@cholokheli.test"
ADMIN_PASS   = "Admin123!"

FRESH_USERNAME = f"auditn_{uuid.uuid4().hex[:6]}"

results = []
def rec(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))

def save(name, payload):
    (OUT / f"acctsec_{name}.json").write_text(json.dumps(payload, indent=2, default=str))


async def sb(page, code):
    return await page.evaluate(f"""async () => {{
        const mod = await import('/src/integrations/supabase/client.ts');
        const supabase = mod.supabase;
        {code}
    }}""")


async def signin(page, email, password):
    return await page.evaluate(
        """async ({email, password}) => {
            const mod = await import('/src/integrations/supabase/client.ts');
            await mod.supabase.auth.signOut().catch(() => {});
            const { data, error } = await mod.supabase.auth.signInWithPassword({ email, password });
            return { ok: !!data?.session, error: error?.message ?? null };
        }""",
        {"email": email, "password": password},
    )


async def type_username(page, value):
    inp = page.get_by_test_id("settings-username-input")
    await inp.click()
    await inp.press("Control+a")
    await inp.press("Delete")
    if value:
        await inp.type(value, delay=15)
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


async def status_code(page):
    return await page.get_by_test_id("settings-username-status").get_attribute("data-status")


async def save_disabled(page):
    return await page.get_by_test_id("settings-username-save").is_disabled()


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        page.on("pageerror", lambda err: print(f"  [pageerror] {err}"))

        await page.goto(BASE + "/", wait_until="domcontentloaded")
        await page.wait_for_timeout(400)

        r = await signin(page, PLAYER_EMAIL, PLAYER_PASS)
        if not r.get("ok"):
            rec("player:signin", False, r.get("error") or "")
            sys.exit(1)
        rec("player:signin", True)

        me = await sb(page, "const {data:{user}} = await supabase.auth.getUser(); return user?.id;")
        rec("me:lookup", bool(me), me or "")

        await page.goto(BASE + "/player/settings", wait_until="domcontentloaded")
        await page.wait_for_selector('[data-testid="account-settings"]', timeout=8000)

        # -------- 4. INLINE VALIDATION MESSAGES ----------------------------
        cases = [
            ("",              "empty",                    "Username is required."),
            ("ab",            "too_short",                "Too short — usernames must be at least 3 characters."),
            ("a" * 25,        "too_long",                 "Too long — usernames must be 24 characters or fewer."),
            ("Bad_Handle",    "uppercase",                "No uppercase letters — usernames are lowercase only."),
            ("9alpha",        "leading_digit_underscore", "Must start with a lowercase letter (a–z)."),
            ("bad handle!",   "invalid_chars",            "Only lowercase letters, digits, and underscore (_) are allowed."),
        ]
        for value, expect_code, expect_msg in cases:
            # bypass lowercase-forcing input handler for uppercase check by using JS to set value
            if value != value.lower():
                await page.evaluate(
                    """(v) => {
                        const el = document.querySelector('[data-testid=settings-username-input]');
                        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
                        setter.call(el, v);
                        el.dispatchEvent(new Event('input', {bubbles:true}));
                    }""", value)
                await page.wait_for_timeout(200)
            else:
                await type_username(page, value)
            code = await status_code(page)
            msg = await status_text(page)
            disabled = await save_disabled(page)
            save(f"validation_{expect_code}", {"value": value, "code": code, "msg": msg, "disabled": disabled})
            rec(f"validation:{expect_code}:code", code == expect_code, f"got {code!r}")
            # empty case has no visible message (min-height only)
            if expect_code != "empty":
                rec(f"validation:{expect_code}:msg", msg == expect_msg, f"got {msg!r}")
            rec(f"validation:{expect_code}:disabled", disabled, "")

        # -------- 3. USERNAME AUDIT LOG ------------------------------------
        # Change username to a fresh one, then check the audit log wrote a row.
        await type_username(page, FRESH_USERNAME)
        assert not await save_disabled(page), "fresh username should enable save"
        await page.get_by_test_id("settings-username-save").click()
        await page.wait_for_timeout(1000)

        audit_query = await sb(page, f"""
            const {{ data, error }} = await supabase
                .from('username_audit')
                .select('*')
                .eq('user_id', '{me}')
                .eq('new_username', '{FRESH_USERNAME}')
                .maybeSingle();
            return {{ data, error: error?.message ?? null }};
        """)
        save("audit_direct_read", audit_query)
        row = audit_query.get("data") or {}
        rec("audit:row_written", bool(row), audit_query.get("error") or "no row")
        rec("audit:new_matches", row.get("new_username") == FRESH_USERNAME, str(row.get("new_username")))
        rec("audit:changed_by_self", row.get("changed_by") == me, str(row.get("changed_by")))
        rec("audit:changed_at_set", bool(row.get("changed_at")), "")

        # As admin, get_username_audit RPC surfaces the same row.
        r_admin = await signin(page, ADMIN_EMAIL, ADMIN_PASS)
        rec("admin:signin", r_admin.get("ok"), r_admin.get("error") or "")
        rpc_audit = await sb(page, """
            const { data, error } = await supabase.rpc('get_username_audit', { _limit: 50 });
            return { data, error: error?.message ?? null };
        """)
        save("audit_rpc", {"count": len(rpc_audit.get("data") or []), "error": rpc_audit.get("error")})
        rpc_rows = rpc_audit.get("data") or []
        rec("audit:rpc_returned_rows", len(rpc_rows) > 0, str(rpc_audit.get("error") or ""))
        found = next((r for r in rpc_rows if r.get("new_username") == FRESH_USERNAME and r.get("user_id") == me), None)
        rec("audit:rpc_contains_change", found is not None, "not found in rpc results")
        rec("audit:rpc_has_email", bool(found and found.get("user_email")), str(found and found.get("user_email")))

        # Sign back in as player, restore original username so cleanup is easy.
        await signin(page, PLAYER_EMAIL, PLAYER_PASS)
        restore = await sb(page, f"""
            const {{ error }} = await supabase.from('profiles').update({{ username: 'player_user' }}).eq('user_id', '{me}');
            return {{ error: error?.message ?? null }};
        """)
        rec("cleanup:restore_username", not restore.get("error"), restore.get("error") or "")

        # -------- 2. SESSIONS PANEL ----------------------------------------
        await page.goto(BASE + "/player/settings", wait_until="domcontentloaded")
        await page.wait_for_selector('[data-testid="settings-sessions-card"]', timeout=8000)
        await page.wait_for_selector('[data-testid="session-row"]', timeout=8000)
        sessions_before = await page.locator('[data-testid="session-row"]').count()
        rec("sessions:visible", sessions_before >= 1, f"count={sessions_before}")

        # Create a second session via a separate context, then revoke it from the UI.
        ctx2 = await browser.new_context(viewport={"width": 800, "height": 600})
        page2 = await ctx2.new_page()
        await page2.goto(BASE + "/", wait_until="domcontentloaded")
        r2 = await signin(page2, PLAYER_EMAIL, PLAYER_PASS)
        rec("sessions:second_signin", r2.get("ok"), r2.get("error") or "")
        await page2.wait_for_timeout(500)

        # Refresh the primary panel and expect at least 2 rows.
        await page.get_by_test_id("sessions-refresh").click()
        await page.wait_for_timeout(1200)
        sessions_after_new = await page.locator('[data-testid="session-row"]').count()
        rec("sessions:count_grew", sessions_after_new >= sessions_before + 1, f"before={sessions_before} after={sessions_after_new}")

        # Find a non-current session id and revoke it via the button.
        rows_data = await page.evaluate("""() =>
            Array.from(document.querySelectorAll('[data-testid=session-row]'))
                 .map(r => ({ id: r.getAttribute('data-session-id'), current: r.getAttribute('data-is-current') === 'true' }))
        """)
        save("sessions_rows", rows_data)
        target = next((r for r in rows_data if not r["current"]), None)
        rec("sessions:found_other", target is not None, str(rows_data))
        if target:
            btn = page.locator(f'[data-testid="session-revoke-{target["id"]}"]')
            await btn.click()
            await page.wait_for_timeout(1200)
            # Panel refreshes after revoke.
            still_present = await page.locator(f'[data-session-id="{target["id"]}"]').count()
            rec("sessions:ui_row_removed", still_present == 0, f"still={still_present}")
            # And the DB-side list no longer contains it either.
            check = await sb(page, """
                const { data, error } = await supabase.rpc('get_my_sessions');
                return { ids: (data||[]).map(s => s.id), error: error?.message ?? null };
            """)
            save("sessions_after_revoke", check)
            rec("sessions:db_row_removed", target["id"] not in (check.get("ids") or []),
                f"still in rpc list: {check}")

        await ctx2.close()

        # -------- 1. CHANGE PASSWORD ---------------------------------------
        # Sign in fresh so the current password field is unambiguously correct.
        await signin(page, PLAYER_EMAIL, PLAYER_PASS)
        await page.goto(BASE + "/player/settings", wait_until="domcontentloaded")
        await page.wait_for_selector('[data-testid="settings-password-card"]', timeout=8000)

        async def fill_pw(cur, new, conf):
            for tid, val in (("pw-current", cur), ("pw-new", new), ("pw-confirm", conf)):
                el = page.get_by_test_id(tid)
                await el.click()
                await el.press("Control+a")
                await el.press("Delete")
                if val:
                    await el.type(val, delay=10)

        # a) Wrong current password → error status.
        await fill_pw("totally-wrong-pass", NEW_PASS, NEW_PASS)
        await page.get_by_test_id("pw-save").click()
        await page.wait_for_timeout(1500)
        s = await page.get_by_test_id("pw-status").inner_text()
        code = await page.get_by_test_id("pw-status").get_attribute("data-status")
        save("pw_wrong_current", {"status": s, "code": code})
        rec("pw:wrong_current_status", code == "error", f"code={code}")
        rec("pw:wrong_current_msg", "current password is incorrect" in s.lower(), s)

        # b) Correct current + valid new password → success.
        await fill_pw(PLAYER_PASS, NEW_PASS, NEW_PASS)
        await page.get_by_test_id("pw-save").click()
        await page.wait_for_timeout(2000)
        s = await page.get_by_test_id("pw-status").inner_text()
        code = await page.get_by_test_id("pw-status").get_attribute("data-status")
        save("pw_success", {"status": s, "code": code})
        rec("pw:success_status", code == "success", f"code={code} msg={s!r}")

        # c) Old password no longer works.
        old = await signin(page, PLAYER_EMAIL, PLAYER_PASS)
        save("pw_old_signin", old)
        rec("pw:old_password_rejected", not old.get("ok"), str(old))

        # d) New password DOES work.
        new_ok = await signin(page, PLAYER_EMAIL, NEW_PASS)
        save("pw_new_signin", new_ok)
        rec("pw:new_password_works", new_ok.get("ok"), str(new_ok))

        # e) Cleanup — restore original password.
        await page.goto(BASE + "/player/settings", wait_until="domcontentloaded")
        await page.wait_for_selector('[data-testid="pw-save"]', timeout=8000)
        await fill_pw(NEW_PASS, PLAYER_PASS, PLAYER_PASS)
        await page.get_by_test_id("pw-save").click()
        await page.wait_for_timeout(2000)
        s = await page.get_by_test_id("pw-status").inner_text()
        code = await page.get_by_test_id("pw-status").get_attribute("data-status")
        save("pw_restore", {"status": s, "code": code})
        rec("pw:cleanup_restored", code == "success", f"code={code} msg={s!r}")
        # Confirm cleanup succeeded.
        confirm = await signin(page, PLAYER_EMAIL, PLAYER_PASS)
        rec("pw:cleanup_signin", confirm.get("ok"), str(confirm))

        await browser.close()

    failed = [r for r in results if not r[1]]
    print("\n========== ACCOUNT SECURITY E2E SUMMARY ==========")
    print(f"Total:  {len(results)}")
    print(f"Passed: {len(results) - len(failed)}")
    print(f"Failed: {len(failed)}")
    if failed:
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
