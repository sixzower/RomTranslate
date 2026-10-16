const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),Result=require('../sheet-import-result');
const notes=[],events=[],listeners={},control={checked:true};
class Audio{
 constructor(){this.state='running';this.currentTime=0;this.destination={};}
 createOscillator(){return {frequency:{set value(v){notes.push(v)}},connect(){},start(){},stop(){},disconnect(){}};}
 createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
}
const context={window:{AudioContext:Audio,dispatchEvent:e=>events.push(e.detail.kind)},document:{getElementById:()=>control,addEventListener:(name,fn)=>listeners[name]=fn},localStorage:{getItem:()=>null,setItem(){}},CustomEvent:class{constructor(name,options){this.detail=options.detail}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('completion-sounds.js','utf8'),context);
(async()=>{
 await listeners.pointerdown();const play=context.window.CompletionSounds.play;
 assert(play('import-success'));assert.deepEqual(notes.splice(0),[659,831,1047]);
 assert(play('import-error'));assert.deepEqual(notes.splice(0),[392,311,247]);
 control.checked=false;control.onchange();assert.equal(play('import-success'),false);assert.equal(play('import-error'),false);assert.equal(notes.length,0);assert.deepEqual(events,['import-success','import-error']);
 const clean={parts:{},issues:[],missing:[]};assert.equal(Result.needsAttention(clean),false);
 assert(Result.needsAttention({...clean,parts:undefined}));assert(Result.needsAttention({...clean,issues:[{severity:'error'}]}));assert(Result.needsAttention({...clean,missing:[{code:'blank',alreadyTranslated:false}]}));assert.equal(Result.needsAttention({...clean,missing:[{code:'blank',alreadyTranslated:true}]}),false);assert(Result.needsAttention({...clean,missing:[{code:'missing-entry'}]}));
 console.log('PASS distinct ascending/descending import tones, shared mute preference, clean/partial/missing/blocked classifications.');
})().catch(e=>{console.error(e);process.exit(1)});
