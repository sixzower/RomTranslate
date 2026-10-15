/* Compact navigation; technical details remain available on demand. */
const UiShell = (() => {
  const $=id=>document.getElementById(id);
  function familyOf(value,p){if(value==='all')return 'all';if(FAMILY_NAMES[value])return value;return p?.entries.find(e=>e.category===value)?.family||'all';}
  function syncCategories(){
    const p=RomTranslateBridge.project(),select=$('categoryFilter'),family=familyOf(select.value,p),counts=categoryCounts();
    const main=$('familyFilter');main.replaceChildren(new Option('ทุกหมวด','all'));
    for(const [key,label]of Object.entries(FAMILY_NAMES)){const n=counts.get(key)?.total||0;if(n&&(key!=='unclassified'||family==='unclassified'))main.add(new Option(label+' · '+n.toLocaleString(),key));}
    main.value=family;main.disabled=!p;select.disabled=!p;
    for(const option of select.options){const own=familyOf(option.value,p),n=counts.get(option.value)?.total||0;option.hidden=(family!=='all'&&own!==family)||(own==='unclassified'&&family!=='unclassified');option.textContent=option.value==='all'?'ทุกข้อความ':FAMILY_NAMES[option.value]?(family==='all'?FAMILY_NAMES[option.value]:'ทั้งหมดในหมวดนี้')+' · '+n.toLocaleString():(family==='all'?option.value:option.value.split(' / ').slice(1).join(' / ')||option.value)+' · '+n.toLocaleString();}
    for(const group of select.querySelectorAll('optgroup'))group.hidden=![...group.children].some(o=>!o.hidden);
    window.WorkManager?.renderCurrent();
  }
  $('showPositions').onchange=()=>document.body.dataset.positions=$('showPositions').checked?'yes':'no';
  $('familyFilter').onchange=()=>{const value=$('familyFilter').value;$('categoryFilter').value=value;$('categoryFilter').dispatchEvent(new Event('change',{bubbles:true}));};
  function notify(message,force=false){if(!force&&!/ไม่สำเร็จ|ไม่พบ|ไม่ถูก|ไม่ตรง|ไม่รองรับ|ยังไม่ได้|หมดเวลา|ล้น|เกิน|ต้องแก้|ต้องเลือก|ไม่มีคำแปล|ฟอนต์ขาด|รหัสพิเศษต้อง|unexpected|invalid/i.test(message))return;
    $('noticeTitle').textContent=/รหัสแอดมินไม่ถูกต้อง/.test(message)?'รหัสไม่ถูกต้อง':'ยังทำรายการนี้ไม่ได้';$('noticeText').textContent=message;$('noticeHelp').hidden=true;const offset=/\$([0-9a-f]{4,8})/i.exec(message),p=RomTranslateBridge.project(),entry=offset&&p?.entries.find(e=>e.romOffset===parseInt(offset[1],16));if(entry){const check=TranslationQuality.entry(entry,entry.translation,rom,p.glossary),issue=check.issues.find(i=>i.severity==='error');let help='แก้คำแปลไทยของข้อความนี้ แล้วลองสร้างไฟล์เกมอีกครั้ง รักษารหัส {…} ให้เหมือนต้นฉบับ';if(issue?.code==='lines')help=`คำแปลใช้ ${check.metrics.lines} บรรทัด แต่ช่องนี้รองรับ ${check.spec.lines} บรรทัด ให้ย่อคำ ตัดคำซ้ำ หรือลบบรรทัดว่าง ดูตัวอย่างจนไม่เกิน ${check.spec.lines} บรรทัด การเพิ่ม Enter อย่างเดียวจะยิ่งเพิ่มบรรทัด`;else if(issue?.code==='width')help='ย่อคำแปลให้พอดีความกว้างหน้าจอ ดูตัวนับพิกเซลและตัวอย่างด้านล่าง';else if(issue?.code==='bytes')help='ชื่อหรือข้อความยาวเกินช่องข้อมูลเดิม ย่อคำแปลให้จำนวนไบต์ไม่เกินค่าที่แจ้ง';else if(issue?.code==='tokens')help='คัดลอกรหัสใน {…} จากต้นฉบับให้ครบและเรียงเหมือนเดิม ห้ามแปล ลบ หรือเพิ่มรหัส';else if(issue?.code==='font')help='ฟอนต์ไม่รองรับอักษรหรือมีรูปอักษรเกินพื้นที่ เลือก preset ที่รองรับ หรือแก้รูปอักษรในสตูดิโอฟอนต์';$('noticeTitle').textContent='ต้องแก้ข้อความก่อนสร้างเกม';$('noticeInstructions').textContent=help;$('noticeHelp').hidden=false;$('noticeFix').onclick=()=>{$('noticeDialog').close();RomTranslateBridge.goToEntry(entry.id);$('translation').focus();};}if(!$('noticeDialog').open)$('noticeDialog').showModal();
  }
  $('noticeDismiss').onclick=()=>$('noticeDialog').close();
  // Menus close after selecting an action, but stay open for preference checkboxes.
  for(const menu of document.querySelectorAll('.tools-menu'))menu.addEventListener('click',e=>{if(e.target.closest('button'))menu.open=false;});
  document.addEventListener('pointerdown',e=>{for(const menu of document.querySelectorAll('.tools-menu[open]'))if(!menu.contains(e.target))menu.open=false;});
  const closeActions={glossaryDialog:'closeGlossary',romFontDialog:'romFontClose',remainingDialog:'remainingClose',progressDialog:'progressClose',sheetExportDialog:'sheetExportClose',sheetImportDialog:'sheetImportCancel',coverageDialog:'coverageClose',qualityDialog:'qualityClose',historyDialog:'historyClose',originalDialog:'cancelOriginal',romDialog:'closeRom',workDialog:'workClose',workDraftDialog:'workDraftClose',fontDialog:'closeFont',fontRenameDialog:'fontRenameCancel',fontCloudDialog:'fontCloudClose',fontHelpDialog:'fontHelpClose',promptDialog:'closePrompt',patchDialog:'patchClose',buildDialog:'closeBuild',noticeDialog:'noticeDismiss'};
  for(const dialog of document.querySelectorAll('dialog')){const button=document.createElement('button');button.type='button';button.className='dialog-x';button.textContent='×';button.setAttribute('aria-label','ปิดหน้าต่าง');button.title='ปิด';button.onclick=()=>{
    if(dialog.id==='operationDialog'||dialog.id==='sheetProgressDialog'){dialog.dispatchEvent(new Event('cancel',{cancelable:true}));return;}
    const action=$(closeActions[dialog.id]);if(action){dialog.dataset.closeRequested='yes';if(!action.disabled)action.click();else{const text=dialog.querySelector('[role=status]');if(text)text.textContent='กำลังทำงาน กรุณารอให้เสร็จก่อนปิด';}return;}
    const event=new Event('cancel',{cancelable:true});if(dialog.dispatchEvent(event))dialog.close();
  };dialog.prepend(button);}
  for(const bar of document.querySelectorAll('progress')){let label=bar.id==='progressBar'?$('progressPercent'):bar.id==='sheetImportProgressBar'?$('sheetImportPercent'):null;
    if(!label){label=document.createElement('output');label.className='load-percent';label.setAttribute('aria-live','polite');bar.after(label);}
    const update=()=>{const raw=bar.hasAttribute('value')?Math.min(100,Math.max(0,bar.value/(bar.max||100)*100)):0,percent=bar.id==='progressBar'?(raw>=100?100:Math.min(99.99,Math.round(raw*100)/100)):Math.round(raw);label.textContent=percent+'%';bar.setAttribute('aria-valuetext',percent+'%');};new MutationObserver(update).observe(bar,{attributes:true,attributeFilter:['value','max']});update();
  }
  syncCategories();return {syncCategories,notify};
})();
window.UiShell=UiShell;
