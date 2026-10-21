const assert=require('node:assert/strict'),Progress=require('../progress'),Tasks=require('../translation-tasks'),Sync=require('../workspace-sync');
globalThis.crypto??=require('node:crypto').webcrypto;
const entries=[{id:192,romOffset:192,source:'Hi',translation:'ไทย',family:'dialogue',category:'บทสนทนา / NPC',verified:true,storage:'pointer'},{id:200,romOffset:200,source:'Bag',translation:'',family:'menu',category:'เมนู / เมนูหลัก',verified:true,storage:'pointer'}];
const p=()=>({title:'Test.gba',romHash:'a'.repeat(64),entries:structuredClone(entries),workTasks:[],font:{}});
const original=p(),snapshot=Tasks.portable(original);assert.deepEqual(snapshot.progressCategories,entries.map(e=>e.category));assert.deepEqual(original.progressCategories,snapshot.progressCategories);
const empty={...snapshot,progressCategories:[]},restored=p();Tasks.hydrate(restored,empty);assert.deepEqual(restored.progressCategories,[]);assert.equal(Progress.stats(restored).total,0);assert.deepEqual(Tasks.portable(restored).progressCategories,[]);
Tasks.hydrate(restored,{...snapshot,progressCategories:[entries[0].category]});assert.equal(Progress.stats(restored).done,1);assert.equal(Progress.stats(restored).total,1);assert.equal(Progress.stats(restored).percent,100);
const categories=['a','b','c'],set=n=>categories.filter((_,i)=>n&(1<<i));
for(let b=0;b<8;b++)for(let l=0;l<8;l++)for(let r=0;r<8;r++){
 const doc=n=>({...snapshot,progressCategories:set(n)}),merged=Sync.reconcile(doc(l),doc(r),doc(b));
 assert.deepEqual(new Set(merged.progressCategories),new Set(categories.filter((_,i)=>((l^(b))&(1<<i)?l:r)&(1<<i))));
}
assert.deepEqual(Sync.reconcile({...snapshot,progressCategories:['b','a']},{...snapshot,progressCategories:['a','b']}).progressCategories,['a','b']);
assert.throws(()=>Tasks.hydrate(p(),{...snapshot,progressCategories:['a','a']}),/เป้าหมาย/);
console.log('PASS explicit target snapshots/hydration, empty selection remains empty, exact percentage, 512 three-way category combinations and order-insensitive goals.');
