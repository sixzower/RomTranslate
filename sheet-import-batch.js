/* Review all selected workbooks before changing the project. */
const SheetImportBatch=(()=>{
 function formatText(entry,text,rom){
  const spec=RomCore.screen(entry);
  if(!entry.verified||!spec.wrap||spec.scroll||/[{}]/.test(text)||entry.translationChoice==='keep-source')return text;
  try{
   let result=RomCore.layoutEntry(entry,text,rom),metrics=RomCore.pixelMetrics(result,rom);
   if(metrics.lines>spec.lines){
    // Join only single manual line breaks; retain blank paragraphs and every word/code.
    const joined=text.replace(/(\S)[ \t]*\n[ \t]*(?=\S)/g,(match,last,offset,whole)=>last+(/[\u0e00-\u0e7f]/.test(last)&&/[\u0e00-\u0e7f]/.test(whole[offset+match.length])?'':' '));
    const candidate=RomCore.layoutEntry(entry,joined,rom),next=RomCore.pixelMetrics(candidate,rom);
    if(next.lines<metrics.lines&&next.width<=spec.width)result=candidate;
   }
   return result;
  }catch{return text;}
 }
 async function review(files,project,rom,progress){
  if(files.length>100)throw Error('เลือกได้ครั้งละไม่เกิน 100 ไฟล์');
  if(files.reduce((n,f)=>n+f.size,0)>128*1024*1024)throw Error('ขนาดไฟล์รวมต้องไม่เกิน 128 MB');
  const result={allowPartial:true,changes:[],issues:[],missing:[],warnings:[],fileWarnings:[],entryIds:[],rows:0,blanks:0,unchanged:0,duplicates:0,formatted:0,files:files.length,filename:files.length===1?files[0].name:`Excel ${files.length} ไฟล์`,scope:''},changes=new Map(),ids=new Set(),origins=new Map();
  for(let i=0;i<files.length;i++){
   const file=files[i];progress.file(i,file.name);progress.check();
   try{
    if(file.size>32*1024*1024)throw Error('ไฟล์ต้องไม่เกิน 32 MB');
    // Per-file pass validates identity/tokens; layout and font allocation run once
    // across the combined files and existing project below.
    const data=await progress.read(file),report=await TranslationSheet.readXlsx(data,project,project.entries,{review:true,rom,deferProjectFonts:true,deferChecks:true,onProgress:progress.update});
    result.missing.push(...(report.missing||[]).map(item=>({...item,file:file.name})));result.rows+=report.rows;result.blanks+=report.blanks;result.unchanged+=report.unchanged;
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
   const unsafe=new Set(result.issues.filter(issue=>issue.severity==='error'&&['identity','input'].includes(issue.code)).map(issue=>Number(issue.id)));
   const allocator=RomCore.fontAllocator(rom,project.entries);
   const candidates=project.entries.filter(entry=>changes.has(entry.id)||entry.translation?.trim());
   let yielded=performance.now();
   for(let i=0;i<candidates.length;i++){
    progress.check();
    if(i===0||i%200===0||i%32===0&&performance.now()-yielded>=16){progress.combined(i,candidates.length);await new Promise(resolve=>setTimeout(resolve,0));yielded=performance.now();}
    const entry=candidates[i],change=changes.get(entry.id);
    if(change&&!unsafe.has(entry.id)){const formatted=formatText({...entry,translationChoice:change.translationChoice},change.translation,rom);if(formatted!==change.translation){change.translation=formatted;result.formatted++;}}
    const text=change?.translation||entry.translation;if(!text?.trim())continue;
    const checked=TranslationQuality.entry(change?{...entry,translationChoice:change.translationChoice}:entry,text,rom,project.glossary,allocator);
    if(change)for(const issue of checked.issues)result.issues.push({file:origins.get(entry.id),row:change.row,id:entry.id,offset:entry.offset,category:entry.category,source:entry.source,translation:text,sheet:change.sheet,...issue});
    else if(checked.issues.some(x=>x.code==='font'&&x.message.includes('ฟอนต์เต็ม')))result.issues.push({row:0,id:entry.id,severity:'error',code:'font',message:'คำแปลรวมทั้งโปรเจกต์ใช้ฟอนต์เกินความจุ'});
   }
  }
  progress.combined?.(1,1);
  result.errors=result.issues.filter(i=>i.severity==='error').length;
  result.warnings=result.issues.filter(i=>i.severity!=='error');progress.check();return result;
 }
 return {review,formatText};
})();

if(typeof module!=="undefined")module.exports=SheetImportBatch;
