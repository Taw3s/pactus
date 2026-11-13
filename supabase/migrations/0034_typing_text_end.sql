-- Typing "Texto" and "Código" modes end at the end of the text (request of 13/11/2026): the session no longer wraps
-- around to the start. What changes on the server, so the browser cannot get around the current checks:
-- * finish_typing_test: a text test may end before its time only when the person typed exactly to the end of the
--   text (start_word + words = text length) and at least 3 s went by. Speed counts the time actually spent (never
--   more than the test's length); the 25 characters per second and 250 wpm limits still apply. The place stays at
--   the end (no modulo). Timed tests ("Palavras", or a text not finished) keep the old timing window.
-- * A text already at its end cannot start again until restart_typing_text (the "Recomeçar" button), which puts the
--   caller's own place back to 0 and bumps the version (an open test of that text becomes stale).
-- * Catalog rows for the Bash theory texts (Texto) and the Bash code examples (Código), same lengths as the app.
-- Run BEFORE merging: the new app sends early finishes and the new ids; without this the server answers
-- "test timing out of range" / "invalid text". The old app keeps working (its tests are timed, it never sends the
-- new ids; a text it finishes now stays at the end instead of wrapping, and it shows the server error to restart).
do $$ begin
  if to_regclass('public.learning_progress') is null then
    raise exception 'Apply 0033_learning_progress.sql first';
  end if;
end $$;

insert into public.typing_text_catalog (id, lang, word_count) values
  ('bash-basico', 'pt', 144),
  ('bash-facil', 'pt', 148),
  ('bash-medio', 'pt', 142),
  ('bash-dificil', 'pt', 145),
  ('bash-expert', 'pt', 137),
  ('en-bash-basic', 'en', 152),
  ('en-bash-easy', 'en', 155),
  ('en-bash-medium', 'en', 138),
  ('en-bash-hard', 'en', 151),
  ('en-bash-expert', 'en', 142),
  ('code-bash-printf', 'pt', 5),
  ('code-bash-read-input', 'pt', 13),
  ('code-bash-directory-check', 'pt', 20),
  ('code-bash-array', 'pt', 13),
  ('code-bash-function', 'pt', 11),
  ('code-bash-glob', 'pt', 18),
  ('code-bash-case', 'pt', 20),
  ('code-bash-pipeline', 'pt', 18),
  ('en-code-bash-printf', 'en', 5),
  ('en-code-bash-read-input', 'en', 13),
  ('en-code-bash-directory-check', 'en', 20),
  ('en-code-bash-array', 'en', 13),
  ('en-code-bash-function', 'en', 11),
  ('en-code-bash-glob', 'en', 18),
  ('en-code-bash-case', 'en', 20),
  ('en-code-bash-pipeline', 'en', 18)
on conflict (id) do update set lang = excluded.lang, word_count = excluded.word_count;

create or replace function public.finish_typing_test(p_test uuid, p_correct integer, p_typed integer, p_words integer default 0, p_restart boolean default false, p_text_words integer default null)
returns table (wpm numeric, accuracy numeric, score numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.typing_tests;
  v_elapsed numeric;
  v_spent numeric;
  v_wpm numeric;
  v_acc numeric;
  v_place integer;
  v_total integer;
  v_version bigint;
  v_end boolean := false;
begin
  perform pg_advisory_xact_lock(hashtext('typing-start:' || auth.uid()::text));
  select * into t from public.typing_tests where id = p_test and user_id = auth.uid() for update;
  if not found then
    raise exception 'test not found';
  end if;
  if t.finished_at is not null then
    raise exception 'test already finished';
  end if;
  v_elapsed := extract(epoch from now() - t.started_at);
  if p_typed is null or p_correct is null or p_typed < 0 or p_correct < 0 or p_correct > p_typed or p_typed > t.seconds * 25 then
    raise exception 'invalid result';
  end if;
  if p_words is null or p_words < 0 or p_words > p_typed / 2 or (p_text_words is not null and p_text_words < 1) then
    raise exception 'invalid result';
  end if;
  if t.mode = 'text' then
    select coalesce(t.text_word_count, c.word_count) into v_total from public.typing_text_catalog c where c.id = t.text_id and c.lang = t.lang;
    if not found then raise exception 'invalid text'; end if;
    if p_text_words is not null and p_text_words <> v_total then raise exception 'invalid text length'; end if;
    select p.version into v_version from public.typing_progress p where p.user_id = auth.uid() and p.text_id = t.text_id;
    if coalesce(v_version, 0) <> t.progress_version then raise exception 'stale typing test'; end if;
    if t.start_word + p_words > v_total then raise exception 'invalid result'; end if;
    v_end := t.start_word + p_words = v_total;
  end if;
  -- Ended neither early (a faked clock) nor long after (left open and finished later). Reaching the end of the text
  -- is the only early end, and it still needs a few seconds and at most 25 characters per second of real time.
  if v_end and v_elapsed < t.seconds - 2 then
    if v_elapsed < 3 or p_typed > v_elapsed * 25 then
      raise exception 'test timing out of range';
    end if;
  elsif v_elapsed < t.seconds - 2 or v_elapsed > t.seconds * 2 + 30 then
    raise exception 'test timing out of range';
  end if;
  v_spent := case when v_end then least(greatest(v_elapsed, 3), t.seconds) else t.seconds end;
  v_wpm := round((p_correct / 5.0) * 60 / v_spent, 1);
  if v_wpm > 250 then
    raise exception 'implausible result';
  end if;
  v_acc := case when p_typed = 0 then 0 else round(p_correct::numeric / p_typed, 3) end;
  update public.typing_tests
  set finished_at = now(), correct_chars = p_correct, typed_chars = p_typed, words_typed = p_words,
      wpm = v_wpm, accuracy = v_acc, score = round(v_wpm * v_acc, 1)
  where id = p_test;
  if t.mode = 'text' then
    v_place := least(t.start_word + p_words, v_total);
    insert into public.typing_progress (user_id, text_id, words, updated_at, version)
    values (auth.uid(), t.text_id, v_place, now(), 1)
    on conflict (user_id, text_id) do update set words = excluded.words, updated_at = now(), version = typing_progress.version + 1;
  end if;
  return query select v_wpm, v_acc, round(v_wpm * v_acc, 1);
end;
$$;

-- start_typing_test (0031) stays as it is; this check runs on its insert, inside its locks.
create or replace function public.typing_tests_text_not_finished()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.mode = 'text' and new.text_word_count is not null and new.start_word >= new.text_word_count then
    raise exception 'text finished';
  end if;
  return new;
end;
$$;
drop trigger if exists typing_tests_text_not_finished on public.typing_tests;
create trigger typing_tests_text_not_finished before insert on public.typing_tests
  for each row execute function public.typing_tests_text_not_finished();

/** "Recomeçar": the caller's place in one text goes back to the start. Bumps the version (stales an open test). */
create or replace function public.restart_typing_text(p_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if not exists (select 1 from public.typing_text_catalog c where c.id = p_text) then
    raise exception 'invalid text';
  end if;
  perform pg_advisory_xact_lock(hashtext('typing-start:' || auth.uid()::text));
  update public.typing_progress set words = 0, updated_at = now(), version = version + 1
  where user_id = auth.uid() and text_id = p_text;
end;
$$;
revoke all on function public.restart_typing_text(text) from public, anon;
grant execute on function public.restart_typing_text(text) to authenticated;
