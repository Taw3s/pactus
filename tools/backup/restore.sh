#!/usr/bin/env bash
# Restores a dump made by dump.sh into a NEW, EMPTY Supabase project (never into the one in use: it would
# collide with what is there). One transaction: on any error nothing is kept. Then compares the row counts.
#   tools/backup/restore.sh "<connection string of the new project>" <folder with roles.sql, schema.sql, data.sql>
set -euo pipefail
DB_URL="${1:?connection string}"
DIR="${2:?dump folder}"
HERE="$(cd "$(dirname "$0")" && pwd)"
psql "$DB_URL" -X -q --single-transaction -v ON_ERROR_STOP=1 \
  --file "$DIR/roles.sql" \
  --file "$DIR/schema.sql" \
  --command 'set session_replication_role = replica' \
  --file "$DIR/data.sql"
"$HERE/counts.sh" "$DB_URL" > "$DIR/counts-restored.tsv"
if diff -u "$DIR/counts.tsv" "$DIR/counts-restored.tsv"; then
  echo "restore ok: every counted table has the same number of rows"
else
  echo "restore DIFFERS from the dump (see above)" >&2
  exit 1
fi
