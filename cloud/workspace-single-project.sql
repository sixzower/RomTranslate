-- One shared project per private library. Preserves all existing data.
begin;
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
-- PostgREST applies per-RPC statement_timeout before executing the request.
-- Keep row-lock waits short; do not change the timeout for other applications.
alter function public.romtranslate_work_code_put(text,uuid,bigint,jsonb) set statement_timeout = '30s';
alter function public.romtranslate_work_code_put(text,uuid,bigint,jsonb) set lock_timeout = '2s';
alter function public.romtranslate_work_user_put(uuid,bigint,jsonb) set statement_timeout = '30s';
alter function public.romtranslate_work_user_put(uuid,bigint,jsonb) set lock_timeout = '2s';

notify pgrst, 'reload schema';
commit;
