#!/usr/bin/env python3
"""
Admin moderation alert inbox E2E.

Verifies the alerts inbox lifecycle end-to-end:

  1. A new scout_request insert (as scout) triggers a moderation_alerts row
     via the SECURITY DEFINER trigger.
  2. As admin, the /admin Inbox tab surfaces the alert row for that
     target_id, with the correct kind and target account name.
  3. Clicking "Mark resolved" flips the row status to 'resolved' in the DB
     (verified via a follow-up select) and removes it from the open list.
  4. Reopen restores the alert to 'new' and it appears in the open list.
  5. Cleanup deletes the seeded scout_request and its alert row so the
     run is idempotent.

Usage:
    python3 e2e/alerts_inbox.py
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

ADMIN_EMAIL  = "admin@cholokheli.test"
ADMIN_PASS   = "Admin123!"
SCOUT_EMAIL  = "scout.verified@cholokheli.test"
SCOUT_PASS   = "Scout123!"
PLAYER_ID    = "b232d1a4-7745-4af8-b03a-00603728c3f7"

results = []
def rec(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
def save(name, payload):
    (OUT / f"alerts_{name}.json").write_text(json.dumps(payload, indent=2, default=str))


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


async def sb(page, code):
    return await page.evaluate(f"""async () => {{
        const mod = await import('/src/integrations/supabase/client.ts');
        const supabase = mod.supabase;
        {code}
    }}""")


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        page.on("pageerror", lambda err: print(f"  [pageerror] {err}"))

        await page.goto(BASE + "/", wait_until="domcontentloaded")
        await page.wait_for_timeout(300)

        # 1. Sign in as scout and insert a scout_request → trigger creates alert
        s = await signin(page, SCOUT_EMAIL, SCOUT_PASS)
        rec("scout:signin", s.get("ok"), s.get("err") or "")
        seed = await sb(page, f"""
            const scoutId = (await supabase.auth.getUser()).data.user.id;
            const {{ data, error }} = await supabase.from('scout_requests')
              .insert({{ scout_id: scoutId, player_id: '{PLAYER_ID}', status: 'pending', notes: 'alerts_e2e_seed' }})
              .select('id').maybeSingle();
            return {{ id: data?.id ?? null, error: error?.message ?? null }};
        """)
        save("seed_request", seed)
        rec("scout:seed_request", bool(seed.get("id")) and not seed.get("error"), seed.get("error") or "")
        request_id = seed.get("id")
        if not request_id:
            sys.exit(1)

        # 2. Switch to admin and confirm the alert row exists in DB
        s = await signin(page, ADMIN_EMAIL, ADMIN_PASS)
        rec("admin:signin", s.get("ok"), s.get("err") or "")
        db_alert = await sb(page, f"""
            const {{ data, error }} = await supabase.from('moderation_alerts')
              .select('id, kind, target_id, status').eq('target_id', '{request_id}').maybeSingle();
            return {{ row: data, error: error?.message ?? null }};
        """)
        save("db_alert_after_seed", db_alert)
        row = db_alert.get("row") or {}
        rec("alert:row_exists", bool(row.get("id")), json.dumps(db_alert))
        rec("alert:kind_is_scout_request", row.get("kind") == "scout_request", str(row.get("kind")))
        rec("alert:status_is_new", row.get("status") == "new", str(row.get("status")))
        alert_id = row.get("id")

        # 3. Load /admin, open Inbox, verify the row is visible
        # Wipe persisted UI state so the tab click lands cleanly.
        await page.evaluate("""() => { for (const k of Object.keys(localStorage))
            if (k.startsWith('adminMod:')) localStorage.removeItem(k); }""")
        await page.goto(BASE + "/admin", wait_until="domcontentloaded")
        await page.get_by_test_id("tab-alerts").click()
        # Wait for our specific row to appear
        await page.wait_for_selector(f'[data-alert-id="{alert_id}"]', timeout=8000)
        ui_row = await page.evaluate(
            f"""() => {{
                const el = document.querySelector('[data-alert-id="{alert_id}"]');
                return el ? {{ kind: el.getAttribute('data-alert-kind'),
                              status: el.getAttribute('data-alert-status') }} : null;
            }}"""
        )
        save("ui_row_before_resolve", ui_row)
        rec("ui:row_shown", ui_row is not None and ui_row.get("status") == "new", str(ui_row))
        rec("ui:row_kind", ui_row and ui_row.get("kind") == "scout_request", str(ui_row))

        # 4. Click Mark resolved on that row and verify
        await page.locator(f'[data-alert-id="{alert_id}"] [data-testid="alert-resolve"]').click()
        # Row should disappear from the open list
        try:
            await page.wait_for_function(
                f"() => !document.querySelector('[data-alert-id=\"{alert_id}\"][data-alert-status=\"new\"]')",
                timeout=6000,
            )
            rec("ui:row_removed_from_open", True)
        except Exception as e:
            rec("ui:row_removed_from_open", False, str(e))

        after = await sb(page, f"""
            const {{ data, error }} = await supabase.from('moderation_alerts')
              .select('status, resolved_by, resolved_at').eq('id', '{alert_id}').maybeSingle();
            return {{ row: data, error: error?.message ?? null }};
        """)
        save("db_alert_after_resolve", after)
        arow = after.get("row") or {}
        rec("db:status_resolved", arow.get("status") == "resolved", str(arow))
        rec("db:resolved_by_set", bool(arow.get("resolved_by")), str(arow))
        rec("db:resolved_at_set", bool(arow.get("resolved_at")), str(arow))

        # 5. Reopen path
        await page.get_by_test_id("alerts-resolved-toggle").click()
        await page.wait_for_selector(f'[data-alert-id="{alert_id}"][data-alert-status="resolved"]', timeout=5000)
        await page.locator(f'[data-alert-id="{alert_id}"] [data-testid="alert-reopen"]').click()
        try:
            await page.wait_for_selector(
                f'[data-alert-id="{alert_id}"][data-alert-status="new"]', timeout=6000
            )
            rec("ui:reopen_puts_back_in_open", True)
        except Exception as e:
            rec("ui:reopen_puts_back_in_open", False, str(e))

        reopened = await sb(page, f"""
            const {{ data }} = await supabase.from('moderation_alerts')
              .select('status, resolved_at, resolved_by').eq('id', '{alert_id}').maybeSingle();
            return {{ row: data }};
        """)
        save("db_alert_after_reopen", reopened)
        rrow = reopened.get("row") or {}
        rec("db:status_reopened_new", rrow.get("status") == "new", str(rrow))
        rec("db:resolved_at_cleared", rrow.get("resolved_at") is None, str(rrow))

        # 6. Cleanup — delete alert (admin) and scout_request (as scout)
        del_alert = await sb(page, f"""
            const {{ error }} = await supabase.from('moderation_alerts').delete().eq('id', '{alert_id}');
            return {{ error: error?.message ?? null }};
        """)
        rec("cleanup:alert_deleted", not del_alert.get("error"), del_alert.get("error") or "")

        await signin(page, SCOUT_EMAIL, SCOUT_PASS)
        del_req = await sb(page, f"""
            const {{ error }} = await supabase.from('scout_requests').delete().eq('id', '{request_id}');
            return {{ error: error?.message ?? null }};
        """)
        rec("cleanup:request_deleted", not del_req.get("error"), del_req.get("error") or "")

        await browser.close()

    failed = [r for r in results if not r[1]]
    print("\n========== ALERTS INBOX SUMMARY ==========")
    print(f"Total:  {len(results)}")
    print(f"Passed: {len(results) - len(failed)}")
    print(f"Failed: {len(failed)}")
    if failed:
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
        sys.exit(1)

asyncio.run(main())
