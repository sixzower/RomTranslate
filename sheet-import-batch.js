/* Review all selected workbooks before changing the project. */
const SheetImportBatch=(()=>{
 function joinSoftLines(text){return text.replace(/(\S)[ \t]*\n[ \t]*(?=\S)/g,(match,last,offset,whole)=>last+(/[ก-๛]/.test(last)&&/[ก-๛]/.test(whole[offset+match.length])?'':' '));}
 function layoutText(entry,text,rom){
  const spec=RomCore.screen(entry);if(!entry.verified||spec.scroll||entry.translationChoice==='keep-source')return text;
  try{
   let result=RomCore.layoutEntry(entry,text,rom),metrics=RomCore.pixelMetrics(result,rom);
   if(metrics.lines>spec.lines){
    // Retain paragraph boundaries, control blocks and every word while reflowing soft line breaks.
    const joined=text.split(/(\{[^}]*\})/g).map(part=>part.startsWith('{')?part:joinSoftLines(part)).join('');
    const candidate=RomCore.layoutEntry(entry,joined,rom),next=RomCore.pixelMetrics(candidate,rom);
    if(next.lines<metrics.lines&&next.width<=spec.width)result=candidate;
   }
   return result;
  }catch{return text;}
 }
 // Layout first, then (only for rows that still overflow) lossless spacing/reflow fixes by default.
 function formatText(entry,text,rom,glossary,level='safe'){
  const laid=layoutText(entry,text,rom);
  if(typeof TextFitter==='undefined'||!entry.verified||entry.translationChoice==='keep-source')return laid;
  try{
   const fitted=TextFitter.fit(entry,laid,{check:value=>TranslationQuality.entry(entry,value,rom,glossary),level});
   return fitted.changed?layoutText(entry,fitted.text,rom):laid;
  }catch{return laid;}
 }
 function canonicalText(entry,text){
  const key=t=>t.replace(/[｛｝]/g,c=>c==='｛'?'{':'}').replace(/\s+/g,'').toUpperCase();
  const known=new Map(RomCore.tokens(entry.source).map(token=>[key(token),token]));
  return text.normalize('NFC').replace(/\{[^{}]+\}|｛[^｛｝]+｝/g,token=>known.get(key(token))||token).split(/(\{[^}]*\})/g).map(part=>part.startsWith('{')?part:part.replace(/\\n/g,'\n').replace(/\u00a0/g,' ').replace(/[“”]/g,'"').replace(/[‘’]/g,"'")).join('');
 }
 function sameControls(entry,before,after){const tokens=JSON.stringify(RomCore.tokens(after));return tokens===JSON.stringify(RomCore.tokens(before))||tokens===JSON.stringify(RomCore.tokens(entry.source));}
 async function review(files,project,rom,progress){
  if(files.length>100)throw Error('เลือกได้ครั้งละไม่เกิน 100 ไฟล์');
  if(files.reduce((n,f)=>n+f.size,0)>128*1024*1024)throw Error('ขนาดไฟล์รวมต้องไม่เกิน 128 MB');
  const result={allowPartial:true,changes:[],issues:[],missing:[],warnings:[],fileWarnings:[],entryIds:[],rows:0,blanks:0,unchanged:0,duplicates:0,formatted:0,formattedIds:[],sourceFiles:[],files:files.length,filename:files.length===1?files[0].name:`Excel ${files.length} ไฟล์`,scope:''},changes=new Map(),ids=new Set(),origins=new Map();
  for(let i=0;i<files.length;i++){
   const file=files[i];progress.file(i,file.name);progress.check();
   try{
    if(file.size>32*1024*1024)throw Error('ไฟล์ต้องไม่เกิน 32 MB');
    // Per-file pass validates identity/tokens; layout and font allocation run once
    // across the combined files and existing project below.
    const data=await progress.read(file),report=await TranslationSheet.readXlsx(data,project,project.entries,{review:true,rom,deferProjectFonts:true,deferChecks:true,onProgress:progress.update});
    const hash=await RomCore.fingerprint(new Uint8Array(data));progress.check();result.sourceFiles.push({hash,name:file.name,entryIds:report.entryIds,rows:report.rows,blanks:report.blanks,unchanged:report.unchanged});
    result.missing.push(...(report.missing||[]).map(item=>({...item,file:file.name})));result.rows+=report.rows;result.blanks+=report.blanks;result.unchanged+=report.unchanged;
    result.fileWarnings.push(...(report.fileWarnings||[]).map(s=>file.name+': '+s));
    result.issues.push(...report.issues.map(issue=>({...issue,file:file.name})));
    for(const id of report.entryIds)ids.add(id);
    for(const c of report.changes){
     if(changes.has(c.id)){
      const old=changes.get(c.id);
      if(['translation','translationChoice','speaker'].every(k=>(old[k]||'')===(c[k]||'')))result.duplicates++;
      else result.issues.push({file:file.name,row:0,id:c.id,severity:'error',code:'identity',message:`คำแปลซ้ำขัดกันกับ ${origins.get(c.id)} กรุณาเลือกฉบับเดียวแล้วนำเข้าใหม่`});
     }else{changes.set(c.id,{...c,file:file.name});origins.set(c.id,file.name);}
    }
   }catch(e){if(e.name==='AbortError')throw e;result.issues.push({file:file.name,row:0,id:'',severity:'error',code:'identity',message:e.message});}
  }
  progress.check();result.changes=[...changes.values()];result.entryIds=[...ids];
  return validate(result,project,rom,progress);
 }
 async function validate(result,project,rom,progress={check(){},combined(){}}){
  result.entryChecks=[];
  const formattedIds=new Set(result.formattedIds||[]);
  const changes=new Map(result.changes.map(c=>[c.id,c])),origins=new Map(result.changes.map(c=>[c.id,c.file]));
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
    if(change&&!unsafe.has(entry.id)){const formatted=formatText({...entry,translationChoice:change.translationChoice},change.translation,rom,project.glossary);if(formatted!==change.translation){change.translation=formatted;formattedIds.add(entry.id);}}
    const text=change?.translation||entry.translation;if(!text?.trim())continue;
    const checked=TranslationQuality.entry(change?{...entry,translationChoice:change.translationChoice}:entry,text,rom,project.glossary,allocator);
    if(change)result.entryChecks.push({id:entry.id,offset:entry.offset,category:entry.category,source:entry.source,bytes:checked.bytes,limit:entry.capacity||entry.maxBytes||null,originalLength:entry.originalLength,expanded:!!(entry.moveTextExpansion||entry.linkMessageBox),width:checked.metrics?.width,lines:checked.metrics?.lines,maxWidth:checked.spec.width,maxLines:checked.spec.lines,scroll:checked.spec.scroll,errors:checked.issues.filter(issue=>issue.severity==='error').length});
    if(change)for(const issue of checked.issues)result.issues.push({file:origins.get(entry.id),row:change.row,id:entry.id,offset:entry.offset,category:entry.category,source:entry.source,translation:text,sheet:change.sheet,...issue});
    else if(checked.issues.some(x=>x.code==='font'&&x.message.includes('ฟอนต์เต็ม')))result.issues.push({row:0,id:entry.id,severity:'error',code:'font',message:'คำแปลรวมทั้งโปรเจกต์ใช้ฟอนต์เกินความจุ'});
   }
  }
  // A prior import may have normalized Thai clusters or line wrapping. Compare
  // the final text, not the pre-layout spreadsheet text, before offering changes.
  const byId=new Map(project.entries.map(entry=>[entry.id,entry])),blockedIds=new Set(result.issues.filter(i=>['identity','input'].includes(i.code)).map(i=>Number(i.id)));let unchanged=0;
  result.changes=result.changes.filter(change=>{const entry=byId.get(change.id),blocked=blockedIds.has(change.id);const same=!blocked&&entry&&['translation','translationChoice','speaker'].every(key=>(change[key]||'')===(entry[key]||''));if(same)unchanged++;return !same;});result.unchanged+=unchanged;
  progress.combined?.(1,1);
  const expandedIds=new Set(project.entries.filter(entry=>entry.moveTextExpansion).map(entry=>entry.id));result.expandedTextRows=result.changes.filter(change=>expandedIds.has(change.id)).length;
  const linkIds=new Set(project.entries.filter(entry=>entry.linkMessageBox).map(entry=>entry.id));result.expandedLinkRows=result.changes.filter(change=>linkIds.has(change.id)).length;
  result.formattedIds=[...formattedIds];result.formatted=formattedIds.size;
  result.errors=result.issues.filter(i=>i.severity==='error').length;
  result.warnings=result.issues.filter(i=>i.severity!=='error');progress.check();return result;
 }
 function candidates(entry,text,rom,glossary,level='compact'){
  const clean=canonicalText(entry,text).replace(/\r\n?/g,'\n').replace(/[\u200b\ufeff]/g,'').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim();
  const values=[clean];
  if(entry.family==='menu')values.push(clean.replace(/กรุณารอสักครู่/g,'โปรดรอ').replace(/กรุณาเลือก/g,'เลือก').replace(/ทำการบันทึก/g,'บันทึก').replace(/ไม่สามารถที่จะ/g,'ไม่สามารถ').replace(/คุณต้องการที่จะ/g,'ต้องการ'));
  if(!RomCore.screen(entry).scroll)values.push(clean.split(/(\{[^}]*\})/g).map(part=>part.startsWith('{')?part:joinSoftLines(part)).join(''));
  // Apply only user-supplied terminology, outside control-code blocks.
  const terms=(glossary||'').split('\n').map(line=>line.split('=')).filter(parts=>parts.length===2&&/^[A-Za-z][A-Za-z -]*$/.test(parts[0].trim())&&parts[1].trim());
  for(const value of [...values])values.push(value.split(/(\{[^}]*\})/g).map(part=>part.startsWith('{')?part:terms.reduce((out,[from,to])=>out.replace(new RegExp('\\b'+from.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','gi'),()=>to.trim()),part)).join(''));
  // Byte/pixel/line overflow: least to most invasive fitting, each kept only if it improves the row.
  if(typeof TextFitter!=='undefined'&&entry.verified){
   const check=value=>TranslationQuality.entry(entry,value,rom,glossary);
   for(const step of TextFitter.levels.slice(0,Math.max(0,TextFitter.levels.indexOf(level))+1)){try{values.push(TextFitter.fit(entry,clean,{check,level:step}).text);}catch{}}
  }
  return [...new Set(values.map(value=>formatText(entry,value,rom,glossary)))].filter(value=>value&&sameControls(entry,text,value));
 }
 async function repair(report,project,rom,edit,progress={check(){},combined(){}}){
  const result={...report,changes:report.changes.map(c=>({...c})),issues:report.issues.map(i=>({...i})),missing:(report.missing||[]).map(i=>({...i})),formatted:report.formatted||0};
  const byId=new Map(project.entries.map(e=>[e.id,e]));let fixed=0;
  if(edit){
   const change=result.changes.find(c=>c.id===edit.id);
   if(!change||result.issues.some(i=>i.code==='identity'&&Number(i.id)===edit.id))throw Error('แถวนี้จับคู่กับต้นฉบับไม่ได้ ต้องใช้ตารางต้นฉบับที่ถูกต้อง');
   if(typeof edit.text!=='string'||!edit.text.trim()||edit.text.length>10000)throw Error('กรอกคำแปล 1–10,000 ตัวอักษร');
   change.translation=edit.text;change.translationChoice='';result.issues=result.issues.filter(i=>!(Number(i.id)===edit.id&&i.code==='input'));
  }else{
   const problemIds=new Set(result.issues.map(i=>Number(i.id)));
   const blocked=new Set(result.issues.filter(i=>i.code==='identity'||i.code==='input').map(i=>Number(i.id)));
   for(let i=0;i<result.changes.length;i++){
    progress.check();if(i%30===0){progress.combined(i,result.changes.length);await new Promise(resolve=>setTimeout(resolve,0));progress.check();}
    const change=result.changes[i],entry=byId.get(change.id);if(!entry||!problemIds.has(change.id)||blocked.has(change.id)||change.translationChoice==='keep-source')continue;
    const alternatives=candidates(entry,change.translation,rom,project.glossary,progress.level).filter(text=>text!==change.translation);if(!alternatives.length)continue;
    const score=text=>{const r=TranslationQuality.entry(entry,text,rom,project.glossary);return [r.issues.filter(i=>i.severity==='error').length,r.issues.filter(i=>i.severity!=='error').length,r.bytes||Infinity];};
    let best=score(change.translation),text=change.translation;
    for(const candidate of alternatives){const next=score(candidate);if(next[0]<best[0]||next[0]===best[0]&&(next[1]<best[1]||next[1]===best[1]&&next[2]<best[2])){best=next;text=candidate;if(!best[0]&&!best[1])break;}}
    if(text!==change.translation){change.translation=text;fixed++;}
   }
  }
  await validate(result,project,rom,progress);result.repairMessage=edit?'ตรวจคำแก้แล้ว ดูผลล่าสุดด้านล่าง':`แก้อัตโนมัติ ${fixed} รายการ · จัดบรรทัดตามคำ ลดช่องว่าง ย่อคำให้กระชับตามระดับที่เลือก และใช้ศัพท์ที่กำหนด · ไม่ตัดเนื้อหาทิ้งหรือเดาตำแหน่งโค้ด`;return result;
 }
 return {review,formatText,repair,sameControls};
})();

if(typeof module!=="undefined")module.exports=SheetImportBatch;
