#!/usr/bin/env bash
# A real race (0033): 8 devices of one account save the same video course at the same moment, each with its own
# video marked done, and 8 more record the same challenge with different scores. Nothing may be lost: all 8 videos
# end up done and the best score is the highest one. Called by run.sh with its psql.
set -euo pipefail
PSQL=("$@")
USER3=99000000-0000-0000-0000-000000000003
for i in $(seq 1 8); do
  vid=$(printf 'racevideo%02d' "$i")
  "${PSQL[@]}" -c "select set_config('request.jwt.claim.sub', '$USER3', false); set role authenticated; select public.learning_video_save('race', array['$vid'], '$vid', $i, $i, 8);" >/dev/null &
  "${PSQL[@]}" -c "select set_config('request.jwt.claim.sub', '$USER3', false); set role authenticated; select public.learning_complete('challenge', 'bash:hard:pt', $(( i % 6 )));" >/dev/null &
done
wait
n=$("${PSQL[@]}" -tA -c "select cardinality(completed_video_ids) from public.learning_video_progress where user_id = '$USER3' and course_id = 'race'")
best=$("${PSQL[@]}" -tA -c "select best_score from public.learning_progress where user_id = '$USER3' and item_id = 'bash:hard:pt'")
rows=$("${PSQL[@]}" -tA -c "select count(*) from public.learning_progress where user_id = '$USER3'")
if [ "$n" != 8 ] || [ "$best" != 5 ] || [ "$rows" != 1 ]; then
  echo "FAIL: race kept $n of 8 videos, best score $best (expected 5), $rows challenge rows (expected 1)" >&2
  exit 1
fi
echo "LEARNING RACE PASSED"
