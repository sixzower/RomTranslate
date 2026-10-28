'use strict';
importScripts('../rom-patch.js?v=1.0.11');
let source=null,game=null,variant=null,current=false;
const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
const phase=text=>postMessage({type:'phase',text});
onmessage=async({data})=>{try{
 if(data.type==='identify'){
  source=null;game=null;variant=null;current=false;
  if(data.file.size>64*1024*1024)throw Error('ไฟล์ใหญ่เกิน 64 MB กรุณาเลือกไฟล์ .gba ของเกมที่ระบุ');
  phase('กำลังอ่านและตรวจรุ่น ROM…');
  const bytes=new Uint8Array(await data.file.arrayBuffer()),sha=await hash(bytes);
  for(const g of data.catalog.games){
   if(sha===g.targetSHA256&&bytes.length===g.targetSize){game=g;current=true;break;}
   const v=g.variants.find(v=>v.sourceSHA256===sha&&v.sourceSize===bytes.length);if(v){game=g;variant=v;break;}
  }
  if(!game)throw Error('ไฟล์ไม่ตรงรุ่นที่รองรับ ใช้ ROM ตามชื่อรุ่นใต้ช่องเลือกไฟล์ หากเป็น ZIP ให้แตกไฟล์ก่อน');
  source=bytes;postMessage({type:'ready',gameId:game.id,current,variant,sourceSHA256:sha});
 }else if(data.type==='apply'){
  if(!source||!game)throw Error('เลือกและตรวจไฟล์ ROM ก่อน');
  let bytes;
  if(current){phase('กำลังเตรียมสำเนาไฟล์รุ่นล่าสุด…');bytes=source.slice();}
  else{const patch=new Uint8Array(data.patch);phase('กำลังตรวจข้อมูลแพตช์…');if(patch.length!==variant.patchSize||await hash(patch)!==variant.patchSHA256)throw Error('ไฟล์แพตช์ไม่ครบหรือเสียหาย กรุณาลองใหม่');phase('กำลังประกอบ ROM ภาษาไทยและตรวจผลลัพธ์…');bytes=(await RomPatch.apply(source,patch)).bytes;}
  if(bytes.length!==game.targetSize||await hash(bytes)!==game.targetSHA256)throw Error('ไฟล์ผลลัพธ์ไม่ตรงกับฉบับที่ตรวจสอบแล้ว ยังไม่ได้สร้างไฟล์ดาวน์โหลด');
  postMessage({type:'complete',bytes:bytes.buffer,filename:game.filename},[bytes.buffer]);
 }
}catch(e){postMessage({type:'error',message:e.message||'ทำรายการไม่สำเร็จ กรุณาเลือกไฟล์อีกครั้ง'});}};
