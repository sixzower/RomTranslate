/* Reconcile one shared ROM workspace without turning existing translations blank. */
const WorkspaceSync=(()=>{
 const imports=typeof SheetImportHistory!=='undefined'?SheetImportHistory:require('./sheet-import-history');
 const fields=['translation','speaker','literal','contextual','translationChoice'];
 const stable=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))):v;
 const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 function mergeTasks(local,remote,base){
  const left=new Map((local.workTasks||[]).map(t=>[t.id,t])),right=new Map((remote.workTasks||[]).map(t=>[t.id,t])),before=new Map((base?.workTasks||[]).map(t=>[t.id,t]));
  const tasks=[],terminal=s=>['completed','cancelled'].includes(s);
  for(const id of new Set([...right.keys(),...left.keys()])){
   const l=left.get(id),r=right.get(id),b=before.get(id);let task;
   if(!l||!r){const remaining=l||r;if(b&&equal(remaining,b))continue;task=structuredClone(remaining);if(b&&task.status==='active')task.status='paused';}
   else if(equal(l,r)||b&&equal(l,b))task=structuredClone(r);
   else if(b&&equal(r,b))task=structuredClone(l);
   else{
    // Scope definitions stay coherent. Concurrent settings use the confirmed
    // cloud copy; independent tasks/edits and the local cursor are preserved.
    task=structuredClone(r);
    if(b&&equal(r.name,b.name))task.name=l.name;
    const scope=t=>[t.entryIds,t.filter,t.exportOptions];
    if(b&&equal(scope(r),scope(b)))for(const key of ['entryIds','filter','exportOptions'])task[key]=structuredClone(l[key]);
    if(terminal(l.status)&&!terminal(r.status))task.status=l.status;
    else if(!terminal(r.status)&&b&&r.status===b.status)task.status=l.status;
    task.updatedAt=Math.max(l.updatedAt,r.updatedAt);
    if(l.position!==undefined)task.position=l.position;
   }
   if(l&&r&&terminal(r.status)&&!terminal(l.status))task.status=r.status;
   if(l&&r&&terminal(l.status)&&!terminal(r.status))task.status=l.status;
   if(task.position!==undefined&&!task.entryIds.includes(task.position))task.position=task.entryIds[0];
   tasks.push(task);
  }
  if(tasks.length>100)throw Error('รวมชุดงานแล้วเกิน 100 ชุด · คำแปลยังอยู่ กรุณาลบชุดงานที่เลิกใช้ก่อนสำรอง');
  const preferred=base&&local.activeWorkTask===base.activeWorkTask?remote.activeWorkTask:local.activeWorkTask;
  const active=[preferred,remote.activeWorkTask,...tasks.map(t=>t.id)].find(id=>tasks.some(t=>t.id===id&&t.status==='active'))||null;
  for(const task of tasks)if(task.status==='active'&&task.id!==active)task.status='paused';
  return {workTasks:tasks,activeWorkTask:active};
 }
 function reconcile(local,remote,base=null,choices={}){
  if(local.romHash!==remote.romHash)throw Error('โปรเจกต์หลักใช้ ROM คนละไฟล์ · งานในเครื่องยังอยู่');
  const byOffset=p=>new Map((p?.entries||[]).map(e=>[e.romOffset,e]));
  const left=byOffset(local),right=byOffset(remote),before=byOffset(base?.romHash===local.romHash?base:null),out=structuredClone(remote),conflicts=[],details=[];
  const choose=(l,r,b,known,label,key=label)=>{
   if(equal(l,r))return l;
   if(known&&equal(l,b))return r;
   if(known&&equal(r,b))return l;
   if(l==null||l==='')return r;
   if(r==null||r==='')return l;
   if(choices[key]==='local')return structuredClone(l);if(choices[key]==='remote')return structuredClone(r);
   conflicts.push(label);details.push({key,label,local:l,remote:r});return r;
  };
  out.entries=[...new Set([...right.keys(),...left.keys()])].map(offset=>{
   const l=left.get(offset),r=right.get(offset),b=before.get(offset);
   if(!l)return structuredClone(r);if(!r)return structuredClone(l);
   if(l.source!==r.source||l.id!==r.id)throw Error('ข้อความต้นฉบับไม่ตรงกันที่ $'+Number(offset).toString(16));
   const row={...r};for(const f of fields)row[f]=choose(l[f]||'',r[f]||'',b?.[f]||'',!!base&&(!b||b.source===l.source),String(l.id),String(l.id)+':'+f);return row;
  });
  for(const key of ['font','glossary','genre','progressCategories']){
   out[key]=choose(local[key],remote[key],base?.[key],!!base,key);
  }
  Object.assign(out,mergeTasks(local,remote,base));out.excelImports=imports.merge(local.excelImports,remote.excelImports);
  // Per-device navigation is not a conflicting edit to the shared translation.
  out.viewState=structuredClone(local.viewState||remote.viewState);
  if(conflicts.length){const e=Error('แก้ข้อมูลเดียวกันต่างกัน '+new Set(conflicts).size+' จุด ('+[...new Set(conflicts)].slice(0,3).join(', ')+') · ยังไม่เขียนทับทั้งสองฉบับ · ปิดการแก้ไขอีกเครื่องแล้วตรวจฉบับล่าสุดก่อน');e.workspaceConflict=true;e.fields=[...new Set(conflicts)];e.details=details;throw e;}
  return out;
 }
 return {reconcile};
})();
if(typeof module!=='undefined')module.exports=WorkspaceSync;
