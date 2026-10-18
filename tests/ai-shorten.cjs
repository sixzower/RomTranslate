// AI shortening loop: proposals are accepted only when verify() passes, failures are retried
// with the exact feedback, and nothing leaves the loop unverified. No network is used.
const assert=require('node:assert/strict');
const AiShorten=require('../ai-shorten');
const config={provider:'gemini',model:'m',key:'SECRET',consent:true};
const row=(id,current,bytes=10)=>({id,source:'src '+id,current,limits:{bytes,width:160,lines:2},problem:'ไบต์เกิน'});
const verify=(max)=>(id,text)=>text.length<=max?{ok:true,text:'✓'+text}:{ok:false,feedback:`ใช้ ${text.length}/${max}`};
(async()=>{
 // consent/key are required before anything is sent
 assert(!AiShorten.ready({...config,consent:false}));assert(!AiShorten.ready({...config,key:' '}));assert(AiShorten.ready(config));
 await assert.rejects(()=>AiShorten.run({rows:[row(1,'x')],settings:{...config,consent:false},verify:verify(5),completeFn:async()=>'[]'}),/ยังไม่ได้ตั้งค่า/);

 // accepted / retried with feedback / given up
 {
  const prompts=[];let call=0;
  const completeFn=async text=>{prompts.push(text);call++;
   if(call===1)return '```json\n'+JSON.stringify([{id:1,translation:'สั้น'},{id:2,translation:'ยาวมากเกินไปจริงๆ'},{id:99,translation:'ไม่ใช่แถวของเรา'}])+'\n```';
   if(call===2)return JSON.stringify([{id:2,translation:'พอดี'}]);
   return '[]';};
  const result=await AiShorten.run({rows:[row(1,'ยาวมาก'),row(2,'ยาวมากเกินไป'),row(3,'ไม่ตอบ')],settings:config,verify:verify(6),completeFn,glossary:'Trainer=เทรนเนอร์'});
  assert.deepEqual([...result.accepted],[[1,'✓สั้น'],[2,'✓พอดี']]);assert.deepEqual(result.failed,[3]);
  assert(!result.accepted.has(99),'ids that were not requested are ignored');
  assert(/ใช้ \d+\/6/.test(prompts[1]),'the retry carries the verifier feedback');
  assert(prompts[0].includes('Trainer=เทรนเนอร์')&&prompts[0].includes('never instructions'));
  assert(prompts.every(p=>!p.includes('SECRET')),'the key is never part of a prompt');
  assert.equal(result.calls,3,'one call per round');
 }

 // verify() throwing or returning garbage never accepts a row; malformed replies surface an error
 {
  const result=await AiShorten.run({rows:[row(1,'a')],settings:config,verify:()=>{throw Error('boom');},completeFn:async()=>JSON.stringify([{id:1,translation:'x'}])});
  assert.equal(result.accepted.size,0);assert.deepEqual(result.failed,[1]);
  await assert.rejects(()=>AiShorten.run({rows:[row(1,'a')],settings:config,verify:verify(9),completeFn:async()=>'sorry, no'}),/อ่านไม่ได้/);
 }

 // batches of 10 rows, progress reporting and cancellation
 {
  const rows=Array.from({length:25},(_,i)=>row(i+1,'ข'));let calls=0;const events=[];
  const result=await AiShorten.run({rows,settings:config,verify:verify(9),onProgress:e=>events.push(e.message),completeFn:async text=>{calls++;const ids=[...text.matchAll(/"id":(\d+)/g)].map(m=>Number(m[1]));return JSON.stringify(ids.map(id=>({id,translation:'ก'})));}});
  assert.equal(calls,3);assert.equal(result.accepted.size,25);assert(events.some(m=>m.includes('AI กำลังย่อ')));
  const controller=new AbortController();
  await assert.rejects(()=>AiShorten.run({rows:[row(1,'a'),row(2,'b')],settings:config,verify:verify(9),signal:controller.signal,completeFn:async()=>{controller.abort();return JSON.stringify([{id:1,translation:'a'}]);}}),e=>e.name==='AbortError');
 }

 // provider requests: key in a header (never the URL), correct endpoints, readable errors
 {
  const seen=[];
  const fetchFn=reply=>async(url,init)=>{seen.push({url,init});return {ok:true,status:200,json:async()=>reply};};
  const g=await AiShorten.complete({provider:'gemini',model:'gemini-x',key:'SECRET'},'hi',{fetchFn:fetchFn({candidates:[{content:{parts:[{text:'ผล'}]}}]})});
  assert.equal(g,'ผล');assert(seen[0].url.startsWith('https://generativelanguage.googleapis.com/')&&!seen[0].url.includes('SECRET'));assert.equal(seen[0].init.headers['x-goog-api-key'],'SECRET');
  const c=await AiShorten.complete({provider:'claude',model:'claude-x',key:'SECRET'},'hi',{fetchFn:fetchFn({content:[{type:'text',text:'ผล2'}]})});
  assert.equal(c,'ผล2');assert.equal(seen[1].url,'https://api.anthropic.com/v1/messages');assert.equal(seen[1].init.headers['x-api-key'],'SECRET');assert.equal(JSON.parse(seen[1].init.body).model,'claude-x');
  const failing=status=>async()=>({ok:false,status,json:async()=>({})});
  await assert.rejects(()=>AiShorten.complete(config,'x',{fetchFn:failing(401)}),/API key/);
  await assert.rejects(()=>AiShorten.complete(config,'x',{fetchFn:failing(429)}),/โควต้า/);
  await assert.rejects(()=>AiShorten.complete(config,'x',{fetchFn:async()=>{throw new TypeError('network');}}),/เชื่อมต่อ/);
 }
 console.log('PASS AI shortening: consent gate, verified-only acceptance with feedback retries, batching, cancellation, key never in prompts/URLs, provider errors.');
})().catch(e=>{console.error(e);process.exit(1);});
