/* Small project-scoped receipts; only a confirmed apply records a file. */
const SheetImportHistory=(()=>{
 const limit=500,validHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),count=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000;
 function clean(rows){return (Array.isArray(rows)?rows:[]).slice(-limit).filter(r=>r&&validHash(r.hash)&&typeof r.name==='string'&&r.name.length<=200&&Number.isFinite(r.at)&&r.at>0&&r.at<=8640000000000000&&['accepted','drafts','needsFix'].every(k=>count(r[k]))).map(r=>({hash:r.hash,name:r.name,at:r.at,accepted:r.accepted,drafts:r.drafts,needsFix:r.needsFix,partial:r.partial===true}));}
 function merge(...lists){const receipts=new Map();for(const list of lists)for(const row of clean(list)){const old=receipts.get(row.hash);if(!old||row.at>old.at||row.at===old.at&&JSON.stringify(row)>JSON.stringify(old))receipts.set(row.hash,row);}return [...receipts.values()].sort((a,b)=>a.at-b.at||a.hash.localeCompare(b.hash)).slice(-limit);}
 function prior(project,hash){return merge(project.excelImports).find(r=>r.hash===hash);}
 function record(project,report){
  if(!report.parts)throw Error('ยังไม่ได้ยืนยันชุดคำแปลที่นำเข้า');
  const accepted=new Set(report.parts.changes.map(c=>c.id)),drafts=new Set(report.parts.drafts.map(c=>c.id)),needsFix=new Set(report.parts.needsFix),at=Date.now(),receipts=[];
  for(const file of report.sourceFiles||[]){
   const ids=file.entryIds||[],done=ids.filter(id=>accepted.has(id)).length,draft=ids.filter(id=>drafts.has(id)).length,fix=ids.filter(id=>needsFix.has(id)).length;
   if(!done&&!draft)continue;
   receipts.push({hash:file.hash,name:file.name.slice(0,200),at,accepted:done,drafts:draft,needsFix:fix,partial:!!(draft||fix||file.blanks||report.issues.some(i=>i.severity==='error'&&i.file===file.name))});
  }
  project.excelImports=merge(project.excelImports,receipts);
 }
 return {clean,merge,prior,record,limit};
})();
if(typeof module!=='undefined')module.exports=SheetImportHistory;
