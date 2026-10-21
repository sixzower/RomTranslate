/* Compact navigation; technical details remain available on demand. */
const UiShell = (() => {
  const $=id=>document.getElementById(id);
  function familyOf(value,p){if(value==='all'||value==='proper-names')return value;if(FAMILY_NAMES[value])return value;if(value.startsWith('work:'))return TranslationProgress.definition(value)?.family||'all';return p?.entries.find(e=>e.category===value)?.family||'all';}
  function syncCategories(){
    const p=RomTranslateBridge.project(),select=$('categoryFilter'),family=familyOf(select.value,p),counts=categoryCounts(),detail=$('categoryDetail'),chosen=select.selectedOptions[0];
    if(chosen?.dataset.detailOption)detail.checked=true;detail.disabled=!p;
    const main=$('familyFilter');main.replaceChildren(new Option('ทุกหมวด','all'));
    for(const [key,label]of Object.entries(FAMILY_NAMES)){const row=counts.get(key);if(row?.total)main.add(new Option(label+' · '+(row.editable||row.total).toLocaleString(),key));}
    if(counts.get('proper-names')?.total)main.add(new Option('ชื่อเฉพาะ · แนะนำคงอังกฤษ · '+counts.get('proper-names').total.toLocaleString(),'proper-names'));main.value=family;main.disabled=!p;select.disabled=!p;
    for(const option of select.options){const own=familyOf(option.value,p),row=counts.get(option.value)||{},isWork=option.dataset.workOption,def=TranslationProgress.definition(option.value),policy=isWork?TranslationProgress.policy(def?.categories?.[0]||option.value):TranslationProgress.policy(option.value),related=family==='all'||own===family||family==='proper-names'&&policy==='keep';option.hidden=!related||!!option.dataset.detailOption&&!detail.checked;const label=option.value==='all'?'ทุกข้อความ':FAMILY_NAMES[option.value]?(family==='all'?FAMILY_NAMES[option.value]:'ทั้งหมดในหมวดนี้'):option.dataset.detailOption&&family!=='all'?option.value.split(' / ').slice(1).join(' / ')||option.value:categoryLabel(option.value);option.textContent=label+' · '+(row.editable||row.total||0).toLocaleString()+(isWork?' · เหลือ '+Math.max(0,(row.selectedTotal||0)-(row.selectedDone||0)).toLocaleString():'');}
    for(const group of select.querySelectorAll('optgroup'))group.hidden=![...group.children].some(o=>!o.hidden);
    $('categoryGuide').hidden=!p;if(p){const value=select.value,def=value.startsWith('work:')?TranslationProgress.definition(value):null,raw=chosen?.dataset.detailOption,kind=family==='unclassified'?'readonly':value==='proper-names'?'keep':def?TranslationProgress.policy(def.categories[0]):raw?TranslationProgress.policy(value):'mixed';$('categoryGuide').dataset.policy=kind;$('categoryGuideTitle').textContent=categoryLabel(value);$('categoryGuidePolicy').textContent={translate:'แนะนำแปล',keep:'แนะนำคงอังกฤษ',optional:'เลือกตามสไตล์',readonly:'อ่านอย่างเดียว',mixed:'เลือกกลุ่มงานเพื่อจำกัดข้อความ'}[kind];$('categoryGuideHint').textContent=def?.hint||(kind==='readonly'?'ข้อมูลส่วนนี้ยังไม่ยืนยันวิธีเขียนกลับ ไม่รวมเปอร์เซ็นต์และ Excel':raw?'เลือกเฉพาะหมวดย่อยนี้ โดยเก็บรหัสข้อความเดิมไว้':value==='proper-names'?'รวมชื่อเฉพาะไว้ดูด้วยกัน คำอธิบายอยู่ในหมวดเกมแต่ละประเภท':'ตัวเลข “เหลือ” นับเฉพาะหมวดที่เลือกในเป้าหมาย ชื่อและคำอธิบายแยกจากกัน');}
    window.WorkManager?.renderCurrent();
  }
  $('categoryDetail').onchange=()=>{if(!$('categoryDetail').checked&&$('categoryFilter').selectedOptions[0]?.dataset.detailOption){const current=$('categoryFilter').value;$('categoryFilter').value=TranslationProgress.definition(current)?.key||familyOf(current,RomTranslateBridge.project());$('categoryFilter').dispatchEvent(new Event('change',{bubbles:true}));}else syncCategories();};
  $('showPositions').onchange=()=>document.body.dataset.positions=$('showPositions').checked?'yes':'no';
  $('familyFilter').onchange=()=>{const value=$('familyFilter').value;$('categoryFilter').value=value;$('categoryFilter').dispatchEvent(new Event('change',{bubbles:true}));};
  function notify(message,force=false){if(!force&&!/ไม่สำเร็จ|ไม่พบ|ไม่ถูก|ไม่ตรง|ไม่รองรับ|ยังไม่ได้|หมดเวลา|ล้น|เกิน|ต้องแก้|ต้องเลือก|ไม่มีคำแปล|ฟอนต์ขาด|รหัสพิเศษต้อง|unexpected|invalid/i.test(message))return;
    $('noticeTitle').textContent=/รหัสแอดมินไม่ถูกต้อง/.test(message)?'รหัสไม่ถูกต้อง':'ยังทำรายการนี้ไม่ได้';$('noticeText').textContent=message;$('noticeText').dataset.kind='error';$('noticeHelp').hidden=true;const offset=/\$([0-9a-f]{4,8})/i.exec(message),p=RomTranslateBridge.project(),entry=offset&&p?.entries.find(e=>e.romOffset===parseInt(offset[1],16));if(entry){const check=TranslationQuality.entry(entry,entry.translation,rom,p.glossary),issue=check.issues.find(i=>i.severity==='error');let help='แก้คำแปลไทยของข้อความนี้ แล้วลองสร้างไฟล์เกมอีกครั้ง รักษารหัส {…} ให้เหมือนต้นฉบับ';if(issue?.code==='lines')help=`คำแปลใช้ ${check.metrics.lines} บรรทัด แต่ช่องนี้รองรับ ${check.spec.lines} บรรทัด ให้ย่อคำ ตัดคำซ้ำ หรือลบบรรทัดว่าง ดูตัวอย่างจนไม่เกิน ${check.spec.lines} บรรทัด การเพิ่ม Enter อย่างเดียวจะยิ่งเพิ่มบรรทัด`;else if(issue?.code==='width')help='ย่อคำแปลให้พอดีความกว้างหน้าจอ ดูตัวนับพิกเซลและตัวอย่างด้านล่าง';else if(issue?.code==='bytes')help='ชื่อหรือข้อความยาวเกินช่องข้อมูลเดิม ย่อคำแปลให้จำนวนไบต์ไม่เกินค่าที่แจ้ง';else if(issue?.code==='tokens')help='คัดลอกรหัสใน {…} จากต้นฉบับให้ครบและเรียงเหมือนเดิม ห้ามแปล ลบ หรือเพิ่มรหัส';else if(issue?.code==='font')help='ฟอนต์ไม่รองรับอักษรหรือมีรูปอักษรเกินพื้นที่ เลือก preset ที่รองรับ หรือแก้รูปอักษรในสตูดิโอฟอนต์';$('noticeTitle').textContent='ต้องแก้ข้อความก่อนสร้างเกม';$('noticeInstructions').textContent=help;$('noticeHelp').hidden=false;$('noticeFix').onclick=()=>{$('noticeDialog').close();RomTranslateBridge.goToEntry(entry.id);$('translation').focus();};}if(!$('noticeDialog').open)$('noticeDialog').showModal();
  }
  $('noticeDismiss').onclick=()=>$('noticeDialog').close();
  // Menus close after selecting an action, but stay open for preference checkboxes.
  for(const menu of document.querySelectorAll('.tools-menu'))menu.addEventListener('click',e=>{if(e.target.closest('button'))menu.open=false;});
  document.addEventListener('pointerdown',e=>{for(const menu of document.querySelectorAll('.tools-menu[open]'))if(!menu.contains(e.target))menu.open=false;});
  const closeActions={glossaryDialog:'closeGlossary',romFontDialog:'romFontClose',remainingDialog:'remainingClose',progressDialog:'progressClose',sheetExportDialog:'sheetExportClose',sheetImportDialog:'sheetImportCancel',coverageDialog:'coverageClose',qualityDialog:'qualityClose',historyDialog:'historyClose',originalDialog:'cancelOriginal',romDialog:'closeRom',workDialog:'workClose',fontDialog:'closeFont',fontRenameDialog:'fontRenameCancel',fontCloudDialog:'fontCloudClose',fontHelpDialog:'fontHelpClose',promptDialog:'closePrompt',patchDialog:'patchClose',buildDialog:'closeBuild',noticeDialog:'noticeDismiss'};
  // A fixed child stays reachable when the dialog itself scrolls. Track the
  // dialog edge rather than the page edge, including content/viewport resizing.
  const closeButtons=new Map();
  function positionClose(dialog){
    const button=closeButtons.get(dialog);if(!dialog.open||!button)return;
    const box=dialog.getBoundingClientRect();
    button.style.top=Math.max(7,box.top+7)+'px';
    button.style.left=Math.max(7,box.right-36)+'px';
  }
  const closeResize=new ResizeObserver(entries=>{for(const entry of entries)positionClose(entry.target);});
  const closeOpen=new MutationObserver(entries=>{for(const entry of entries)positionClose(entry.target);});
  const repositionClose=()=>{for(const dialog of closeButtons.keys())positionClose(dialog);};
  window.addEventListener('resize',repositionClose);
  window.visualViewport?.addEventListener('resize',repositionClose);
  window.visualViewport?.addEventListener('scroll',repositionClose);
  for(const dialog of document.querySelectorAll('dialog')){const button=document.createElement('button');button.type='button';button.className='dialog-x';button.textContent='×';button.setAttribute('aria-label','ปิดหน้าต่าง');button.title='ปิด';button.onclick=()=>{
    if(dialog.id==='operationDialog'||dialog.id==='sheetProgressDialog'){dialog.dispatchEvent(new Event('cancel',{cancelable:true}));return;}
    const action=$(closeActions[dialog.id]);if(action){dialog.dataset.closeRequested='yes';if(!action.disabled)action.click();else{const text=dialog.querySelector('[role=status]');if(text)text.textContent='กำลังทำงาน กรุณารอให้เสร็จก่อนปิด';}return;}
    const event=new Event('cancel',{cancelable:true});if(dialog.dispatchEvent(event))dialog.close();
  };dialog.prepend(button);closeButtons.set(dialog,button);closeResize.observe(dialog);closeOpen.observe(dialog,{attributes:true,attributeFilter:['open']});positionClose(dialog);}
  for(const bar of document.querySelectorAll('progress')){let label=bar.id==='progressBar'?$('progressPercent'):bar.id==='sheetImportProgressBar'?$('sheetImportPercent'):bar.id==='romCloudBar'?$('romCloudPercent'):null;
    if(!label){label=document.createElement('output');label.className='load-percent';label.setAttribute('aria-live','polite');bar.after(label);}
    if(bar.id!=='progressBar'){const row=document.createElement('div');row.className='load-progress-row';bar.before(row);row.append(bar,label);label.classList.add('load-percent');}
    const update=()=>{const raw=bar.hasAttribute('value')?Math.min(100,Math.max(0,bar.value/(bar.max||100)*100)):0,percent=bar.id==='progressBar'?(raw>=100?100:Math.min(99.99,Math.round(raw*100)/100)):Math.round(raw);label.textContent=percent+'%';bar.setAttribute('aria-valuetext',percent+'%');};new MutationObserver(update).observe(bar,{attributes:true,attributeFilter:['value','max']});update();
  }
  syncCategories();return {syncCategories,notify};
})();
window.UiShell=UiShell;
