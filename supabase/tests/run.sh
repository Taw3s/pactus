#!/usr/bin/env bash
# Runs the migration + tests against a throwaway local Postgres (needs Postgres 15+ binaries).
set -euo pipefail
cd "$(dirname "$0")"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)}"
DATA="$(mktemp -d)"
PORT=54329
trap '"$PGBIN/pg_ctl" -D "$DATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DATA"' EXIT

"$PGBIN/initdb" -D "$DATA" -U postgres >/dev/null
"$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $DATA" -l "$DATA/log" start >/dev/null

PSQL=(psql -h "$DATA" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f stub_supabase.sql
"${PSQL[@]}" -f ../migrations/0001_init.sql
"${PSQL[@]}" -f ../migrations/0002_security_fixes.sql
"${PSQL[@]}" -f ../migrations/0003_ranking_projects.sql
"${PSQL[@]}" -f ../migrations/0004_ai_reviews.sql
"${PSQL[@]}" -f rls_test.sql
"${PSQL[@]}" -f ../migrations/0005_ai_judge.sql
"${PSQL[@]}" -f ai_judge_test.sql
