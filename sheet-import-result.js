/* Explain review and committed import outcomes without changing translations. */
const SheetImportResult=(()=>{
 function fix(issue){
  if(issue.code==='blank')return issue.alreadyTranslated?'มีคำแปลเดิมอยู่แล้ว ระบบเก็บไว้ หากต้องการเปลี่ยนให้กรอก translation แล้วนำเข้าใหม่':'เติมคำแปลในช่อง translation ของแถวนี้ แล้วนำเข้าไฟล์อีกครั้ง';
  if(issue.code==='missing-entry')return 'คืนแถวรหัสนี้จากไฟล์ส่งออกเดิม กรอก translation แล้วนำเข้าใหม่ คำแปลเดิมในระบบจะไม่ถูกลบ';
  if(issue.code==='missing-rows')return 'เทียบจำนวนแถวกับไฟล์ส่งออกเดิม คืนแถวที่หาย หรือส่งเฉพาะชุดย่อยที่ตั้งใจแปล ข้อความที่ไม่อยู่ในไฟล์จะไม่ถูกลบ';
  if(['lines','width','bytes'].includes(issue.code))return 'ย่อคำแปลหรือลดบรรทัดในช่องคำแปลตามรหัสนี้ แล้วตรวจกรอบอีกครั้งก่อนสร้างเกม';
  if(issue.code==='input'&&issue.message.includes('10,000'))return 'ย่อคำแปลให้ไม่เกิน 10,000 ตัวอักษร แล้วนำเข้าใหม่';
  if(['tokens','input'].includes(issue.code))return 'คัดลอกรหัสพิเศษจากต้นฉบับให้ครบและเรียงเหมือนเดิม เช่น {VAR:01} แล้วแก้ช่อง translation';
  if(issue.code==='font')return 'ตรวจอักษรที่ฟอนต์ไม่รองรับหรือความจุฟอนต์ เลือกฟอนต์ที่รองรับ แล้วนำเข้าหรือตรวจอีกครั้ง';
  if(issue.code==='identity')return 'ใช้ไฟล์ส่งออกจาก ROM นี้ คง entry_id, rom_offset, source และ rom_sha256 เดิม หากไฟล์ซ้ำขัดกันให้เลือกเพียงฉบับเดียว';
  return 'ตรวจข้อความตามรายละเอียด แก้ในแถวที่ระบุแล้วนำเข้าใหม่';
 }
 function rows(report){return [...report.issues,...(report.missing||[])].map(i=>({...i,fix:fix(i)}));}
 function needsAttention(report){return !report.parts||report.issues.some(i=>i.severity==='error')||(report.missing||[]).some(i=>i.code!=='blank'||!i.alreadyTranslated);}
 function render(report,applied=false,actions={}){
  const $=id=>document.getElementById(id),out=$('sheetImportOutcome'),list=$('sheetChanges'),parts=report.parts;
  out.replaceChildren();list.replaceChildren();const editorIds=new Set(),identityIds=new Set(report.issues.filter(i=>i.code==='identity').map(i=>Number(i.id))),changesById=new Map(report.changes.map(c=>[Number(c.id),c]));
  const add=(parent,text,kind)=>{const p=document.createElement('p');p.textContent=text;if(kind)p.className='import-'+kind;parent.append(p);return p;};
  if(!applied){const seenFiles=new Map(),changedIds=new Set(report.changes.map(c=>c.id));for(const file of report.sourceFiles||[]){
   const previous=SheetImportHistory.prior(report.project||{},file.hash),sameName=SheetImportHistory.clean(report.project?.excelImports).some(r=>r.name===file.name&&r.hash!==file.hash);
   if(previous){add(out,`${previous.partial?'เคยนำเข้าบางส่วนของไฟล์นี้แล้ว':'เคยนำเข้าไฟล์นี้แล้ว'} · ${file.name} · ${new Date(previous.at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})} · ครั้งก่อนนำเข้า ${previous.accepted} คำแปล${previous.drafts?' / '+previous.drafts+' ร่าง':''}${previous.name!==file.name?' · ชื่อเดิม '+previous.name:''}`,'neutral').classList.add('import-duplicate');const changed=(file.entryIds||[]).filter(id=>changedIds.has(id)).length;if(changed)add(out,`ไฟล์ที่เคยนำเข้านี้ต่างกับงานปัจจุบัน ${changed} รายการ · หากยืนยันนำเข้าอีกครั้ง จะใช้ค่าจากไฟล์`,'neutral');}
   else if(sameName)add(out,`ชื่อไฟล์ ${file.name} เคยใช้แล้ว แต่เนื้อหาเปลี่ยนไป ระบบจะตรวจเป็นไฟล์ฉบับใหม่`,'neutral');
   if(seenFiles.has(file.hash))add(out,`ไฟล์ ${file.name} มีเนื้อหาเหมือน ${seenFiles.get(file.hash)} ในชุดที่เลือก ไม่เพิ่มคำแปลซ้ำ`,'neutral');else seenFiles.set(file.hash,file.name);
  }}
  const changes=parts?.changes||[],drafts=parts?.drafts||[],needsFix=parts?.needsFix||[];
  const summary=[`ตรวจ ${report.files} ไฟล์ · ${report.rows} แถว · เปลี่ยน ${report.changes.length} ข้อความ · ว่าง ${report.blanks} แถว · เหมือนเดิม ${report.unchanged} แถว · ข้อผิดพลาด ${report.errors} จุด`,report.formatted?`จัดบรรทัดอัตโนมัติ ${report.formatted} แถว`:'',report.duplicates?`รวมแถวซ้ำที่เหมือนกัน ${report.duplicates} แถว`:'',parts?`นำเข้าได้ ${changes.length} แถว`:'',parts?.rejected?`ข้ามแถวที่จับคู่ไม่ได้ ${parts.rejected} แถว`:'',needsFix.length?`รวม ${needsFix.length} แถวที่ล้นกรอบ`:'',...(report.fileWarnings||[])].filter(Boolean);$('sheetImportSummary').textContent=summary.join(' · ');
  if(report.repairMessage)add(out,report.repairMessage,'neutral');if(report.expandedTextRows)add(out,`คำอธิบายท่า ${report.expandedTextRows} รายการรองรับพื้นที่ขยาย 256 ไบต์แล้ว · ตรวจขนาดหน้าจอแยกจากจำนวนไบต์`,'neutral');
  const auto=$('sheetAutoFix');if(auto){auto.hidden=applied||!report.changes.length||!report.issues.some(issue=>issue.severity==='error'||issue.code==='glossary');auto.onclick=()=>actions.onRepair?.();}
  const clean=Math.max(0,changes.length-needsFix.length),errors=report.issues.filter(i=>i.severity==='error');
  add(out,applied?`นำเข้าสำเร็จ ${changes.length.toLocaleString()} รายการ · ผ่านเงื่อนไขเกม ${clean.toLocaleString()} รายการ`:`พร้อมนำเข้า ${changes.length.toLocaleString()} รายการ · ผ่านเงื่อนไขเกม ${clean.toLocaleString()} รายการ`,changes.length?'success':'neutral');
  if(!parts)add(out,'ยังนำเข้าชุดนี้ไม่ได้ กรุณาแก้ข้อผิดพลาดด้านล่าง แล้วเลือกไฟล์ใหม่','error');
  if(needsFix.length)add(out,`${needsFix.length} รายการ${applied?'เก็บคำแปลแล้ว':'นำเข้าได้'} แต่ต้องย่อให้พอดีก่อนสร้างเกม`,'error');
  if(drafts.length)add(out,`${drafts.length} รายการ${applied?'เก็บเป็นร่างแล้ว':'จะเก็บเป็นร่าง'} ยังไม่นับว่าแปลแล้ว ต้องแก้โค้ดหรือฟอนต์`,'error');
  if(parts?.rejected)add(out,`ข้ามแถวที่จับคู่ไม่ได้ ${parts.rejected} จุด ไม่เปลี่ยนข้อมูลเดิม`,'error');
  if(report.blanks)add(out,`ช่องคำแปลว่าง ${report.blanks.toLocaleString()} แถว · ไม่ลบคำแปลเดิม ดูแถวที่ต้องเติมด้านล่าง`,'neutral');
  if(!applied&&!report.changes.length&&report.unchanged)add(out,'ข้อมูลคำแปลในไฟล์ตรงกับงานปัจจุบันแล้ว ไม่มีคำแปลใหม่ให้นำเข้า','neutral');
  if(report.unchanged)add(out,`เหมือนคำแปลเดิม ${report.unchanged.toLocaleString()} แถว · ไม่เพิ่มซ้ำ`,'neutral');
  if(!errors.length&&!report.blanks&&!(report.missing||[]).length)add(out,'ข้อมูลในไฟล์ที่นำเข้าครบตามที่ตรวจได้ ไม่พบข้อผิดพลาด','success');
  add(out,'ตรวจเฉพาะไฟล์ที่เลือก หาก AI ลบแถวและแก้จำนวนแถวกำกับด้วย ระบบไม่สามารถยืนยันแถวที่หายได้','neutral');
  const details=rows(report);for(const issue of details.slice(0,300)){
   const block=document.createElement('section');block.className='import-detail';
   add(block,`${issue.file||''} · ${issue.sheet||''} · ${issue.row?'แถว '+issue.row:issue.code==='missing-entry'?'ไม่พบแถวในตาราง':'ระดับไฟล์'}${issue.id?' #'+issue.id:''}`, 'neutral');
   add(block,issue.message,issue.severity==='error'||['missing-rows','missing-entry'].includes(issue.code)||issue.code==='blank'&&!issue.alreadyTranslated?'error':'neutral');if(issue.source)add(block,'ต้นฉบับ: '+issue.source);add(block,'วิธีแก้: '+issue.fix);
   const id=Number(issue.id),change=changesById.get(id),editable=change&&(issue.severity==='error'||issue.code==='glossary')&&!editorIds.has(id)&&!identityIds.has(id);
   if(editable){editorIds.add(id);
    if(applied){const button=document.createElement('button');button.textContent='ไปแก้คำแปลนี้';button.onclick=()=>{document.getElementById('sheetImportDialog').close();window.RomTranslateBridge?.goToEntry(id);};block.append(button);}
    else if(actions.onRepair){const label=document.createElement('label');label.textContent='คำแปล — แก้ได้ที่นี่';const input=document.createElement('textarea');input.value=change.translation;input.maxLength=10000;input.dataset.repairId=String(id);input.rows=3;label.append(input);block.append(label);const button=document.createElement('button');button.textContent='ตรวจและใช้คำแก้';button.dataset.repairApply=String(id);button.onclick=()=>actions.onRepair({id,text:input.value});block.append(button);}
   }
   list.append(block);
  }
  if(details.length>300)add(list,`แสดง 300 / ${details.length.toLocaleString()} จุด ดาวน์โหลดรายการที่ต้องแก้เพื่อดูทั้งหมด`,'neutral');
  for(const change of changes.slice(0,30))add(list,`#${change.id} → ${change.translation}`,'success');
  $('sheetReport').disabled=!details.length;
 }
 return {render,rows,fix,needsAttention};
})();
if(typeof module!=='undefined')module.exports=SheetImportResult;
