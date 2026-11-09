#!/usr/bin/env bash
# Dumps a Supabase database the way Supabase documents for moving to a new project: roles, schema and data in
# three files, plus the row count of the tables the app depends on (to check a restore). Needs the Supabase CLI
# (it runs pg_dump in Docker, matching the server's version) and psql.
#   tools/backup/dump.sh "<postgres connection string>" <output folder>
# The folder holds personal data in clear text: encrypt it before it leaves the machine (see docs/backup.md).
set -euo pipefail
DB_URL="${1:?connection string}"
OUT="${2:?output folder}"
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUT"
supabase db dump --db-url "$DB_URL" -f "$OUT/roles.sql" --role-only
supabase db dump --db-url "$DB_URL" -f "$OUT/schema.sql"
supabase db dump --db-url "$DB_URL" -f "$OUT/data.sql" --use-copy --data-only
"$HERE/counts.sh" "$DB_URL" > "$OUT/counts.tsv"
date -u +%Y-%m-%dT%H:%M:%SZ > "$OUT/created_at.txt"
echo "dump ok: $(wc -l < "$OUT/counts.tsv") tables counted"
