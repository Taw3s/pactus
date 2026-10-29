-- Private supporting files for study proofs and optional GitHub projects.
-- Uploads are written by the authenticated server route after signature and size validation.
do $$ begin
  if to_regclass('public.checkins') is null or to_regclass('storage.objects') is null then
    raise exception 'Apply the existing Pacto and Supabase migrations first';
  end if;
end $$;

-- Some production databases already have this optional field from an earlier manual setup.
-- Reuse it when present; reject unexpected types instead of silently accepting a bad schema.
do $$
declare
  v_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into v_type
  from pg_attribute a
  where a.attrelid = 'public.checkins'::regclass and a.attname = 'project_url' and not a.attisdropped;
  if v_type is null then
    alter table public.checkins add column project_url text;
  elsif v_type <> 'text' then
    raise exception 'public.checkins.project_url must be text, found %', v_type;
  end if;
end $$;
alter table public.checkins
  add constraint project_url_format check (
    project_url is null or (
      project_url ~ '^https://github\.com/[A-Za-z0-9][A-Za-z0-9-]{0,38}/[A-Za-z0-9_.-]{1,100}$'
      and split_part(project_url, '/', 5) not in ('.', '..')
    )
  ) not valid,
  add constraint project_url_only_for_projects check (goal::text = 'project' or project_url is null) not valid,
  add constraint project_requires_github_url check (goal::text <> 'project' or project_url is not null) not valid;
grant insert (project_url) on public.checkins to authenticated;

create table public.checkin_attachments (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  group_id uuid not null,
  user_id uuid not null,
  kind text not null check (kind in ('study_pdf', 'project_zip')),
  storage_path text not null unique check (char_length(storage_path) <= 240),
  display_name text not null check (char_length(display_name) between 1 and 120),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now(),
  unique (checkin_id, kind)
);

alter table public.checkin_attachments enable row level security;
revoke all on public.checkin_attachments from public, anon, authenticated;
grant select on public.checkin_attachments to authenticated;
grant select, insert, delete on public.checkin_attachments to service_role;
create policy "checkin attachments: read same group" on public.checkin_attachments
  for select to authenticated using (group_id = public.my_group_id());

create function public.checkin_attachments_before_insert()
returns trigger language plpgsql security definer set search_path = public, storage as $$
declare
  v_owner uuid;
  v_group uuid;
  v_goal text;
begin
  select c.user_id, c.group_id, c.goal::text into v_owner, v_group, v_goal
  from public.checkins c where c.id = new.checkin_id;
  if not found or v_owner is distinct from new.user_id or v_group is distinct from new.group_id then
    raise exception 'invalid checkin attachment owner';
  end if;
  if (new.kind = 'study_pdf' and v_goal <> 'study') or (new.kind = 'project_zip' and v_goal <> 'project') then
    raise exception 'invalid attachment kind';
  end if;
  if new.storage_path not like new.group_id::text || '/' || new.user_id::text || '/' || new.checkin_id::text || '/%' then
    raise exception 'invalid attachment path';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'attachments' and o.name = new.storage_path) then
    raise exception 'attachment not uploaded';
  end if;
  return new;
end;
$$;
revoke all on function public.checkin_attachments_before_insert() from public, anon, authenticated;
create trigger checkin_attachments_before_insert
before insert on public.checkin_attachments
for each row execute function public.checkin_attachments_before_insert();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 10485760, array['application/pdf', 'application/zip']);

create policy "attachments: read same group" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = public.my_group_id()::text);
-- No authenticated insert/update/delete policies: the server validates files and owns mutations.
