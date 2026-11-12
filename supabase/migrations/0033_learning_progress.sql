-- Aprender: study progress belongs to the account and follows it across devices. It never touches points, ranking,
-- debts or the group: it is only what each person finished in the lessons, challenges and video courses.
--
-- * learning_progress: lessons and challenges finished, with the best challenge score (0–5). Finishing again never
--   lowers a score; a voluntary redo keeps the record.
-- * learning_video_progress: per video course, the YouTube videos marked done (merged across devices, never lost to
--   a stale device) and the last position (last write wins: it is only where to resume).
-- Each person reads only their own rows; writes go only through the functions below, which check formats and caps.
-- The rows go with the account (auth.users cascade). Leaving the group does not erase them: they are not group data.
-- Run BEFORE merging: the new Aprender reads these tables; without them it says progress cannot be loaded.
do $$ begin
  if to_regprocedure('public.claim_feedback_send()') is null then
    raise exception 'Apply 0032_feedback_rate_limits.sql first';
  end if;
end $$;

create table if not exists public.learning_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('lesson', 'challenge')),
  item_id text not null check (item_id ~ '^[a-z0-9][a-z0-9:._-]{0,119}$'),
  best_score smallint check (best_score between 0 and 5),
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, item_id),
  constraint score_only_for_challenges check (kind = 'challenge' or best_score is null)
);

create table if not exists public.learning_video_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null check (course_id ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  completed_video_ids text[] not null default '{}' check (cardinality(completed_video_ids) <= 600),
  current_video_id text check (current_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  current_index integer not null default 0 check (current_index between 0 and 599),
  current_seconds integer not null default 0 check (current_seconds between 0 and 86400),
  video_count integer not null default 0 check (video_count between 0 and 600),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table public.learning_progress enable row level security;
alter table public.learning_video_progress enable row level security;
revoke all on public.learning_progress, public.learning_video_progress from anon, authenticated;
grant select on public.learning_progress, public.learning_video_progress to authenticated;
grant select, delete on public.learning_progress, public.learning_video_progress to service_role;
drop policy if exists "learning: read own" on public.learning_progress;
create policy "learning: read own" on public.learning_progress for select to authenticated using (user_id = auth.uid());
drop policy if exists "learning videos: read own" on public.learning_video_progress;
create policy "learning videos: read own" on public.learning_video_progress for select to authenticated using (user_id = auth.uid());

/**
 * Records a finished lesson or challenge for the caller. Idempotent: replaying it changes nothing but the best score,
 * which only goes up. At most 2000 items per account (the catalog has a few hundred).
 */
create or replace function public.learning_complete(p_kind text, p_item text, p_score integer default null)
returns table (kind text, item_id text, best_score smallint)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  if p_kind not in ('lesson', 'challenge') or p_item is null or p_item !~ '^[a-z0-9][a-z0-9:._-]{0,119}$' then
    raise exception 'invalid item';
  end if;
  if (p_kind = 'lesson' and p_score is not null) or (p_score is not null and (p_score < 0 or p_score > 5)) then
    raise exception 'invalid score';
  end if;
  perform pg_advisory_xact_lock(hashtext('learning:' || v_user::text));
  if not exists (select 1 from public.learning_progress l where l.user_id = v_user and l.kind = p_kind and l.item_id = p_item)
     and (select count(*) from public.learning_progress l where l.user_id = v_user) >= 2000 then
    raise exception 'too many items';
  end if;
  insert into public.learning_progress as l (user_id, kind, item_id, best_score)
  values (v_user, p_kind, p_item, p_score)
  on conflict on constraint learning_progress_pkey do update
    set best_score = case when excluded.best_score is null then l.best_score else greatest(coalesce(l.best_score, 0), excluded.best_score) end,
        updated_at = case when excluded.best_score > coalesce(l.best_score, -1) then now() else l.updated_at end;
  return query select l.kind, l.item_id, l.best_score from public.learning_progress l where l.user_id = v_user and l.kind = p_kind and l.item_id = p_item;
end;
$$;

/**
 * Saves a video course for the caller: videos marked done are added to what the server already has (two devices
 * never undo each other), the position and the playlist size replace the previous ones. At most 100 courses.
 * Returns the merged list, for the device to show what the other ones did.
 */
create or replace function public.learning_video_save(
  p_course text, p_completed text[], p_current text, p_index integer, p_seconds integer, p_count integer
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_merged text[];
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  if p_course is null or p_course !~ '^[a-z0-9][a-z0-9-]{0,59}$' then
    raise exception 'invalid course';
  end if;
  if p_completed is null or cardinality(p_completed) > 600
     or exists (select 1 from unnest(p_completed) v where v is null or v !~ '^[A-Za-z0-9_-]{11}$') then
    raise exception 'invalid videos';
  end if;
  if (p_current is not null and p_current !~ '^[A-Za-z0-9_-]{11}$')
     or p_index is null or p_index not between 0 and 599
     or p_seconds is null or p_seconds not between 0 and 86400
     or p_count is null or p_count not between 0 and 600 then
    raise exception 'invalid position';
  end if;
  perform pg_advisory_xact_lock(hashtext('learning:' || v_user::text));
  if not exists (select 1 from public.learning_video_progress v where v.user_id = v_user and v.course_id = p_course)
     and (select count(*) from public.learning_video_progress v where v.user_id = v_user) >= 100 then
    raise exception 'too many courses';
  end if;
  select array(
    select distinct x from unnest(coalesce((select v.completed_video_ids from public.learning_video_progress v
                                            where v.user_id = v_user and v.course_id = p_course), '{}') || p_completed) x
    order by x
  ) into v_merged;
  if cardinality(v_merged) > 600 then
    raise exception 'invalid videos';
  end if;
  insert into public.learning_video_progress as v (user_id, course_id, completed_video_ids, current_video_id, current_index, current_seconds, video_count, updated_at)
  values (v_user, p_course, v_merged, p_current, p_index, p_seconds, p_count, now())
  on conflict on constraint learning_video_progress_pkey do update
    set completed_video_ids = excluded.completed_video_ids,
        current_video_id = excluded.current_video_id,
        current_index = excluded.current_index,
        current_seconds = excluded.current_seconds,
        video_count = excluded.video_count,
        updated_at = now();
  return v_merged;
end;
$$;

revoke all on function public.learning_complete(text, text, integer), public.learning_video_save(text, text[], text, integer, integer, integer) from public, anon;
grant execute on function public.learning_complete(text, text, integer), public.learning_video_save(text, text[], text, integer, integer, integer) to authenticated;
