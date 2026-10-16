const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite'),Reader=require('../workspace-reader.js');
globalThis.crypto??=crypto.webcrypto;
(async()=>{const db=new PGlite();try{
 await db.exec("create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;");
 await db.exec(fs.readFileSync('cloud/workspace-library.sql','utf8'));
 const code='a'.repeat(64),other='b'.repeat(64),id=crypto.randomUUID(),hash=crypto.createHash('sha256').update(code).digest('hex');
 for(const c of [code,other])await db.query("insert into public.romtranslate_font_vaults(code_hash) values(encode(sha256(convert_to($1,'UTF8')),'hex'))",[c]);
 const payload={workspaceId:id,workspaceName:'คำแปลล่าสุด',workspaceFormat:'RomTranslate workspace v1',version:2,romHash:'f'.repeat(64),workTasks:[{status:'active'}],excelImports:[{hash:'e'.repeat(64),name:'แปลแล้ว.xlsx'}],entries:Array.from({length:27166},(_,i)=>({id:i,source:'Original text '+i,translation:'คำแปลล่าสุด 😀 ตัวอย่าง\n{SCROLL} '+i}))};
 await db.query('select public.romtranslate_work_code_put($1,$2,0,$3::jsonb)',[code,id,JSON.stringify(payload)]);
 const revision=Number((await db.query('select revision from public.romtranslate_workspaces')).rows[0].revision);
 const migration=fs.readFileSync('cloud/workspace-read-fix.sql','utf8');await db.exec(migration);await db.exec(migration);
 const config=(await db.query("select proconfig from pg_proc where proname in ('romtranslate_work_read','romtranslate_work_code_get','romtranslate_work_user_get','romtranslate_work_code_list','romtranslate_work_user_list')")).rows;
 assert.equal(config.length,5);assert(config.every(f=>f.proconfig.includes('statement_timeout=60s')));
 const call=async(args,c=code)=>(await db.query('select public.romtranslate_work_read($1,$2,$3,$4) as part',[c,args.p_id,args.p_revision,args.p_offset])).rows[0].part;
 await db.exec('set role anon');await db.exec('begin read only');let calls=0;
 const result=await Reader.read(id,async args=>{calls++;const part=await call(args);assert(part.data.length<=524288);return part;},()=>{throw Error('must not use legacy');});
 await db.exec('commit');assert(calls>1);assert.deepEqual(result,[{payload,revision}]);
 assert.deepEqual(await Reader.read(id,args=>call(args,other),()=>{throw Error('legacy');}),[]);
 await assert.rejects(call({p_id:id,p_revision:null,p_offset:1}),/Invalid workspace read/);
 await assert.rejects(call({p_id:id,p_revision:revision-1,p_offset:262144}),/Workspace changed/);
 await assert.rejects(call({p_id:id,p_revision:null,p_offset:0},'c'.repeat(64)),/Invalid library code/);
 await assert.rejects(call({p_id:id,p_revision:null,p_offset:0},null),/Sign in/);
 await assert.rejects(db.query('select * from public.romtranslate_workspaces'),/permission denied/);
 // A concurrent revision must never produce a mixed or silently partial project.
 let n=0;await assert.rejects(Reader.read(id,async args=>{if(n++===1){await db.exec('reset role');await db.query('update public.romtranslate_workspaces set revision=revision+1 where owner_key=$1',['code:'+hash]);await db.exec('set role anon');}return call(args);},()=>{}),/Workspace changed/);
 // A damaged response with matching size must fail SHA-256, not open damaged words.
 await assert.rejects(Reader.read(id,async args=>{const part=await call(args);if(args.p_offset===0)part.data='!'+part.data.slice(1);return part;},()=>{}),/ครบถ้วน/);
 let fallback=0;assert.deepEqual(await Reader.read(id,async()=>{throw Error('PGRST202 Could not find the function');},async()=>{fallback++;return [{payload,revision}];}),[{payload,revision}]);assert.equal(fallback,1);
 await assert.rejects(Reader.read(id,async()=>{throw Error('57014 timeout');},()=>{throw Error('unsafe fallback');}),/57014/);
 await assert.rejects(Reader.read(id,async()=>({revision:1,totalLength:2,sha256:'a'.repeat(64),data:'{}',nextOffset:0}),()=>{}),/โหลดไม่ครบ/);
 await db.exec('reset role');assert.deepEqual((await db.query('select payload from public.romtranslate_workspaces')).rows[0].payload,payload);
 await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[crypto.randomUUID()]);assert.equal(await call({p_id:id,p_revision:null,p_offset:0},null),null);
 await db.query('select public.romtranslate_work_user_put($1,0,$2::jsonb)',[id,JSON.stringify(payload)]);assert.deepEqual((await Reader.read(id,args=>call(args,null),()=>{}))[0].payload,payload);
 console.log('PASS real PostgreSQL + browser reader: 27,166 Thai/emoji rows in bounded read-only chunks, exact SHA/metadata, revision-change/corruption rejection, code/user isolation, direct-table denial, repeatable migration and safe legacy fallback. PGlite does not simulate production PostgREST timeouts or concurrent lock contention.');
 }finally{await db.close();}})().catch(e=>{console.error(e);process.exit(1)});
