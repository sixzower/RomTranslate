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
declare owner_id text; expected_hash text; f public.romtranslate_rom_files%rowtype; chunk bytea; combined bytea; result jsonb; total integer;
begin
 if p_action is null or p_action not in ('info','begin','put','finish','get','delete') or p_id is null then raise exception 'Invalid ROM request'; end if;
 owner_id:=public.romtranslate_work_owner(p_code);
 if p_action in ('begin','delete') then perform pg_advisory_xact_lock(hashtextextended(owner_id,0)); end if;
 select w.rom_sha256 into expected_hash from public.romtranslate_workspaces w where w.owner_key=owner_id and w.workspace_id=p_id;
 if not found then raise exception 'Save workspace before uploading its ROM'; end if;
 select r.* into f from public.romtranslate_rom_files r where r.owner_key=owner_id and r.workspace_id=p_id for update;
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
   select string_agg(c.data,''::bytea order by c.chunk_index) into combined from public.romtranslate_rom_chunks c where c.owner_key=owner_id and c.workspace_id=p_id;
   if (select count(*) from public.romtranslate_rom_chunks c where c.owner_key=owner_id and c.workspace_id=p_id)<>total or combined is null or octet_length(combined)<>f.size_bytes or encode(sha256(combined),'hex')<>f.rom_sha256 then raise exception 'Incomplete ROM or SHA-256 mismatch'; end if;
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
revoke all on function public.romtranslate_rom(text,uuid,text,integer,text,integer,text) from public;
grant execute on function public.romtranslate_rom(text,uuid,text,integer,text,integer,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
