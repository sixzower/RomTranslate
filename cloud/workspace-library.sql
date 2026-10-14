-- Add private work files to the existing Supabase connection.
-- Reuses existing font-vault codes; does NOT create another code or upload ROMs.
begin;
create sequence if not exists public.romtranslate_work_revision_seq as bigint;
revoke all on sequence public.romtranslate_work_revision_seq from public,anon,authenticated;
create table if not exists public.romtranslate_font_vaults (
  code_hash text primary key, created_at timestamptz not null default now()
);
alter table public.romtranslate_font_vaults enable row level security;
revoke all on public.romtranslate_font_vaults from anon, authenticated;
create table if not exists public.romtranslate_workspaces (
  owner_key text not null,
  workspace_id uuid not null,
  name text not null check (length(name) between 1 and 100),
  rom_sha256 text not null check (rom_sha256 ~ '^[a-f0-9]{64}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 16777216),
  revision bigint not null default nextval('public.romtranslate_work_revision_seq') check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (owner_key, workspace_id)
);
-- Keep revisions increasing even after deleting/recreating a file (no stale-write ABA).
lock table public.romtranslate_workspaces in access exclusive mode;
select setval('public.romtranslate_work_revision_seq',case when not (select is_called from public.romtranslate_work_revision_seq) and not exists(select 1 from public.romtranslate_workspaces) then (select last_value from public.romtranslate_work_revision_seq) else greatest(coalesce((select max(revision) from public.romtranslate_workspaces),0),(select last_value from public.romtranslate_work_revision_seq))+1 end,false);
alter table public.romtranslate_workspaces alter column revision set default nextval('public.romtranslate_work_revision_seq');
alter table public.romtranslate_workspaces enable row level security;
revoke all on public.romtranslate_workspaces from anon, authenticated;

create or replace function public.romtranslate_work_owner(p_code text)
returns text language plpgsql security definer set search_path = pg_catalog as $$
declare h text; u uuid;
begin
  if p_code is null then
    u := auth.uid();
    if u is null then raise exception 'Sign in or connect a private library code'; end if;
    return 'user:' || u::text;
  end if;
  if p_code !~ '^[a-f0-9]{64}$' then raise exception 'Invalid library code'; end if;
  h := encode(sha256(convert_to(p_code,'UTF8')),'hex');
  if not exists(select 1 from public.romtranslate_font_vaults v where v.code_hash=h) then raise exception 'Invalid library code'; end if;
  return 'code:' || h;
end;
$$;
create or replace function public.romtranslate_work_list(p_owner text)
returns table(workspace_id uuid, name text, rom_sha256 text, revision bigint, updated_at timestamptz, pending_tasks bigint)
language sql security definer set search_path = pg_catalog as $$
  select w.workspace_id,w.name,w.rom_sha256,w.revision,w.updated_at,
    (select count(*) from jsonb_array_elements(coalesce(w.payload->'workTasks','[]'::jsonb)) t where t->>'status' in ('active','paused'))
  from public.romtranslate_workspaces w where w.owner_key=p_owner order by w.updated_at desc limit 100;
$$;
create or replace function public.romtranslate_work_get(p_owner text,p_id uuid)
returns table(payload jsonb, revision bigint)
language sql security definer set search_path = pg_catalog as $$
  select w.payload,w.revision from public.romtranslate_workspaces w where w.owner_key=p_owner and w.workspace_id=p_id;
$$;
create or replace function public.romtranslate_work_put(p_owner text,p_id uuid,p_expected bigint,p_payload jsonb)
returns bigint language plpgsql security definer set search_path = pg_catalog as $$
declare old_revision bigint; next_revision bigint;
begin
  if p_id is null or p_expected is null or p_expected < 0 or jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload->>'workspaceId' is distinct from p_id::text or p_payload->>'workspaceFormat' is distinct from 'RomTranslate workspace v1'
    or p_payload->>'version' is distinct from '2' or coalesce(length(p_payload->>'workspaceName'),0) not between 1 and 100
    or p_payload->>'romHash' is null or p_payload->>'romHash' !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_payload->'entries') is distinct from 'array' or jsonb_typeof(p_payload->'workTasks') is distinct from 'array'
    or octet_length(p_payload::text) > 16777216 then raise exception 'Invalid work file (maximum 16 MB)'; end if;
  if jsonb_array_length(p_payload->'entries') not between 1 and 100000 or jsonb_array_length(p_payload->'workTasks')>100 then raise exception 'Invalid work file row count'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner,0));
  select w.revision into old_revision from public.romtranslate_workspaces w where w.owner_key=p_owner and w.workspace_id=p_id for update;
  if found then
    if old_revision<>p_expected then raise exception 'Workspace version conflict: reload the cloud copy before saving'; end if;
    next_revision := nextval('public.romtranslate_work_revision_seq');
    update public.romtranslate_workspaces w set payload=p_payload,name=p_payload->>'workspaceName',rom_sha256=p_payload->>'romHash',revision=next_revision,updated_at=now() where w.owner_key=p_owner and w.workspace_id=p_id;
  else
    if p_expected<>0 then raise exception 'Workspace version conflict: cloud file was removed'; end if;
    if (select count(*) from public.romtranslate_workspaces w where w.owner_key=p_owner)>=100 then raise exception 'Maximum 100 work files per library'; end if;
    next_revision := nextval('public.romtranslate_work_revision_seq');
    insert into public.romtranslate_workspaces(owner_key,workspace_id,name,rom_sha256,payload,revision) values(p_owner,p_id,p_payload->>'workspaceName',p_payload->>'romHash',p_payload,next_revision);
  end if;
  return next_revision;
end;
$$;
create or replace function public.romtranslate_work_delete(p_owner text,p_id uuid,p_expected bigint)
returns void language plpgsql security definer set search_path = pg_catalog as $$
declare old_revision bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner,0));
  select w.revision into old_revision from public.romtranslate_workspaces w where w.owner_key=p_owner and w.workspace_id=p_id for update;
  if not found then return; end if;
  if p_expected is null or p_expected<>old_revision then raise exception 'Workspace version conflict: refresh the list before deleting'; end if;
  delete from public.romtranslate_workspaces w where w.owner_key=p_owner and w.workspace_id=p_id;
end;
$$;

create or replace function public.romtranslate_work_code_list(p_code text)
returns table(workspace_id uuid,name text,rom_sha256 text,revision bigint,updated_at timestamptz,pending_tasks bigint)
language sql security definer set search_path = pg_catalog as $$ select * from public.romtranslate_work_list(public.romtranslate_work_owner(p_code)); $$;
create or replace function public.romtranslate_work_code_get(p_code text,p_id uuid)
returns table(payload jsonb,revision bigint)
language sql security definer set search_path = pg_catalog as $$ select * from public.romtranslate_work_get(public.romtranslate_work_owner(p_code),p_id); $$;
create or replace function public.romtranslate_work_code_put(p_code text,p_id uuid,p_expected bigint,p_payload jsonb)
returns bigint language sql security definer set search_path = pg_catalog as $$ select public.romtranslate_work_put(public.romtranslate_work_owner(p_code),p_id,p_expected,p_payload); $$;
create or replace function public.romtranslate_work_code_delete(p_code text,p_id uuid,p_expected bigint)
returns void language sql security definer set search_path = pg_catalog as $$ select public.romtranslate_work_delete(public.romtranslate_work_owner(p_code),p_id,p_expected); $$;
create or replace function public.romtranslate_work_user_list()
returns table(workspace_id uuid,name text,rom_sha256 text,revision bigint,updated_at timestamptz,pending_tasks bigint)
language sql security definer set search_path = pg_catalog as $$ select * from public.romtranslate_work_list(public.romtranslate_work_owner(null)); $$;
create or replace function public.romtranslate_work_user_get(p_id uuid)
returns table(payload jsonb,revision bigint)
language sql security definer set search_path = pg_catalog as $$ select * from public.romtranslate_work_get(public.romtranslate_work_owner(null),p_id); $$;
create or replace function public.romtranslate_work_user_put(p_id uuid,p_expected bigint,p_payload jsonb)
returns bigint language sql security definer set search_path = pg_catalog as $$ select public.romtranslate_work_put(public.romtranslate_work_owner(null),p_id,p_expected,p_payload); $$;
create or replace function public.romtranslate_work_user_delete(p_id uuid,p_expected bigint)
returns void language sql security definer set search_path = pg_catalog as $$ select public.romtranslate_work_delete(public.romtranslate_work_owner(null),p_id,p_expected); $$;

revoke all on function public.romtranslate_work_owner(text),public.romtranslate_work_list(text),public.romtranslate_work_get(text,uuid),public.romtranslate_work_put(text,uuid,bigint,jsonb),public.romtranslate_work_delete(text,uuid,bigint) from public,anon,authenticated;
revoke all on function public.romtranslate_work_code_list(text),public.romtranslate_work_code_get(text,uuid),public.romtranslate_work_code_put(text,uuid,bigint,jsonb),public.romtranslate_work_code_delete(text,uuid,bigint),public.romtranslate_work_user_list(),public.romtranslate_work_user_get(uuid),public.romtranslate_work_user_put(uuid,bigint,jsonb),public.romtranslate_work_user_delete(uuid,bigint) from public,anon,authenticated;
grant execute on function public.romtranslate_work_code_list(text),public.romtranslate_work_code_get(text,uuid),public.romtranslate_work_code_put(text,uuid,bigint,jsonb),public.romtranslate_work_code_delete(text,uuid,bigint) to anon,authenticated;
grant execute on function public.romtranslate_work_user_list(),public.romtranslate_work_user_get(uuid),public.romtranslate_work_user_put(uuid,bigint,jsonb),public.romtranslate_work_user_delete(uuid,bigint) to authenticated;
commit;
