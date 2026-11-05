-- Pacto — extra study sessions that stop scoring under the rule of 05/11/2026 (P100-3, decision 2).
-- Read-only: a single SELECT, safe to run in the SQL Editor (not a migration; changes nothing).
--
-- An extra session scores only while a main study proof of that person and day counts (the first one, or a
-- valid retake of an annulled one). This lists, per month and person, the valid extra sessions whose day has
-- no counting main study proof: they leave the ranking once the PR is merged. Proofs stay in the history.
-- `minutes` is the sum before the daily cap of 240 minutes, so the real loss in points can be smaller.
-- The result has members' names: look at it in the SQL Editor, do not paste it anywhere public.
with annulled as (
  select checkin_id from public.dispute_results where status = 'upheld'
),
main_counts as (
  select distinct c.user_id, c.day
  from public.checkins c
  where c.goal = 'study' and not c.extra and c.id not in (select checkin_id from annulled)
)
select to_char(e.day, 'YYYY-MM') as month,
       g.name as group_name,
       m.display_name,
       count(*) as extra_sessions,
       sum(coalesce(e.minutes, 0)) as minutes
from public.checkins e
join public.members m on m.user_id = e.user_id
join public.groups g on g.id = e.group_id
where e.extra
  and e.goal = 'study'
  and e.id not in (select checkin_id from annulled)
  and not exists (select 1 from main_counts o where o.user_id = e.user_id and o.day = e.day)
group by 1, 2, 3
order by 1, 2, 3;
