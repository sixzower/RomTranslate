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
    $('noticeText').textContent=message;if(!$('noticeDialog').open)$('noticeDialog').showModal();
  }
  $('noticeDismiss').onclick=()=>$('noticeDialog').close();
  // Menus close after selecting an action, but stay open for preference checkboxes.
  for(const menu of document.querySelectorAll('.tools-menu'))menu.addEventListener('click',e=>{if(e.target.closest('button'))menu.open=false;});
  document.addEventListener('pointerdown',e=>{for(const menu of document.querySelectorAll('.tools-menu[open]'))if(!menu.contains(e.target))menu.open=false;});
  syncCategories();return {syncCategories,notify};
})();
window.UiShell=UiShell;
