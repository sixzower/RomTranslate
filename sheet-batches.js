/* Inclusive ranges refer to a frozen, filtered list of canonical ROM entries. */
const SheetBatches=(()=>{
 function integer(value,label){const n=Number(value);if(!Number.isSafeInteger(n)||n<1)throw Error(label+' ต้องเป็นจำนวนเต็มตั้งแต่ 1');return n;}
 function plan(total,{mode='single',start=1,count=200,ranges='',size=200,all=false}={}){
  total=integer(total,'จำนวนข้อความ');let result=[];
  if(all)result=[{start:1,end:total}];
  else if(mode==='ranges'){
   const parts=String(ranges).replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-0x0e50)).replace(/[–—]/g,'-').trim().replace(/(\d)\s*-\s*(\d)/g,'$1-$2').split(/[,;\s]+/);
   if(!parts[0])throw Error('ระบุช่วง เช่น 1-200, 201-400');
   result=parts.map(part=>{if(!/^\d+(?:-\d+)?$/.test(part))throw Error('ช่วงไม่ถูกต้อง: '+part+' ใช้รูปแบบ 1-200, 201-400');const [a,b=a]=part.split('-');return {start:integer(a,'แถวเริ่ม'),end:integer(b,'แถวจบ')};});
  }else if(mode==='batches'){
   size=integer(size,'จำนวนแถวต่อชุด');if(Math.ceil(total/size)>200)throw Error('ไม่เกิน 200 ไฟล์ต่อครั้ง กรุณาเพิ่มจำนวนแถวต่อชุด');
   for(let i=1;i<=total;i+=size)result.push({start:i,end:Math.min(total,i+size-1)});
  }else if(mode==='single'){
   start=integer(start,'แถวเริ่ม');count=integer(count,'จำนวนแถว');if(start>total)throw Error('แถวเริ่มเกินจำนวนข้อความ '+total);result=[{start,end:Math.min(total,start+count-1)}];
  }else throw Error('รูปแบบส่งออกไม่ถูกต้อง');
  if(result.length>200)throw Error('ไม่เกิน 200 ชุดต่อครั้ง');result.sort((a,b)=>a.start-b.start);
  for(let i=0;i<result.length;i++){const r=result[i];if(r.end<r.start)throw Error('แถวจบต้องไม่น้อยกว่าแถวเริ่ม');if(r.start>total||r.end>total)throw Error('ช่วง '+r.start+'-'+r.end+' เกิน '+total+' ข้อความ');if(i&&r.start<=result[i-1].end)throw Error('ช่วงแถวซ้ำหรือทับกัน: '+result[i-1].start+'-'+result[i-1].end+' กับ '+r.start+'-'+r.end);}
  return result.map(r=>({...r,count:r.end-r.start+1}));
 }
 const table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
 function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
 function zip(files){const chunks=[],directory=[],names=new Set();let offset=0;for(const file of files){if(names.has(file.name))throw Error('ชื่อไฟล์ ZIP ซ้ำ');names.add(file.name);const name=new TextEncoder().encode(file.name),bytes=file.bytes instanceof Uint8Array?file.bytes:new Uint8Array(file.bytes);if(name.length>65535||offset+bytes.length>0xffffffff)throw Error('ZIP ใหญ่เกินขนาดที่รองรับ');const crc=crc32(bytes),header=new Uint8Array(30+name.length),view=new DataView(header.buffer);view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x800,true);view.setUint16(12,0x21,true);view.setUint32(14,crc,true);view.setUint32(18,bytes.length,true);view.setUint32(22,bytes.length,true);view.setUint16(26,name.length,true);header.set(name,30);chunks.push(header,bytes);const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);directory.push(central);offset+=header.length+bytes.length;}
  if(files.length>65535)throw Error('ZIP มีไฟล์มากเกินไป');const length=directory.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,length,true);v.setUint32(16,offset,true);return new Blob([...chunks,...directory,end],{type:'application/zip'});
 }
 return {plan,zip};
})();
if(typeof module!=="undefined")module.exports=SheetBatches;
