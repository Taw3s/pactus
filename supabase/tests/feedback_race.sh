#!/usr/bin/env bash
# A real race (0032): 8 sessions of one account claim a feedback slot at the same moment. Exactly one may pass the
# 30-second cooldown. Called by run.sh with its psql.
set -euo pipefail
PSQL=("$@")
USER3=98000000-0000-0000-0000-000000000003
for i in $(seq 1 8); do
  "${PSQL[@]}" -v ON_ERROR_STOP=0 -c "select set_config('request.jwt.claim.sub', '$USER3', false); set role authenticated; select public.claim_feedback_send();" >/dev/null 2>&1 &
done
wait
n=$("${PSQL[@]}" -tA -c "select count(*) from public.feedback_sends where user_id = '$USER3'")
if [ "$n" != 1 ]; then
  echo "FAIL: race let $n feedback sends through (expected 1)" >&2
  exit 1
fi
echo "FEEDBACK RACE PASSED"
