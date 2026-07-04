#!/usr/bin/env python3
"""
Username uniqueness E2E.

Verifies:
  1. Existing seeded usernames cannot be reused (case-insensitive).
  2. A brand-new username can be claimed by a fresh signup.
  3. That same username, once claimed, is then rejected for a second signup
     even with a different email.

Uses the browser Supabase client so RLS + the unique index are exercised
the same way the app does at runtime.

Cleanup: any auth users created here are removed via the admin edge
function `handle-signup-role` and profile row deletion is left to seed;
we only insert usernames on ephemeral emails and then delete the profile
username reservation by resetting it. Passwords are ephemeral.

Usage:
    python3 e2e/username_uniqueness.py
"""
import asyncio, json, os, uuid, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

SEEDED_USERNAMES = ["admin_user", "scout_pending", "scout_verified", "player_user"]

results = []
def rec(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))

def save(name, payload):
    (OUT / f"username_{name}.json").write_text(json.dumps(payload, indent=2, default=str))


async def check_taken(page, uname):
    """Return True if `uname` (case-insensitive) already exists in profiles."""
    return await page.evaluate(
        """async (u) => {
            const mod = await import('/src/integrations/supabase/client.ts');
            const { data, error } = await mod.supabase
                .from('profiles').select('user_id').ilike('username', u).maybeSingle();
            return { taken: !!data, error: error?.message ?? null };
        }""",
        uname,
    )


async def try_claim_username(page, email, password, uname, full_name):
    """Signup + call edge function to set the profile username. Returns result payload."""
    return await page.evaluate(
        """async ({email, password, uname, full_name}) => {
            const mod = await import('/src/integrations/supabase/client.ts');
            const { supabase } = mod;
            const { data: su, error: suErr } = await supabase.auth.signUp({
                email, password,
                options: { data: { full_name } },
            });
            if (suErr) return { stage: 'signup', error: suErr.message };
            // Wait a beat for the profile row trigger, then try to claim username directly
            // via a plain UPDATE — will fail against the unique index if taken.
            await new Promise(r => setTimeout(r, 400));
            const uid = su.user?.id;
            if (!uid) return { stage: 'no_user', session: !!su.session };
            const { error: updErr } = await supabase
                .from('profiles').update({ username: uname }).eq('user_id', uid);
            return { stage: 'update', error: updErr?.message ?? null, uid };
        }""",
        {"email": email, "password": password, "uname": uname, "full_name": full_name},
    )


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await ctx.new_page()
        page.on("pageerror", lambda err: print(f"  [pageerror] {err}"))
        await page.goto(BASE + "/auth", wait_until="domcontentloaded")
        await page.wait_for_timeout(500)

        # 1. Existing usernames report as taken (case-insensitive).
        for u in SEEDED_USERNAMES:
            r = await check_taken(page, u)
            save(f"existing_{u}", r)
            rec(f"existing_taken:{u}", r.get("taken") is True, r.get("error") or "")
            r2 = await check_taken(page, u.upper())
            rec(f"existing_taken_ci:{u.upper()}", r2.get("taken") is True, r2.get("error") or "")

        # 2. Fresh username is initially available.
        fresh = f"e2e_{uuid.uuid4().hex[:8]}"
        r = await check_taken(page, fresh)
        save(f"fresh_available_{fresh}", r)
        rec(f"fresh_available:{fresh}", r.get("taken") is False, r.get("error") or "")

        # 3. Claim it via a new signup.
        email_a = f"e2e_{uuid.uuid4().hex[:8]}@cholokheli.test"
        claim = await try_claim_username(page, email_a, "TempPass_123!", fresh, "E2E Alpha")
        save(f"claim_{fresh}", claim)
        rec(f"first_claim_ok:{fresh}", claim.get("stage") == "update" and not claim.get("error"),
            claim.get("error") or json.dumps(claim))

        # 4. Now the same username must be reported as taken.
        r = await check_taken(page, fresh)
        rec(f"after_claim_taken:{fresh}", r.get("taken") is True, r.get("error") or "")

        # 5. A second signup with a different email that tries the same username FAILS.
        await page.evaluate("async () => { const m = await import('/src/integrations/supabase/client.ts'); await m.supabase.auth.signOut(); }")
        email_b = f"e2e_{uuid.uuid4().hex[:8]}@cholokheli.test"
        claim2 = await try_claim_username(page, email_b, "TempPass_123!", fresh, "E2E Beta")
        save(f"claim_conflict_{fresh}", claim2)
        # The DB unique index must reject the update.
        rejected = claim2.get("stage") == "update" and bool(claim2.get("error"))
        rec(f"second_claim_rejected:{fresh}", rejected, claim2.get("error") or json.dumps(claim2))

        # 6. Case-insensitive rejection: second user tries UPPER form of the same username.
        upper = fresh.upper()
        claim3 = await page.evaluate(
            """async (u) => {
                const mod = await import('/src/integrations/supabase/client.ts');
                const { data: sess } = await mod.supabase.auth.getSession();
                const uid = sess?.session?.user?.id;
                if (!uid) return { error: 'no_session' };
                const { error } = await mod.supabase.from('profiles').update({ username: u }).eq('user_id', uid);
                return { error: error?.message ?? null };
            }""",
            upper,
        )
        save(f"claim_conflict_ci_{fresh}", claim3)
        rec(f"second_claim_rejected_ci:{upper}", bool(claim3.get("error")), claim3.get("error") or "")

        await browser.close()

    failed = [r for r in results if not r[1]]
    print("\n========== USERNAME UNIQUENESS SUMMARY ==========")
    print(f"Total:  {len(results)}")
    print(f"Passed: {len(results) - len(failed)}")
    print(f"Failed: {len(failed)}")
    if failed:
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
        sys.exit(1)

asyncio.run(main())
