/* File read and validation progress; XLSX decompression has no numeric progress API. */
const SheetImportProgress=(()=>{
 const $=id=>document.getElementById(id),dialog=$('sheetProgressDialog');
 dialog.addEventListener('cancel',e=>e.preventDefault());
 function update({phase,completed=0,total=0}){const bar=$('sheetImportProgressBar'),percent=$('sheetImportPercent'),detail=$('sheetImportProgressDetail'),ratio=total?Math.min(1,completed/total):0;const stages={read:[0,20,'กำลังอ่านไฟล์'],duplicates:[20,30,'ตรวจรหัสแถวซ้ำ'],validate:[30,80,'กำลังตรวจคำแปลแต่ละแถว'],fonts:[80,100,'ตรวจฟอนต์และพื้นที่รวมของโปรเจกต์']};if(phase==='parse'||phase==='apply'){bar.removeAttribute('value');percent.textContent='กำลังทำงาน…';detail.textContent=phase==='parse'?'กำลังเปิดโครงสร้าง Excel ช่วงนี้ยังวัดเปอร์เซ็นต์ไม่ได้':'กำลังบันทึกคำแปลลงโปรเจกต์…';return;}if(phase==='done'){bar.value=100;percent.textContent='100%';detail.textContent='ตรวจไฟล์ครบแล้ว พร้อมแสดงผลนำเข้า';return;}const [start,end,label]=stages[phase]||stages.read;const value=Math.min(99,Math.floor(start+ratio*(end-start)));bar.value=value;percent.textContent=value+'%';detail.textContent=label+' · '+completed.toLocaleString()+' / '+total.toLocaleString()+(phase==='read'?' ไบต์':' แถว');}
 function start(name){$('sheetImportFilename').textContent=name;update({phase:'read'});dialog.showModal();}
 function read(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onprogress=e=>{if(e.lengthComputable)update({phase:'read',completed:e.loaded,total:e.total});};reader.onload=()=>{update({phase:'read',completed:file.size,total:file.size});resolve(reader.result);};reader.onerror=()=>reject(Error('อ่านไฟล์ Excel ไม่สำเร็จ'));reader.onabort=()=>reject(Error('ยกเลิกอ่านไฟล์'));reader.readAsArrayBuffer(file);});}
 async function finish(){update({phase:'done'});await new Promise(resolve=>setTimeout(resolve,80));dialog.close();}
 return {start,update,read,finish,close:()=>dialog.close()};
})();
