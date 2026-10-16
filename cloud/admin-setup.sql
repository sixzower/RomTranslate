-- One-time shared admin setup. Preserves existing vaults, fonts and workspaces.
-- Optional no-email library. Run in Supabase SQL Editor, then KEEP the
-- private_library_code returned by the final query. Re-running adds a NEW
-- independent vault; it does not erase previous vaults or email libraries.
create table if not exists public.romtranslate_font_vaults (
  code_hash text primary key,
  created_at timestamptz not null default now()
);
create table if not exists public.romtranslate_font_vault_entries (
  code_hash text not null references public.romtranslate_font_vaults(code_hash) on delete cascade,
  font_id text not null check (font_id ~ '^font-[a-f0-9]{24}$'),
  font jsonb not null check (jsonb_typeof(font) = 'object' and octet_length(font::text) <= 1048576),
  primary key(code_hash, font_id)
);
alter table public.romtranslate_font_vaults enable row level security;
alter table public.romtranslate_font_vault_entries enable row level security;
revoke all on public.romtranslate_font_vaults, public.romtranslate_font_vault_entries from anon, authenticated;

create or replace function public.romtranslate_font_code_list(p_code text, p_offset integer default 0)
returns table(font_id text, font jsonb)
language plpgsql security definer set search_path = pg_catalog as $$
declare h text;
begin
  if p_code is null or p_code !~ '^[a-f0-9]{64}$' or p_offset < 0 or p_offset is null then raise exception 'Invalid library code'; end if;
  h := encode(sha256(convert_to(p_code, 'UTF8')), 'hex');
  if not exists(select 1 from public.romtranslate_font_vaults v where v.code_hash=h) then raise exception 'Invalid library code'; end if;
  return query select e.font_id,e.font from public.romtranslate_font_vault_entries e where e.code_hash=h order by e.font_id limit 200 offset p_offset;
end;
$$;
create or replace function public.romtranslate_font_code_put(p_code text, p_fonts jsonb)
returns void language plpgsql security definer set search_path = pg_catalog as $$
declare h text; r jsonb;
begin
  if p_code is null or p_code !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_fonts) is distinct from 'array' then raise exception 'Invalid request'; end if;
  if jsonb_array_length(p_fonts)>25 then raise exception 'Maximum 25 fonts per request'; end if;
  h := encode(sha256(convert_to(p_code,'UTF8')), 'hex');
  perform 1 from public.romtranslate_font_vaults v where v.code_hash=h for update;
  if not found then raise exception 'Invalid library code'; end if;
  for r in select value from jsonb_array_elements(p_fonts) loop
    if not exists(select 1 from public.romtranslate_font_vault_entries e where e.code_hash=h and e.font_id=r->>'font_id') then
      if (select count(*) from public.romtranslate_font_vault_entries e where e.code_hash=h)>=1000 then raise exception 'Library limit: 1000 fonts'; end if;
      insert into public.romtranslate_font_vault_entries(code_hash,font_id,font) values(h,r->>'font_id',r->'font');
    end if;
  end loop;
end;
$$;
revoke all on function public.romtranslate_font_code_list(text,integer), public.romtranslate_font_code_put(text,jsonb) from public;
grant execute on function public.romtranslate_font_code_list(text,integer), public.romtranslate_font_code_put(text,jsonb) to anon, authenticated;


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
declare old_revision bigint; next_revision bigint; primary_id uuid;
begin
  if p_id is null or p_expected is null or p_expected < 0 or jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload->>'workspaceId' is distinct from p_id::text or p_payload->>'workspaceFormat' is distinct from 'RomTranslate workspace v1'
    or p_payload->>'version' is distinct from '2' or coalesce(length(p_payload->>'workspaceName'),0) not between 1 and 100
    or p_payload->>'romHash' is null or p_payload->>'romHash' !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_payload->'entries') is distinct from 'array' or jsonb_typeof(p_payload->'workTasks') is distinct from 'array'
    or octet_length(p_payload::text) > 16777216 then raise exception 'Invalid work file (maximum 16 MB)'; end if;
  if jsonb_array_length(p_payload->'entries') not between 1 and 100000 or jsonb_array_length(p_payload->'workTasks')>100 then raise exception 'Invalid work file row count'; end if;
  if not pg_try_advisory_xact_lock(hashtextextended(p_owner,0)) then
    raise exception using errcode='55P03', message='Workspace is busy: another backup is running; try again shortly';
  end if;
  select w.workspace_id into primary_id from public.romtranslate_workspaces w
    where w.owner_key=p_owner order by w.updated_at desc,w.revision desc limit 1;
  if primary_id is not null and primary_id<>p_id then
    raise exception 'Workspace version conflict: use the primary cloud workspace';
  end if;
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
  if not pg_try_advisory_xact_lock(hashtextextended(p_owner,0)) then
    raise exception using errcode='55P03', message='Workspace is busy: another backup is running; try again shortly';
  end if;
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

-- PostgREST applies per-RPC statement_timeout before executing the request.
-- Keep row-lock waits short; do not change the timeout for other applications.
alter function public.romtranslate_work_code_put(text,uuid,bigint,jsonb) set statement_timeout = '30s';
alter function public.romtranslate_work_code_put(text,uuid,bigint,jsonb) set lock_timeout = '2s';
alter function public.romtranslate_work_user_put(uuid,bigint,jsonb) set statement_timeout = '30s';
alter function public.romtranslate_work_user_put(uuid,bigint,jsonb) set lock_timeout = '2s';

revoke all on function public.romtranslate_work_owner(text),public.romtranslate_work_list(text),public.romtranslate_work_get(text,uuid),public.romtranslate_work_put(text,uuid,bigint,jsonb),public.romtranslate_work_delete(text,uuid,bigint) from public,anon,authenticated;
revoke all on function public.romtranslate_work_code_list(text),public.romtranslate_work_code_get(text,uuid),public.romtranslate_work_code_put(text,uuid,bigint,jsonb),public.romtranslate_work_code_delete(text,uuid,bigint),public.romtranslate_work_user_list(),public.romtranslate_work_user_get(uuid),public.romtranslate_work_user_put(uuid,bigint,jsonb),public.romtranslate_work_user_delete(uuid,bigint) from public,anon,authenticated;
grant execute on function public.romtranslate_work_code_list(text),public.romtranslate_work_code_get(text,uuid),public.romtranslate_work_code_put(text,uuid,bigint,jsonb),public.romtranslate_work_code_delete(text,uuid,bigint) to anon,authenticated;
grant execute on function public.romtranslate_work_user_list(),public.romtranslate_work_user_get(uuid),public.romtranslate_work_user_put(uuid,bigint,jsonb),public.romtranslate_work_user_delete(uuid,bigint) to authenticated;
notify pgrst, 'reload schema';
commit;

-- Run once in Supabase SQL Editor after the existing font-code/workspace SQL.
-- The preconfigured admin password is stored as a bcrypt hash, never in the web app.
-- First login on the original device links its existing private vault; no data is erased.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.romtranslate_admin_library (
 id boolean primary key default true check(id),
 password_hash text not null,
 library_code text check(library_code ~ '^[a-f0-9]{64}$')
);
alter table public.romtranslate_admin_library enable row level security;
revoke all on public.romtranslate_admin_library from public,anon,authenticated;
insert into public.romtranslate_admin_library(id,password_hash) values(true,'$2a$12$MHqxhFwA96p/Nbzlr40QbePBHe0JKx9.Mg4A0S.VzqAfrLpasLpmS') on conflict(id) do nothing;
create table if not exists public.romtranslate_admin_attempts(
 client text primary key, window_start timestamptz not null, failures integer not null default 0
);
alter table public.romtranslate_admin_attempts enable row level security;
revoke all on public.romtranslate_admin_attempts from public,anon,authenticated;
-- Respect projects that installed pgcrypto in public instead of extensions.
create or replace function public.romtranslate_admin_password_matches(p_password text,p_hash text)
returns boolean language plpgsql set search_path=pg_catalog as $$
declare crypto_schema text; matches boolean;
begin
 select n.nspname into crypto_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto';
 execute format('select %I.crypt($1,$2)=$2',crypto_schema) into matches using p_password,p_hash;
 return coalesce(matches,false);
end;
$$;
revoke all on function public.romtranslate_admin_password_matches(text,text) from public,anon,authenticated;
create or replace function public.romtranslate_admin_login(p_password text,p_existing_code text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare settings public.romtranslate_admin_library%rowtype; a public.romtranslate_admin_attempts%rowtype; client_key text; headers jsonb; next_code text; source_hash text; vault_count integer; choices jsonb;
begin
 headers:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
 client_key:=encode(sha256(convert_to(coalesce(headers->>'cf-connecting-ip',headers->>'x-real-ip',split_part(headers->>'x-forwarded-for',',',1),'unknown'),'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('romtranslate-admin:'||client_key,0));
 delete from public.romtranslate_admin_attempts where window_start < now()-interval '1 day';
 select * into a from public.romtranslate_admin_attempts where client=client_key;
 if a.window_start>now()-interval '5 minutes' and a.failures>=6 then
   return jsonb_build_object('error','too_many_attempts','message','ลองผิดหลายครั้ง กรุณารอ 5 นาที');
 end if;
 select * into settings from public.romtranslate_admin_library where id=true for update;
 if p_password is null or length(p_password)>200 or not public.romtranslate_admin_password_matches(p_password,settings.password_hash) then
   insert into public.romtranslate_admin_attempts(client,window_start,failures) values(client_key,now(),1)
   on conflict(client) do update set failures=case when romtranslate_admin_attempts.window_start>now()-interval '5 minutes' then romtranslate_admin_attempts.failures+1 else 1 end,window_start=case when romtranslate_admin_attempts.window_start>now()-interval '5 minutes' then romtranslate_admin_attempts.window_start else now() end;
   return jsonb_build_object('error','invalid_password','message','รหัสแอดมินไม่ถูกต้อง');
 end if;
 delete from public.romtranslate_admin_attempts where client=client_key;
 next_code:=settings.library_code;
 if next_code is null then
   if p_existing_code ~ '^[a-f0-9]{64}$' and exists(select 1 from public.romtranslate_font_vaults where code_hash=encode(sha256(convert_to(p_existing_code,'UTF8')),'hex')) then next_code:=p_existing_code;
   elsif auth.uid() is not null or not exists(select 1 from public.romtranslate_font_vaults) then
     next_code:=encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex');
     insert into public.romtranslate_font_vaults(code_hash) values(encode(sha256(convert_to(next_code,'UTF8')),'hex'));
   else
     -- A valid admin can adopt an old code vault without needing its original browser.
     -- Copy into a new shared vault; keep the original code and all rows working.
     select count(*) into vault_count from public.romtranslate_font_vaults;
     if p_existing_code ~ '^vault:[a-f0-9]{64}$' then
       source_hash:=substring(p_existing_code from 7);
       if not exists(select 1 from public.romtranslate_font_vaults where code_hash=source_hash) then
         return jsonb_build_object('error','invalid_library','message','ไม่พบคลังที่เลือก กรุณาเข้าใช้อีกครั้ง');
       end if;
     elsif vault_count=1 then
       select code_hash into source_hash from public.romtranslate_font_vaults;
     else
       select jsonb_agg(jsonb_build_object('id',v.code_hash,'fonts',(select count(*) from public.romtranslate_font_vault_entries f where f.code_hash=v.code_hash),'workspaces',(select count(*) from public.romtranslate_workspaces w where w.owner_key='code:'||v.code_hash),'created_at',v.created_at) order by v.created_at) into choices from public.romtranslate_font_vaults v;
       return jsonb_build_object('error','choose_library','message','พบคลังเดิมหลายคลัง เลือกคลังที่จะใช้ครั้งเดียว ข้อมูลคลังอื่นยังอยู่','libraries',choices);
     end if;
     next_code:=encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex');
     insert into public.romtranslate_font_vaults(code_hash) values(encode(sha256(convert_to(next_code,'UTF8')),'hex'));
     insert into public.romtranslate_font_vault_entries(code_hash,font_id,font)
       select encode(sha256(convert_to(next_code,'UTF8')),'hex'),font_id,font from public.romtranslate_font_vault_entries where code_hash=source_hash;
     insert into public.romtranslate_workspaces(owner_key,workspace_id,name,rom_sha256,payload,revision,updated_at)
       select 'code:'||encode(sha256(convert_to(next_code,'UTF8')),'hex'),workspace_id,name,rom_sha256,payload,nextval('public.romtranslate_work_revision_seq'),updated_at from public.romtranslate_workspaces where owner_key='code:'||source_hash;
   end if;
   if auth.uid() is not null and p_existing_code is null then
     if to_regclass('public.romtranslate_font_library') is not null then
       execute 'insert into public.romtranslate_font_vault_entries(code_hash,font_id,font) select $1,font_id,font from public.romtranslate_font_library where user_id=$2 on conflict do nothing' using encode(sha256(convert_to(next_code,'UTF8')),'hex'),auth.uid();
     end if;
     insert into public.romtranslate_workspaces(owner_key,workspace_id,name,rom_sha256,payload,revision,updated_at)
     select 'code:'||encode(sha256(convert_to(next_code,'UTF8')),'hex'),workspace_id,name,rom_sha256,payload,nextval('public.romtranslate_work_revision_seq'),updated_at from public.romtranslate_workspaces where owner_key='user:'||auth.uid()::text on conflict do nothing;
   end if;
   update public.romtranslate_admin_library set library_code=next_code where id=true;
 end if;
 return jsonb_build_object('library_code',next_code);
end;
$$;
revoke all on function public.romtranslate_admin_login(text,text) from public;
grant execute on function public.romtranslate_admin_login(text,text) to anon,authenticated;
commit;

-- Optional temporary private ROM storage for existing workspaces.
-- Run once after workspace-library.sql. No passwords, buckets or public URLs.
begin;
create table if not exists public.romtranslate_rom_files (
 owner_key text not null, workspace_id uuid not null,
 rom_sha256 text not null check (rom_sha256 ~ '^[a-f0-9]{64}$'),
 size_bytes integer not null check (size_bytes between 192 and 33554432),
 ready boolean not null default false, updated_at timestamptz not null default now(),
 primary key(owner_key,workspace_id),
 foreign key(owner_key,workspace_id) references public.romtranslate_workspaces(owner_key,workspace_id) on delete cascade
);
create table if not exists public.romtranslate_rom_chunks (
 owner_key text not null, workspace_id uuid not null, chunk_index integer not null check(chunk_index between 0 and 127),
 data bytea not null check(octet_length(data) between 1 and 262144),
 primary key(owner_key,workspace_id,chunk_index),
 foreign key(owner_key,workspace_id) references public.romtranslate_rom_files(owner_key,workspace_id) on delete cascade
);
alter table public.romtranslate_rom_files enable row level security;
alter table public.romtranslate_rom_chunks enable row level security;
revoke all on public.romtranslate_rom_files,public.romtranslate_rom_chunks from public,anon,authenticated;
create or replace function public.romtranslate_rom(p_action text,p_id uuid,p_code text default null,p_index integer default null,p_data text default null,p_size integer default null,p_hash text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare owner_id text; expected_hash text; f public.romtranslate_rom_files%rowtype; chunk bytea; actual_hash text; stored_chunks integer; stored_bytes bigint; result jsonb; total integer;
begin
 if p_action is null or p_action not in ('info','begin','put','finish','get','delete') or p_id is null then raise exception 'Invalid ROM request'; end if;
 owner_id:=public.romtranslate_work_owner(p_code);
 if p_action in ('begin','delete') and not pg_try_advisory_xact_lock(hashtextextended(owner_id,0)) then
  raise exception using errcode='55P03',message='ROM backup is busy; retry shortly';
 end if;
 select w.rom_sha256 into expected_hash from public.romtranslate_workspaces w where w.owner_key=owner_id and w.workspace_id=p_id;
 if not found then raise exception 'Save workspace before uploading its ROM'; end if;
 if p_action in ('info','get') then
  select r.* into f from public.romtranslate_rom_files r where r.owner_key=owner_id and r.workspace_id=p_id;
 else
  select r.* into f from public.romtranslate_rom_files r where r.owner_key=owner_id and r.workspace_id=p_id for update;
 end if;
 if p_action='delete' then
  delete from public.romtranslate_rom_files r where r.owner_key=owner_id and r.workspace_id=p_id;return jsonb_build_object('deleted',true);
 end if;
 if p_action='begin' then
  if p_size is null or p_size not between 192 and 33554432 or p_hash is distinct from expected_hash then raise exception 'ROM size or SHA-256 does not match workspace'; end if;
  if f.workspace_id is not null then
   if f.rom_sha256<>p_hash or f.size_bytes<>p_size then raise exception 'Delete the old ROM copy before replacing it'; end if;
  else
   if coalesce((select sum(r.size_bytes) from public.romtranslate_rom_files r where r.owner_key=owner_id),0)+p_size>134217728 then raise exception 'Temporary ROM quota: 128 MB per library. Delete completed ROM copies first'; end if;
   insert into public.romtranslate_rom_files(owner_key,workspace_id,rom_sha256,size_bytes) values(owner_id,p_id,p_hash,p_size) returning * into f;
  end if;
 end if;
 if f.workspace_id is null then
  if p_action='info' then return null; end if;
  raise exception 'ROM copy not found';
 end if;
 if f.rom_sha256<>expected_hash then raise exception 'Stored ROM does not match workspace'; end if;
 total:=(f.size_bytes+262143)/262144;
 if p_action in ('put','get') and (p_index is null or p_index<0 or p_index>=total) then raise exception 'Invalid ROM chunk index'; end if;
 if p_action='put' then
  if f.ready then return jsonb_build_object('ready',true); end if;
  if p_data is null or length(p_data)>349528 then raise exception 'Maximum 256 KB per chunk'; end if;
  chunk:=decode(p_data,'base64');
  if octet_length(chunk)<>least(262144,f.size_bytes-p_index*262144) then raise exception 'Invalid ROM chunk length'; end if;
  insert into public.romtranslate_rom_chunks(owner_key,workspace_id,chunk_index,data) values(owner_id,p_id,p_index,chunk)
   on conflict(owner_key,workspace_id,chunk_index) do update set data=excluded.data;
  return jsonb_build_object('index',p_index,'stored',true);
 elsif p_action='finish' then
  if not f.ready then
   select count(*),coalesce(sum(octet_length(c.data)),0) into stored_chunks,stored_bytes from public.romtranslate_rom_chunks c where c.owner_key=owner_id and c.workspace_id=p_id;
   if stored_chunks<>total or stored_bytes<>f.size_bytes then raise exception 'Incomplete ROM or SHA-256 mismatch'; end if;
   -- Return only the digest from the executor, avoiding a second 32 MB bytea
   -- copy in the PL/pgSQL function's memory context. Full-file SHA stays mandatory.
   select encode(sha256(string_agg(c.data,''::bytea order by c.chunk_index)),'hex') into actual_hash from public.romtranslate_rom_chunks c where c.owner_key=owner_id and c.workspace_id=p_id;
   if actual_hash is distinct from f.rom_sha256 then raise exception 'Incomplete ROM or SHA-256 mismatch'; end if;
   update public.romtranslate_rom_files r set ready=true,updated_at=now() where r.owner_key=owner_id and r.workspace_id=p_id;
   f.ready:=true;
  end if;
 elsif p_action='get' then
  if not f.ready then raise exception 'ROM upload is not complete'; end if;
  select c.data into chunk from public.romtranslate_rom_chunks c where c.owner_key=owner_id and c.workspace_id=p_id and c.chunk_index=p_index;
  if chunk is null then raise exception 'ROM chunk missing'; end if;
  return jsonb_build_object('index',p_index,'data',encode(chunk,'base64'));
 end if;
 return jsonb_build_object('sha256',f.rom_sha256,'size',f.size_bytes,'ready',f.ready,'chunks',total,'present',coalesce((select jsonb_agg(c.chunk_index order by c.chunk_index) from public.romtranslate_rom_chunks c where c.owner_key=owner_id and c.workspace_id=p_id),'[]'::jsonb));
end;
$$;
-- PostgREST applies this per-RPC timeout; other application RPCs are unchanged.
alter function public.romtranslate_rom(text,uuid,text,integer,text,integer,text) set statement_timeout='60s';
alter function public.romtranslate_rom(text,uuid,text,integer,text,integer,text) set lock_timeout='2s';
revoke all on function public.romtranslate_rom(text,uuid,text,integer,text,integer,text) from public;
grant execute on function public.romtranslate_rom(text,uuid,text,integer,text,integer,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
