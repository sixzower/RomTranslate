/* File drops share the same reviewed import as the file picker. */
const SheetDrop=(()=>{
 function install(importFiles){
  const overlay=document.createElement('div');overlay.id='sheetDropOverlay';overlay.hidden=true;
  const hint=document.createElement('div');hint.textContent='วางไฟล์ Excel (.xlsx) เพื่อนำเข้าคำแปล';
  const detail=document.createElement('small');detail.textContent='วางได้ทุกพื้นที่ · รองรับหลายไฟล์พร้อมกัน';hint.append(detail);overlay.append(hint);document.body.append(overlay);
  let depth=0;
  const files=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
  const reset=()=>{depth=0;overlay.hidden=true;};
  document.addEventListener('dragenter',e=>{if(!files(e))return;e.preventDefault();depth++;overlay.hidden=false;},true);
  document.addEventListener('dragover',e=>{if(!files(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy';overlay.hidden=false;},true);
  document.addEventListener('dragleave',()=>{if(depth>0)depth--;if(!depth)reset();},true);
  document.addEventListener('drop',e=>{const incoming=Array.from(e.dataTransfer?.files||[]),isFile=files(e)||incoming.length;reset();if(!isFile)return;e.preventDefault();e.stopPropagation();void importFiles(incoming);},true);
  window.addEventListener('dragend',reset);window.addEventListener('blur',reset);
 }
 return {install};
})();
