-- Differential test harness (test-only). Scenarios replay a history through the real RPCs and
-- triggers; diff.probe() then asks the database every question the TypeScript side also answers
-- (src/lib/ledger.ts, ranking.ts, the Hoje page, the chests panel) and stores the answers as JSON.
-- Every "would the database accept this?" probe runs in a subtransaction that is rolled back.
\set ON_ERROR_STOP on

create schema diff;
create table diff.scn (scenario int primary key, group_id uuid not null);
create table diff.log (scenario int not null, step int not null, ok boolean not null, err text, primary key (scenario, step));
create table diff.obs (id bigint generated always as identity primary key, scenario int not null, label text not null, data jsonb not null);
-- The stub has no index on the photo path, and the check-in trigger looks every photo up.
create index if not exists diff_storage_name_idx on storage.objects (name);
grant usage on schema diff to authenticated;
grant insert on diff.log to authenticated;

/** The written ranking rule (guide "ranking" and "extra", CLAUDE.md P100-3), as an oracle for scoreMonth. */
create function diff.ranking(p_group uuid) returns jsonb language sql stable as $$
  with m as (select user_id from public.members where group_id = p_group),
  c as (
    select c.id, c.user_id, c.day, c.goal::text as goal, c.minutes, c.pages, c.extra, c.created_at,
           coalesce(r.status, 'none') = 'upheld' as annulled
    from public.checkins c left join public.dispute_results r on r.checkin_id = c.id
    where c.user_id in (select user_id from m)
  ),
  main_study as (select distinct user_id, day from c where goal = 'study' and not extra and not annulled),
  study as (
    select c.user_id, c.day, least(240, sum(coalesce(c.minutes, 60)))::numeric as pts
    from c where c.goal = 'study' and not c.annulled
      and (not c.extra or exists (select 1 from main_study s where s.user_id = c.user_id and s.day = c.day))
    group by 1, 2
  ),
  reading as (
    select user_id, day, (least(50, sum(coalesce(pages, 0))) * 2)::numeric as pts
    from c where goal = 'reading' and not annulled group by 1, 2
  ),
  project as (select user_id, day, (count(*) * 10)::numeric as pts from c where goal = 'project' and not annulled group by 1, 2),
  cut as (select user_id, day, max(created_at) as at from c where goal = 'typing' and annulled group by 1, 2),
  typing as (
    select t.user_id, t.day, round(least(240, max(t.score))) as pts
    from public.typing_tests t left join cut k on k.user_id = t.user_id and k.day = t.day
    where t.user_id in (select user_id from m) and t.score is not null and t.finished_at is not null
      and (k.at is null or t.finished_at > k.at)
      and exists (select 1 from c where c.user_id = t.user_id and c.day = t.day and c.goal = 'typing' and not c.annulled)
    group by 1, 2
  ),
  done as (select d.user_id, d.day, 20::numeric as pts from public.completed_days d where d.user_id in (select user_id from m)),
  parts as (
    select * from study union all select * from reading union all select * from project
    union all select * from typing union all select * from done
  ),
  months as (select distinct to_char(day, 'YYYY-MM') as month from parts)
  select coalesce(jsonb_agg(jsonb_build_object('month', mo.month, 'user_id', m.user_id,
    'points', coalesce((select sum(p.pts) from parts p where p.user_id = m.user_id and to_char(p.day, 'YYYY-MM') = mo.month), 0))), '[]'::jsonb)
  from months mo cross join m
$$;

create function diff.probe(p_scenario int, p_label text) returns void language plpgsql as $$
declare
  v_group uuid := (select group_id from diff.scn where scenario = p_scenario);
  v_today date := public.sp_today();
  v_from date;
  v_members uuid[];
  v_m uuid;
  v_other uuid;
  v_day date;
  v_item text;
  v_goal text;
  v_test uuid;
  v_out text;
  v_path text;
  v_id uuid;
  v_pay jsonb := '[]';
  v_dispute jsonb := '[]';
  v_vote jsonb := '[]';
  v_chest jsonb := '[]';
  v_proof jsonb := '[]';
  v_data jsonb;
begin
  select array_agg(user_id order by user_id), min(joined_on) - 1 into v_members, v_from from public.members where group_id = v_group;
  if v_members is null then
    insert into diff.obs (scenario, label, data) values (p_scenario, p_label, jsonb_build_object('closed', true, 'now', pacto_clock.now()));
    return;
  end if;

  -- A photo for the proof probes (the check-in trigger wants it uploaded).
  insert into storage.objects (bucket_id, name)
  select 'media', v_group || '/' || u || '/probe.jpg' from unnest(v_members) u
  where not exists (select 1 from storage.objects o where o.bucket_id = 'media' and o.name = v_group || '/' || u || '/probe.jpg');

  foreach v_m in array v_members loop
    -- Payments: any other member may register one. Every day in range, every item of the catalog.
    v_other := (select u from unnest(v_members) u where u <> v_m limit 1);
    if v_other is not null then
      perform set_config('request.jwt.claim.sub', v_other::text, true);
      perform set_config('role', 'authenticated', true);
      for v_day in select generate_series(v_from, v_today + 1, interval '1 day')::date loop
        foreach v_item in array array['coke', 'snack', 'coffee', 'chocolate', 'acai', 'pizza', 'icecream', 'pix'] loop
          begin
            insert into public.payments (debtor_id, day, item) values (v_m, v_day, v_item);
            raise exception sqlstate 'DF000';
          exception
            when sqlstate 'DF000' then v_out := 'ok';
            when unique_violation then v_out := 'paid';
            when others then v_out := sqlerrm;
          end;
          if v_out not in ('day is not payable', 'day off', 'day was completed', 'item not owed that day') then
            v_pay := v_pay || jsonb_build_object('debtor', v_m, 'day', v_day, 'item', v_item, 'out', v_out);
          end if;
          -- A refusal about the day itself is the same for every item: the other seven tries would only cost time.
          exit when v_out in ('day is not payable', 'day off', 'day was completed');
        end loop;
      end loop;
      perform set_config('role', 'none', true);
    end if;

    perform set_config('request.jwt.claim.sub', v_m::text, true);
    perform set_config('role', 'authenticated', true);
    foreach v_item in array array['daily', 'weekly'] loop
      begin
        perform * from public.open_chest(v_item);
        raise exception sqlstate 'DF000';
      exception
        when sqlstate 'DF000' then v_out := 'ok';
        when others then v_out := sqlerrm;
      end;
      v_chest := v_chest || jsonb_build_object('user_id', v_m, 'kind', v_item, 'out', v_out);
    end loop;

    -- Tribunal: accuse each recent proof (the window is today and yesterday; one day more shows the edge), vote in each tribunal.
    for v_id in select id from public.checkins where group_id = v_group and day >= v_today - 2 order by created_at, id loop
      begin
        insert into public.disputes (checkin_id, reason) values (v_id, 'Motivo de teste');
        raise exception sqlstate 'DF000';
      exception
        when sqlstate 'DF000' then v_out := 'ok';
        when others then v_out := sqlerrm;
      end;
      v_dispute := v_dispute || jsonb_build_object('user_id', v_m, 'checkin_id', v_id, 'out', v_out);
    end loop;
    for v_id in select id from public.disputes where group_id = v_group order by created_at, id loop
      begin
        insert into public.dispute_votes (dispute_id, upheld, reason) values (v_id, true, 'Voto de teste');
        raise exception sqlstate 'DF000';
      exception
        when sqlstate 'DF000' then v_out := 'ok';
        when others then v_out := sqlerrm;
      end;
      v_vote := v_vote || jsonb_build_object('user_id', v_m, 'dispute_id', v_id, 'out', v_out);
    end loop;

    -- Would a new proof of each goal be accepted now? (first proof, retake, extra session, project)
    v_path := v_group || '/' || v_m || '/probe.jpg';
    foreach v_goal in array array['study', 'reading', 'project', 'extra'] loop
      begin
        if v_goal = 'study' then
          insert into public.checkins (goal, photo_path, summary, minutes) values ('study', v_path, 'Resposta de teste com mais de quarenta caracteres.', 60);
        elsif v_goal = 'reading' then
          insert into public.checkins (goal, photo_path, pages) values ('reading', v_path, 1);
        elsif v_goal = 'project' then
          insert into public.checkins (goal, photo_path, title, project_url) values ('project', v_path, 'Projeto', 'https://github.com/pacto/teste');
        else
          insert into public.checkins (goal, photo_path, minutes, extra) values ('study', v_path, 10, true);
        end if;
        raise exception sqlstate 'DF000';
      exception
        when sqlstate 'DF000' then v_out := 'ok';
        when others then v_out := sqlerrm;
      end;
      v_proof := v_proof || jsonb_build_object('user_id', v_m, 'goal', v_goal, 'out', v_out);
    end loop;
    -- Typing: one try per finished test of the scenario's last two days (yesterday's must be refused).
    perform set_config('role', 'none', true);
    for v_test in select id from public.typing_tests where user_id = v_m and finished_at is not null and day >= v_today - 1 order by started_at loop
      perform set_config('role', 'authenticated', true);
      begin
        insert into public.checkins (goal, photo_path, typing_test_id) values ('typing', v_path, v_test);
        raise exception sqlstate 'DF000';
      exception
        when sqlstate 'DF000' then v_out := 'ok';
        when others then v_out := sqlerrm;
      end;
      perform set_config('role', 'none', true);
      v_proof := v_proof || jsonb_build_object('user_id', v_m, 'goal', 'typing', 'test_id', v_test, 'out', v_out);
    end loop;
  end loop;
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claim.sub', '', true);

  select jsonb_build_object(
    'now', pacto_clock.now(),
    'today', v_today,
    'week', date_trunc('week', v_today)::date,
    'next_monday', public.next_monday(v_today),
    'group_id', v_group,
    'owner_id', (select owner_id from public.groups where id = v_group),
    'members', (select jsonb_agg(jsonb_build_object('user_id', user_id, 'joined_on', joined_on, 'created_at', created_at) order by user_id) from public.members where group_id = v_group),
    'day_off_changes', (select coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'weekday', weekday, 'effective_from', effective_from) order by id), '[]') from public.day_off_changes where user_id = any (v_members)),
    'debt_menus', (select coalesce(jsonb_agg(jsonb_build_object('effective_from', effective_from, 'items', items) order by effective_from), '[]') from public.debt_menus where group_id = v_group),
    'checkins', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'user_id', user_id, 'day', day, 'goal', goal, 'minutes', minutes, 'pages', pages,
        'extra', extra, 'retake_of', retake_of, 'created_at', created_at, 'typing_test_id', typing_test_id) order by created_at, id), '[]') from public.checkins where group_id = v_group),
    'results', (select coalesce(jsonb_agg(jsonb_build_object('checkin_id', checkin_id, 'status', status, 'yes', yes, 'no', no, 'eligible', eligible) order by checkin_id), '[]') from public.dispute_results where group_id = v_group),
    'payments', (select coalesce(jsonb_agg(jsonb_build_object('debtor_id', debtor_id, 'day', day, 'item', item, 'received_by', received_by, 'received_name', received_name, 'paid_at', paid_at) order by debtor_id, day, item), '[]') from public.payments where group_id = v_group),
    'typing', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'user_id', user_id, 'day', day, 'score', score, 'wpm', wpm, 'accuracy', accuracy, 'device', device, 'minutes', minutes,
        'finished_at', finished_at) order by started_at, id), '[]') from public.typing_tests where group_id = v_group),
    'chests', (select coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'kind', kind, 'period', period) order by user_id, kind, period), '[]') from public.chest_openings where group_id = v_group),
    'completed', (select coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'day', day) order by user_id, day), '[]') from public.completed_days where user_id = any (v_members)),
    'weekly', (select coalesce(jsonb_agg(jsonb_build_object('user_id', w.user_id, 'done_days', w.done_days) order by w.user_id), '[]') from public.weekly_progress(v_group, date_trunc('week', v_today)::date) w),
    'days', (select jsonb_agg(jsonb_build_object('day', d::date, 'dow', extract(dow from d)::int, 'items', public.debt_items_on(v_group, d::date)) order by d) from generate_series(v_from, v_today + 1, interval '1 day') d),
    'off', (select jsonb_agg(jsonb_build_object('user_id', u, 'day', d::date, 'weekday', public.day_off_for(u, d::date)) order by u, d)
            from unnest(v_members) u cross join generate_series(v_from, v_today + 1, interval '1 day') d),
    'disputes', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'checkin_id', checkin_id, 'created_at', created_at, 'by_ai', by_ai) order by created_at, id), '[]') from public.disputes where group_id = v_group),
    'votes', (select coalesce(jsonb_agg(jsonb_build_object('dispute_id', v.dispute_id, 'voter_id', v.voter_id)), '[]') from public.dispute_votes v join public.disputes d on d.id = v.dispute_id where d.group_id = v_group),
    'pay', v_pay,
    'dispute_try', v_dispute,
    'vote_try', v_vote,
    'chest_try', v_chest,
    'proof_try', v_proof,
    'ranking', diff.ranking(v_group)
  ) into v_data;
  insert into diff.obs (scenario, label, data) values (p_scenario, p_label, v_data);
end $$;
