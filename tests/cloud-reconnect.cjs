const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const context=await browser.newContext({serviceWorkers:'block'}),p=await context.newPage();let failed=false,lists=0,logins=0;
 await p.route('**/coi-serviceworker.js',r=>r.fulfill({body:''}));
 await p.addInitScript(()=>{
  Object.defineProperty(window,'RomTranslateCloudConfig',{get:()=>({url:'https://reconnect-test.supabase.co',key:'sb_publishable_test_1234567890'}),set:()=>{}});
  localStorage.setItem('romtranslate.fontCloud.code.v1',JSON.stringify({url:'https://reconnect-test.supabase.co',code:'a'.repeat(64)}));
  const f=fetch.bind(window);window.fetch=(i,o)=>f(typeof i==='string'&&i.startsWith('https://reconnect-test.supabase.co')?location.origin+'/__reconnect'+i.slice('https://reconnect-test.supabase.co'.length):i,o);
 });
 await p.route('**/__reconnect/**',async r=>{const path=r.request().url();if(path.endsWith('admin_login'))logins++;if(path.endsWith('font_code_list')){lists++;if(failed)return r.abort('failed');}return r.fulfill({contentType:'application/json',body:'[]'});});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TEST_URL||'http://127.0.0.1:5180/download/index.html');await p.waitForFunction(()=>FontCloud.connected());
 await p.clock.install();await p.evaluate(()=>{window.cues=0;CompletionSounds.play=()=>window.cues++;window.changes=0;window.addEventListener('romtranslate:cloud-connection',()=>window.changes++);});
 // Unchanged successful health checks must not trigger autosave listeners again.
 await p.evaluate(()=>FontCloud.sync());assert.equal(await p.evaluate(()=>window.changes),0);
 // A single task failure is a warning pending a health check, not a logout.
 await p.evaluate(()=>FontCloud.reportError('ทดสอบส่งไฟล์สะดุด'));assert(await p.evaluate(()=>FontCloud.connected()));assert.equal(await p.locator('#fontCloudStatus').getAttribute('data-kind'),'warning');
 failed=true;const baseline=lists;
 const job=p.evaluate(()=>FontCloud.sync());await p.waitForFunction(()=>document.getElementById('cloudOpen').dataset.syncing==='true');
 await p.evaluate(()=>{for(let i=0;i<30;i++){window.dispatchEvent(new Event('focus'));window.dispatchEvent(new CustomEvent('romtranslate:font-saved'));}});
 await p.clock.fastForward(500);await job;
 assert.equal(lists-baseline,2,'one safe read retry only, no immediate queued resync');assert.equal(await p.locator('#cloudOpen').getAttribute('data-state'),'disconnected');assert(await p.evaluate(()=>FontCloud.authenticated()));
 await p.locator('#cloudOpen').click();assert(await p.locator('#adminLoginForm').isHidden());assert(await p.locator('#adminRetrySync').isVisible());
 const before=lists;await p.evaluate(()=>{for(let i=0;i<30;i++)window.dispatchEvent(new CustomEvent('romtranslate:font-saved'));});await p.clock.fastForward(59000);assert.equal(lists,before,'cooldown must prevent repeated attempts');
 failed=false;await p.clock.fastForward(1500);await p.waitForFunction(()=>FontCloud.connected());assert.equal(logins,0,'reconnect must reuse credentials');assert.equal(await p.evaluate(()=>window.cues),0,'background reconnect must not replay login sound');
 // Explicit retry can bypass cooldown and still never asks for a password.
 failed=true;const attempt=p.evaluate(()=>FontCloud.sync());await p.clock.fastForward(500);await attempt;failed=false;await p.locator('#adminRetrySync').click();await p.waitForFunction(()=>FontCloud.connected());assert.equal(logins,0);assert.deepEqual(errors,[]);
 console.log('PASS cooldown coalesces focus/font storms and queued failure, saved login survives outage, one task failure stays warning, automatic recovery and manual retry reuse credentials, no duplicate state events or login sounds.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
