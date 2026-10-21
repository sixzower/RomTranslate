-- Run once in the existing Supabase SQL Editor. Preserves every project and ROM.
-- Bounded read responses; no new stored copies, tables or global role settings.
begin;
create or replace function public.romtranslate_work_read(p_code text,p_id uuid,p_revision bigint default null,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare owner_id text; saved_revision bigint; document text; total integer; fragment text;
begin
 if p_id is null or p_offset is null or p_offset<0 or p_offset>=16777216 or (p_offset>0 and p_revision is null) then raise exception 'Invalid workspace read'; end if;
 owner_id:=public.romtranslate_work_owner(p_code);
 select w.payload::text,w.revision into document,saved_revision from public.romtranslate_workspaces w where w.owner_key=owner_id and w.workspace_id=p_id;
 if not found then
  if p_revision is null and p_offset=0 then return null; end if;
  raise exception using errcode='40001',message='Workspace changed during download; open again';
 end if;
 if p_revision is not null and p_revision<>saved_revision then raise exception using errcode='40001',message='Workspace changed during download; open again'; end if;
 total:=char_length(document);
 if total>16777216 or p_offset>=total then raise exception 'Invalid workspace offset'; end if;
 fragment:=substring(document from p_offset+1 for 262144);
 return jsonb_build_object('revision',saved_revision,'totalLength',total,'nextOffset',p_offset+char_length(fragment),'data',fragment,
  'sha256',case when p_offset=0 then encode(sha256(convert_to(document,'UTF8')),'hex') else null end);
end;
$$;
alter function public.romtranslate_work_read(text,uuid,bigint,integer) set statement_timeout='60s';
alter function public.romtranslate_work_read(text,uuid,bigint,integer) set lock_timeout='2s';
revoke all on function public.romtranslate_work_read(text,uuid,bigint,integer) from public,anon,authenticated;
grant execute on function public.romtranslate_work_read(text,uuid,bigint,integer) to anon,authenticated;
-- Existing installations and older clients also receive a sufficient read budget.
alter function public.romtranslate_work_code_get(text,uuid) set statement_timeout='60s';
alter function public.romtranslate_work_user_get(uuid) set statement_timeout='60s';
alter function public.romtranslate_work_code_list(text) set statement_timeout='60s';
alter function public.romtranslate_work_user_list() set statement_timeout='60s';
notify pgrst, 'reload schema';
commit;
