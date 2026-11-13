-- Beta feedback sending limits (0032): one every 30 s, 3 in 24 h, per account; slots given back only by their owner
-- and only shortly after; the cron forgets accounts quiet for 30 days. No message is ever stored.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('98000000-0000-0000-0000-000000000001', 'fb1@pacto.test'),
  ('98000000-0000-0000-0000-000000000002', 'fb2@pacto.test');

do $$ begin
  -- The table has no column for the text, the e-mail or the profile.
  assert (select array_agg(column_name::text order by column_name) from information_schema.columns
          where table_schema = 'public' and table_name = 'feedback_sends') = array['created_at', 'id', 'user_id'], 'only who and when';
end $$;

select set_config('request.jwt.claim.sub', '98000000-0000-0000-0000-000000000001', false);
set role authenticated;
create temp table slot as select public.claim_feedback_send() as id;
reset role;
grant select on slot to authenticated;
set role authenticated;
do $$ begin
  begin
    perform public.claim_feedback_send();
    raise exception 'FAIL: second send inside 30 s';
  exception when raise_exception then
    if sqlerrm <> 'cooldown' then raise; end if;
  end;
  begin
    perform 1 from public.feedback_sends;
    raise exception 'FAIL: member read the table';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.feedback_sends (user_id) values (auth.uid());
    raise exception 'FAIL: member wrote the table';
  exception when insufficient_privilege then null; end;
  begin
    perform public.prune_feedback_sends();
    raise exception 'FAIL: member pruned';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Another account cannot give back person 1's slot; person 1 can, once.
select set_config('request.jwt.claim.sub', '98000000-0000-0000-0000-000000000002', false);
set role authenticated;
do $$ begin
  assert not public.release_feedback_send((select id from slot)), 'not your slot';
end $$;
reset role;
select set_config('request.jwt.claim.sub', '98000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  assert public.release_feedback_send((select id from slot)), 'own slot given back';
  assert not public.release_feedback_send((select id from slot)), 'only once';
end $$;
reset role;

-- Three sends spread over the day pass; the fourth within 24 h does not.
insert into public.feedback_sends (user_id, created_at) values
  ('98000000-0000-0000-0000-000000000001', now() - interval '20 hours'),
  ('98000000-0000-0000-0000-000000000001', now() - interval '10 hours');
select set_config('request.jwt.claim.sub', '98000000-0000-0000-0000-000000000001', false);
set role authenticated;
select public.claim_feedback_send() is not null as third;
reset role;
update public.feedback_sends set created_at = created_at - interval '1 minute' where user_id = '98000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub', '98000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  begin
    perform public.claim_feedback_send();
    raise exception 'FAIL: fourth send in 24 h';
  exception when raise_exception then
    if sqlerrm <> 'daily limit' then raise; end if;
  end;
end $$;
reset role;
-- A slot older than 10 minutes cannot be given back (no replay to reopen the quota).
create temp table old_slot as select id from public.feedback_sends where user_id = '98000000-0000-0000-0000-000000000001' order by created_at desc limit 1;
grant select on old_slot to authenticated;
update public.feedback_sends set created_at = now() - interval '11 minutes' where id = (select id from old_slot);
select set_config('request.jwt.claim.sub', '98000000-0000-0000-0000-000000000001', false);
set role authenticated;
do $$ begin
  assert not public.release_feedback_send((select id from old_slot)), 'too late to give back';
end $$;
reset role;

-- Anonymous callers get nothing.
set role anon;
do $$ begin
  begin
    perform public.claim_feedback_send();
    raise exception 'FAIL: anon claimed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Cron: person 2 quiet for 31 days is forgotten; person 1 (recent) keeps every row.
insert into public.feedback_sends (user_id, created_at) values ('98000000-0000-0000-0000-000000000002', now() - interval '31 days');
set role service_role;
do $$
declare n integer := public.prune_feedback_sends();
begin
  assert n = 1, 'one quiet row forgotten: ' || n;
  assert not exists (select 1 from public.feedback_sends where user_id = '98000000-0000-0000-0000-000000000002'), 'quiet account gone';
  assert (select count(*) from public.feedback_sends where user_id = '98000000-0000-0000-0000-000000000001') = 3, 'active account kept';
end $$;
reset role;

-- Deleting the account deletes its rows.
delete from auth.users where id = '98000000-0000-0000-0000-000000000001';
do $$ begin
  assert not exists (select 1 from public.feedback_sends where user_id = '98000000-0000-0000-0000-000000000001'), 'gone with the account';
end $$;

-- Person 3 is left with no sends, for the race (feedback_race.sh).
insert into auth.users (id, email) values ('98000000-0000-0000-0000-000000000003', 'fb3@pacto.test');
select 'FEEDBACK RATE LIMIT TESTS PASSED';
