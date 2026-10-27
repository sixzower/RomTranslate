'use strict';
const AzothUpdate = (() => {
 const data=SixzAzothUpdate;
 const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const unhex=s=>{if(typeof s!=='string'||s.length%2||!/^[0-9a-f]*$/.test(s))throw Error('ข้อมูลอัปเดตไม่ถูกต้อง');return Uint8Array.from(s.match(/../g)||[],s=>parseInt(s,16));};
 async function identify(bytes){if(bytes.byteLength!==33554432)throw Error('ขนาดไฟล์ไม่ตรงกับ Azoth รุ่นที่รองรับ');const sha=await hash(bytes);if(sha===data.sha256)return {version:'013',current:true};const spec=data.inputs.find(x=>x.sha256===sha);if(!spec)throw Error('ไฟล์นี้ไม่ตรงกับ Azoth TH 011/012 เดิม จึงยังไม่แก้ไข กรุณาเลือกไฟล์รุ่นที่รองรับ');return spec;}
 async function apply(bytes){const spec=await identify(bytes);if(spec.current)return bytes.slice();const result=bytes.slice();let end=0;for(const span of spec.spans){const before=unhex(span.before),after=unhex(span.after),at=span.offset;if(!Number.isSafeInteger(at)||at<end||before.length!==after.length||at+after.length>result.length)throw Error('ตำแหน่งอัปเดตไม่ถูกต้อง');for(let i=0;i<before.length;i++)if(bytes[at+i]!==before[i])throw Error('ข้อมูลต้นฉบับไม่ตรงกับอัปเดต');result.set(after,at);end=at+after.length;}if(await hash(result)!==data.sha256)throw Error('ตรวจผลลัพธ์ไม่ผ่าน ยังไม่ได้สร้างไฟล์ดาวน์โหลด');return result;}
 return {identify,apply,hash};
})();
if(typeof document!=='undefined'){
 const input=document.getElementById('rom'),button=document.getElementById('download'),status=document.getElementById('status');let selected=null,generation=0,busy=false;
 const show=(text,kind)=>{status.textContent=text;status.dataset.kind=kind;};
 input.addEventListener('change',async()=>{const gen=++generation;selected=null;button.disabled=true;const file=input.files[0];if(!file){show('ยังไม่ได้เลือกไฟล์','info');return;}show('กำลังอ่านและตรวจสอบไฟล์…','working');try{if(file.size!==33554432)throw Error('ขนาดไฟล์ไม่ตรงกับ Azoth รุ่นที่รองรับ');const bytes=new Uint8Array(await file.arrayBuffer()),spec=await AzothUpdate.identify(bytes);if(gen!==generation)return;selected=bytes;button.disabled=false;show(spec.current?'ไฟล์นี้เป็น TH v.2.3 By LoongPlaeDo แล้ว · สามารถดาวน์โหลดสำเนาได้':`พบ Azoth รุ่น ${spec.version} · พร้อมแก้ไขและดาวน์โหลด TH v.2.3 By LoongPlaeDo`,'success');}catch(e){if(gen===generation)show(e.message,'error');}});
 button.addEventListener('click',async()=>{if(busy||!selected)return;busy=true;input.disabled=true;button.disabled=true;show('กำลังสร้างและตรวจสอบไฟล์ GBA…','working');try{const result=await AzothUpdate.apply(selected),blob=new Blob([result],{type:'application/octet-stream'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=SixzAzothUpdate.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);show('สร้าง TH v.2.3 By LoongPlaeDo และส่งไฟล์ให้เบราว์เซอร์แล้ว · ตรวจในรายการดาวน์โหลด','success');}catch(e){show(e.message,'error');}finally{busy=false;input.disabled=false;button.disabled=!selected;}});
}
if(typeof module!=='undefined')module.exports=AzothUpdate;
