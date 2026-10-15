/* Private, optional, chunked ROM copies; translation backups remain independent. */
const RomCloud=(()=>{
 const $=id=>document.getElementById(id),CHUNK=262144,bridge=()=>window.RomTranslateBridge;let busy=false,cancelled=false;
 function check(){if(cancelled)throw new DOMException('ยกเลิกรับส่ง ROM แล้ว','AbortError');}
 function progress(value,text){check();value=Math.min(100,Math.max(0,Math.floor(value)));$('romCloudBar').value=value;$('romCloudPercent').textContent=value+'%';$('romCloudDetail').textContent=text;}
 $('romCloudProgress').addEventListener('cancel',event=>{event.preventDefault();cancelled=true;$('romCloudDetail').textContent='กำลังยกเลิก… ชิ้นส่วนที่ส่งแล้วเก็บไว้ส่งต่อหรือลบได้';});
 function start(title){if(busy)throw Error('กำลังรับส่ง ROM กรุณารอสักครู่');busy=true;cancelled=false;$('romCloudHeading').textContent=title;progress(0,'กำลังตรวจไฟล์');$('romCloudProgress').showModal();}
 function end(){busy=false;$('romCloudProgress').close();}
 function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
 function unbase64(value){const raw=atob(value),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;}
 async function request(action,args,retry=false){check();try{return await FontCloud.romRequest(action,args);}catch(e){check();if(retry&&e.networkFailure){await new Promise(resolve=>setTimeout(resolve,350));check();return FontCloud.romRequest(action,args);}throw e;}}
 async function info(id){try{const result=await FontCloud.romRequest('info',{p_id:id});$('romCloudSetup').hidden=true;return result;}catch(e){if(e.romSetupMissing)$('romCloudSetup').hidden=false;throw e;}}
 async function checkSetup(id){if(!id||!FontCloud.connected())return;try{await info(id);}catch{}}
 async function download(p,metadata){
  const m=metadata;if(!m?.ready)return null;
  if(m.sha256!==p.romHash||!Number.isSafeInteger(m.size)||m.size<192||m.size>33554432||m.chunks!==Math.ceil(m.size/CHUNK))throw Error('ข้อมูล ROM คลาวด์ไม่ตรงกับโปรเจกต์');
  start('กำลังดึง ROM ของโปรเจกต์');
  try{const bytes=new Uint8Array(m.size);for(let i=0;i<m.chunks;i++){check();const part=await request('get',{p_id:p.workspaceId,p_index:i}),data=unbase64(part?.data||'');if(part?.index!==i||data.length!==Math.min(CHUNK,m.size-i*CHUNK))throw Error('ชิ้นส่วน ROM ที่โหลดมาไม่ครบ');bytes.set(data,i*CHUNK);progress((i+1)/m.chunks*95,'ดึง ROM '+(i+1)+' / '+m.chunks+' ส่วน');await new Promise(resolve=>setTimeout(resolve,0));}if(await RomCore.fingerprint(bytes)!==p.romHash)throw Error('SHA-256 ของ ROM คลาวด์ไม่ตรงกับต้นฉบับ');progress(100,'ตรวจ SHA-256 แล้ว พร้อมใช้งาน');return bytes;}finally{end();}
 }
 async function forResume(p){try{const m=await info(p.workspaceId);return await download(p,m);}catch(e){if(!e.romSetupMissing)bridge().toast('ยังดึง ROM อัตโนมัติไม่ได้: '+e.message+' · เลือก ROM ต้นฉบับจากเครื่องเพื่อทำต่อได้');return null;}}
 async function saveWork(p){
  if(busy)throw Error('กำลังรับส่ง ROM กรุณารอสักครู่');
  const current=bridge().project(),active=current?.workspaceId===p.workspaceId;
  const workspace=JSON.parse(JSON.stringify(active?bridge().workSnapshot():p));
  let bytes=active?bridge().romSnapshot().bytes:null;
  if(!bytes){const cached=await bridge().cachedRom(workspace.romHash).catch(()=>null);bytes=cached?.bytes;}
  if(!bytes){
   if(!FontCloud.connected())throw Error('เชื่อมคลังส่วนตัวเพื่อดึง ROM ก่อน');
   const metadata=await info(workspace.workspaceId);
   if(!metadata)throw Error('โปรเจกต์นี้ยังไม่ได้เก็บ ROM บนคลาวด์ · เปิด ROM ที่เครื่องเดิม แล้วดาวน์โหลดชุดทำงานต่อจากเครื่องนั้น');
   if(!metadata.ready)throw Error('ROM บนคลาวด์ยังส่งไม่ครบ · กลับเครื่องเดิมแล้วกดเก็บ ROM เพื่อส่งต่อให้ครบก่อน');
   bytes=await download(workspace,metadata);
  }
  if(bytes.byteLength>33554432||await RomCore.fingerprint(bytes)!==workspace.romHash)throw Error('ROM ไม่ตรงกับไฟล์งาน จึงยังสร้างชุดทำงานต่อไม่ได้');
  start('กำลังจัดชุดทำงานต่อ');
  try{
   progress(10,'เตรียม ROM และคำแปลล่าสุด');await new Promise(resolve=>setTimeout(resolve,0));check();
   const name=(workspace.title||'game.gba').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-'),base=name.replace(/\.gba$/i,''),encode=value=>new TextEncoder().encode(value);
   const zip=SheetBatches.zip([{name:base+'.gba',bytes},{name:base+'-translation.json',bytes:encode(JSON.stringify(workspace))},{name:'วิธีเปิดงานต่อ.txt',bytes:encode('แตก ZIP แล้วเปิดเว็บ RomTranslate\n1. เปิด ROM เลือกไฟล์ .gba ในชุดนี้\n2. ไฟล์ → เปิดไฟล์สำรอง เลือกไฟล์ -translation.json ในชุดนี้\nคำแปล ฟอนต์ หมวดเป้าหมาย และชุดงานจะกลับมา\nROM ในชุดนี้เป็นต้นฉบับ คำแปลล่าสุดเก็บใน JSON\nหากต้องการเกมแปลพร้อมเล่น เลือก ไฟล์ → สร้างไฟล์เกม\n')}]);
   progress(100,'พร้อมดาวน์โหลด ROM และไฟล์งาน');check();bridge().download(zip,base+'-work.zip');
   bridge().toast('ดาวน์โหลดชุดทำงานต่อแล้ว · แตก ZIP แล้วเปิด ROM และไฟล์สำรอง JSON ตามวิธีในชุด');
  }finally{end();}
 }
 function target(){const p=bridge().pendingWorkspace()||bridge().project();if(!p)throw Error('เปิดโปรเจกต์ก่อน');return p;}
 async function action(work){try{if(!FontCloud.connected())throw Error('เชื่อมคลังส่วนตัวก่อน');await work();}catch(e){const message=e.message+(/SHA-256/.test(e.message)?' · ลบ ROM คลาวด์ของงานนี้ แล้วกดเก็บ ROM ใหม่อีกครั้ง':'' );if(e.romSetupMissing)$('romCloudSetup').hidden=false;$('romCloudStatus').textContent=message;bridge().toast(message,e.name==='AbortError'?'info':'error');}}
 $('romCloudUpload').onclick=()=>action(async()=>{
  const p=bridge().project(),snapshot=bridge().romSnapshot();if(!p)throw Error('เปิดโปรเจกต์ก่อน');start('เก็บ ROM ชั่วคราวบนคลาวด์');
  try{progress(0,'กำลังบันทึกโปรเจกต์ก่อนส่ง ROM');await WorkManager.saveForRom();check();if(bridge().project()!==p)throw Error('โปรเจกต์เปลี่ยนแล้ว กรุณาลองใหม่');if(await RomCore.fingerprint(snapshot.bytes)!==snapshot.hash)throw Error('ROM ไม่ตรงกับโปรเจกต์');const m=await request('begin',{p_id:p.workspaceId,p_size:snapshot.bytes.length,p_hash:snapshot.hash},true),present=new Set(m?.present||[]);if(m?.sha256!==snapshot.hash||m.size!==snapshot.bytes.length)throw Error('ข้อมูลตอบรับ ROM ไม่ตรงกับไฟล์');
   const total=snapshot.bytes.length,chunks=Math.ceil(total/CHUNK),chunkBytes=i=>Math.min(CHUNK,total-i*CHUNK);
   if([...present].some(i=>!Number.isInteger(i)||i<0||i>=chunks))throw Error('รายการชิ้นส่วน ROM จากเซิร์ฟเวอร์ไม่ถูกต้อง');
   let confirmed=m.ready?total:[...present].reduce((sum,i)=>sum+chunkBytes(i),0);
   const showUpload=()=>progress(Math.min(99,confirmed/total*100),'เซิร์ฟเวอร์รับแล้ว '+confirmed.toLocaleString()+' / '+total.toLocaleString()+' ไบต์'+(confirmed===total?' · กำลังตรวจ SHA-256 บนเซิร์ฟเวอร์':''));
   showUpload();
   if(!m.ready)for(let i=0;i<chunks;i++){check();if(!present.has(i)){await request('put',{p_id:p.workspaceId,p_index:i,p_data:base64(snapshot.bytes.subarray(i*CHUNK,(i+1)*CHUNK))},true);confirmed+=chunkBytes(i);showUpload();}await new Promise(resolve=>setTimeout(resolve,0));}
   showUpload();const result=await request('finish',{p_id:p.workspaceId},true);if(!result?.ready)throw Error('เซิร์ฟเวอร์ยังไม่ยืนยัน ROM');$('romCloudSetup').hidden=true;progress(100,'เก็บ ROM ครบแล้ว');window.CompletionSounds?.play('upload');$('romCloudStatus').textContent='เก็บ ROM แล้ว · '+(snapshot.bytes.length/1048576).toFixed(2)+' MB · ลบออกได้เมื่อทำงานเสร็จ';bridge().toast('เก็บ ROM ชั่วคราวแล้ว เปิดงานต่อข้ามเครื่องได้');
  }finally{end();}
 });
 $('romWorkDownload').onclick=async()=>{try{await saveWork(target());}catch(e){$('romCloudStatus').textContent=e.message;bridge().toast(e.message,e.name==='AbortError'?'info':'error');}};
 $('romCloudRemove').onclick=()=>action(async()=>{const p=target();if(!confirm('ลบเฉพาะ ROM ของ “'+(p.workspaceName||p.title)+'” จากคลาวด์? คำแปลและ ROM ในเครื่องยังอยู่'))return;await FontCloud.romRequest('delete',{p_id:p.workspaceId});$('romCloudStatus').textContent='ลบ ROM คลาวด์แล้ว · คำแปลยังอยู่';bridge().toast('ลบ ROM คลาวด์แล้ว');});
 $('romCloudCheck').onclick=()=>action(async()=>{const p=target(),m=await info(p.workspaceId);$('romCloudStatus').textContent=!m?'ยังไม่ได้เก็บ ROM บนคลาวด์':m.ready?'เก็บ ROM ครบแล้ว · '+(m.size/1048576).toFixed(2)+' MB':'อัปโหลดยังค้าง '+Math.floor((m.present?.length||0)/m.chunks*100)+'% · กดเก็บ ROM เพื่อส่งต่อจากเดิม';});
 $('romCloudSql').onclick=async()=>{try{await navigator.clipboard.writeText(RomCloudSchema);$('romCloudStatus').textContent='คัดลอก SQL แล้ว วางใน Supabase SQL Editor แล้ว Run ครั้งเดียว';}catch{$('romCloudSqlText').value=RomCloudSchema;$('romCloudSqlText').hidden=false;$('romCloudSqlText').select();}};
 return {forResume,info,checkSetup,saveWork};
})();
window.RomCloud=RomCloud;
