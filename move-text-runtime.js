/* Pinned Imperium consumers only; wider text requires matching runtime changes. */
const MoveTextRuntime=(()=>{
 const tables=[{start:0x52f3f8,count:48,kind:'contest'},{start:0x6315ec,count:22,kind:'advisory'}],limit=256,wrapperSize=76,reserved=wrapperSize*2;
 const frames=[{offset:0xdfa54,old:0xb094,value:0xb0c6},{offset:0xdfa66,old:0xb014,value:0xb046},{offset:0xdfb02,old:0xb094,value:0xb0c6},{offset:0xdfb70,old:0xb014,value:0xb046}];
 const hooks=[{offset:0xdfa9c,returnTo:0xdfaa4},{offset:0xdfb44,returnTo:0xdfb4c}];
 function metadata(bytes,entries){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),byId=new Map(entries.map(e=>[e.id,e]));
  for(const table of tables)for(let i=0;i<table.count;i++){
   const entry=byId.get(view.getUint32(table.start+i*4,true)-0x08000000);
   // Shared strings may have unrelated consumers. Keep their existing bound.
   if(!entry?.verified||entry.storage!=='pointer'||entry.pointerSites.some(site=>site<table.start||site>=table.start+table.count*4))continue;
   entry.maxBytes=limit;entry.moveTextExpansion=table.kind;entry.textProof='ตรวจตัวอ่านคำอธิบายท่าและบัฟเฟอร์กับ ROM ต้นฉบับ · ย้ายข้อความได้สูงสุด 256 ไบต์';
  }
 }
 function wrapper(offset,lower,upper,returnTo){
  const data=[],labels={},fixups=[];
  const half=n=>data.push(n&255,n>>>8&255),word=n=>{half(n&65535);half(n>>>16);},label=name=>labels[name]=data.length;
  const ldr=(reg,name)=>{fixups.push({at:data.length,type:'ldr',reg,name});half(0);};
  const branch=(condition,name)=>{fixups.push({at:data.length,type:'branch',condition,name});half(0);};
  const call=name=>{fixups.push({at:data.length,type:'call',name});half(0);half(0);};
  half(0xb410);ldr(4,'return');half(0x46a6);half(0xbc10); // Set the original continuation without losing r4 or stack arguments.
  half(0x4620);half(0x2177); // Replaced call-site instructions: r0 = r4; r1 = 119.
  half(0xb510);ldr(4,'lower');half(0x42a3);branch(3,'original');ldr(4,'upper');half(0x42a3);branch(2,'original');
  half(0x4619);call('copy');half(0xbd10);
  label('original');half(0x9c02);half(0xb082);half(0x9400);call('format');half(0xb002);half(0xbd10);
  label('copy');ldr(4,'copyAddress');half(0x4720);
  label('format');ldr(4,'formatAddress');half(0x4720);
  while(data.length%4)half(0x46c0);
  label('lower');word(0x08000000+lower);label('upper');word(0x08000000+upper);label('return');word(0x08000001+returnTo);
  label('copyAddress');word(0x08215f6d);label('formatAddress');word(0x080e0f79);
  const out=Uint8Array.from(data),view=new DataView(out.buffer);
  for(const f of fixups){const target=offset+labels[f.name],pc=offset+f.at+4;
   if(f.type==='ldr'){const distance=target-(pc&~3);if(distance<0||distance%4||distance>1020)throw Error('Runtime literal out of range');view.setUint16(f.at,0x4800|(f.reg<<8)|(distance/4),true);}
   else if(f.type==='branch'){const distance=target-pc;if(distance%2||distance< -256||distance>254)throw Error('Runtime branch out of range');view.setUint16(f.at,0xd000|(f.condition<<8)|((distance/2)&255),true);}
   else{const distance=target-pc;if(distance%2||Math.abs(distance)>=0x400000)throw Error('Runtime call out of range');view.setUint16(f.at,0xf000|((distance>>12)&0x7ff),true);view.setUint16(f.at+2,0xf800|((distance>>1)&0x7ff),true);}
  }
  if(out.length!==wrapperSize)throw Error('Move text runtime size mismatch');return out;
 }
 function install(original,out,{offset,lower,upper}){
  const before=new DataView(original.buffer,original.byteOffset,original.byteLength),after=new DataView(out.buffer,out.byteOffset,out.byteLength);
  for(const patch of frames){if(before.getUint16(patch.offset,true)!==patch.old)throw Error('Move description buffer signature mismatch');after.setUint16(patch.offset,patch.value,true);}
  for(let i=0;i<hooks.length;i++){
   const hook=hooks[i],at=offset+i*wrapperSize;
   const a=before.getUint16(hook.offset,true),b=before.getUint16(hook.offset+2,true);
   if(!((a===0x0020&&b===0x2177)||(a===0x2177&&b===0x0020))||(before.getUint16(hook.offset+4,true)&0xf800)!==0xf000||(before.getUint16(hook.offset+6,true)&0xf800)!==0xf800)throw Error('Move description formatter signature mismatch');
   let delta=((before.getUint16(hook.offset+4,true)&0x7ff)<<12)|((before.getUint16(hook.offset+6,true)&0x7ff)<<1);if(delta&0x400000)delta-=0x800000;if(hook.offset+8+delta!==0xe0f78)throw Error('Unexpected move text formatter target');
   out.set(wrapper(at,lower,upper,hook.returnTo),at);
   // A Thumb-1 absolute jump: unlike BL, it can reach the text pool over 4 MB away.
   after.setUint16(hook.offset,0x4900,true);after.setUint16(hook.offset+2,0x4708,true);after.setUint32(hook.offset+4,0x08000001+at,true);
  }
 }
 return {metadata,install,reserved,tables,limit,frames,hooks};
})();
if(typeof module!=='undefined')module.exports=MoveTextRuntime;
