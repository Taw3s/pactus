-- Aprender progress (0033): own rows only, writes only through the functions, scores never go down, video courses
-- merge what each device marked done, formats and caps checked, and the rows go with the account.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('99000000-0000-0000-0000-000000000001', 'ap1@pacto.test'),
  ('99000000-0000-0000-0000-000000000002', 'ap2@pacto.test');

select set_config('request.jwt.claim.sub', '99000000-0000-0000-0000-000000000001', false);
set role authenticated;
select * from public.learning_complete('lesson', 'aula-sql-professor');
select * from public.learning_complete('lesson', 'aula-sql-professor'); -- replay: nothing changes
select * from public.learning_complete('challenge', 'python:medium:pt', 3);
select * from public.learning_complete('challenge', 'python:medium:pt', 1); -- a worse redo keeps the record
do $$ begin
  assert (select count(*) from public.learning_progress) = 2, 'two items';
  assert (select best_score from public.learning_progress where item_id = 'python:medium:pt') = 3, 'best score kept';
  perform public.learning_complete('challenge', 'python:medium:pt', 5);
  assert (select best_score from public.learning_progress where item_id = 'python:medium:pt') = 5, 'best score raised';
  -- Formats and limits.
  begin perform public.learning_complete('lesson', 'Aula Com Espaço'); raise exception 'FAIL: bad id'; exception when raise_exception then if sqlerrm <> 'invalid item' then raise; end if; end;
  begin perform public.learning_complete('badge', 'x'); raise exception 'FAIL: bad kind'; exception when raise_exception then if sqlerrm <> 'invalid item' then raise; end if; end;
  begin perform public.learning_complete('challenge', 'sql:hard:en', 6); raise exception 'FAIL: score 6'; exception when raise_exception then if sqlerrm <> 'invalid score' then raise; end if; end;
  begin perform public.learning_complete('lesson', 'aula-x', 2); raise exception 'FAIL: lesson score'; exception when raise_exception then if sqlerrm <> 'invalid score' then raise; end if; end;
  -- No direct writes, not even to one's own rows.
  begin insert into public.learning_progress (user_id, kind, item_id) values (auth.uid(), 'lesson', 'x'); raise exception 'FAIL: direct insert'; exception when insufficient_privilege then null; end;
  begin update public.learning_progress set best_score = 5; raise exception 'FAIL: direct update'; exception when insufficient_privilege then null; end;
  begin delete from public.learning_progress; raise exception 'FAIL: direct delete'; exception when insufficient_privilege then null; end;
end $$;

-- Video courses: two devices merge the videos marked done; the position is the last one saved.
select public.learning_video_save('python-basics', array['aaaaaaaaaa1', 'aaaaaaaaaa2'], 'aaaaaaaaaa2', 1, 120, 30);
select public.learning_video_save('python-basics', array['aaaaaaaaaa3'], 'aaaaaaaaaa3', 2, 15, 30); -- another device, stale list
do $$ begin
  assert (select completed_video_ids from public.learning_video_progress where course_id = 'python-basics') = array['aaaaaaaaaa1', 'aaaaaaaaaa2', 'aaaaaaaaaa3'], 'merged, nothing lost';
  assert (select current_seconds from public.learning_video_progress where course_id = 'python-basics') = 15, 'last position wins';
  begin perform public.learning_video_save('python-basics', array['bad video!!'], null, 0, 0, 0); raise exception 'FAIL: bad video'; exception when raise_exception then if sqlerrm <> 'invalid videos' then raise; end if; end;
  begin perform public.learning_video_save('../etc', array[]::text[], null, 0, 0, 0); raise exception 'FAIL: bad course'; exception when raise_exception then if sqlerrm <> 'invalid course' then raise; end if; end;
  begin perform public.learning_video_save('python-basics', array[]::text[], null, 0, 90000, 0); raise exception 'FAIL: bad seconds'; exception when raise_exception then if sqlerrm <> 'invalid position' then raise; end if; end;
  begin perform public.learning_video_save('python-basics', array_fill('aaaaaaaaaa1'::text, array[601]), null, 0, 0, 0); raise exception 'FAIL: 601 videos'; exception when raise_exception then if sqlerrm <> 'invalid videos' then raise; end if; end;
end $$;
reset role;

-- Isolation: person 2 sees nothing of person 1 and writes only their own rows.
select set_config('request.jwt.claim.sub', '99000000-0000-0000-0000-000000000002', false);
set role authenticated;
do $$ begin
  assert not exists (select 1 from public.learning_progress), 'no rows of others';
  assert not exists (select 1 from public.learning_video_progress), 'no video rows of others';
  perform public.learning_complete('lesson', 'aula-sql-professor');
  assert (select count(*) from public.learning_progress) = 1, 'only own';
end $$;
reset role;
set role anon;
do $$ begin
  begin perform 1 from public.learning_progress; raise exception 'FAIL: anon read'; exception when insufficient_privilege then null; end;
  begin perform public.learning_complete('lesson', 'aula-x'); raise exception 'FAIL: anon wrote'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Caps: 2000 items and 100 courses per account.
insert into public.learning_progress (user_id, kind, item_id)
select '99000000-0000-0000-0000-000000000002', 'lesson', 'cap-' || g from generate_series(1, 1999) g;
insert into public.learning_video_progress (user_id, course_id)
select '99000000-0000-0000-0000-000000000002', 'curso-' || g from generate_series(1, 100) g;
select set_config('request.jwt.claim.sub', '99000000-0000-0000-0000-000000000002', false);
set role authenticated;
do $$ begin
  begin perform public.learning_complete('lesson', 'one-more'); raise exception 'FAIL: over the cap'; exception when raise_exception then if sqlerrm <> 'too many items' then raise; end if; end;
  perform public.learning_complete('lesson', 'aula-sql-professor'); -- an existing item still replays
  begin perform public.learning_video_save('curso-novo', array[]::text[], null, 0, 0, 0); raise exception 'FAIL: 101 courses'; exception when raise_exception then if sqlerrm <> 'too many courses' then raise; end if; end;
end $$;
reset role;

-- The rows go with the account.
delete from auth.users where id = '99000000-0000-0000-0000-000000000002';
do $$ begin
  assert not exists (select 1 from public.learning_progress where user_id = '99000000-0000-0000-0000-000000000002'), 'gone with the account';
  assert not exists (select 1 from public.learning_video_progress where user_id = '99000000-0000-0000-0000-000000000002'), 'videos gone with the account';
end $$;

-- Person 3 is left clean for the race (learning_race.sh).
insert into auth.users (id, email) values ('99000000-0000-0000-0000-000000000003', 'ap3@pacto.test');
select 'LEARNING PROGRESS TESTS PASSED';
