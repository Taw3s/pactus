-- Pacto — typing proofs annulled by the tribunal: how they were (or could not be) retaken.
-- Read-only: a single SELECT, safe to run in the SQL Editor (not a migration; changes nothing).
-- Measures the three cases the differential test of 10/11/2026 found (supabase/tests/differential):
--
--   A  retake sent with a test finished BEFORE the condemned proof. The database takes it (0010), the app
--      never offers it and gives it 0 typing points: the day counts, the points do not. Expected: 0 rows
--      (only reachable by calling the API directly).
--   B  retake sent with a test finished AFTER the condemned proof was sent but BEFORE the verdict. The proof
--      page shows the day's best test, so the tribunal may have judged exactly this test. App and database
--      both take it and score it.
--   C  proof annulled on its own day, never retaken, with the 3 attempts of the day spent and no later test:
--      the screen had nothing to send and no test to start. `day_complete` false = the day became a debt.
--
-- The result has members' names: look at it in the SQL Editor, do not paste it anywhere public.
with upheld as (
  select r.checkin_id, r.dispute_id, r.majority, d.created_at as opened_at
  from public.dispute_results r join public.disputes d on d.id = r.dispute_id
  where r.status = 'upheld'
),
condemned as (
  select c.id, c.user_id, c.group_id, c.day, c.created_at,
         -- The vote that reached the majority, or the 72 h limit when nobody did.
         coalesce((select v.created_at from public.dispute_votes v where v.dispute_id = u.dispute_id and v.upheld
                   order by v.created_at offset u.majority - 1 limit 1), u.opened_at + interval '72 hours') as decided_at
  from public.checkins c join upheld u on u.checkin_id = c.id
  where c.goal = 'typing'
),
cases as (
  select case when t.finished_at <= c.created_at then 'A: refeita com teste anterior à prova anulada'
              else 'B: refeita com teste feito entre a prova e a anulação' end as caso,
         c.group_id, c.user_id, c.day, t.score::text as detail
  from condemned c
  join public.checkins r on r.retake_of = c.id
  join public.typing_tests t on t.id = r.typing_test_id
  where t.finished_at <= c.decided_at
  union all
  select 'C: anulada no mesmo dia, sem refação e sem tentativa', c.group_id, c.user_id, c.day,
         'anulada às ' || to_char(c.decided_at at time zone 'America/Sao_Paulo', 'HH24:MI')
  from condemned c
  where (c.decided_at at time zone 'America/Sao_Paulo')::date = c.day
    and not exists (select 1 from public.checkins r where r.retake_of = c.id)
    and (select count(*) from public.typing_tests t where t.user_id = c.user_id and t.day = c.day) >= 3
    and not exists (select 1 from public.typing_tests t where t.user_id = c.user_id and t.day = c.day and t.finished_at > c.created_at)
)
select x.caso, g.name as group_name, m.display_name, x.day, x.detail,
       exists (select 1 from public.completed_days d where d.user_id = x.user_id and d.day = x.day) as day_complete
from cases x
join public.members m on m.user_id = x.user_id
join public.groups g on g.id = x.group_id
order by x.caso, x.day, m.display_name;
