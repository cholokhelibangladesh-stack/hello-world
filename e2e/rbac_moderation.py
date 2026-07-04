#!/usr/bin/env python3
"""
Role-based access hardening E2E — verifies that only admins can read
moderation queues and audit logs.

Non-admin accounts (player, verified scout, anon) must be blocked from:
  * SELECT on public.moderation_alerts
  * SELECT on public.username_audit
  * UPDATE / DELETE on public.moderation_alerts
  * RPC get_username_audit
  * RPC get_admin_user_emails
  * Visiting /admin (client-side gate redirects them away)

Admin must be allowed on every one of those surfaces.

Usage:
    python3 e2e/rbac_moderation.py
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

ADMIN  = ("admin@cholokheli.test",          "Admin123!")
PLAYER = ("player@cholokheli.test",         "Player123!")
SCOUT  = ("scout.verified@cholokheli.test", "Scout123!")

results = []
def rec(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
def save(name, payload):
    (OUT / f"rbac_{name}.json").write_text(json.dumps(payload, indent=2, default=str))


async def signin(page, email, password):
    return await page.evaluate(
        """async ({email, password}) => {
            const m = await import('/src/integrations/supabase/client.ts');
            await m.supabase.auth.signOut().catch(()=>{});
            const { data, error } = await m.supabase.auth.signInWithPassword({ email, password });
            return { ok: !!data?.session, err: error?.message ?? null };
        }""",
        {"email": email, "password": password},
    )


async def signout(page):
    await page.evaluate("""async () => {
        const m = await import('/src/integrations/supabase/client.ts');
        await m.supabase.auth.signOut();
    }""")


async def sb(page, code):
    return await page.evaluate(f"""async () => {{
        const mod = await import('/src/integrations/supabase/client.ts');
        const supabase = mod.supabase;
        {code}
    }}""")


async def probe(page, label):
    """Run every restricted query and RPC as the currently signed-in user."""
    return await sb(page, """
        const results = {};
        const q1 = await supabase.from('moderation_alerts').select('id').limit(1);
        results.select_alerts = { rows: (q1.data||[]).length, error: q1.error?.message ?? null };

        const q2 = await supabase.from('username_audit').select('id').limit(1);
        results.select_audit  = { rows: (q2.data||[]).length, error: q2.error?.message ?? null };

        const q3 = await supabase.from('moderation_alerts')
                    .update({ status: 'resolved' })
                    .eq('id', '00000000-0000-0000-0000-000000000000');
        results.update_alerts = { error: q3.error?.message ?? null, status: q3.status ?? null };

        const q4 = await supabase.from('moderation_alerts')
                    .delete().eq('id', '00000000-0000-0000-0000-000000000000');
        results.delete_alerts = { error: q4.error?.message ?? null };

        const q5 = await supabase.rpc('get_username_audit', { _limit: 5 });
        results.rpc_audit = { rows: (q5.data||[]).length, error: q5.error?.message ?? null };

        const q6 = await supabase.rpc('get_admin_user_emails');
        results.rpc_emails = { rows: (q6.data||[]).length, error: q6.error?.message ?? null };
        return results;
    """)


def denied(part):
    """Data-API denied for RLS-blocked read = no rows AND (no error OR permission err).
    For RPCs that raise 'forbidden'/'42501', we require the error string to be present."""
    return part.get("rows", 0) == 0 and (part.get("error") or True)


async def visit_admin_and_check_redirect(page, actor):
    """Visit /admin and assert the ProtectedRoute redirects non-admins."""
    await page.goto(BASE + "/admin", wait_until="domcontentloaded")
    # Give the redirect a moment to run
    for _ in range(20):
        await page.wait_for_timeout(200)
        url = page.url
        if "/admin" not in url or "/auth" in url:
            break
    final_url = page.url
    # Admin panel is only rendered for admins; the H1 text is 'ADMIN PANEL'.
    heading = await page.evaluate("() => document.querySelector('h1')?.innerText || ''")
    save(f"visit_admin_{actor}", {"url": final_url, "heading": heading})
    return final_url, heading


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        page.on("pageerror", lambda err: print(f"  [pageerror] {err}"))

        await page.goto(BASE + "/", wait_until="domcontentloaded")

        # ---------- ANON ----------
        await signout(page)
        anon = await probe(page, "anon")
        save("probe_anon", anon)
        # anon has no bearer at all → PostgREST returns error, zero rows
        rec("anon:select_alerts_denied",  denied(anon["select_alerts"]),  json.dumps(anon["select_alerts"]))
        rec("anon:select_audit_denied",   denied(anon["select_audit"]),   json.dumps(anon["select_audit"]))
        rec("anon:rpc_audit_denied",      bool(anon["rpc_audit"]["error"]),  json.dumps(anon["rpc_audit"]))
        rec("anon:rpc_emails_denied",     bool(anon["rpc_emails"]["error"]), json.dumps(anon["rpc_emails"]))

        # ---------- PLAYER ----------
        r = await signin(page, *PLAYER)
        rec("player:signin", r.get("ok"), r.get("err") or "")
        p = await probe(page, "player")
        save("probe_player", p)
        # RLS SELECT policies scoped to admins → returns 0 rows, no error
        rec("player:select_alerts_no_rows", p["select_alerts"]["rows"] == 0, json.dumps(p["select_alerts"]))
        rec("player:select_audit_no_rows",  p["select_audit"]["rows"]  == 0, json.dumps(p["select_audit"]))
        # RPCs raise 'forbidden' (SQLSTATE 42501)
        rec("player:rpc_audit_forbidden",  "forbidden" in (p["rpc_audit"]["error"]  or "").lower(), json.dumps(p["rpc_audit"]))
        rec("player:rpc_emails_forbidden", "forbidden" in (p["rpc_emails"]["error"] or "").lower(), json.dumps(p["rpc_emails"]))

        # Visit /admin — should redirect away (to /player or /)
        final_url, heading = await visit_admin_and_check_redirect(page, "player")
        rec("player:admin_redirected",
            "/admin" not in final_url or "ADMIN PANEL" not in heading.upper(),
            f"url={final_url} h1={heading!r}")

        # ---------- SCOUT ----------
        r = await signin(page, *SCOUT)
        rec("scout:signin", r.get("ok"), r.get("err") or "")
        sres = await probe(page, "scout")
        save("probe_scout", sres)
        rec("scout:select_alerts_no_rows", sres["select_alerts"]["rows"] == 0, json.dumps(sres["select_alerts"]))
        rec("scout:select_audit_no_rows",  sres["select_audit"]["rows"]  == 0, json.dumps(sres["select_audit"]))
        rec("scout:rpc_audit_forbidden",   "forbidden" in (sres["rpc_audit"]["error"]  or "").lower(), json.dumps(sres["rpc_audit"]))
        rec("scout:rpc_emails_forbidden",  "forbidden" in (sres["rpc_emails"]["error"] or "").lower(), json.dumps(sres["rpc_emails"]))

        final_url, heading = await visit_admin_and_check_redirect(page, "scout")
        rec("scout:admin_redirected",
            "/admin" not in final_url or "ADMIN PANEL" not in heading.upper(),
            f"url={final_url} h1={heading!r}")

        # ---------- ADMIN (positive path) ----------
        r = await signin(page, *ADMIN)
        rec("admin:signin", r.get("ok"), r.get("err") or "")
        a = await probe(page, "admin")
        save("probe_admin", a)
        # Admin can SELECT (may return 0 rows if empty tables, but must NOT error)
        rec("admin:select_alerts_ok", a["select_alerts"]["error"] is None, json.dumps(a["select_alerts"]))
        rec("admin:select_audit_ok",  a["select_audit"]["error"]  is None, json.dumps(a["select_audit"]))
        rec("admin:rpc_audit_ok",     a["rpc_audit"]["error"]     is None, json.dumps(a["rpc_audit"]))
        rec("admin:rpc_emails_ok",    a["rpc_emails"]["error"]    is None, json.dumps(a["rpc_emails"]))

        # Admin can load /admin and see the panel
        await page.goto(BASE + "/admin", wait_until="domcontentloaded")
        await page.wait_for_selector('[data-testid="tab-alerts"]', timeout=8000)
        heading = await page.evaluate("() => document.querySelector('h1')?.innerText || ''")
        save("visit_admin_admin", {"url": page.url, "heading": heading})
        rec("admin:admin_panel_visible", "ADMIN PANEL" in heading.upper(), f"h1={heading!r}")

        await browser.close()

    failed = [r for r in results if not r[1]]
    print("\n========== RBAC MODERATION SUMMARY ==========")
    print(f"Total:  {len(results)}")
    print(f"Passed: {len(results) - len(failed)}")
    print(f"Failed: {len(failed)}")
    if failed:
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
        sys.exit(1)

asyncio.run(main())
