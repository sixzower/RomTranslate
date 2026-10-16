const assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
(async()=>{const db=new PGlite();try{
await db.exec("create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql as $$ select null::uuid $$;");
await db.exec(fs.readFileSync('cloud/workspace-library.sql','utf8'));
const code='a'.repeat(64),id='12345678-1234-4234-8234-123456789abc';
await db.query("insert into public.romtranslate_font_vaults(code_hash) values(encode(sha256(convert_to($1,'UTF8')),'hex'))",[code]);
const payload={workspaceId:id,workspaceName:'งานทดสอบขนาดใหญ่',workspaceFormat:'RomTranslate workspace v1',version:2,romHash:'a'.repeat(64),workTasks:[],entries:Array.from({length:27166},(_,i)=>({id:i,source:'Original text '+i,translation:'คำแปลภาษาไทยสำหรับทดสอบ '+i}))};
const put=async rev=>(await db.query('select public.romtranslate_work_code_put($1,$2,$3,$4::jsonb) as revision',[code,id,rev,JSON.stringify(payload)])).rows[0].revision;
await db.exec('set role anon');const first=Number(await put(0));
await db.exec('reset role');const migration=fs.readFileSync('cloud/workspace-timeout-fix.sql','utf8');await db.exec(migration);await db.exec(migration);
const config=(await db.query("select proname,proconfig from pg_proc where proname in ('romtranslate_work_code_put','romtranslate_work_user_put')")).rows;
assert.equal(config.length,2);for(const f of config){assert(f.proconfig.includes('statement_timeout=30s'));assert(f.proconfig.includes('lock_timeout=2s'));}
await db.exec('set role anon');const second=Number(await put(first));assert(second>first);await assert.rejects(put(first),/version conflict/);
const saved=(await db.query('select * from public.romtranslate_work_code_get($1,$2)',[code,id])).rows[0];assert.deepEqual(saved.payload,payload);assert.equal(Number(saved.revision),second);
await assert.rejects(db.query('select * from public.romtranslate_workspaces'),/permission denied/);
console.log('PASS repeatable timeout migration preserves 27,166 Thai rows, revisions, conflict guards and private access; RPC-only 30s timeout and 2s lock limit configured. Real concurrent lock contention is not simulated by PGlite.');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exit(1)});
