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
declare settings public.romtranslate_admin_library%rowtype; a public.romtranslate_admin_attempts%rowtype; client_key text; headers jsonb; next_code text;
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
     return jsonb_build_object('error','link_required','message','ยืนยันรหัสนี้ที่เครื่องเดิมซึ่งเคยเชื่อมคลัง เพื่อผูกฟอนต์และไฟล์งานเดิมครั้งเดียว');
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
