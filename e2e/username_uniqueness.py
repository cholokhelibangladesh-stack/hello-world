#!/usr/bin/env python3
"""
Username uniqueness E2E.

Signs in as admin and exercises the case-insensitive UNIQUE index on
public.profiles.username directly. Admin can UPDATE any profile row
(policy: "Admins update any profile"), which lets us verify:

  1. Every seeded username reports as taken (case-insensitive search).
  2. A random fresh username reports as available.
  3. Admin can claim a fresh username on their own profile.
  4. Attempting to update ANOTHER account's profile to a taken username
     (or its UPPERCASE variant) is rejected by the DB unique index.
  5. Restore original admin username so the run is idempotent.

Usage:
    python3 e2e/username_uniqueness.py
"""
import asyncio, json, os, uuid, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

ADMIN_EMAIL = "admin@cholokheli.test"
ADMIN_PASS  = "Admin123!"
PLAYER_EMAIL = "player@cholokheli.test"

SEEDED_USERNAMES = ["admin_user", "scout_pending", "scout_verified", "player_user"]

results = []
def rec(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))

def save(name, payload):
    (OUT / f"username_{name}.json").write_text(json.dumps(payload, indent=2, default=str))


async def sb(page, code):
    return await page.evaluate(f"""async () => {{
        const mod = await import('/src/integrations/supabase/client.ts');
        const supabase = mod.supabase;
        {code}
    }}""")


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await ctx.new_page()
        page.on("pageerror", lambda err: print(f"  [pageerror] {err}"))
        await page.goto(BASE + "/auth", wait_until="domcontentloaded")
        await page.wait_for_timeout(400)

        # Sign in as admin.
        signin = await page.evaluate(
            """async ({email, password}) => {
                const mod = await import('/src/integrations/supabase/client.ts');
                const { data, error } = await mod.supabase.auth.signInWithPassword({ email, password });
                return { ok: !!data?.session, error: error?.message ?? null };
            }""",
            {"email": ADMIN_EMAIL, "password": ADMIN_PASS},
        )
        if not signin.get("ok"):
            rec("admin:signin", False, signin.get("error") or "")
            sys.exit(1)
        rec("admin:signin", True)

        # 1. Every seeded username reports as taken (case-insensitive search).
        for u in SEEDED_USERNAMES:
            r = await sb(page, f"""
                const {{ data, error }} = await supabase.from('profiles').select('user_id, username').ilike('username', '{u}').maybeSingle();
                return {{ taken: !!data, error: error?.message ?? null }};
            """)
            save(f"existing_{u}", r)
            rec(f"existing_taken:{u}", r.get("taken") is True, r.get("error") or "")
            r_up = await sb(page, f"""
                const {{ data, error }} = await supabase.from('profiles').select('user_id').ilike('username', '{u.upper()}').maybeSingle();
                return {{ taken: !!data, error: error?.message ?? null }};
            """)
            rec(f"existing_taken_ci:{u.upper()}", r_up.get("taken") is True, r_up.get("error") or "")

        # 2. A random fresh username is initially available.
        fresh = f"e2e_{uuid.uuid4().hex[:8]}"
        r = await sb(page, f"""
            const {{ data, error }} = await supabase.from('profiles').select('user_id').ilike('username', '{fresh}').maybeSingle();
            return {{ taken: !!data, error: error?.message ?? null }};
        """)
        save(f"fresh_{fresh}", r)
        rec(f"fresh_available:{fresh}", r.get("taken") is False, r.get("error") or "")

        # Lookup player user_id.
        player = await sb(page, f"""
            const {{ data }} = await supabase.from('profiles').select('user_id, username').eq('username', 'player_user').maybeSingle();
            return data;
        """)
        player_id = (player or {}).get("user_id")
        if not player_id:
            rec("find_player", False, "player_user not found")
            sys.exit(1)

        # 3. Attempt to steal a taken username onto the player profile — DB unique index must reject.
        for target in ("scout_pending", "SCOUT_PENDING", "Admin_User"):
            conflict = await sb(page, f"""
                const {{ error }} = await supabase.from('profiles').update({{ username: '{target}' }}).eq('user_id', '{player_id}');
                return {{ error: error?.message ?? null, code: error?.code ?? null }};
            """)
            save(f"conflict_{target}", conflict)
            rejected = bool(conflict.get("error"))
            rec(f"conflict_rejected:{target}", rejected, conflict.get("error") or "unexpectedly succeeded")

        # 4. Confirm the player's username is still 'player_user' (was not overwritten).
        after = await sb(page, f"""
            const {{ data }} = await supabase.from('profiles').select('username').eq('user_id', '{player_id}').maybeSingle();
            return data;
        """)
        rec("player_username_intact", (after or {}).get("username") == "player_user", json.dumps(after))

        # 5. A brand-new username CAN be claimed onto the player.
        set_ok = await sb(page, f"""
            const {{ error }} = await supabase.from('profiles').update({{ username: '{fresh}' }}).eq('user_id', '{player_id}');
            return {{ error: error?.message ?? null }};
        """)
        save(f"claim_{fresh}", set_ok)
        rec(f"fresh_claim_ok:{fresh}", not set_ok.get("error"), set_ok.get("error") or "")

        # 6. Now the fresh name reports as taken.
        r2 = await sb(page, f"""
            const {{ data }} = await supabase.from('profiles').select('user_id').ilike('username', '{fresh}').maybeSingle();
            return {{ taken: !!data }};
        """)
        rec(f"after_claim_taken:{fresh}", r2.get("taken") is True)

        # 7. Cleanup — restore player_user.
        restore = await sb(page, f"""
            const {{ error }} = await supabase.from('profiles').update({{ username: 'player_user' }}).eq('user_id', '{player_id}');
            return {{ error: error?.message ?? null }};
        """)
        save("cleanup_restore_player", restore)
        rec("cleanup:restore_player_user", not restore.get("error"), restore.get("error") or "")

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
