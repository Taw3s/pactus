-- Pacto — weekly retention of one group. Read-only: a single SELECT, safe to run in the SQL Editor
-- (it is not a migration and changes nothing).
--
-- * Week N of a member = days joined_on + 7N … joined_on + 7N + 6 (counted from their own join day,
--   so late joiners are compared at the same age).
-- * active = at least one proof that week (any goal, extras included). kept = at least one complete day.
-- * eligible = members whose week N has started; the week still running is marked partial.
-- * Blind spot: leaving the group (0016) deletes the member row and their check-ins, so people who
--   left vanish from every week. Numbers here only cover who is still in the group, so they run high
--   (survivorship): compare `membros` in week 0 with how many people you know joined.
--
-- Group: set invite_code below; left null, it takes the group with the most members.

with params as (
  select null::text as invite_code
),
target as (
  select g.id, g.name, g.created_at
  from public.groups g
  left join public.members m on m.group_id = g.id
  where (select invite_code from params) is null or g.invite_code = upper((select invite_code from params))
  group by g.id
  order by count(m.user_id) desc, g.created_at
  limit 1
),
today as (
  select (now() at time zone 'America/Sao_Paulo')::date as d
),
roster as (
  select m.user_id, m.joined_on
  from public.members m
  where m.group_id = (select id from target)
),
weeks as (
  select r.user_id, r.joined_on, n as week, r.joined_on + 7 * n as starts_on, r.joined_on + 7 * n + 6 as ends_on
  from roster r
  cross join lateral generate_series(0, ((select d from today) - r.joined_on) / 7) n
),
activity as (
  select w.week, w.user_id, w.ends_on,
    exists (select 1 from public.checkins c where c.user_id = w.user_id and c.day between w.starts_on and w.ends_on) as active,
    exists (select 1 from public.completed_days cd where cd.user_id = w.user_id and cd.day between w.starts_on and w.ends_on) as kept
  from weeks w
)
select
  (select name from target) as grupo,
  a.week as semana,
  count(*) as membros,
  count(*) filter (where a.active) as ativos,
  round(100.0 * count(*) filter (where a.active) / count(*), 1) as ativos_pct,
  count(*) filter (where a.kept) as cumpriram_1_dia,
  round(100.0 * count(*) filter (where a.kept) / count(*), 1) as cumpriram_pct,
  bool_or(a.ends_on >= (select d from today)) as parcial
from activity a
group by a.week
order by a.week;
