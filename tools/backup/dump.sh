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
# Storage's internal tables (migrations, multipart uploads, vector and analytics buckets...) belong to the Storage
# service: the postgres role of a new project cannot write them, and a new project creates its own. Only the bucket
# list and the file records (photo paths) are kept. The list is read from the source, so a newer Storage still works.
EXCLUDE=$(psql "$DB_URL" -X -q -tA -v ON_ERROR_STOP=1 -c \
  "select string_agg('storage.' || tablename, ',' order by tablename) from pg_tables
   where schemaname = 'storage' and tablename not in ('buckets', 'objects')")
supabase db dump --db-url "$DB_URL" -f "$OUT/data.sql" --use-copy --data-only ${EXCLUDE:+-x "$EXCLUDE"}
"$HERE/counts.sh" "$DB_URL" > "$OUT/counts.tsv"
date -u +%Y-%m-%dT%H:%M:%SZ > "$OUT/created_at.txt"
echo "dump ok: $(wc -l < "$OUT/counts.tsv") tables counted"
