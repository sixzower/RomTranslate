/* Reconcile one shared ROM workspace without turning existing translations blank. */
const WorkspaceSync=(()=>{
 const fields=['translation','speaker','literal','contextual','translationChoice'];
 const stable=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))):v;
 const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 function reconcile(local,remote,base=null){
  if(local.romHash!==remote.romHash)throw Error('โปรเจกต์หลักใช้ ROM คนละไฟล์ · งานในเครื่องยังอยู่');
  const byOffset=p=>new Map((p?.entries||[]).map(e=>[e.romOffset,e]));
  const left=byOffset(local),right=byOffset(remote),before=byOffset(base?.romHash===local.romHash?base:null),out=structuredClone(remote),conflicts=[];
  const choose=(l,r,b,known,label)=>{
   if(equal(l,r))return l;
   if(known&&equal(l,b))return r;
   if(known&&equal(r,b))return l;
   if(l==null||l==='')return r;
   if(r==null||r==='')return l;
   conflicts.push(label);return r;
  };
  out.entries=[...new Set([...right.keys(),...left.keys()])].map(offset=>{
   const l=left.get(offset),r=right.get(offset),b=before.get(offset);
   if(!l)return structuredClone(r);if(!r)return structuredClone(l);
   if(l.source!==r.source||l.id!==r.id)throw Error('ข้อความต้นฉบับไม่ตรงกันที่ $'+Number(offset).toString(16));
   const row={...r};for(const f of fields)row[f]=choose(l[f]||'',r[f]||'',b?.[f]||'',!!base&&(!b||b.source===l.source),String(l.id));return row;
  });
  for(const key of ['font','glossary','genre','progressCategories','workTasks','activeWorkTask']){
   out[key]=choose(local[key],remote[key],base?.[key],!!base,key);
  }
  // Per-device navigation is not a conflicting edit to the shared translation.
  out.viewState=structuredClone(local.viewState||remote.viewState);
  if(conflicts.length){const e=Error('แก้ข้อมูลเดียวกันต่างกัน '+new Set(conflicts).size+' จุด ('+[...new Set(conflicts)].slice(0,3).join(', ')+') · ยังไม่เขียนทับทั้งสองฉบับ · ปิดการแก้ไขอีกเครื่องแล้วตรวจฉบับล่าสุดก่อน');e.workspaceConflict=true;e.fields=[...new Set(conflicts)];throw e;}
  return out;
 }
 return {reconcile};
})();
if(typeof module!=='undefined')module.exports=WorkspaceSync;
