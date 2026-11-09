#!/usr/bin/env bash
# Exact row count of every app table (public), of the accounts (auth.users, auth.identities) and of the
# Storage metadata (storage.buckets, storage.objects), one "table<TAB>rows" line each, sorted.
set -euo pipefail
DB_URL="${1:?connection string}"
psql "$DB_URL" -X -q -tA -F $'\t' -v ON_ERROR_STOP=1 <<'SQL' | sort
select format('select %L, count(*) from %I.%I', schemaname || '.' || tablename, schemaname, tablename)
from pg_tables
where schemaname = 'public'
   or (schemaname = 'auth' and tablename in ('users', 'identities'))
   or (schemaname = 'storage' and tablename in ('buckets', 'objects'))
order by 1
\gexec
SQL
