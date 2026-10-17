const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),fonts=new Map(),calls=new Map(),errors=[];let mode='reject';
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/coi-serviceworker.js',r=>r.fulfill({body:''}));
 await page.addInitScript(()=>{Object.defineProperty(window,'RomTranslateCloudConfig',{get:()=>({url:'https://upload-test.supabase.co',key:'sb_publishable_test_1234567890'}),set:()=>{}});const f=fetch.bind(window);window.fetch=(i,o)=>f(typeof i==='string'&&i.startsWith('https://upload-test.supabase.co')?location.origin+'/__cloud'+i.slice('https://upload-test.supabase.co'.length):i,o);});
 await page.route('**/__cloud/**',async r=>{const path=r.request().url(),body=r.request().postDataJSON();let result=[];
  if(path.endsWith('admin_login'))result={library_code:'b'.repeat(64)};
  else if(path.endsWith('font_code_list'))result=[...fonts].map(([font_id,font])=>({font_id,font}));
  else if(path.endsWith('font_code_put')){
   for(const f of body.p_fonts)calls.set(f.font_id,(calls.get(f.font_id)||0)+1);
   if(mode==='reject'&&body.p_fonts.some(f=>f.font.name==='Pokemon Font Thai Shader V.2'))return r.fulfill({status:413,contentType:'application/json',body:JSON.stringify({message:'Payload too large',code:'TEST_LIMIT'})});
   for(const f of body.p_fonts)fonts.set(f.font_id,f.font);
   if(mode==='lost')return r.abort('failed');
  }
  await r.fulfill({contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:5176');const local=await page.evaluate(async()=>{await FontPresets.ready;for(const name of ['Pokemon Font Thai Shader V.2','normal'])await FontPresets.importData({...FontPresets.defaultData(),name},false,{activate:false,cloud:false});return FontPresets.list();});
 await page.locator('#cloudOpen').click();await page.locator('#adminPassword').fill('not-a-real-password');await page.locator('#adminConnect').click();await page.waitForFunction(()=>FontCloud.connected());
 assert.equal(fonts.size,1,'one HTTP rejection blocked the good preset');await page.locator('#toolsToggle').click();await page.locator('#cloudManageOpen').click();await page.waitForFunction(()=>FontCloud.connected());
 assert((await page.locator('#cloudPendingRows').innerText()).includes('HTTP 413'));assert((await page.locator('#cloudPendingRows').innerText()).includes('KB'));
 const downloadEvent=page.waitForEvent('download');await page.locator('#cloudPendingRows button').click();const download=await downloadEvent;const font=JSON.parse(require('fs').readFileSync(await download.path()));assert.equal(font.name,'Pokemon Font Thai Shader V.2');assert(!JSON.stringify(font).includes('not-a-real-password'));
 mode='success';await page.locator('#fontCloudSync').click();await page.waitForFunction(()=>FontCloud.connected()&&document.getElementById('cloudPending').hidden&&document.getElementById('cloudOpen').dataset.syncing==='false');assert.equal(fonts.size,2);
 mode='lost';const id=await page.evaluate(()=>FontPresets.importData({...FontPresets.defaultData(),name:'response-lost'},false,{activate:false,cloud:false}));await page.locator('#fontCloudSync').click();await page.waitForFunction(()=>FontCloud.connected()&&document.getElementById('cloudPending').hidden&&document.getElementById('cloudOpen').dataset.syncing==='false');assert(fonts.has(id));assert.equal(calls.get(id),1,'saved font was unnecessarily retried after lost response');assert.deepEqual(errors,[]);
 console.log('PASS HTTP 413 isolates the failed Shader preset, diagnostic size/status and safe preset export, retry, and lost-response readback confirms saved content without duplicate writes.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
