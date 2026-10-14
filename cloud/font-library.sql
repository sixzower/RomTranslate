-- Run once in YOUR Supabase project's SQL Editor. No ROMs are stored here.
create table if not exists public.romtranslate_font_library (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  font_id text not null check (font_id ~ '^font-[a-f0-9]{24}$'),
  font jsonb not null check (jsonb_typeof(font) = 'object' and octet_length(font::text) <= 1048576),
  created_at timestamptz not null default now(),
  primary key (user_id, font_id)
);
alter table public.romtranslate_font_library enable row level security;
revoke all on public.romtranslate_font_library from anon;
grant select, insert, update, delete on public.romtranslate_font_library to authenticated;
drop policy if exists romtranslate_font_owner_select on public.romtranslate_font_library;
create policy romtranslate_font_owner_select on public.romtranslate_font_library for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists romtranslate_font_owner_insert on public.romtranslate_font_library;
create policy romtranslate_font_owner_insert on public.romtranslate_font_library for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists romtranslate_font_owner_update on public.romtranslate_font_library;
create policy romtranslate_font_owner_update on public.romtranslate_font_library for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists romtranslate_font_owner_delete on public.romtranslate_font_library;
create policy romtranslate_font_owner_delete on public.romtranslate_font_library for delete to authenticated using ((select auth.uid()) = user_id);
