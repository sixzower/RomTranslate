const assert=require('node:assert/strict'),{remove}=require('../workspace-delete');
const item={workspace_id:'11111111-1111-4111-8111-111111111111',revision:7},network=()=>Object.assign(Error('Failed to fetch'),{networkFailure:true});
(async()=>{
 let calls=[];await remove(item,async(a,args)=>{calls.push([a,args]);});assert.equal(calls.length,1);
 calls=[];await remove(item,async(a,args)=>{calls.push([a,args]);if(a==='delete')throw network();return [];});assert.deepEqual(calls.map(c=>c[0]),['delete','list']);
 calls=[];await remove(item,async(a,args)=>{calls.push([a,args]);if(calls.length===1)throw network();if(a==='list')return [item];});assert.deepEqual(calls.map(c=>c[0]),['delete','list','delete']);assert.equal(calls[2][1].p_expected,7);
 calls=[];await assert.rejects(remove(item,async a=>{calls.push(a);if(a==='delete')throw network();return [{...item,revision:8}];}),/version conflict/);assert.deepEqual(calls,['delete','list']);
 calls=[];await assert.rejects(remove(item,async a=>{calls.push(a);throw network();}),e=>e.uncertainDelete&&e.networkFailure);assert.deepEqual(calls,['delete','list']);
 calls=[];await assert.rejects(remove(item,async a=>{calls.push(a);if(a==='delete')throw network();return [item];}),/สำเนายังอยู่/);assert.deepEqual(calls,['delete','list','delete','list']);
 calls=[];await assert.rejects(remove(item,async a=>{calls.push(a);throw Error('HTTP 403');}),/HTTP 403/);assert.deepEqual(calls,['delete']);
 await assert.rejects(remove(item,async a=>{if(a==='delete')throw network();return [null];}),e=>e.uncertainDelete);
 console.log('PASS acknowledged/lost-response/retry deletion, fixed revision, newer-version protection, unknown result, bounded retries, HTTP errors and malformed verification');
})().catch(e=>{console.error(e);process.exit(1)});
