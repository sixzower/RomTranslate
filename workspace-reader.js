/* Read a revision-consistent workspace without one large PostgREST response. */
const WorkspaceReader=(()=>{
 const missing=e=>/PGRST202|Could not find the function|does not exist|schema cache/i.test(e.message);
 async function read(id,send,legacy){
  let first;
  try{first=await send({p_id:id,p_revision:null,p_offset:0});}
  catch(e){if(missing(e))return legacy();throw e;}
  if(first===null)return [];
  if(!first||!Number.isSafeInteger(first.revision)||first.revision<1||!Number.isInteger(first.totalLength)||first.totalLength<2||first.totalLength>16777216||!/^[a-f0-9]{64}$/.test(first.sha256))throw Error('ข้อมูลโปรเจกต์ไม่ครบ กรุณาเปิดอีกครั้ง');
  const chunks=[],revision=first.revision,total=first.totalLength;let offset=0,part=first;
  for(let count=0;;count++){
   if(count>=64||part?.revision!==revision||part?.totalLength!==total||typeof part.data!=='string'||!Number.isInteger(part.nextOffset)||part.nextOffset<=offset||part.nextOffset>total||part.nextOffset-offset>262144||Array.from(part.data).length!==part.nextOffset-offset)throw Error('โปรเจกต์เปลี่ยนหรือข้อมูลโหลดไม่ครบ กรุณาเปิดอีกครั้ง · งานเดิมยังอยู่');
   chunks.push(part.data);offset=part.nextOffset;
   if(offset===total)break;
   part=await send({p_id:id,p_revision:revision,p_offset:offset});
  }
  const text=chunks.join(''),bytes=new TextEncoder().encode(text);
  if(bytes.length>16777216)throw Error('โปรเจกต์มีขนาดเกินกำหนด');
  const digest=await crypto.subtle.digest('SHA-256',bytes),hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==first.sha256)throw Error('ตรวจความครบถ้วนของโปรเจกต์ไม่ผ่าน กรุณาเปิดอีกครั้ง · งานเดิมยังอยู่');
  const payload=JSON.parse(text);
  if(payload?.workspaceId!==id)throw Error('โปรเจกต์ที่ได้รับไม่ตรงกับงานที่เลือก');
  return [{payload,revision}];
 }
 return {read};
})();
if(typeof module!=='undefined')module.exports=WorkspaceReader;
