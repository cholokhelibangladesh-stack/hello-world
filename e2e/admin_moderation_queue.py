#!/usr/bin/env python3
"""
Admin moderation queue E2E.

Sign in as admin, seed a few test rows for Videos and Requests (Scouts
already has seeded rows), then verify:

  1. Sort controls (Newest / Oldest / Status / Account A–Z / Z–A) reorder
     rows correctly for the Scouts, Videos, and Requests tabs.
  2. The fast search input filters by target account (name / email /
     username / uploader) for each tab.
  3. Search, filter, sort, and active-tab choices persist across page
     reloads via localStorage.
  4. Cleanup — every seeded row is deleted so the run is idempotent.

Usage:
    python3 e2e/admin_moderation_queue.py
"""
import asyncio, json, os, sys, uuid
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

ADMIN_EMAIL  = "admin@cholokheli.test"
ADMIN_PASS   = "Admin123!"
PLAYER_EMAIL = "player@cholokheli.test"
PLAYER_PASS  = "Player123!"
SCOUT_EMAIL  = "scout_verified@cholokheli.test"
SCOUT_PASS   = "Scout123!"

PLAYER_ID = "b232d1a4-7745-4af8-b03a-00603728c3f7"

results = []
def rec(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))

def save(name, payload):
    (OUT / f"admin_mod_{name}.json").write_text(json.dumps(payload, indent=2, default=str))


async def sign_in(page, email, password):
    return await page.evaluate(
        """async ({email, password}) => {
            const m = await import('/src/integrations/supabase/client.ts');
            await m.supabase.auth.signOut();
            const { data, error } = await m.supabase.auth.signInWithPassword({ email, password });
            return { ok: !!data?.session, err: error?.message ?? null };
        }""",
        {"email": email, "password": password},
    )


async def sb(page, code, args=None):
    if args is None:
        return await page.evaluate(f"""async () => {{
            const mod = await import('/src/integrations/supabase/client.ts');
            const supabase = mod.supabase;
            {code}
        }}""")
    return await page.evaluate(
        f"""async (args) => {{
            const mod = await import('/src/integrations/supabase/client.ts');
            const supabase = mod.supabase;
            {code}
        }}""",
        args,
    )


async def wait_rows(page, tab, expected_min=1, timeout=6000):
    await page.wait_for_function(
        f"() => document.querySelectorAll('[data-testid=\"mod-row-{tab}\"]').length >= {expected_min}",
        timeout=timeout,
    )


async def read_rows(page, tab, attr):
    return await page.evaluate(
        f"""(a) => Array.from(document.querySelectorAll('[data-testid="mod-row-{tab}"]'))
                        .map(el => el.getAttribute(a))""",
        attr,
    )


async def set_sort(page, tab, value):
    await page.select_option(f'[data-testid="mod-sort-{tab}"]', value)
    await page.wait_for_timeout(120)


async def set_search(page, tab, value):
    inp = page.get_by_test_id(f"mod-search-{tab}")
    await inp.click()
    await inp.press("Control+a")
    await inp.press("Delete")
    if value:
        await inp.type(value, delay=10)
    await page.wait_for_timeout(150)


async def open_tab(page, name):
    await page.get_by_role("tab", name=lambda t: t and name.lower() in t.lower()).first.click()
    await page.wait_for_timeout(200)


def is_desc(vals):
    return all(a >= b for a, b in zip(vals, vals[1:]))

def is_asc(vals):
    return all(a <= b for a, b in zip(vals, vals[1:]))


STATUS_RANK = {"pending": 0, "pending_payment": 0, "draft": 1, "live": 2, "approved": 2, "active": 2, "rejected": 3}


async def check_sort_for_tab(page, tab):
    # Newest first
    await set_sort(page, tab, "date_desc")
    dates = await read_rows(page, tab, "data-created-at")
    save(f"{tab}_dates_desc", dates)
    rec(f"{tab}:sort_date_desc", len(dates) >= 2 and is_desc(dates), str(dates))

    await set_sort(page, tab, "date_asc")
    dates = await read_rows(page, tab, "data-created-at")
    save(f"{tab}_dates_asc", dates)
    rec(f"{tab}:sort_date_asc", len(dates) >= 2 and is_asc(dates), str(dates))

    await set_sort(page, tab, "status_asc")
    statuses = await read_rows(page, tab, "data-status")
    ranks = [STATUS_RANK.get(s, 99) for s in statuses]
    save(f"{tab}_status_asc", {"statuses": statuses, "ranks": ranks})
    rec(f"{tab}:sort_status_asc", len(ranks) >= 2 and is_asc(ranks), str(statuses))

    await set_sort(page, tab, "status_desc")
    statuses = await read_rows(page, tab, "data-status")
    ranks = [STATUS_RANK.get(s, 99) for s in statuses]
    rec(f"{tab}:sort_status_desc", len(ranks) >= 2 and is_desc(ranks), str(statuses))

    await set_sort(page, tab, "target_asc")
    accts = [a or "" for a in await read_rows(page, tab, "data-account")]
    lowered = [a.lower() for a in accts]
    save(f"{tab}_target_asc", accts)
    rec(f"{tab}:sort_target_asc", len(lowered) >= 2 and is_asc(lowered), str(accts))

    await set_sort(page, tab, "target_desc")
    accts = [a or "" for a in await read_rows(page, tab, "data-account")]
    lowered = [a.lower() for a in accts]
    rec(f"{tab}:sort_target_desc", len(lowered) >= 2 and is_desc(lowered), str(accts))


async def check_search_for_tab(page, tab, needle, expect_contains):
    await set_search(page, tab, needle)
    accts = [a or "" for a in await read_rows(page, tab, "data-account")]
    save(f"{tab}_search_{needle}", accts)
    ok = len(accts) > 0 and all(expect_contains.lower() in a.lower() for a in accts)
    rec(f"{tab}:search[{needle}]", ok, str(accts))
    # Nonsense search → 0 rows.
    await set_search(page, tab, f"zzz_{uuid.uuid4().hex[:6]}")
    accts_empty = await read_rows(page, tab, "data-account")
    rec(f"{tab}:search_empty", len(accts_empty) == 0, str(accts_empty))
    await set_search(page, tab, "")


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1400, "height": 2000})
        page = await ctx.new_page()
        page.on("pageerror", lambda err: print(f"  [pageerror] {err}"))

        await page.goto(BASE + "/", wait_until="domcontentloaded")
        await page.wait_for_timeout(400)

        # --- Seed as player: three videos with staggered created_at ---
        s = await sign_in(page, PLAYER_EMAIL, PLAYER_PASS)
        if not s.get("ok"):
            rec("player:signin", False, s.get("err") or "")
            sys.exit(1)
        rec("player:signin", True)
        seeded_videos = await sb(page, """
            const now = Date.now();
            const rows = [
              { user_id: (await supabase.auth.getUser()).data.user.id, title: 'e2e_vid_A', description: 'e2e_desc_A', status: 'pending_payment', created_at: new Date(now - 3*86400000).toISOString(), position_tags: [], trait_tags: [] },
              { user_id: (await supabase.auth.getUser()).data.user.id, title: 'e2e_vid_B', description: 'e2e_desc_B', status: 'live',            created_at: new Date(now - 2*86400000).toISOString(), position_tags: [], trait_tags: [] },
              { user_id: (await supabase.auth.getUser()).data.user.id, title: 'e2e_vid_C', description: 'e2e_desc_C', status: 'rejected',        created_at: new Date(now - 1*86400000).toISOString(), position_tags: [], trait_tags: [] },
            ];
            const { data, error } = await supabase.from('videos').insert(rows).select('id');
            return { ids: (data||[]).map(d=>d.id), error: error?.message ?? null };
        """)
        save("seed_videos", seeded_videos)
        rec("seed:videos", not seeded_videos.get("error") and len(seeded_videos.get("ids", [])) == 3, seeded_videos.get("error") or "")
        video_ids = seeded_videos.get("ids", [])

        # --- Seed as scout: two more scout_requests toward the player ---
        s = await sign_in(page, SCOUT_EMAIL, SCOUT_PASS)
        if not s.get("ok"):
            rec("scout:signin", False, s.get("err") or "")
            sys.exit(1)
        rec("scout:signin", True)
        seeded_reqs = await sb(page, f"""
            const scoutId = (await supabase.auth.getUser()).data.user.id;
            const now = Date.now();
            const rows = [
              {{ scout_id: scoutId, player_id: '{PLAYER_ID}', status: 'approved', notes: 'e2e_req_1', created_at: new Date(now - 3*86400000).toISOString() }},
              {{ scout_id: scoutId, player_id: '{PLAYER_ID}', status: 'rejected', notes: 'e2e_req_2', created_at: new Date(now - 1*86400000).toISOString() }},
            ];
            const {{ data, error }} = await supabase.from('scout_requests').insert(rows).select('id');
            return {{ ids: (data||[]).map(d=>d.id), error: error?.message ?? null }};
        """)
        save("seed_requests", seeded_reqs)
        rec("seed:requests", not seeded_reqs.get("error") and len(seeded_reqs.get("ids", [])) == 2, seeded_reqs.get("error") or "")
        request_ids = seeded_reqs.get("ids", [])

        # --- Now switch to admin and load the moderation queue ---
        s = await sign_in(page, ADMIN_EMAIL, ADMIN_PASS)
        if not s.get("ok"):
            rec("admin:signin", False, s.get("err") or "")
            sys.exit(1)
        rec("admin:signin", True)

        # Clean any previously persisted UI state so the run is deterministic.
        await page.evaluate("""() => {
            for (const k of Object.keys(localStorage)) if (k.startsWith('adminMod:')) localStorage.removeItem(k);
        }""")

        await page.goto(BASE + "/admin", wait_until="domcontentloaded")
        await wait_rows(page, "scouts", expected_min=2, timeout=10000)
        await page.screenshot(path=str(OUT / "admin_mod_scouts.png"))

        # ---- SCOUTS TAB (default) ----
        await check_sort_for_tab(page, "scouts")
        await check_search_for_tab(page, "scouts", "verified", "Verified Scout")

        # ---- VIDEOS TAB ----
        await open_tab(page, "Videos")
        await wait_rows(page, "videos", expected_min=3)
        await check_sort_for_tab(page, "videos")
        await check_search_for_tab(page, "videos", "player_user", "Player User")

        # ---- REQUESTS TAB ----
        await open_tab(page, "Requests")
        await wait_rows(page, "requests", expected_min=2)
        await check_sort_for_tab(page, "requests")
        await check_search_for_tab(page, "requests", "player@cholokheli", "Player User")

        # ---- Persistence: set specific choices, reload, verify they stick ----
        await open_tab(page, "Videos")
        await wait_rows(page, "videos", expected_min=3)
        await set_sort(page, "videos", "target_asc")
        await page.get_by_test_id("mod-filter-videos-live").click()
        await set_search(page, "videos", "e2e_")
        pre = {
            "videoSort": await page.eval_on_selector('[data-testid="mod-sort-videos"]', "el => el.value"),
            "videoFilter_active": await page.get_by_test_id("mod-filter-videos-live").get_attribute("class"),
            "videoSearch": await page.eval_on_selector('[data-testid="mod-search-videos"]', "el => el.value"),
            "activeTab": await page.evaluate("() => localStorage.getItem('adminMod:activeTab')"),
        }
        save("persist_pre_reload", pre)
        rec("persist:sort_localstorage", await page.evaluate("() => localStorage.getItem('adminMod:videoSort')") == "target_asc")
        rec("persist:search_localstorage", await page.evaluate("() => localStorage.getItem('adminMod:videoSearch')") == "e2e_")
        rec("persist:activeTab_localstorage", pre["activeTab"] == "videos")

        await page.reload(wait_until="domcontentloaded")
        await wait_rows(page, "videos", expected_min=1, timeout=10000)
        post = {
            "videoSort": await page.eval_on_selector('[data-testid="mod-sort-videos"]', "el => el.value"),
            "videoSearch": await page.eval_on_selector('[data-testid="mod-search-videos"]', "el => el.value"),
            "activeTab": await page.evaluate("() => localStorage.getItem('adminMod:activeTab')"),
        }
        save("persist_post_reload", post)
        rec("persist:videoSort_survives_reload", post["videoSort"] == "target_asc", str(post))
        rec("persist:videoSearch_survives_reload", post["videoSearch"] == "e2e_", str(post))
        rec("persist:activeTab_survives_reload", post["activeTab"] == "videos", str(post))
        # After reload the videos tab should still be the active pane with our search applied.
        accts_after = await read_rows(page, "videos", "data-account")
        rec("persist:filtered_rows_still_scoped",
            len(accts_after) > 0 and all("Player" in (a or "") for a in accts_after),
            str(accts_after))

        # ---- Cleanup ----
        # Admin can delete videos directly. Scout_requests need the owning scout.
        clean_vids = await sb(page, f"""
            const {{ error }} = await supabase.from('videos').delete().in('id', {json.dumps(video_ids)});
            return {{ error: error?.message ?? null }};
        """)
        rec("cleanup:videos", not clean_vids.get("error"), clean_vids.get("error") or "")

        await sign_in(page, SCOUT_EMAIL, SCOUT_PASS)
        clean_reqs = await sb(page, f"""
            const {{ error }} = await supabase.from('scout_requests').delete().in('id', {json.dumps(request_ids)});
            return {{ error: error?.message ?? null }};
        """)
        rec("cleanup:requests", not clean_reqs.get("error"), clean_reqs.get("error") or "")

        # Reset persisted admin UI state so subsequent runs / real usage starts fresh.
        await sign_in(page, ADMIN_EMAIL, ADMIN_PASS)
        await page.goto(BASE + "/admin", wait_until="domcontentloaded")
        await page.evaluate("""() => {
            for (const k of Object.keys(localStorage)) if (k.startsWith('adminMod:')) localStorage.removeItem(k);
        }""")

        await browser.close()

    failed = [r for r in results if not r[1]]
    print("\n========== ADMIN MODERATION QUEUE SUMMARY ==========")
    print(f"Total:  {len(results)}")
    print(f"Passed: {len(results) - len(failed)}")
    print(f"Failed: {len(failed)}")
    if failed:
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
        sys.exit(1)

asyncio.run(main())
