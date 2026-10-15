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
