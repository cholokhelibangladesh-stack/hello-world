# CholoKheli End-to-End Test Suite

Automated Playwright smoke test that signs in as each seeded account and walks the feature pages.

## Accounts covered
| Role | Email | Password |
|---|---|---|
| Admin | `admin@cholokheli.test` | `Admin123!` |
| Scout (pending) | `scout@cholokheli.test` | `Scout123!` |
| Scout (verified) | `scout.verified@cholokheli.test` | `Scout123!` |
| Player | `player@cholokheli.test` | `Player123!` |

## Run

```bash
# Once, if Playwright is not installed:
pip install playwright && playwright install chromium

# Against local dev server (default):
python3 e2e/run.py

# Against a deployed environment:
BASE_URL=https://your-preview.lovable.app python3 e2e/run.py
```

Screenshots for every step are written to `e2e/screenshots/`. The script exits non-zero if any check fails and prints a summary matrix.

## What it verifies
- All public routes return 200 and render expected content (`/`, `/mission`, `/safe-scouting`, `/faq`, `/privacy-policy`, `/auth`).
- Each account can sign in and reach its role dashboard.
- Pending-scout gate correctly blocks the scout dashboard.
- Verified scout, player, and admin land on their respective dashboards.
- Sign-out clears session between accounts.
