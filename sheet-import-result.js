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
 function render(report,applied=false){
  const $=id=>document.getElementById(id),out=$('sheetImportOutcome'),list=$('sheetChanges'),parts=report.parts;
  out.replaceChildren();list.replaceChildren();
  const add=(parent,text,kind)=>{const p=document.createElement('p');p.textContent=text;if(kind)p.className='import-'+kind;parent.append(p);return p;};
  const changes=parts?.changes||[],drafts=parts?.drafts||[],needsFix=parts?.needsFix||[];
  const clean=Math.max(0,changes.length-needsFix.length),errors=report.issues.filter(i=>i.severity==='error');
  add(out,applied?`นำเข้าสำเร็จ ${changes.length.toLocaleString()} รายการ · ผ่านเงื่อนไขเกม ${clean.toLocaleString()} รายการ`:`พร้อมนำเข้า ${changes.length.toLocaleString()} รายการ · ผ่านเงื่อนไขเกม ${clean.toLocaleString()} รายการ`,changes.length?'success':'neutral');
  if(!parts)add(out,'ยังนำเข้าชุดนี้ไม่ได้ กรุณาแก้ข้อผิดพลาดด้านล่าง แล้วเลือกไฟล์ใหม่','error');
  if(needsFix.length)add(out,`${needsFix.length} รายการ${applied?'เก็บคำแปลแล้ว':'นำเข้าได้'} แต่ต้องย่อให้พอดีก่อนสร้างเกม`,'error');
  if(drafts.length)add(out,`${drafts.length} รายการ${applied?'เก็บเป็นร่างแล้ว':'จะเก็บเป็นร่าง'} ยังไม่นับว่าแปลแล้ว ต้องแก้โค้ดหรือฟอนต์`,'error');
  if(parts?.rejected)add(out,`ข้ามแถวที่จับคู่ไม่ได้ ${parts.rejected} จุด ไม่เปลี่ยนข้อมูลเดิม`,'error');
  if(report.blanks)add(out,`ช่องคำแปลว่าง ${report.blanks.toLocaleString()} แถว · ไม่ลบคำแปลเดิม ดูแถวที่ต้องเติมด้านล่าง`,'neutral');
  if(report.unchanged)add(out,`เหมือนคำแปลเดิม ${report.unchanged.toLocaleString()} แถว · ไม่เพิ่มซ้ำ`,'neutral');
  if(!errors.length&&!report.blanks&&!(report.missing||[]).length)add(out,'ข้อมูลในไฟล์ที่นำเข้าครบตามที่ตรวจได้ ไม่พบข้อผิดพลาด','success');
  add(out,'ตรวจเฉพาะไฟล์ที่เลือก หาก AI ลบแถวและแก้จำนวนแถวกำกับด้วย ระบบไม่สามารถยืนยันแถวที่หายได้','neutral');
  const details=rows(report);for(const issue of details.slice(0,300)){
   const block=document.createElement('section');block.className='import-detail';
   add(block,`${issue.file||''} · ${issue.sheet||''} · ${issue.row?'แถว '+issue.row:issue.code==='missing-entry'?'ไม่พบแถวในตาราง':'ระดับไฟล์'}${issue.id?' #'+issue.id:''}`, 'neutral');
   add(block,issue.message,issue.severity==='error'||['missing-rows','missing-entry'].includes(issue.code)||issue.code==='blank'&&!issue.alreadyTranslated?'error':'neutral');if(issue.source)add(block,'ต้นฉบับ: '+issue.source);add(block,'วิธีแก้: '+issue.fix);list.append(block);
  }
  if(details.length>300)add(list,`แสดง 300 / ${details.length.toLocaleString()} จุด ดาวน์โหลดรายการที่ต้องแก้เพื่อดูทั้งหมด`,'neutral');
  for(const change of changes.slice(0,30))add(list,`#${change.id} → ${change.translation}`,'success');
  $('sheetReport').disabled=!details.length;
 }
 return {render,rows,fix};
})();
if(typeof module!=='undefined')module.exports=SheetImportResult;
