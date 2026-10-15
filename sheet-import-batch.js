/* Review all selected workbooks before changing the project. */
const SheetImportBatch=(()=>{
 async function review(files,project,rom,progress){
  if(files.length>100)throw Error('เลือกได้ครั้งละไม่เกิน 100 ไฟล์');
  if(files.reduce((n,f)=>n+f.size,0)>128*1024*1024)throw Error('ขนาดไฟล์รวมต้องไม่เกิน 128 MB');
  const result={allowPartial:true,changes:[],issues:[],warnings:[],fileWarnings:[],entryIds:[],rows:0,blanks:0,unchanged:0,duplicates:0,files:files.length,filename:files.length===1?files[0].name:`Excel ${files.length} ไฟล์`,scope:''},changes=new Map(),ids=new Set(),origins=new Map();
  for(let i=0;i<files.length;i++){
   const file=files[i];progress.file(i,file.name);progress.check();
   try{
    if(file.size>32*1024*1024)throw Error('ไฟล์ต้องไม่เกิน 32 MB');
    const data=await progress.read(file),report=await TranslationSheet.readXlsx(data,project,project.entries,{review:true,rom,deferProjectFonts:true,onProgress:progress.update});
    result.rows+=report.rows;result.blanks+=report.blanks;result.unchanged+=report.unchanged;
    result.fileWarnings.push(...(report.fileWarnings||[]).map(s=>file.name+': '+s));
    result.issues.push(...report.issues.map(issue=>({...issue,file:file.name})));
    for(const id of report.entryIds)ids.add(id);
    for(const c of report.changes){
     if(changes.has(c.id)){
      const old=changes.get(c.id);
      if(['translation','translationChoice','speaker'].every(k=>(old[k]||'')===(c[k]||'')))result.duplicates++;
      else result.issues.push({file:file.name,row:0,id:c.id,severity:'error',code:'identity',message:`คำแปลซ้ำขัดกันกับ ${origins.get(c.id)} กรุณาเลือกฉบับเดียวแล้วนำเข้าใหม่`});
     }else{changes.set(c.id,c);origins.set(c.id,file.name);}
    }
   }catch(e){if(e.name==='AbortError')throw e;result.issues.push({file:file.name,row:0,id:'',severity:'error',code:'identity',message:e.message});}
  }
  progress.check();result.changes=[...changes.values()];result.entryIds=[...ids];
  // Font allocation is shared across every file and existing translation.
  if(rom){
   result.issues=result.issues.filter(i=>['identity','input'].includes(i.code));
   const allocator=RomCore.fontAllocator(rom,project.entries);
   for(let i=0;i<project.entries.length;i++){
    if(i%200===0){progress.combined(i,project.entries.length);await new Promise(resolve=>setTimeout(resolve,0));}
    const entry=project.entries[i],change=changes.get(entry.id),text=change?.translation||entry.translation;if(!text?.trim())continue;
    const checked=TranslationQuality.entry(change?{...entry,translationChoice:change.translationChoice}:entry,text,rom,project.glossary,allocator);
    if(change)for(const issue of checked.issues)result.issues.push({file:origins.get(entry.id),row:change.row,id:entry.id,offset:entry.offset,category:entry.category,source:entry.source,translation:text,sheet:change.sheet,...issue});
    else if(checked.issues.some(x=>x.code==='font'&&x.message.includes('ฟอนต์เต็ม')))result.issues.push({row:0,id:entry.id,severity:'error',code:'font',message:'คำแปลรวมทั้งโปรเจกต์ใช้ฟอนต์เกินความจุ'});
   }
  }
  result.errors=result.issues.filter(i=>i.severity==='error').length;
  result.warnings=result.issues.filter(i=>i.severity!=='error');progress.check();return result;
 }
 return {review};
})();
