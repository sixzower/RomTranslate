/* Portable work files and private cloud copies use the existing font connection. */
const WorkManager = (() => {
  const $ = id => document.getElementById(id), bridge = () => window.RomTranslateBridge;
  let busy = false, queued = false, timer = null, latestCloud = null, remoteReady = false, awaitingRom = null, pollingRom = false;
  const sent = new Map(),resumedScopes=new Set();
  const newest=rows=>rows.slice().sort((a,b)=>(typeof b.updated_at==='number'?b.updated_at:Date.parse(b.updated_at)||0)-(typeof a.updated_at==='number'?a.updated_at:Date.parse(a.updated_at)||0)||Number(b.revision)-Number(a.revision));
  async function retainLatest(id,revision,scope){
    const request=async(action,args)=>{if(await FontCloud.workspaceScope()!==scope)throw Error('คลังเปลี่ยนระหว่างจัดเก็บงาน กรุณาเชื่อมต่อใหม่');return FontCloud.workspaceRequest(action,args);};
    const rows=await request('list');if(!Array.isArray(rows))throw Error('อ่านรายการเพื่อตรวจงานล่าสุดไม่ได้');
    const keep=rows.find(r=>r.workspace_id===id);
    if(!keep||Number(keep.revision)!==Number(revision)||newest(rows)[0]?.workspace_id!==id)throw Error('คลาวด์มีงานรุ่นใหม่กว่า จึงยังไม่ลบสำเนาเก่า · รีเฟรชรายการก่อน');
    for(const item of rows){if(item.workspace_id===id)continue;
      const latest=await request('list');if(newest(latest)[0]?.workspace_id!==id||Number(latest.find(r=>r.workspace_id===id)?.revision)!==Number(revision))throw Error('งานคลาวด์เปลี่ยนระหว่างจัดเก็บ จึงหยุดลบสำเนาเก่า');
      await WorkspaceDelete.remove(item,request,status);sent.delete(item.workspace_id);
      await bridge().storeCloudState(item.workspace_id,{cloudAutosave:false,cloudSyncPaused:true,cloudDeletePending:false});
    }
  }
  async function sharedWorkspace(p,scope){
    if(p.cloudScope&&p.cloudScope!==scope)throw Error('งานในเครื่องอยู่คนละคลัง · ยังไม่รวมงานข้ามคลัง');
    const stamp=p.lastChangedAt,current=bridge().project();
    const rows=newest(await FontCloud.workspaceRequest('list'));
    const item=rows[0];if(!item)return p;
    if(item.rom_sha256!==p.romHash)throw Error('คลังมีโปรเจกต์หลักของ ROM อีกไฟล์ · ยังไม่ส่งงานในเครื่องไปแทนที่');
    const saved=(await FontCloud.workspaceRequest('get',{p_id:item.workspace_id}))?.[0];
    if(await FontCloud.workspaceScope()!==scope||bridge().project()!==current||p.lastChangedAt!==stamp)throw Error('งานเปลี่ยนระหว่างซิงก์ · จะบันทึกรอบถัดไป');
    if(!saved?.payload||saved.payload.workspaceId!==item.workspace_id||saved.payload.romHash!==p.romHash)throw Error('อ่านโปรเจกต์หลักไม่สำเร็จ · ยังไม่ส่งงานไปแทนที่');
    if(p.workspaceId===item.workspace_id&&Number(saved.revision)===Number(p.cloudRevision))return p;
    const local=TranslationTasks.portable(p);
    // Merge unsent fields against the last confirmed server snapshot.
    const merged=WorkspaceSync.reconcile(local,saved.payload,p.cloudBase||null);
    const payload={...merged,cloudRevision:Number(saved.revision),cloudScope:scope,cloudAutosave:true,cloudSyncPaused:false,cloudBase:structuredClone(saved.payload)};
    const guard=()=>FontCloud.authenticated()&&bridge().project()===current&&p.lastChangedAt===stamp;
    if(current!==p)throw Error('โปรเจกต์ในเครื่องยังไม่เปิด · เปิดงานหลักก่อนซิงก์');
    if(await bridge().loadWorkspace(payload,{guard,requireRom:true})!==true)throw Error('ยังเปิดโปรเจกต์หลักไม่ได้ · งานเดิมยังอยู่');
    const active=bridge().project();await bridge().storeCloudState(active.workspaceId,{cloudBase:structuredClone(saved.payload)});
    if(local.workspaceId!==active.workspaceId)await bridge().storeCloudState(local.workspaceId,{cloudAutosave:false,cloudSyncPaused:true});
    status('ใช้โปรเจกต์หลักเดียวกันแล้ว · รวมคำแปลที่ไม่ซ้ำกันไว้ครบ');return active;
  }
  async function loadCloudItem(item){
    const scope=await FontCloud.workspaceScope(),result=await FontCloud.workspaceRequest('get',{p_id:item.workspace_id}),saved=result?.[0];
    if(!saved?.payload||saved.payload.workspaceId!==item.workspace_id||saved.payload.romHash!==item.rom_sha256)throw Error('ไม่พบไฟล์งานและ ROM ที่ตรงกับรายการ กรุณารีเฟรช');
    if(await FontCloud.workspaceScope()!==scope)throw Error('คลังเปลี่ยนแล้ว กรุณาเปิดรายการใหม่');
    if(bridge().project()?.romHash===saved.payload.romHash){await sharedWorkspace(bridge().project(),scope);$('workDialog').close();return true;}
    status('กำลังเปิด ROM และคำแปลล่าสุด…');
    const payload={...saved.payload,cloudRevision:Number(saved.revision),cloudScope:scope,cloudAutosave:true,cloudSyncPaused:false,cloudDeletePending:false,lastCloudSavedAt:Date.parse(item.updated_at)||Date.now(),cloudSavedChange:saved.payload.lastChangedAt||0};
    let loaded;try{loaded=await bridge().loadWorkspace(payload,{requireRom:true});}catch(e){if(!e.romRequired)throw e;
      if(!bridge().project()&&!bridge().pendingWorkspace())await bridge().autoResumeWorkspace(payload,()=>FontCloud.authenticated()&&!bridge().project()&&!bridge().pendingWorkspace(),null);
      if(!bridge().project()&&bridge().pendingWorkspace()?.workspaceId===payload.workspaceId){awaitingRom={id:payload.workspaceId,hash:payload.romHash,scope};resumedScopes.delete(scope);}
      await inspectCloudRom(item);status('คำแปลยังอยู่ · รอเครื่องเดิมสำรองไฟล์เกมให้ครบ');return false;}
    if(loaded!==true)throw Error('ยังเปิด ROM ไม่สำเร็จ · งานเดิมยังอยู่ กรุณาลองอีกครั้ง');
    await bridge().storeCloudState(payload.workspaceId,{cloudBase:structuredClone(saved.payload)});$('workDialog').close();$('fontCloudDialog').close();$('cloudManageDialog').close();status('เปิด ROM และคำแปลล่าสุดแล้ว');bridge().toast('เปิด ROM พร้อมคำแปลล่าสุดแล้ว ทำงานต่อได้เลย');
  }
  function status(message) { $('workStatus').textContent = message; }
  function button(label, action) { const b = document.createElement('button'); b.textContent = label; b.onclick = action; return b; }
  function time(value){return new Date(value).toLocaleString('th-TH',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Bangkok'});}
  function backupStatus(p){$('backupStatus').hidden=!p;const local=$('localSaveStatus'),cloud=$('cloudSaveStatus'),badge=$('autosaveBadge');if(!p){local.textContent='ยังไม่ได้เปิดโปรเจกต์';cloud.textContent='ยังไม่ได้เปิดโปรเจกต์';badge.textContent='บันทึกงานอัตโนมัติ';return;}const pending=(p.lastLocalSavedChange||0)<(p.lastChangedAt||0);local.textContent=pending?'กำลังบันทึก…':p.lastLocalSavedAt?'บันทึกแล้ว · '+time(p.lastLocalSavedAt):'รอบันทึกครั้งแรก';badge.textContent=pending?'กำลังบันทึก…':p.lastLocalSavedAt?'บันทึกแล้ว '+new Date(p.lastLocalSavedAt).toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok'}):'บันทึกงานอัตโนมัติ';badge.title=local.textContent;
    const suffix=p.lastCloudSavedAt?' · ล่าสุด '+time(p.lastCloudSavedAt):'';cloud.textContent=p.cloudDeletePending?'รอตรวจผลลบสำเนา · หยุดสำรองชั่วคราว':p.cloudSyncPaused?'หยุดสำรองงานนี้'+suffix:!FontCloud.connected()?'รอเชื่อมคลังส่วนตัว'+suffix:(p.cloudSavedChange||0)<(p.lastChangedAt||0)?'มีการแก้ไข รอสำรอง'+suffix:p.lastCloudSavedAt?(p.cloudRomReady?'ROM และคำแปลสำรองครบแล้ว':'คำแปลสำรองแล้ว · ROM ยังไม่พร้อม')+suffix:'ยังไม่ได้สำรอง';
  }
  function renderCurrent() {
    const p = bridge()?.project(), task = TranslationTasks.active(p);backupStatus(p);for(const button of document.querySelectorAll('#workCloudRows button'))button.disabled=busy;
    $('workBanner').hidden = !task || RomTranslateViews.current()!=='translation';
    $('cloudBackupRetry').hidden=!p||!!p.cloudRomReady&&!p.cloudSyncPaused&&(p.cloudSavedChange||0)>=(p.lastChangedAt||0);
    $('cloudBackupRetry').disabled=busy||!p||!FontCloud.connected();
    $('workCloudRefresh').disabled=busy||!FontCloud.connected();
    $('romCloudOpen').disabled=busy||FontCloud.connected()&&(!latestCloud||!remoteReady&&p?.romHash!==latestCloud.rom_sha256);
    $('romCloudOpen').textContent=!FontCloud.connected()?'เชื่อมคลังส่วนตัว':!latestCloud?'ยังไม่มีงานบนคลาวด์':remoteReady||p&&p.romHash===latestCloud.rom_sha256?'เปิดงานต่อ':'รอไฟล์เกมบนคลาวด์';
    if (task) { const s = TranslationTasks.stats(p, task); $('workBannerText').textContent = 'กำลังดูชุด: '+task.name + ` · แปลแล้ว ${s.done}/${s.total} · เหลือ ${s.remaining}`; }
  }
  function localRecords(records){
    if(!Array.isArray(records))throw Error('อ่านรายการโปรเจกต์ในเครื่องไม่สำเร็จ');
    const rows=[],issues=[...(records.invalidRecords||[])];
    for(let i=0;i<records.length;i++){const p=records[i];if(p&&TranslationTasks.uuid(p.workspaceId))rows.push(p);else issues.push({id:'local:invalid-'+i,name:'ไฟล์งานในเครื่อง',kind:'local',message:'ข้ามรายการงานที่ว่างหรือไม่มีรหัสโปรเจกต์ · ไม่ได้ลบข้อมูลเดิม'});}
    return {rows,issues};
  }
  async function open() {
    $('workDialog').showModal();renderCurrent();await run(async()=>{status('กำลังโหลดโปรเจกต์…');if(FontCloud.connected()){await listCloud();status('');}else status('บันทึกในเครื่องอัตโนมัติ · เชื่อมคลังส่วนตัวเพื่อสำรองข้ามเครื่อง');});
  }
  async function run(action) {
    if (busy){status('กำลังจัดการโปรเจกต์ กรุณารอสักครู่');return;} busy = true; renderCurrent();
    try { await action(); } catch (e) { status(e.message);if(e.networkFailure)FontCloud.reportError(e.message);if($('workDialog').open)window.UiShell?.notify(e.message,true);else bridge().toast(e.message,'error'); }
    finally { busy = false; renderCurrent(); if (queued) { queued = false; schedule(); } }
  }
  async function inspectCloudRom(item){
    remoteReady=false;$('cloudRomState').dataset.state='checking';$('cloudRomState').textContent='กำลังตรวจไฟล์เกมบนคลาวด์…';$('cloudRomHint').textContent='';
    try{const {metadata:m}=await RomCloud.locate({workspaceId:item.workspace_id,romHash:item.rom_sha256});if(latestCloud?.workspace_id!==item.workspace_id)return;
      if(m?.ready){remoteReady=true;$('cloudRomState').dataset.state='ready';$('cloudRomState').textContent='ไฟล์เกมและคำแปลพร้อมเปิด · '+(m.size/1048576).toFixed(0)+' MB';}
      else{$('cloudRomState').dataset.state='waiting';const count=new Set(m?.present||[]).size,total=m?.chunks||0;const percent=total?Math.floor(count/total*100):0;$('cloudRomState').textContent=m?'ไฟล์เกมยังสำรองไม่ครบ · '+percent+'% ('+count+'/'+total+' ส่วน)':'พบคำแปล · ยังไม่มีไฟล์เกมบนคลาวด์';$('cloudRomHint').textContent='เปิดเว็บที่เครื่องเดิมให้สำรอง ROM ครบก่อน มือถือจะเปิดงานให้เอง ไม่ต้องเลือกไฟล์ในมือถือ';}
    }catch(e){$('cloudRomState').dataset.state='error';$('cloudRomState').textContent=e.romSetupMissing?'ยังไม่ได้ติดตั้งที่เก็บไฟล์เกม':'ตรวจไฟล์เกมไม่สำเร็จ';$('cloudRomHint').textContent=e.message;}
    renderCurrent();
  }
  async function removeCloudItem(item){
    if(!confirm('ลบโปรเจกต์ “'+item.name+'” และไฟล์เกมบนคลาวด์? งานในเครื่องยังอยู่'))return;
    status('กำลังลบโปรเจกต์…');const scope=await FontCloud.workspaceScope();clearTimeout(timer);
    await bridge().storeCloudState(item.workspace_id,{cloudAutosave:false,cloudSyncPaused:true,cloudDeletePending:true});
    const request=async(action,args)=>{if(await FontCloud.workspaceScope()!==scope)throw Error('คลังเปลี่ยนระหว่างลบ กรุณาเปิดรายการใหม่');return FontCloud.workspaceRequest(action,args);};
    await WorkspaceDelete.remove(item,request,status);sent.delete(item.workspace_id);
    await bridge().storeCloudState(item.workspace_id,{cloudRevision:0,cloudSyncPaused:true,cloudAutosave:false,cloudDeletePending:false,lastCloudSavedAt:0,cloudSavedChange:0});
    await listCloud();status('ลบโปรเจกต์และไฟล์เกมบนคลาวด์แล้ว · งานในเครื่องยังอยู่');
  }
  async function listCloud(){
    const result=await FontCloud.workspaceRequest('list');if(!Array.isArray(result))throw Error('อ่านรายการไฟล์งานไม่สำเร็จ');const rows=newest(result),item=rows[0];latestCloud=item||null;remoteReady=false;
    $('workCloudRows').replaceChildren();$('workCloudActions').replaceChildren();$('cloudRomHint').textContent='';
    if(item){const row=document.createElement('article'),info=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small');row.className='project-card';row.dataset.workspaceId=item.workspace_id;info.className='project-card-info';title.textContent=item.name;meta.textContent='บันทึกล่าสุด '+time(item.updated_at);info.append(title,meta);row.append(info);$('workCloudRows').append(row);
      $('workCloudActions').append(button('ดาวน์โหลดสำรอง (.zip)',()=>run(async()=>{const saved=(await FontCloud.workspaceRequest('get',{p_id:item.workspace_id}))?.[0]?.payload;if(!saved||saved.workspaceId!==item.workspace_id||saved.romHash!==item.rom_sha256)throw Error('โปรเจกต์เปลี่ยนแล้ว กรุณาตรวจสถานะใหม่');await RomCloud.saveWork(saved);})),button('ลบโปรเจกต์บนคลาวด์',()=>run(()=>removeCloudItem(item))));
      await inspectCloudRom(item);
    }else{$('workCloudRows').textContent='ยังไม่มีงานบนคลาวด์';$('cloudRomState').textContent='เปิด ROM ใหม่ที่เครื่องที่ต้องการเริ่มแปล แล้วเชื่อมคลังเพื่อสำรอง';$('cloudRomState').dataset.state='empty';}
    renderCurrent();return rows;
  }
  async function autoResume(rows,scope){
    if((resumedScopes.has(scope)&&!bridge().project())||bridge().isLoading())return;
    const staged=bridge().pendingWorkspace();if(staged&&(!awaitingRom||awaitingRom.scope!==scope||awaitingRom.id!==staged.workspaceId))return;
    if(bridge().project())return;
    const current=bridge().project(),clean=p=>p&&!p.cloudSyncPaused&&p.cloudScope===scope&&p.cloudRevision>0&&(p.cloudSavedChange||0)>=(p.lastChangedAt||0);
    // Never switch away from active work. A clean copy of the same workspace
    // can receive its newer cloud revision once on connection.
    const candidates=rows.slice().sort((a,b)=>(Date.parse(b.updated_at)||0)-(Date.parse(a.updated_at)||0)||String(a.workspace_id).localeCompare(String(b.workspace_id)));
    const item=current?(clean(current)?candidates.find(r=>r.workspace_id===current.workspaceId&&Number(r.revision)>current.cloudRevision):null):candidates[0];
    if(!item){resumedScopes.add(scope);return;}
    const stamp=current?.lastChangedAt,guard=()=>FontCloud.authenticated()&&!bridge().isLoading()&&bridge().pendingWorkspace()===staged&&bridge().project()===current&&(!current||current.lastChangedAt===stamp&&clean(current));
    const result=await FontCloud.workspaceRequest('get',{p_id:item.workspace_id}),saved=result?.[0];
    if(!guard())return;
    if(!saved?.payload||saved.payload.workspaceId!==item.workspace_id)throw Error('ไม่พบไฟล์งานคลาวด์ที่ตรงกับรายการ');
    const payload={...saved.payload,cloudRevision:Number(saved.revision),cloudScope:scope,cloudAutosave:true,cloudSyncPaused:false,cloudDeletePending:false,lastCloudSavedAt:Date.parse(item.updated_at)||Date.now(),cloudSavedChange:saved.payload.lastChangedAt||0};
    let cloudBytes=null;if(window.RomCloud&&!current){const cached=await bridge().cachedRom(payload.romHash).catch(()=>null);if(!cached?.bytes)try{cloudBytes=await RomCloud.forResume(payload);}catch(e){if(e.name!=='AbortError')throw e;resumedScopes.add(scope);awaitingRom=null;status('ยกเลิกเปิดงานอัตโนมัติแล้ว');return;}if(!guard())return;}if(await bridge().autoResumeWorkspace(payload,guard,cloudBytes,staged)){await bridge().storeCloudState(payload.workspaceId,{cloudBase:structuredClone(saved.payload)});awaitingRom=null;resumedScopes.add(scope);status('เปิดงานล่าสุดอัตโนมัติแล้ว · '+(payload.workspaceName||payload.title));}else if(!bridge().project()&&bridge().pendingWorkspace()?.workspaceId===payload.workspaceId){awaitingRom={id:payload.workspaceId,hash:payload.romHash,scope};status('รอ ROM สำรอง · พร้อมแล้วจะเปิดงานให้อัตโนมัติ');}
  }
  async function pollAwaitingRom(){
    const waiting=awaitingRom;if(!waiting||busy||pollingRom||!FontCloud.connected()||document.hidden)return;
    if(bridge().project()||bridge().pendingWorkspace()?.workspaceId!==waiting.id){awaitingRom=null;return;}
    pollingRom=true;
    try{
      if(await FontCloud.workspaceScope()!==waiting.scope){awaitingRom=null;return;}
      const metadata=await RomCloud.readyInfo(waiting.id,waiting.hash);
      if(!metadata?.ready||metadata.sha256!==waiting.hash)return;
      if(awaitingRom!==waiting||bridge().project()||bridge().pendingWorkspace()?.workspaceId!==waiting.id)return;
      await syncConnected();
    }catch(e){status('ยังรอ ROM สำรอง · ระบบจะตรวจอีกครั้งอัตโนมัติ');}
    finally{pollingRom=false;}
  }
  window.addEventListener('romtranslate:cloud-resume-cancelled',()=>{if(awaitingRom)resumedScopes.add(awaitingRom.scope);awaitingRom=null;});
  window.addEventListener('focus',pollAwaitingRom);window.addEventListener('online',pollAwaitingRom);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollAwaitingRom();});
  setInterval(pollAwaitingRom,60000);
  function serialized(p) { const payload = TranslationTasks.portable(p); delete payload.cloudRevision; return {payload, content:JSON.stringify(payload)}; }
  async function upload(manual = false, target = bridge().project(), options={}) {
    let p = target; if (!p) throw Error('เปิด ROM / ไฟล์งานก่อน');
    if (!manual && (!p.cloudAutosave||p.cloudSyncPaused)) return;
    const scope = await FontCloud.workspaceScope();
    if (p.cloudScope !== scope) {
      if (!manual && p.cloudScope) { status('ไฟล์นี้อยู่คนละคลัง ไม่ย้ายคลังอัตโนมัติ'); return; }
      p.cloudScope = scope; p.cloudRevision = 0;
    }
    p=await sharedWorkspace(p,scope);
    const changedAt=p.lastChangedAt||Date.now();const {payload, content} = serialized(p);
    if (!manual && sent.get(p.workspaceId) === content){await bridge().storeCloudState(p.workspaceId,{cloudSavedChange:changedAt});await finishBackup(p,p.cloudRevision,scope,options);renderCurrent();return;}
    if (new TextEncoder().encode(content).length > 16*1024*1024) throw Error('ไฟล์งานคลาวด์ต้องไม่เกิน 16 MB ดาวน์โหลด JSON สำรองได้');
    status('กำลังบันทึกไฟล์งานบนคลาวด์…');
    let revision;
    try { revision = Number(await FontCloud.workspaceRequest('put', {p_id:p.workspaceId,p_expected:p.cloudRevision || 0,p_payload:payload})); }
    catch (e) { if (/Workspace version conflict/.test(e.message)) { p.cloudAutosave = false;p.cloudSyncPaused=true;await bridge().storeCloudState(p.workspaceId,{cloudAutosave:false,cloudSyncPaused:true}); throw Error('อีกเครื่องมีไฟล์งานรุ่นใหม่กว่า หยุดซิงก์เพื่อไม่ทับข้อมูล ดาวน์โหลด JSON ของเครื่องนี้ไว้ แล้วรีเฟรชรายการและเปิดฉบับคลาวด์ก่อน'); } throw e; }
    if (!Number.isSafeInteger(revision) || revision < 1) throw Error('เวอร์ชันไฟล์งานตอบกลับไม่ถูกต้อง');
    sent.set(p.workspaceId, content);p.cloudRevision=revision;await bridge().storeCloudState(p.workspaceId,{cloudScope:scope,cloudRevision:revision,cloudAutosave:true,cloudSyncPaused:false,cloudDeletePending:false,lastCloudSavedAt:Date.now(),cloudSavedChange:changedAt,cloudBase:structuredClone(payload)});
    await finishBackup(p,revision,scope,options);
    status('บันทึกคลาวด์แล้ว · รุ่น ' + revision + ' · ' + new Date().toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok'}));
    if ($('workDialog').open)await listCloud();
  }
  async function finishBackup(p,revision,scope,options){
    try{
      if(!window.RomCloud?.ensure)throw Error('ระบบสำรอง ROM ยังไม่พร้อม กรุณาเปิดเว็บรุ่นล่าสุด');
      await bridge().storeCloudState(p.workspaceId,{cloudRomReady:false});
      await RomCloud.ensure(p,{interactive:!!options.interactive,onProgress:(value,message)=>{status(message);if($('cloudSaveStatus'))$('cloudSaveStatus').textContent=message;options.onProgress?.(value,message);}});
      await bridge().storeCloudState(p.workspaceId,{cloudRomReady:true});
      await retainLatest(p.workspaceId,revision,scope);
    }catch(e){throw Error('คำแปลบันทึกแล้ว แต่ยังสำรองงานครบชุดไม่สำเร็จ: '+e.message);}
  }
  function schedule() {
    clearTimeout(timer); const p = bridge()?.project(); if (!p?.cloudAutosave || !FontCloud.connected()) return;
    timer = setTimeout(() => { if (busy) { queued = true; return; } run(() => upload()); }, 1500);
  }
  $('workOpen').onclick = open; $('workClose').onclick = () => $('workDialog').close();
  $('workCloudRefresh').onclick=()=>run(listCloud);
  $('romCloudOpen').onclick=()=>{if(!FontCloud.connected()){FontCloud.open();return;}return run(async()=>{const rows=await listCloud();if(!rows.length)throw Error('ยังไม่มีโปรเจกต์บนคลาวด์');await loadCloudItem(rows[0]);});};
  $('cloudBackupRetry').onclick=()=>run(async()=>{await upload(true,bridge().project(),{interactive:true});await listCloud();});
  $('workPauseCurrent').onclick = () => { const p=bridge().project(),t=TranslationTasks.active(p);if(t){TranslationTasks.finish(p,t.id,'paused');bridge().workChanged();} };
  $('workCancelCurrent').onclick = () => { const p=bridge().project(),t=TranslationTasks.active(p);if(t){TranslationTasks.finish(p,t.id,'cancelled');bridge().workChanged();} };
  async function syncConnected(onProgress=()=>{}){
    if(busy){const since=Date.now();while(busy&&Date.now()-since<20000){onProgress(0,'รอบันทึกงานปัจจุบันก่อนซิงก์');await new Promise(resolve=>setTimeout(resolve,100));}if(busy)throw Error('กำลังบันทึกงาน กรุณารอสักครู่แล้วซิงก์อีกครั้ง');}
    busy=true;renderCurrent();
    try{onProgress(0,'กำลังคืนงานในเครื่องก่อนอ่านคลาวด์');if(typeof bridge()?.startupReady!=='function')throw Error('ไฟล์เว็บที่โหลดเป็นคนละรุ่น กรุณาปิดแท็บนี้แล้วเปิด https://sixzower.github.io/RomTranslate/ ใหม่ หรือใช้ index.html รุ่นล่าสุด');await bridge().startupReady();onProgress(0,'กำลังอ่านรายการโปรเจกต์');const scope=await FontCloud.workspaceScope();const cloudRows=await listCloud(),resumeWarnings=[];const waitingSince=Date.now();while(bridge().isLoading()&&Date.now()-waitingSince<60000){onProgress(5,'รอเปิด ROM ในเครื่องก่อนคืนงานคลาวด์');await new Promise(resolve=>setTimeout(resolve,100));}if(bridge().isLoading())throw Error('ROM ยังเปิดไม่เสร็จ กรุณาซิงก์คลังอีกครั้งหลังเปิด ROM');try{await autoResume(cloudRows,scope);}catch(e){const current=bridge().project(),item=current?cloudRows.find(r=>r.workspace_id===current.workspaceId):cloudRows.slice().sort((a,b)=>(Date.parse(b.updated_at)||0)-(Date.parse(a.updated_at)||0))[0];resumeWarnings.push({id:item?.workspace_id,name:item?.name||'โปรเจกต์ล่าสุด',kind:'resume',message:'ดึงงานอัตโนมัติยังไม่สำเร็จ: '+e.message+' · เปิด โปรเจกต์ Cloud เพื่อเลือกงานอีกครั้ง'});}if(bridge().project()&&cloudRows.length&&!resumeWarnings.length)try{await sharedWorkspace(bridge().project(),scope);}catch(e){resumeWarnings.push({id:bridge().project().workspaceId,message:e.message});}onProgress(10,'อ่านรายการโปรเจกต์บนคลาวด์แล้ว');const current=bridge().project(),{rows:locals,issues:localIssues}=localRecords(await bridge().localWorkspaces());const rows=new Map(locals.map(p=>[p.workspaceId,p]));if(current){TranslationTasks.ensure(current);current.font=FontPresets.data();rows.set(current.workspaceId,current);}
      const warnings=[...resumeWarnings,...localIssues];let completed=0;const candidate=current||(!cloudRows.length?newest([...rows.values()].map(p=>({...p,updated_at:p.lastChangedAt||p.lastLocalSavedAt||0})))[0]:null);const planned=(candidate?[candidate]:[]).filter(p=>!resumeWarnings.some(w=>w.id===p.workspaceId)&&p.workspaceId!==bridge().pendingWorkspace()?.workspaceId&&!p.cloudSyncPaused&&(!p.cloudScope||p.cloudScope===scope));onProgress(20,'กำลังสำรอง '+planned.length+' โปรเจกต์');
      for(const p of planned){if(p.cloudSyncPaused||p.cloudScope&&p.cloudScope!==scope)continue;p.cloudAutosave=true;try{await upload(false,p,{onProgress:(value,message)=>onProgress(20+70*(completed+value/100)/planned.length,message)});}catch(e){if(/รุ่นใหม่กว่า/.test(e.message)){warnings.push({id:p.workspaceId,name:p.workspaceName||p.title,message:e.message});}else warnings.push({id:p.workspaceId,name:p.workspaceName||p.title,message:e.message});}onProgress(20+70*(++completed)/planned.length,'ตรวจการสำรอง '+completed+'/'+planned.length+' โปรเจกต์แล้ว');}
      if(!candidate&&!resumeWarnings.length&&cloudRows.length){const latest=newest(cloudRows)[0];try{const m=await RomCloud.info(latest.workspace_id);if(m?.ready&&m.sha256===latest.rom_sha256)await retainLatest(latest.workspace_id,latest.revision,scope);}catch(e){warnings.push({id:latest.workspace_id,name:latest.name,kind:'cleanup',message:'งานล่าสุดยังอยู่ แต่ยังจัดเก็บสำเนาเก่าไม่ครบ: '+e.message});}}
      onProgress(95,'กำลังตรวจรายการโปรเจกต์ล่าสุด');await listCloud();onProgress(100,'ตรวจรายการโปรเจกต์ครบแล้ว');if(warnings.length)status(warnings[0].message);return {pendingProjects:warnings};
    }finally{busy=false;renderCurrent();if(queued){queued=false;schedule();}}
  }
  window.addEventListener('romtranslate:project-changed',e=>{renderCurrent();const p=bridge().project();if(!p)return;if(FontCloud.connected()&&!p.cloudSyncPaused){p.cloudAutosave=true;schedule();}});
  async function followShared(){if(busy||!FontCloud.connected()||document.hidden)return;try{await syncConnected();}catch(e){status(e.message);}}
  window.addEventListener('focus',followShared);setInterval(followShared,60000);
  window.addEventListener('online',schedule);window.addEventListener('romtranslate:view',renderCurrent);
  window.addEventListener('romtranslate:cloud-connection',()=>{if(!FontCloud.connected())clearTimeout(timer);else{const p=bridge().project();if(p&&!p.cloudSyncPaused){p.cloudAutosave=true;schedule();}}renderCurrent();});
  return {renderCurrent,open,syncConnected,saveForRom:async(options={})=>{if(busy)throw Error('กำลังบันทึกโปรเจกต์ กรุณารอสักครู่');busy=true;renderCurrent();try{await upload(true,bridge().project(),options);}finally{busy=false;renderCurrent();}}};
})();
window.WorkManager=WorkManager;
