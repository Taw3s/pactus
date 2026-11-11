-- Approved typing rules (0031): retake only with a test started after the verdict, the single "Nova tentativa"
-- after the 3 tests, the extra Coca when the tribunal annuls that proof too. Runs right after the migration.
-- Leaves group 97…a1 in place: run.sh races start_typing_test against it (typing_retake_race.sh) afterwards.
\set ON_ERROR_STOP on

insert into public.groups (id, name, invite_code) values
  ('97000000-0000-0000-0000-0000000000a1', 'Regras 0031', 'REGRA031'),
  ('97000000-0000-0000-0000-0000000000b1', 'Outro grupo', 'OUTRO031');
insert into auth.users (id, email, raw_user_meta_data) values
  ('97000000-0000-0000-0000-000000000001', 'r1@pacto.test', '{"invite_code":"REGRA031"}'),
  ('97000000-0000-0000-0000-000000000002', 'r2@pacto.test', '{"invite_code":"REGRA031"}'),
  ('97000000-0000-0000-0000-000000000003', 'r3@pacto.test', '{"invite_code":"REGRA031"}'),
  ('97000000-0000-0000-0000-000000000004', 'r4@pacto.test', '{"invite_code":"REGRA031"}'),
  ('97000000-0000-0000-0000-000000000005', 'r5@pacto.test', '{"invite_code":"REGRA031"}'),
  ('97000000-0000-0000-0000-000000000006', 'r6@pacto.test', '{"invite_code":"REGRA031"}'),
  ('97000000-0000-0000-0000-000000000009', 'r9@pacto.test', '{"invite_code":"OUTRO031"}');
insert into storage.objects (bucket_id, name)
select 'media', '97000000-0000-0000-0000-0000000000a1/97000000-0000-0000-0000-00000000000' || u || '/' || n || '.jpg'
from unnest(array['1', '4', '5', '6']) u, unnest(array['p1', 'p2', 'p3']) n;

-- A finished test with a chosen start (fixture: the measuring is tested elsewhere).
create or replace function pg_temp.test(p_user text, p_ago interval, p_score numeric, p_special boolean default false) returns uuid language sql as $$
  insert into public.typing_tests (user_id, group_id, day, device, seconds, started_at, finished_at, correct_chars, typed_chars, wpm, accuracy, score, special)
  values (('97000000-0000-0000-0000-00000000000' || p_user)::uuid, '97000000-0000-0000-0000-0000000000a1', public.sp_today(), 'pc', 60,
          now() - p_ago, now() - p_ago + interval '60 seconds', 300, 300, p_score, 1, p_score, p_special)
  returning id
$$;
-- Sends a typing proof as its owner.
create or replace function pg_temp.proof(p_user text, p_test uuid, p_photo text) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  perform set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-00000000000' || p_user, true);
  execute 'set local role authenticated';
  insert into public.checkins (goal, photo_path, typing_test_id)
  values ('typing', '97000000-0000-0000-0000-0000000000a1/97000000-0000-0000-0000-00000000000' || p_user || '/' || p_photo || '.jpg', p_test)
  returning id into v_id;
  execute 'reset role';
  return v_id;
end $$;
-- The tribunal decides with votes cast at a chosen time (fixture: the vote rules are tested elsewhere).
create or replace function pg_temp.verdict(p_checkin uuid, p_upheld boolean, p_ago interval) returns void language plpgsql as $$
declare v_dispute uuid;
begin
  insert into public.disputes (checkin_id, reason, by_ai) values (p_checkin, 'Juiz IA: teste', true) returning id into v_dispute;
  alter table public.dispute_votes disable trigger dispute_votes_before_insert;
  insert into public.dispute_votes (dispute_id, voter_id, upheld, reason, created_at)
  select v_dispute, m.user_id, p_upheld, 'Voto de teste', now() - p_ago + (row_number() over (order by m.user_id)) * interval '1 second'
  from public.members m join public.checkins c on c.id = p_checkin
  where m.group_id = c.group_id and m.user_id <> c.user_id;
  alter table public.dispute_votes enable trigger dispute_votes_before_insert;
end $$;
create temp table ids (k text primary key, id uuid);
grant select on ids to authenticated;

-- Person 1: 3 tests, a proof, annulled two hours ago --------------------------------------------------------
insert into ids select 't1a', pg_temp.test('1', interval '3 hours', 50);
insert into ids select 't1b', pg_temp.test('1', interval '170 minutes', 80);
insert into ids select 't1c', pg_temp.test('1', interval '160 minutes', 60);
insert into ids select 'c1', pg_temp.proof('1', (select id from ids where k = 't1a'), 'p1');

select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  assert (select used from public.my_typing_attempts()) = 3, 'three normal tests used';
  assert not (select special_available from public.my_typing_attempts()), 'no special attempt while the proof stands';
  begin
    perform public.start_typing_test('pc');
    raise exception 'FAIL: 4th test with the proof standing';
  exception when raise_exception then
    if sqlerrm not like '%no attempts left%' then raise; end if;
  end;
end $$;
reset role;

select pg_temp.verdict((select id from ids where k = 'c1'), true, interval '2 hours');
do $$
declare r record;
begin
  select * into r from public.dispute_results where checkin_id = (select id from ids where k = 'c1');
  assert r.status = 'upheld', 'annulled';
  -- The vote that reached the majority, not the last one cast.
  assert r.decided_at = (select dv.created_at from public.dispute_votes dv where dv.dispute_id = r.dispute_id
                         order by dv.created_at offset (r.majority - 1) limit 1), 'decided_at is the majority vote';
  assert r.decided_at < now() - interval '110 minutes', 'decided two hours ago';
end $$;

select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  -- Rule 1: the unused tests of the day are older than the verdict and no longer serve.
  begin
    insert into public.checkins (goal, photo_path, typing_test_id)
    values ('typing', '97000000-0000-0000-0000-0000000000a1/97000000-0000-0000-0000-000000000001/p2.jpg', (select id from ids where k = 't1b'));
    raise exception 'FAIL: retake with a test from before the verdict';
  exception when raise_exception then
    if sqlerrm not like '%after the verdict%' then raise; end if;
  end;
  -- Rule 2: the special attempt is open, and only the server picks it.
  assert (select special_available from public.my_typing_attempts()), 'special attempt open after the verdict';
  assert not (select special_used from public.my_typing_attempts()), 'not used yet';
  begin
    perform public._typing_attempt_kind(auth.uid(), public.sp_today());
    raise exception 'FAIL: members call the internal rule';
  exception when insufficient_privilege then null; end;
end $$;
select test_id is not null as started from public.start_typing_test('pc');
do $$ begin
  assert (select count(*) from public.typing_tests where user_id = auth.uid() and day = public.sp_today() and special) = 1, 'one special test';
  assert (select used from public.my_typing_attempts()) = 3, 'the special one is outside the quota';
  assert (select special_used from public.my_typing_attempts()) and not (select special_available from public.my_typing_attempts()), 'used up';
  -- Replay: a second start is refused.
  begin
    perform public.start_typing_test('pc');
    raise exception 'FAIL: second special attempt';
  exception when raise_exception then
    if sqlerrm not like '%no attempts left%' then raise; end if;
  end;
  -- Members cannot mark a test special themselves.
  begin
    update public.typing_tests set special = true where user_id = auth.uid();
    raise exception 'FAIL: member updated a test';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  -- The unique index is the last guard against a second special test.
  begin
    perform pg_temp.test('1', interval '1 minute', 10, true);
    raise exception 'FAIL: two special tests in a day';
  exception when unique_violation then null; end;
end $$;
-- The special test is measured as usual; finish it here (the timing rule is tested elsewhere).
update public.typing_tests set finished_at = now(), correct_chars = 200, typed_chars = 200, wpm = 40, accuracy = 1, score = 40
where user_id = '97000000-0000-0000-0000-000000000001' and special;
insert into ids select 'c1r', pg_temp.proof('1', (select id from public.typing_tests where user_id = '97000000-0000-0000-0000-000000000001' and special), 'p2');
do $$ begin
  assert (select retake_of from public.checkins where id = (select id from ids where k = 'c1r')) = (select id from ids where k = 'c1'), 'it is the retake';
  assert not exists (select 1 from public.typing_penalties), 'no penalty before a verdict';
end $$;

-- The tribunal annuls the special proof too: one extra Coca, owed once.
select pg_temp.verdict((select id from ids where k = 'c1r'), true, interval '0 seconds');
do $$ begin
  assert (select count(*) from public.typing_penalties where user_id = '97000000-0000-0000-0000-000000000001') = 1, 'one penalty';
  assert (select item::text from public.typing_penalties) = 'coke', 'a Coca';
end $$;
select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000002', false);
set role authenticated;
do $$ begin
  assert (select count(*) from public.typing_penalties) = 1, 'the group sees the penalty';
  begin
    insert into public.payments (debtor_id, day, item, penalty) values ('97000000-0000-0000-0000-000000000001', public.sp_today(), 'snack', true);
    raise exception 'FAIL: penalty paid with another item';
  exception when raise_exception then
    if sqlerrm not like '%penalty not owed%' then raise; end if;
  end;
  begin
    insert into public.payments (debtor_id, day, item, penalty) values ('97000000-0000-0000-0000-000000000003', public.sp_today(), 'coke', true);
    raise exception 'FAIL: penalty of someone who has none';
  exception when raise_exception then
    if sqlerrm not like '%penalty not owed%' then raise; end if;
  end;
  -- The normal debt of today is not payable yet; the penalty is, as soon as the verdict is final.
  begin
    insert into public.payments (debtor_id, day, item) values ('97000000-0000-0000-0000-000000000001', public.sp_today(), 'coke');
    raise exception 'FAIL: today paid as a normal debt';
  exception when raise_exception then
    if sqlerrm not like '%not payable%' then raise; end if;
  end;
  insert into public.payments (debtor_id, day, item, penalty) values ('97000000-0000-0000-0000-000000000001', public.sp_today(), 'coke', true);
  begin
    insert into public.payments (debtor_id, day, item, penalty) values ('97000000-0000-0000-0000-000000000001', public.sp_today(), 'coke', true);
    raise exception 'FAIL: penalty paid twice';
  exception when unique_violation then null; end;
end $$;
reset role;
do $$ begin
  -- Nobody gets a third way in after the special proof was annulled.
  assert public._typing_attempt_kind('97000000-0000-0000-0000-000000000001', public.sp_today()) is null, 'no attempt after the special one';
end $$;

-- Person 4: the special proof is contested and kept: no penalty ---------------------------------------------
insert into ids select 't4a', pg_temp.test('4', interval '3 hours', 50);
select pg_temp.test('4', interval '170 minutes', 50);
select pg_temp.test('4', interval '160 minutes', 50);
insert into ids select 'c4', pg_temp.proof('4', (select id from ids where k = 't4a'), 'p1');
select pg_temp.verdict((select id from ids where k = 'c4'), true, interval '2 hours');
do $$ begin
  assert public._typing_attempt_kind('97000000-0000-0000-0000-000000000004', public.sp_today()) = 'special', 'special for person 4';
end $$;
insert into ids select 't4s', pg_temp.test('4', interval '10 minutes', 45, true);
insert into ids select 'c4r', pg_temp.proof('4', (select id from ids where k = 't4s'), 'p2');
select pg_temp.verdict((select id from ids where k = 'c4r'), false, interval '0 seconds');
do $$ begin
  assert (select status from public.dispute_results where checkin_id = (select id from ids where k = 'c4r')) = 'rejected', 'kept';
  assert not exists (select 1 from public.typing_penalties where user_id = '97000000-0000-0000-0000-000000000004'), 'a rejected accusation costs nothing';
end $$;

-- Person 5: two tests, annulled, then a third test after the verdict: that is the way back, no special one ---
insert into ids select 't5a', pg_temp.test('5', interval '3 hours', 50);
select pg_temp.test('5', interval '170 minutes', 70);
insert into ids select 'c5', pg_temp.proof('5', (select id from ids where k = 't5a'), 'p1');
select pg_temp.verdict((select id from ids where k = 'c5'), true, interval '2 hours');
do $$ begin
  assert public._typing_attempt_kind('97000000-0000-0000-0000-000000000005', public.sp_today()) = 'normal', 'the third normal test is left';
end $$;
insert into ids select 't5c', pg_temp.test('5', interval '30 minutes', 30);
do $$ begin
  assert public._typing_attempt_kind('97000000-0000-0000-0000-000000000005', public.sp_today()) is null, 'attempted after the verdict: no special';
end $$;
select pg_temp.proof('5', (select id from ids where k = 't5c'), 'p2');

-- A group of one: the AI accuses, nobody can vote, the tribunal is rejected at once (decided_at = opening).
do $$
declare v_c uuid; v_d uuid;
begin
  alter table public.checkins disable trigger user;
  insert into public.checkins (user_id, group_id, day, goal, photo_path, summary, minutes)
  values ('97000000-0000-0000-0000-000000000009', '97000000-0000-0000-0000-0000000000b1', public.sp_today(), 'study', 'x/y.jpg', repeat('a', 40), 60)
  returning id into v_c;
  alter table public.checkins enable trigger user;
  insert into public.disputes (checkin_id, reason, by_ai) values (v_c, 'Juiz IA: teste', true) returning id into v_d;
  assert (select status from public.dispute_results where dispute_id = v_d) = 'rejected', 'nobody to vote: rejected';
  assert (select decided_at from public.dispute_results where dispute_id = v_d) = (select created_at from public.disputes where id = v_d), 'decided when opened';
end $$;

-- Isolation: another group sees no penalty; anonymous sees nothing at all -----------------------------------
select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000009', false);
set role authenticated;
do $$ begin
  assert not exists (select 1 from public.typing_penalties), 'other groups do not see penalties';
  assert not exists (select 1 from public.typing_tests where special), 'nor special tests';
  begin
    insert into public.payments (debtor_id, day, item, penalty) values ('97000000-0000-0000-0000-000000000001', public.sp_today(), 'coke', true);
    raise exception 'FAIL: outsider paid a penalty';
  exception when raise_exception then
    if sqlerrm not like '%not in your group%' then raise; end if;
  end;
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform 1 from public.typing_penalties;
    raise exception 'FAIL: anon read penalties';
  exception when insufficient_privilege then null; end;
  begin
    perform public.my_typing_attempts();
    raise exception 'FAIL: anon called my_typing_attempts';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Person 6 is left ready for the race: 3 tests and an annulled proof (typing_retake_race.sh).
insert into ids select 't6a', pg_temp.test('6', interval '3 hours', 50);
select pg_temp.test('6', interval '170 minutes', 50);
select pg_temp.test('6', interval '160 minutes', 50);
insert into ids select 'c6', pg_temp.proof('6', (select id from ids where k = 't6a'), 'p1');
select pg_temp.verdict((select id from ids where k = 'c6'), true, interval '2 hours');

select 'TYPING RETAKE RULES TESTS PASSED';
