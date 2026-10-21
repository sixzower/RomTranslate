const assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
(async()=>{const db=new PGlite();try{
 await db.exec("create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;");
 const fontSql=fs.readFileSync('cloud/font-code-library.sql','utf8'),code=(await db.exec(fontSql)).at(-1).rows[0].private_library_code,second=(await db.exec(fontSql)).at(-1).rows[0].private_library_code;
 const sql=fs.readFileSync('cloud/workspace-library.sql','utf8');await db.exec(sql);await db.exec(sql);
 const id='12345678-1234-4234-8234-123456789abc',payload={version:2,workspaceFormat:'RomTranslate workspace v1',workspaceId:id,workspaceName:'Test',romHash:'a'.repeat(64),entries:[{id:192}],workTasks:[{status:'active'}]};
 await db.exec('set role anon');await assert.rejects(db.query('select * from public.romtranslate_workspaces'),/permission denied/);await assert.rejects(db.query('select public.romtranslate_work_list($1)',['code:fake']),/permission denied/);
 await assert.rejects(db.query('select * from public.romtranslate_work_code_list($1)',['b'.repeat(64)]),/Invalid library code/);
 async function put(c,rev,p=payload){return (await db.query('select public.romtranslate_work_code_put($1,$2,$3,$4::jsonb) as revision',[c,id,rev,JSON.stringify(p)])).rows[0].revision;}
 assert.equal(Number(await put(code,0)),1);assert.equal(Number(await put(code,1)),2);await assert.rejects(put(code,1),/version conflict/);
 const rows=(await db.query('select * from public.romtranslate_work_code_list($1)',[code])).rows;assert.equal(rows.length,1);assert.equal(Number(rows[0].pending_tasks),1);
 assert.equal((await db.query('select * from public.romtranslate_work_code_get($1,$2)',[second,id])).rows.length,0);
 await db.query('select public.romtranslate_work_code_delete($1,$2,$3)',[second,id,2]);assert.equal((await db.query('select * from public.romtranslate_work_code_get($1,$2)',[code,id])).rows.length,1);
 await assert.rejects(put(code,2,{...payload,workspaceId:'bad'}),/Invalid work file/);await assert.rejects(db.query('select public.romtranslate_work_code_delete($1,$2,$3)',[code,id,1]),/version conflict/);
 await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",['11111111-1111-4111-8111-111111111111']);assert.equal((await db.query('select * from public.romtranslate_work_user_list()')).rows.length,0);
 await db.query('select public.romtranslate_work_user_put($1,$2,$3::jsonb)',[id,0,JSON.stringify(payload)]);assert.equal((await db.query('select * from public.romtranslate_work_user_list()')).rows.length,1);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",['22222222-2222-4222-8222-222222222222']);assert.equal((await db.query('select * from public.romtranslate_work_user_get($1)',[id])).rows.length,0);
 await db.exec('set role anon');await db.query('select public.romtranslate_work_code_delete($1,$2,$3)',[code,id,2]);assert.equal((await db.query('select * from public.romtranslate_work_code_list($1)',[code])).rows.length,0);const recreated=Number(await put(code,0));assert(recreated>2);await assert.rejects(put(code,2),/version conflict/);assert.equal((await db.query('select * from public.romtranslate_font_code_list($1)',[code])).rows.length,0);
 console.log('PASS PostgreSQL: repeatable migration, existing vault codes, denied tables/helpers, code/user isolation, CAS conflict protection, scoped delete and preserved font vaults.');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exit(1)});
