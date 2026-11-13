#!/usr/bin/env bash
# Docker-free DB test runner: fresh Postgres DB -> Supabase shim -> every file in
# supabase/migrations (in order) -> pgTAP tests in supabase/tests/database.
# Needs: PostgreSQL 15+, pgTAP, pg_prove, pg_cron in shared_preload_libraries.
# Usage: PGUSER=postgres supabase/tests/local/run.sh
# With Docker + Supabase CLI, prefer:  supabase db reset && supabase test db
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DB="${TEST_DB:-ck_test}"
psql -q -d postgres -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='$DB'" >/dev/null
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/supabase/tests/local/supabase_shim.sql" >/dev/null
echo "Applying migrations..."
for f in "$ROOT"/supabase/migrations/*.sql; do
  if ! out=$(psql -q -v ON_ERROR_STOP=1 -1 -d "$DB" -f "$f" 2>&1); then
    echo "  FAILED: $(basename "$f")"; echo "$out" | grep -m3 ERROR; exit 1
  fi
done
echo "  all $(ls "$ROOT"/supabase/migrations/*.sql | wc -l) migrations applied"
pg_prove -d "$DB" --ext .sql "$ROOT"/supabase/tests/database/
