-- Rules approved by the owner on 10/11/2026 (docs: CLAUDE.md, guide "refazer"):
--
-- 1. A typing proof sent after the tribunal annulled the previous one must use a test started (and therefore
--    finished) after the final verdict. Older tests of the day, even unused ones, no longer serve.
-- 2. With the 3 daily tests spent and the typing proof annulled, the server unlocks one "Nova tentativa": a 4th
--    test, outside the normal quota, once per person and day, only after the verdict and only if nothing was
--    attempted after it. If the tribunal annuls the proof sent with it too, the day owes 1 Coca more than the
--    normal debt (derived, like every debt: typing_penalties; paid through payments.penalty).
-- 3. The proof is frozen to the test chosen when it was sent (checkins.typing_test_id, already immutable): the
--    app shows and reviews that test, never "the best of the day" (app side only).
-- 4. Weekly chest: whoever leaves or is removed during the week stops blocking it, and whoever joins after
--    Monday plays the next week. weekly_progress (0006) already reads only the current members who joined on
--    or before Monday; nothing changes here, the differential test keeps it pinned.
--
-- Run BEFORE merging: the new app reads dispute_results.decided_at, typing_tests.special, payments.penalty and
-- my_typing_attempts(); the old app ignores them (a 4th test only starts through the new screen).
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'checkin_attachments' and column_name = 'expired_at') then
    raise exception 'Apply 0030_attachment_retention.sql first';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------
-- When a verdict became final. Same columns as 0002, plus decided_at at the end (a view may only grow there).
-- Upheld or rejected by majority: the vote that reached it (votes are refused once the tribunal is closed).
-- After 72 h: closes_at. Open: null.
-- ---------------------------------------------------------------------------------------------------------
create or replace view public.dispute_results
with (security_invoker = true)
as
select
  d.id as dispute_id,
  d.checkin_id,
  d.group_id,
  v.yes,
  v.no,
  d.eligible::bigint as eligible,
  (d.eligible / 2 + 1)::bigint as majority,
  d.created_at + interval '72 hours' as closes_at,
  case
    when v.yes >= d.eligible / 2 + 1 then 'upheld'
    when v.no > d.eligible - (d.eligible / 2 + 1) then 'rejected'
    when now() >= d.created_at + interval '72 hours' then
      case when v.yes > v.no then 'upheld' else 'rejected' end
    else 'open'
  end as status,
  case
    when v.yes >= d.eligible / 2 + 1 then
      (select dv.created_at from public.dispute_votes dv where dv.dispute_id = d.id and dv.upheld
       order by dv.created_at, dv.voter_id offset (d.eligible / 2) limit 1)
    -- With nobody eligible (a group of one, the AI accused) the tribunal is rejected the moment it opens.
    when v.no > d.eligible - (d.eligible / 2 + 1) then coalesce(
      (select dv.created_at from public.dispute_votes dv where dv.dispute_id = d.id and not dv.upheld
       order by dv.created_at, dv.voter_id offset greatest(0, d.eligible - (d.eligible / 2 + 1)) limit 1),
      d.created_at)
    when now() >= d.created_at + interval '72 hours' then d.created_at + interval '72 hours'
  end as decided_at
from public.disputes d
cross join lateral (
  select count(*) filter (where dv.upheld) as yes,
         count(*) filter (where not dv.upheld) as no
  from public.dispute_votes dv where dv.dispute_id = d.id
) v;

-- ---------------------------------------------------------------------------------------------------------
-- Rule 2: the special attempt. One per person and day (the unique index is the replay guard).
-- ---------------------------------------------------------------------------------------------------------
alter table public.typing_tests add column if not exists special boolean not null default false;
create unique index if not exists typing_tests_one_special_key on public.typing_tests (user_id, day) where special;

/**
 * Which test the person may start on that day: 'normal' (one of the 3), 'special' (the "Nova tentativa") or
 * null. Internal: start_typing_test and my_typing_attempts call it under the caller's id.
 */
create or replace function public._typing_attempt_kind(p_user uuid, p_day date)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_proof uuid;
  v_decided timestamptz;
begin
  if (select count(*) from public.typing_tests t where t.user_id = p_user and t.day = p_day and not t.special) < 3 then
    return 'normal';
  end if;
  if exists (select 1 from public.typing_tests t where t.user_id = p_user and t.day = p_day and t.special) then
    return null;
  end if;
  -- The latest typing proof of the day decides (a retake comes after the proof it retakes).
  select c.id into v_proof from public.checkins c
  where c.user_id = p_user and c.day = p_day and c.goal::text = 'typing' and not c.extra
  order by c.created_at desc, c.id desc limit 1;
  if v_proof is null then
    return null;
  end if;
  select r.decided_at into v_decided from public.dispute_results r where r.checkin_id = v_proof and r.status = 'upheld';
  if v_decided is null then
    return null;
  end if;
  -- Something already attempted after the verdict is the way to retake: no special one on top of it.
  if exists (select 1 from public.typing_tests t where t.user_id = p_user and t.day = p_day and t.started_at > v_decided) then
    return null;
  end if;
  return 'special';
end;
$$;
revoke all on function public._typing_attempt_kind(uuid, date) from public, anon, authenticated;

/** Today's attempts for the caller: normal tests used, and whether the "Nova tentativa" is open or was used. */
create or replace function public.my_typing_attempts()
returns table (used integer, special_available boolean, special_used boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::integer from public.typing_tests t where t.user_id = auth.uid() and t.day = public.sp_today() and not t.special),
    coalesce(public.my_group_id() is not null and public._typing_attempt_kind(auth.uid(), public.sp_today()) = 'special', false),
    exists (select 1 from public.typing_tests t where t.user_id = auth.uid() and t.day = public.sp_today() and t.special)
$$;
revoke all on function public.my_typing_attempts() from public, anon;
grant execute on function public.my_typing_attempts() to authenticated;

-- Same as 0022, except the quota check: the server picks a normal test or the special one, never the client.
create or replace function public.start_typing_test(p_device text, p_mode text default 'words', p_text text default null, p_lang text default 'pt', p_minutes integer default 1)
returns table (test_id uuid, seconds integer, start_word integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid := public.my_group_id();
  v_id uuid;
  v_seconds integer;
  v_start integer := 0;
  v_text_words integer;
  v_version bigint := 0;
  v_kind text;
begin
  -- Serialize each user's daily quota check and insertion, across different requests.
  perform pg_advisory_xact_lock(hashtext('typing-start:' || auth.uid()::text));
  if v_group is null then
    raise exception 'not a member';
  end if;
  if p_device not in ('pc', 'mobile') then
    raise exception 'invalid device';
  end if;
  if p_mode not in ('words', 'text') or (p_mode = 'text') <> (p_text is not null) or char_length(coalesce(p_text, '')) > 60 then
    raise exception 'invalid mode';
  end if;
  -- An English text is an 'en-' text, and only an English test types it.
  if p_lang not in ('pt', 'en') or (p_mode = 'text' and (p_text like 'en-%') <> (p_lang = 'en')) then
    raise exception 'invalid language';
  end if;
  if p_minutes is null or p_minutes not in (1, 5) then
    raise exception 'invalid length';
  end if;
  if p_mode = 'text' then
    select c.word_count into v_text_words from public.typing_text_catalog c where c.id = p_text and c.lang = p_lang;
    if not found then raise exception 'invalid text'; end if;
  end if;
  -- The checkins lock too: a proof (and its verdict lookup) cannot slip in between the check and the insert.
  perform pg_advisory_xact_lock(hashtext('checkin:' || auth.uid()::text));
  v_kind := public._typing_attempt_kind(auth.uid(), public.sp_today());
  if v_kind is null then
    raise exception 'no attempts left today';
  end if;
  if p_mode = 'text' then
    select p.words, p.version into v_start, v_version from public.typing_progress p where p.user_id = auth.uid() and p.text_id = p_text;
    v_start := coalesce(v_start, 0);
    v_version := coalesce(v_version, 0);
  end if;
  v_seconds := (select c.seconds from public.typing_config c) * p_minutes;
  insert into public.typing_tests (user_id, group_id, day, device, seconds, mode, text_id, start_word, lang, minutes, text_word_count, progress_version, special)
  values (auth.uid(), v_group, public.sp_today(), p_device, v_seconds, p_mode, case when p_mode = 'text' then p_text end, v_start, p_lang, p_minutes, v_text_words, v_version, v_kind = 'special')
  returning id into v_id;
  return query select v_id, v_seconds, v_start;
end;
$$;
revoke all on function public.start_typing_test(text, text, text, text, integer) from public, anon;
grant execute on function public.start_typing_test(text, text, text, text, integer) to authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- Rule 1: a retake needs a test started after the final verdict on the proof it retakes.
-- Runs after checkins_before_insert (alphabetical order), which sets user_id, day and retake_of.
-- ---------------------------------------------------------------------------------------------------------
create or replace function public.checkins_typing_test()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_decided timestamptz;
begin
  if new.goal::text <> 'typing' then
    new.typing_test_id := null;
    return new;
  end if;
  if new.typing_test_id is null or not exists (
    select 1 from public.typing_tests t
    where t.id = new.typing_test_id and t.user_id = new.user_id and t.day = new.day and t.finished_at is not null
  ) then
    raise exception 'typing needs a finished test from today';
  end if;
  if new.retake_of is not null then
    select r.decided_at into v_decided from public.dispute_results r where r.checkin_id = new.retake_of and r.status = 'upheld';
    if v_decided is null or not exists (
      select 1 from public.typing_tests t where t.id = new.typing_test_id and t.started_at > v_decided
    ) then
      raise exception 'retake needs a test started after the verdict';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------
-- Rule 2: the extra Coca. A proof sent with the special test and annulled by the tribunal owes it, once.
-- Derived, like the normal debt: it appears when the verdict is final and leaves with the person's proofs.
-- ---------------------------------------------------------------------------------------------------------
create or replace view public.typing_penalties
with (security_invoker = true)
as
select c.user_id, c.group_id, c.day, c.id as checkin_id, 'coke'::text as item, r.decided_at
from public.checkins c
join public.typing_tests t on t.id = c.typing_test_id and t.special
join public.dispute_results r on r.checkin_id = c.id and r.status = 'upheld';
revoke all on public.typing_penalties from anon, authenticated;
grant select on public.typing_penalties to authenticated, service_role;

alter table public.payments add column if not exists penalty boolean not null default false;
-- A penalty Coca is paid apart from the day's normal Coca.
alter table public.payments drop constraint if exists payments_debtor_id_day_item_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'payments_debtor_day_item_penalty_key') then
    alter table public.payments add constraint payments_debtor_day_item_penalty_key unique (debtor_id, day, item, penalty);
  end if;
end $$;
grant insert (penalty) on public.payments to authenticated;

-- Same as 0025, plus the penalty branch.
create or replace function public.payments_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_joined date;
begin
  new.received_by := auth.uid();
  new.group_id := public.my_group_id();
  new.paid_at := now();
  new.received_name := (select display_name from public.members where user_id = new.received_by);
  new.penalty := coalesce(new.penalty, false);

  if new.debtor_id = new.received_by then
    raise exception 'cannot mark your own debt as paid';
  end if;
  select joined_on into v_joined from public.members
  where user_id = new.debtor_id and group_id = new.group_id;
  if not found then
    raise exception 'debtor not in your group';
  end if;
  if new.penalty then
    -- Owed once the verdict is final, whatever the day's normal debt (day off and join day included).
    if not exists (select 1 from public.typing_penalties p where p.user_id = new.debtor_id and p.group_id = new.group_id and p.day = new.day and p.item = new.item) then
      raise exception 'penalty not owed';
    end if;
    return new;
  end if;
  if new.day >= public.sp_today() or new.day <= v_joined then
    raise exception 'day is not payable';
  end if;
  if extract(dow from new.day)::smallint = public.day_off_for(new.debtor_id, new.day) then
    raise exception 'day off';
  end if;
  if exists (select 1 from public.completed_days where user_id = new.debtor_id and day = new.day) then
    raise exception 'day was completed';
  end if;
  if not (new.item = any (public.debt_items_on(new.group_id, new.day))) then
    raise exception 'item not owed that day';
  end if;
  return new;
end;
$$;
