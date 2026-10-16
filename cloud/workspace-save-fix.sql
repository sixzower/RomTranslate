-- Run once in the existing Supabase SQL Editor. No data or functions are replaced.
begin;
alter function public.romtranslate_work_code_put(text,uuid,bigint,jsonb) set statement_timeout='60s';
alter function public.romtranslate_work_code_put(text,uuid,bigint,jsonb) set lock_timeout='2s';
alter function public.romtranslate_work_user_put(uuid,bigint,jsonb) set statement_timeout='60s';
alter function public.romtranslate_work_user_put(uuid,bigint,jsonb) set lock_timeout='2s';
notify pgrst, 'reload schema';
commit;
