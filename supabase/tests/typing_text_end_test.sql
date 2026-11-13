-- 0034: a text session ends at the end of the text. Early finish only at the exact end (and not too fast), the place
-- stays at the end, the text cannot start again until "Recomeçar", timed tests keep the old window.
\set ON_ERROR_STOP on
insert into groups(id,name,invite_code) values ('93400000-0000-0000-0000-0000000000a1','Text end','TEND0001');
insert into auth.users(id,email,raw_user_meta_data) values
  ('93400000-0000-0000-0000-000000000001','text-end@pacto.test','{"invite_code":"TEND0001"}'),
  ('93400000-0000-0000-0000-000000000002','text-end2@pacto.test','{"invite_code":"TEND0001"}');
select set_config('request.jwt.claim.sub','93400000-0000-0000-0000-000000000001',false);
set role authenticated;
-- code-bash-printf has 5 words in the catalog.
create temp table run_a as select * from public.start_typing_test('pc','text','code-bash-printf');
reset role;
update typing_tests set started_at = now() - interval '1 second' where id = (select test_id from run_a);
set role authenticated;
do $$ declare a uuid := (select test_id from run_a); begin
  -- Too fast, even at the end.
  begin perform public.finish_typing_test(a, 40, 40, 5); raise exception 'FAIL: 1 s finish accepted';
  exception when raise_exception then if sqlerrm not like '%timing out of range%' then raise; end if; end;
end $$;
reset role;
update typing_tests set started_at = now() - interval '10 seconds' where id = (select test_id from run_a);
set role authenticated;
do $$ declare a uuid := (select test_id from run_a); begin
  -- Early, but short of the end: still a timed test.
  begin perform public.finish_typing_test(a, 30, 30, 4); raise exception 'FAIL: early finish before the end accepted';
  exception when raise_exception then if sqlerrm not like '%timing out of range%' then raise; end if; end;
  -- Past the end of the text.
  begin perform public.finish_typing_test(a, 60, 60, 6); raise exception 'FAIL: words past the end accepted';
  exception when raise_exception then if sqlerrm not like '%invalid result%' then raise; end if; end;
  -- More than 25 characters per second of real time.
  begin perform public.finish_typing_test(a, 260, 260, 5); raise exception 'FAIL: 26 cps accepted';
  exception when raise_exception then if sqlerrm not like '%timing out of range%' then raise; end if; end;
  perform public.finish_typing_test(a, 40, 40, 5);
  -- 40 correct characters in ~10 s = ~48 wpm (not 8 wpm over the full minute).
  assert (select wpm from public.typing_tests where id = a) between 40 and 50, 'speed over the real time';
  assert (select words from public.typing_progress where user_id = auth.uid() and text_id = 'code-bash-printf') = 5, 'place kept at the end';
  begin perform public.start_typing_test('pc','text','code-bash-printf'); raise exception 'FAIL: finished text started again';
  exception when raise_exception then if sqlerrm not like '%text finished%' then raise; end if; end;
  perform public.restart_typing_text('code-bash-printf');
  assert (select words from public.typing_progress where user_id = auth.uid() and text_id = 'code-bash-printf') = 0, 'restart goes back to 0';
  begin perform public.restart_typing_text('invented'); raise exception 'FAIL: unknown text restarted';
  exception when raise_exception then if sqlerrm not like '%invalid text%' then raise; end if; end;
end $$;
-- After the restart the text starts from 0 again; a timed text test keeps the full minute and does not wrap.
create temp table run_b as select * from public.start_typing_test('pc','text','bash-basico');
do $$ begin assert (select start_word from run_b) = 0, 'new text from 0'; end $$;
reset role;
update typing_tests set started_at = now() - interval '61 seconds' where id = (select test_id from run_b);
-- Another person's restart touches only their own place.
select set_config('request.jwt.claim.sub','93400000-0000-0000-0000-000000000002',false);
set role authenticated;
select public.restart_typing_text('bash-basico');
select set_config('request.jwt.claim.sub','93400000-0000-0000-0000-000000000001',false);
do $$ declare b uuid := (select test_id from run_b); begin
  perform public.finish_typing_test(b, 300, 300, 50);
  assert (select words from public.typing_progress where user_id = auth.uid() and text_id = 'bash-basico') = 50, 'timed text keeps its place';
  assert (select wpm from public.typing_tests where id = b) = 60, 'timed speed over the full minute';
end $$;
reset role;
-- The new texts are in the catalog with the app's lengths (checked word by word in typing-catalog.test.ts).
do $$ begin
  assert (select count(*) from public.typing_text_catalog where id like '%bash%') = 26, 'bash catalog rows';
end $$;
