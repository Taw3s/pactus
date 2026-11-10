-- Test-only clock for the differential test (never a migration: production keeps the real now()).
--
-- The rules under test read the time through now() and sp_today(). To replay a history of several
-- days against the real triggers, views and RPCs, an unqualified now() must answer the scenario's
-- instant. Nothing in the rules is rewritten: each function keeps its body byte for byte and only
-- gets a search_path where pacto_clock.now() comes before pg_catalog.now(); dispute_results is
-- recreated from its own definition with that one call swapped; column defaults likewise.
\set ON_ERROR_STOP on

create schema pacto_clock;
create function pacto_clock.now() returns timestamptz language sql stable as $$
  select coalesce(nullif(current_setting('pacto.now', true), '')::timestamptz, pg_catalog.now())
$$;
grant usage on schema pacto_clock to anon, authenticated, service_role;
grant execute on function pacto_clock.now() to anon, authenticated, service_role;

do $$
declare
  f record;
  c record;
  v_path text;
  v_def text;
begin
  -- Functions: same body, the clock schema first in their search_path.
  for f in
    select p.oid::regprocedure as sig,
           (select substring(cfg from '^search_path=(.*)$') from unnest(p.proconfig) cfg where cfg like 'search_path=%') as path
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') -- not pgcrypto's
  loop
    v_path := coalesce(f.path, 'public');
    execute format('alter function %s set search_path = pacto_clock, pg_catalog, %s', f.sig, v_path);
  end loop;

  -- The verdict view closes disputes by time.
  v_def := pg_get_viewdef('public.dispute_results'::regclass, true);
  assert position('now()' in v_def) > 0, 'dispute_results no longer reads now(): review clock.sql';
  execute 'create or replace view public.dispute_results with (security_invoker = true) as '
    || replace(v_def, 'now()', 'pacto_clock.now()');

  -- Column defaults (members.created_at decides who may vote in a tribunal).
  for c in
    select a.attrelid::regclass as tbl, a.attname as col, pg_get_expr(d.adbin, d.adrelid) as expr
    from pg_attrdef d
    join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
    join pg_class k on k.oid = d.adrelid
    where k.relnamespace = 'public'::regnamespace and pg_get_expr(d.adbin, d.adrelid) = 'now()'
  loop
    execute format('alter table %s alter column %I set default pacto_clock.now()', c.tbl, c.col);
  end loop;
end $$;

-- The shim works: the day follows the fake instant, in São Paulo.
do $$ begin
  perform set_config('pacto.now', '2026-03-03 02:59:59+00', true);
  assert public.sp_today() = date '2026-03-02', 'fake clock: 23:59:59 in São Paulo is still the 2nd';
  perform set_config('pacto.now', '2026-03-03 03:00:00+00', true);
  assert public.sp_today() = date '2026-03-03', 'fake clock: midnight in São Paulo';
end $$;
