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

-- Only SQL Editor/admin can create a vault; public clients cannot create one.
-- The original code is returned once. Only its SHA-256 hash is stored.
with generated as materialized (
  select encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text,'UTF8')),'hex') as code
), saved as (
  insert into public.romtranslate_font_vaults(code_hash)
  select encode(sha256(convert_to(code,'UTF8')),'hex') from generated returning code_hash
)
select code as private_library_code from generated cross join saved;
