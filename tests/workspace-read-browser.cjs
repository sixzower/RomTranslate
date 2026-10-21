const assert=require('node:assert/strict'),crypto=require('node:crypto'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),id='11111111-1111-4111-8111-111111111111',payload={workspaceId:id,workspaceName:'งานล่าสุด',entries:Array.from({length:12000},(_,i)=>({id:i,translation:'ภาษาไทย 😀 '+i})),workTasks:[{status:'active'}]},text=JSON.stringify(payload),points=Array.from(text),hash=crypto.createHash('sha256').update(text).digest('hex');let mode='good',reads=0,legacy=0,writes=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/coi-serviceworker.js',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await context.addInitScript(()=>{Object.defineProperty(window,'RomTranslateCloudConfig',{get:()=>({url:'https://read-test.supabase.co',key:'sb_publishable_test_1234567890'}),set:()=>{}});const native=fetch.bind(window);window.fetch=(input,options)=>native(typeof input==='string'&&input.startsWith('https://read-test.supabase.co')?location.origin+'/__read'+input.slice('https://read-test.supabase.co'.length):input,options);});
 await context.route('**/__read/**',route=>{const path=route.request().url(),args=route.request().postDataJSON();let data=[];
  if(path.endsWith('admin_login'))data={library_code:'a'.repeat(64)};
  else if(path.endsWith('romtranslate_work_read')){reads++;assert.equal(args.p_code,'a'.repeat(64));if(mode==='missing'||mode==='old-timeout')return route.fulfill({status:404,json:{code:'PGRST202',message:'Could not find the function'}});if(mode==='timeout')return route.fulfill({status:500,json:{code:'57014',message:'canceling statement due to statement timeout'}});if(mode==='network-once'&&reads===1)return route.abort('failed');if(mode==='changed'&&args.p_offset>0)return route.fulfill({status:400,json:{code:'40001',message:'Workspace changed during download'}});const next=Math.min(points.length,args.p_offset+262144);data={revision:7,totalLength:points.length,nextOffset:next,data:points.slice(args.p_offset,next).join(''),sha256:args.p_offset===0?hash:null};}
  else if(path.endsWith('work_code_get')){legacy++;if(mode==='old-timeout')return route.fulfill({status:500,json:{code:'57014',message:'canceling statement due to statement timeout'}});data=[{payload,revision:7}];}
  else if(/work_code_(put|delete)$/.test(path)){writes++;throw Error('Read test must not mutate projects');}
  return route.fulfill({json:data});
 });
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:5194');await page.locator('#cloudOpen').click();await page.locator('#adminPassword').fill('test-password');await page.locator('#adminConnect').click();await page.waitForFunction(()=>FontCloud.connected());
 const read=()=>page.evaluate(id=>FontCloud.workspaceRequest('get',{p_id:id}),id);
 assert.deepEqual(await read(),[{payload,revision:7}]);assert(reads>1);assert.equal(legacy,0);
 mode='network-once';reads=0;assert.deepEqual(await read(),[{payload,revision:7}]);assert.equal(reads,Math.ceil(points.length/262144)+1);
 mode='changed';await assert.rejects(read(),/มีการบันทึกฉบับใหม่.*งานเดิมยังอยู่/);
 mode='timeout';reads=0;await assert.rejects(read(),/เปิดโปรเจกต์.*workspace-read-fix.sql.*57014/);assert.equal(reads,1);assert.equal(legacy,0,'timeout triggered a second large download');
 mode='missing';assert.deepEqual(await read(),[{payload,revision:7}]);assert.equal(legacy,1);
 mode='old-timeout';await assert.rejects(read(),/workspace-read-fix.sql.*57014/);assert.equal(legacy,2);
 assert.equal(writes,0);assert.deepEqual(errors,[]);
 console.log('PASS browser: bounded complete Thai/emoji download, safe network retry, changed-revision rejection, actionable timeout SQL, old-installation fallback, no blind timeout retry and zero writes:',process.env.TEST_URL||'source');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
