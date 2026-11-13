#!/usr/bin/env bash
# A real race (0031): 8 sessions of person 6 call start_typing_test at the same moment, right after the
# verdict opened the "Nova tentativa". Exactly one special test may come out. Called by run.sh with its psql.
set -euo pipefail
PSQL=("$@")
USER6=97000000-0000-0000-0000-000000000006
for i in $(seq 1 8); do
  "${PSQL[@]}" -v ON_ERROR_STOP=0 -c "select set_config('request.jwt.claim.sub', '$USER6', false); set role authenticated; select * from public.start_typing_test('pc');" >/dev/null 2>&1 &
done
wait
n=$("${PSQL[@]}" -tA -c "select count(*) from public.typing_tests where user_id = '$USER6' and day = public.sp_today() and special")
total=$("${PSQL[@]}" -tA -c "select count(*) from public.typing_tests where user_id = '$USER6' and day = public.sp_today()")
if [ "$n" != 1 ] || [ "$total" != 4 ]; then
  echo "FAIL: race produced $n special tests and $total tests in total (expected 1 and 4)" >&2
  exit 1
fi
echo "TYPING RETAKE RACE PASSED"
