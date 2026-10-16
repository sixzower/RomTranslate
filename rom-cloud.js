/* Private, optional, chunked ROM copies; translation backups remain independent. */
const RomCloud=(()=>{
 const $=id=>document.getElementById(id),CHUNK=262144,bridge=()=>window.RomTranslateBridge;let busy=false,cancelled=false,preparing=false;
 function check(){if(cancelled)throw new DOMException('ยกเลิกรับส่ง ROM แล้ว','AbortError');}
 function progress(value,text){check();value=Math.min(100,Math.max(0,Math.floor(value)));$('romCloudBar').value=value;$('romCloudPercent').textContent=value+'%';$('romCloudDetail').textContent=text;}
 $('romCloudProgress').addEventListener('cancel',event=>{event.preventDefault();cancelled=true;$('romCloudDetail').textContent='กำลังยกเลิก… ชิ้นส่วนที่ส่งแล้วเก็บไว้ส่งต่อหรือลบได้';});
 function start(title){if(busy)throw Error('กำลังรับส่ง ROM กรุณารอสักครู่');busy=true;cancelled=false;$('romCloudHeading').textContent=title;progress(0,'กำลังตรวจไฟล์');$('romCloudProgress').showModal();}
 function beginResume(){if(busy||preparing)return false;preparing=true;cancelled=false;resumeStage('กำลังอ่านโปรเจกต์ล่าสุดจากคลาวด์');return true;}
 function resumeStage(message){if(!preparing)return;check();$('romCloudHeading').textContent='เปิด ROM และงานแปลล่าสุด';$('romCloudBar').removeAttribute('value');$('romCloudPercent').textContent='';$('romCloudDetail').textContent=message;if(!$('romCloudProgress').open)$('romCloudProgress').showModal();}
 function endResume(){if(!preparing)return;preparing=false;if(!busy)$('romCloudProgress').close();}
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
 async function readyInfo(id,hash){
  let m=await info(id);
  if(m&&!m.ready&&m.sha256===hash&&Number.isSafeInteger(m.size)&&m.size>=192&&m.size<=33554432&&m.chunks===Math.ceil(m.size/CHUNK)&&Array.isArray(m.present)&&new Set(m.present).size===m.chunks&&m.present.every(i=>Number.isInteger(i)&&i>=0&&i<m.chunks)){
   m=await FontCloud.romRequest('finish',{p_id:id});
  }
  return m;
 }
 async function locate(p){
  let m=await readyInfo(p.workspaceId,p.romHash),source=p;
  if(!m?.ready){const rows=await FontCloud.workspaceRequest('list');if(!Array.isArray(rows))throw Error('อ่านรายการ ROM ของงานเดิมไม่ได้');for(const row of rows){if(row.workspace_id===p.workspaceId||row.rom_sha256!==p.romHash)continue;const candidate=await readyInfo(row.workspace_id,p.romHash);if(candidate?.sha256!==p.romHash)continue;if(candidate.ready||!m||(candidate.present?.length||0)>(m.present?.length||0)){m=candidate;source={...p,workspaceId:row.workspace_id};}if(m?.ready)break;}}
  if(m&&(m.sha256!==p.romHash||!Number.isSafeInteger(m.size)||m.size<192||m.size>33554432||m.chunks!==Math.ceil(m.size/CHUNK)))throw Error('ข้อมูลไฟล์เกมบนคลาวด์ไม่ตรงกับโปรเจกต์');
  return {metadata:m,source};
 }
 async function forResume(p,{strict=false}={}){const own=beginResume();try{check();resumeStage('กำลังตรวจไฟล์เกมของ '+(p.workspaceName||p.title));
  const {metadata:m,source}=await locate(p);
  if(strict&&!m?.ready){const error=Error(m?'ROM ของงานนี้ยังสำรองไม่ครบ':'คำแปลอยู่บนคลาวด์แล้ว แต่ยังไม่มี ROM ที่สำรองครบ');error.romRequired=true;throw error;}
  check();return await download(source,m);
 }catch(e){if(strict||e.name==='AbortError')throw e;if(!e.romSetupMissing)bridge().toast('ยังเปิดงานจากคลาวด์ไม่ได้: '+e.message);return null;}finally{if(own)endResume();}}
 async function ensure(p,{interactive=false,onProgress=()=>{}}={}){
  if(busy)throw Error('กำลังรับส่ง ROM กรุณารอสักครู่');
  const scope=await FontCloud.workspaceScope();
  if(interactive)start('สำรอง ROM และคำแปล');else{busy=true;cancelled=false;}
  const scoped=async(action,args,retry=false)=>{check();if(await FontCloud.workspaceScope()!==scope)throw Error('คลังเปลี่ยนระหว่างสำรอง ROM จึงหยุดส่งไฟล์');return request(action,args,retry);};
  const update=(value,message)=>{if(interactive)progress(value,message);onProgress(Math.floor(value),message);};
  try{
   update(0,'กำลังตรวจ ROM บนคลาวด์');const existing=await scoped('info',{p_id:p.workspaceId});
   if(existing?.ready){if(existing.sha256!==p.romHash||existing.size<192||existing.size>33554432||existing.chunks!==Math.ceil(existing.size/CHUNK))throw Error('ROM คลาวด์ไม่ตรงกับโปรเจกต์');update(100,'ROM สำรองครบแล้ว');return;}
   let bytes;if(bridge().project()?.workspaceId===p.workspaceId){const snapshot=bridge().romSnapshot();if(snapshot.hash!==p.romHash)throw Error('ROM ในเครื่องไม่ตรงกับงาน');bytes=snapshot.bytes;}else bytes=(await bridge().cachedRom(p.romHash).catch(()=>null))?.bytes;
   if(!bytes)throw Error('คำแปลถูกบันทึกแล้ว แต่เครื่องนี้ไม่มี ROM ต้นฉบับ · เปิดเว็บที่เครื่องเดิมและเชื่อมคลัง ระบบจะสำรอง ROM ให้เอง');
   if(bytes.byteLength>33554432||await RomCore.fingerprint(bytes)!==p.romHash)throw Error('ROM ไม่ตรงกับโปรเจกต์ จึงยังสำรองไม่ได้');
   const m=await scoped('begin',{p_id:p.workspaceId,p_size:bytes.length,p_hash:p.romHash},true),present=new Set(m?.present||[]),total=bytes.length,chunks=Math.ceil(total/CHUNK),chunkBytes=i=>Math.min(CHUNK,total-i*CHUNK);
   if(m?.sha256!==p.romHash||m.size!==total||[...present].some(i=>!Number.isInteger(i)||i<0||i>=chunks))throw Error('ข้อมูลตอบรับ ROM ไม่ตรงกับไฟล์');
   let confirmed=m.ready?total:[...present].reduce((sum,i)=>sum+chunkBytes(i),0);
   const show=()=>update(Math.min(99,confirmed/total*100),'สำรอง ROM '+Math.floor(confirmed/total*100)+'% · เซิร์ฟเวอร์รับแล้ว '+confirmed.toLocaleString()+' / '+total.toLocaleString()+' ไบต์');show();
   if(!m.ready)for(let i=0;i<chunks;i++){check();if(!present.has(i)){await scoped('put',{p_id:p.workspaceId,p_index:i,p_data:base64(bytes.subarray(i*CHUNK,(i+1)*CHUNK))},true);confirmed+=chunkBytes(i);show();}await new Promise(resolve=>setTimeout(resolve,0));}
   const result=await scoped('finish',{p_id:p.workspaceId},true);if(!result?.ready)throw Error('เซิร์ฟเวอร์ยังไม่ยืนยัน ROM');
   update(100,'สำรอง ROM ครบแล้ว');window.CompletionSounds?.play('upload');
  }finally{if(interactive)end();else busy=false;}
 }
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
 $('romCloudSql').onclick=async()=>{try{await navigator.clipboard.writeText(RomCloudSchema);$('cloudManageStatus').textContent='คัดลอก SQL แล้ว วางใน Supabase SQL Editor แล้ว Run ครั้งเดียว';}catch{$('romCloudSqlText').value=RomCloudSchema;$('romCloudSqlText').hidden=false;$('romCloudSqlText').select();}};
 return {beginResume,resumeStage,endResume,forResume,info,readyInfo,locate,checkSetup,saveWork,ensure};
})();
window.RomCloud=RomCloud;
