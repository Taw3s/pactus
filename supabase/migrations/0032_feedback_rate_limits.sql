-- Beta feedback (POST /api/feedback): the message goes by e-mail from the server (Resend) and is never stored here.
-- The database only keeps when each account sent something, to limit sending: one every 30 seconds and at most 3 in
-- 24 hours. The daily cron (/api/cron/remind) forgets an account's rows once it has been quiet for 30 days.
-- Run BEFORE merging: the new route calls claim_feedback_send(); without it the form answers "indisponível".
do $$ begin
  if to_regclass('public.typing_penalties') is null then
    raise exception 'Apply 0031_typing_retake_rules.sql first';
  end if;
end $$;

create table if not exists public.feedback_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists feedback_sends_user_idx on public.feedback_sends (user_id, created_at desc);

-- Nobody reads or writes the rows directly: only the functions below (and the service role, for the cron).
alter table public.feedback_sends enable row level security;
revoke all on public.feedback_sends from anon, authenticated;
grant select, delete on public.feedback_sends to service_role;

/**
 * Takes one sending slot for the caller, or refuses: 'cooldown' (30 s since the last one) or 'daily limit' (3 in
 * 24 h). Serialized per account, so parallel requests cannot both pass the check. Returns the slot id, which
 * release_feedback_send gives back when the e-mail could not be delivered.
 */
create or replace function public.claim_feedback_send()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_last timestamptz;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  perform pg_advisory_xact_lock(hashtext('feedback:' || v_user::text));
  select max(created_at) into v_last from public.feedback_sends where user_id = v_user;
  if v_last is not null and v_last > now() - interval '30 seconds' then
    raise exception 'cooldown';
  end if;
  if (select count(*) from public.feedback_sends where user_id = v_user and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'daily limit';
  end if;
  insert into public.feedback_sends (user_id) values (v_user) returning id into v_id;
  return v_id;
end;
$$;

/**
 * Gives a slot back when delivery failed, so a provider outage does not spend the day's sends. Only the caller's
 * own slot, and only for 10 minutes (a replay later cannot reopen the quota).
 */
create or replace function public.release_feedback_send(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  delete from public.feedback_sends where id = p_id and user_id = auth.uid() and created_at > now() - interval '10 minutes';
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

/** Daily cron: forgets accounts with no send in 30 days. Returns how many rows went. */
create or replace function public.prune_feedback_sends()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  delete from public.feedback_sends f
  where not exists (select 1 from public.feedback_sends r where r.user_id = f.user_id and r.created_at > now() - interval '30 days');
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.claim_feedback_send(), public.release_feedback_send(uuid), public.prune_feedback_sends() from public, anon, authenticated;
grant execute on function public.claim_feedback_send(), public.release_feedback_send(uuid) to authenticated;
grant execute on function public.prune_feedback_sends() to service_role;
