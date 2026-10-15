/* Portable work files and private cloud copies use the existing font connection. */
const WorkManager = (() => {
  const $ = id => document.getElementById(id), bridge = () => window.RomTranslateBridge;
  let busy = false, queued = false, timer = null;
  const sent = new Map(),resumedScopes=new Set();
  function status(message) { $('workStatus').textContent = message;$('workInlineStatus').textContent=message; $('workCloudBadge').textContent = message; }
  function button(label, action) { const b = document.createElement('button'); b.textContent = label; b.onclick = action; return b; }
  function name() { const value = $('workspaceName').value.trim(); if (!value || value.length > 100) throw Error('ใส่ชื่อไฟล์งาน 1–100 ตัวอักษร'); return value; }
  function time(value){return new Date(value).toLocaleString('th-TH',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Bangkok'});}
  function backupStatus(p){const local=$('localSaveStatus'),cloud=$('cloudSaveStatus'),file=$('fileBackupStatus'),badge=$('autosaveBadge');if(!p){local.textContent='ยังไม่ได้เปิดโปรเจกต์';cloud.textContent='ยังไม่ได้เปิดโปรเจกต์';file.textContent='ยังไม่ได้ส่งออก';badge.textContent='บันทึกงานอัตโนมัติ';return;}const pending=(p.lastLocalSavedChange||0)<(p.lastChangedAt||0);local.textContent=pending?'กำลังบันทึก…':p.lastLocalSavedAt?'บันทึกแล้ว · '+time(p.lastLocalSavedAt):'รอบันทึกครั้งแรก';badge.textContent=pending?'กำลังบันทึก…':p.lastLocalSavedAt?'บันทึกแล้ว '+new Date(p.lastLocalSavedAt).toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok'}):'บันทึกงานอัตโนมัติ';badge.title=local.textContent;
    const suffix=p.lastCloudSavedAt?' · ล่าสุด '+time(p.lastCloudSavedAt):'';cloud.textContent=p.cloudSyncPaused?'หยุดสำรองงานนี้'+suffix:!FontCloud.connected()?'รอเชื่อมคลังส่วนตัว'+suffix:(p.cloudSavedChange||0)<(p.lastChangedAt||0)?'มีการแก้ไข รอสำรอง'+suffix:p.lastCloudSavedAt?'สำรองแล้ว'+suffix:'ยังไม่ได้สำรอง';file.textContent=p.lastExportedAt?'ส่งออกล่าสุด '+time(p.lastExportedAt):'ยังไม่เคยส่งออก (ไม่จำเป็น ต้องการเก็บสำรองเองค่อยดาวน์โหลด)';
  }
  function renderCurrent() {
    const p = bridge()?.project(), task = TranslationTasks.active(p);backupStatus(p);for(const button of document.querySelectorAll('#workCloudRows button,#workLocalRows button'))button.disabled=busy;
    $('workBanner').hidden = !task || RomTranslateViews.current()!=='translation';
    $('workCreate').disabled = !p; $('workFileSave').disabled = !p; $('workCloudSave').disabled = !p || busy || !FontCloud.connected();
    $('romCloudUpload').disabled=busy||!p||!FontCloud.connected();for(const id of ['romCloudRemove','romCloudCheck'])$(id).disabled=busy||!(p||bridge()?.pendingWorkspace())||!FontCloud.connected();
    $('workCloudRefresh').disabled = busy||!FontCloud.connected(); $('workDrafts').disabled = !p?.entries.some(e => e.contextual && e.contextual !== e.translation);
    if (task) { const s = TranslationTasks.stats(p, task); $('workBannerText').textContent = 'กำลังดูชุด: '+task.name + ` · แปลแล้ว ${s.done}/${s.total} · เหลือ ${s.remaining}`; }
  }
  function renderTasks() {
    const p = bridge()?.project(); $('workTaskRows').replaceChildren();
    if (!p) return;
    for (const task of p.workTasks || []) {
      const row = document.createElement('div'), label = document.createElement('span'), stats = TranslationTasks.stats(p, task);
      label.textContent = `${task.name} · ${stats.done}/${stats.total} · ${ {active:'กำลังทำ',paused:'พักไว้',completed:'ปิดงานแล้ว',cancelled:'ยกเลิกแล้ว'}[task.status]} `;
      row.append(label);
      if (['active', 'paused'].includes(task.status)) {
        row.append(button('ทำต่อ', () => { bridge().resumeWork(task.id); $('workDialog').close(); }));
        for (const [label, state] of [['พัก', 'paused'], ['ปิดงาน', 'completed'], ['ยกเลิกงาน', 'cancelled']]) row.append(button(label, () => { TranslationTasks.finish(p, task.id, state); bridge().workChanged(); renderTasks(); }));
      } else row.append(button('ลบรายการงาน', () => { p.workTasks = p.workTasks.filter(t => t.id !== task.id); bridge().workChanged(); renderTasks(); }));
      $('workTaskRows').append(row);
    }
    if (!p.workTasks?.length) $('workTaskRows').textContent = 'ยังไม่มีงานค้าง เลือกหมวด / ผลกรอง แล้วกดจำส่วนนี้เป็นงานใหม่';
  }
  function localRecords(records){
    if(!Array.isArray(records))throw Error('อ่านรายการโปรเจกต์ในเครื่องไม่สำเร็จ');
    const rows=[],issues=[...(records.invalidRecords||[])];
    for(let i=0;i<records.length;i++){const p=records[i];if(p&&TranslationTasks.uuid(p.workspaceId))rows.push(p);else issues.push({id:'local:invalid-'+i,name:'ไฟล์งานในเครื่อง',kind:'local',message:'ข้ามรายการงานที่ว่างหรือไม่มีรหัสโปรเจกต์ · ไม่ได้ลบข้อมูลเดิม'});}
    return {rows,issues};
  }
  async function localList() {
    try { const {rows,issues}=localRecords(await bridge().localWorkspaces()); $('workLocalRows').replaceChildren();if(!rows.length)$('workLocalRows').textContent='ยังไม่มีโปรเจกต์บันทึกในเครื่อง';
      for (const p of rows) { const row = document.createElement('p'); row.textContent = (p.workspaceName || p.title) + ' ';
        row.append(button('เปิดงานในเครื่อง', async () => { try { await bridge().loadWorkspace(p); $('workDialog').close(); } catch (e) { status(e.message); } })); row.append(button('ลบงานในเครื่อง',async()=>{if(!confirm('ลบไฟล์งานนี้จากเครื่อง? สำเนาคลาวด์ยังอยู่'))return;try{clearTimeout(timer);await bridge().removeLocalWorkspace(p.workspaceId);sent.delete(p.workspaceId);await localList();status('ลบงานในเครื่องแล้ว');}catch(e){status(e.message);}}));$('workLocalRows').append(row); }
    for(const issue of issues){const note=document.createElement('p');note.textContent=issue.message;$('workLocalRows').append(note);}
    } catch (e) { status('อ่านงานในเครื่องไม่สำเร็จ: ' + e.message); }finally{renderCurrent();}
  }
  async function open() {
    const p = bridge().project(); $('workspaceName').value = p?.workspaceName || p?.title.replace(/\.gba$/i, '') || '';
    $('workTaskName').value = TranslationTasks.active(p)?.name || 'งาน ' + ($('categoryFilter').selectedOptions[0]?.textContent || 'แปลเกม');

    $('workDialog').showModal();renderCurrent();renderTasks();await run(async()=>{status('กำลังโหลดโปรเจกต์…');await localList();if(FontCloud.connected()){const rows=await listCloud();await window.RomCloud?.checkSetup(rows[0]?.workspace_id);}else status('บันทึกในเครื่องอัตโนมัติ · เชื่อมคลังส่วนตัวเพื่อสำรองข้ามเครื่อง');});
  }
  async function run(action) {
    if (busy){status('กำลังจัดการโปรเจกต์ กรุณารอสักครู่');return;} busy = true; renderCurrent();
    try { await action(); } catch (e) { status(e.message);if(!/รุ่นใหม่กว่า/.test(e.message))FontCloud.reportError(e.message);if($('workDialog').open)window.UiShell?.notify(e.message,true); }
    finally { busy = false; renderCurrent(); if (queued) { queued = false; schedule(); } }
  }
  async function listCloud() {
    const rows = await FontCloud.workspaceRequest('list'); if (!Array.isArray(rows)) throw Error('อ่านรายการไฟล์งานไม่สำเร็จ');
    $('workCloudRows').replaceChildren();
    for (const item of rows) {
      const row = document.createElement('article');row.className='project-card';row.dataset.workspaceId=item.workspace_id;const info=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small');title.textContent=item.name;meta.textContent='อัปเดต '+time(item.updated_at)+(Number(item.pending_tasks)>0?' · '+Number(item.pending_tasks)+' ชุดงานค้าง':'');info.className='project-card-info';info.append(title,meta);row.append(info);const actions=document.createElement('div');actions.className='project-card-actions';row.append(actions);
      actions.append(button('เปิดไฟล์งานนี้', () => run(async () => {
        const result = await FontCloud.workspaceRequest('get', {p_id: item.workspace_id}); const saved = result?.[0];
        if (!saved?.payload) throw Error('ไม่พบไฟล์งานบนคลาวด์');
        const loaded=await bridge().loadWorkspace({...saved.payload, cloudRevision: Number(saved.revision),cloudScope:await FontCloud.workspaceScope(),cloudSyncPaused:false,lastCloudSavedAt:Date.parse(item.updated_at)||Date.now()});if(loaded===false)return; $('workDialog').close();$('fontCloudDialog').close();$('cloudManageDialog').close();
        status('เปิดไฟล์งานคลาวด์แล้ว ถ้ายังไม่ได้เปิด ROM ให้เลือก ROM ต้นฉบับเดียวกัน');
      })));
      const more=document.createElement('details'),moreTitle=document.createElement('summary');moreTitle.textContent='เพิ่มเติม';more.append(moreTitle);actions.append(more);more.append(button('ลบสำเนาคลาวด์', () => {
        if (!confirm('ลบสำเนาคลาวด์ “' + item.name + '”? คำแปลในเครื่องและไฟล์ JSON ยังอยู่')) return;
        run(async () => { const p = bridge().project();try{await FontCloud.workspaceRequest('delete', {p_id:item.workspace_id,p_expected:Number(item.revision)});}catch(e){if(/Workspace version conflict/.test(e.message)){await listCloud();throw Error('ไฟล์งานนี้มีรุ่นใหม่กว่า รีเฟรชรายการแล้ว ตรวจรายการล่าสุดก่อนกดลบอีกครั้ง');}throw e;}if (p?.workspaceId === item.workspace_id) {p.cloudAutosave=false;p.cloudSyncPaused=true;bridge().workChanged();}await bridge().storeCloudState(item.workspace_id,{cloudRevision:0,cloudSyncPaused:true,cloudAutosave:false,lastCloudSavedAt:0,cloudSavedChange:0});sent.delete(item.workspace_id);await listCloud(); status('ลบสำเนาคลาวด์แล้ว งานในเครื่องยังอยู่'); });
      }));
      $('workCloudRows').append(row);
    }
    if (!rows.length) $('workCloudRows').textContent = 'ยังไม่มีโปรเจกต์บนคลาวด์ · เปิด ROM แล้วเชื่อมคลังเพื่อเริ่มบันทึก';renderCurrent();
    status(rows.length+' โปรเจกต์');return rows;
  }
  async function autoResume(rows,scope){
    if(resumedScopes.has(scope)||bridge().isLoading()||bridge().pendingWorkspace())return;
    const current=bridge().project(),clean=p=>p&&!p.cloudSyncPaused&&p.cloudScope===scope&&p.cloudRevision>0&&(p.cloudSavedChange||0)>=(p.lastChangedAt||0);
    // Never switch away from active work. A clean copy of the same workspace
    // can receive its newer cloud revision once on connection.
    const candidates=rows.slice().sort((a,b)=>(Date.parse(b.updated_at)||0)-(Date.parse(a.updated_at)||0)||String(a.workspace_id).localeCompare(String(b.workspace_id)));
    const item=current?(clean(current)?candidates.find(r=>r.workspace_id===current.workspaceId&&Number(r.revision)>current.cloudRevision):null):candidates[0];
    if(!item){resumedScopes.add(scope);return;}
    const stamp=current?.lastChangedAt,guard=()=>FontCloud.authenticated()&&!bridge().isLoading()&&!bridge().pendingWorkspace()&&bridge().project()===current&&(!current||current.lastChangedAt===stamp&&clean(current));
    const result=await FontCloud.workspaceRequest('get',{p_id:item.workspace_id}),saved=result?.[0];
    if(!guard())return;
    if(!saved?.payload||saved.payload.workspaceId!==item.workspace_id)throw Error('ไม่พบไฟล์งานคลาวด์ที่ตรงกับรายการ');
    const payload={...saved.payload,cloudRevision:Number(saved.revision),cloudScope:scope,cloudAutosave:true,cloudSyncPaused:false,lastCloudSavedAt:Date.parse(item.updated_at)||Date.now(),cloudSavedChange:saved.payload.lastChangedAt||0};
    let cloudBytes=null;if(window.RomCloud&&!current){const cached=await bridge().cachedRom(payload.romHash).catch(()=>null);if(!cached?.bytes)cloudBytes=await RomCloud.forResume(payload);if(!guard())return;}if(await bridge().autoResumeWorkspace(payload,guard,cloudBytes)){resumedScopes.add(scope);status('ดึงโปรเจกต์ล่าสุดแล้ว · '+(payload.workspaceName||payload.title));}
  }
  function serialized(p) { const payload = TranslationTasks.portable(p); delete payload.cloudRevision; return {payload, content:JSON.stringify(payload)}; }
  async function upload(manual = false, target = bridge().project()) {
    const p = target; if (!p) throw Error('เปิด ROM / ไฟล์งานก่อน');
    if (!manual && (!p.cloudAutosave||p.cloudSyncPaused)) return;
    const scope = await FontCloud.workspaceScope();
    if (p.cloudScope !== scope) {
      if (!manual && p.cloudScope) { status('ไฟล์นี้อยู่คนละคลัง ไม่ย้ายคลังอัตโนมัติ'); return; }
      p.cloudScope = scope; p.cloudRevision = 0;
    }
    const changedAt=p.lastChangedAt||Date.now();const {payload, content} = serialized(p);
    if (!manual && sent.get(p.workspaceId) === content){await bridge().storeCloudState(p.workspaceId,{cloudSavedChange:changedAt});renderCurrent();return;}
    if (new TextEncoder().encode(content).length > 16*1024*1024) throw Error('ไฟล์งานคลาวด์ต้องไม่เกิน 16 MB ดาวน์โหลด JSON สำรองได้');
    status('กำลังบันทึกไฟล์งานบนคลาวด์…');
    let revision;
    try { revision = Number(await FontCloud.workspaceRequest('put', {p_id:p.workspaceId,p_expected:p.cloudRevision || 0,p_payload:payload})); }
    catch (e) { if (/Workspace version conflict/.test(e.message)) { p.cloudAutosave = false;p.cloudSyncPaused=true;await bridge().storeCloudState(p.workspaceId,{cloudAutosave:false,cloudSyncPaused:true}); throw Error('อีกเครื่องมีไฟล์งานรุ่นใหม่กว่า หยุดซิงก์เพื่อไม่ทับข้อมูล ดาวน์โหลด JSON ของเครื่องนี้ไว้ แล้วรีเฟรชรายการและเปิดฉบับคลาวด์ก่อน'); } throw e; }
    if (!Number.isSafeInteger(revision) || revision < 1) throw Error('เวอร์ชันไฟล์งานตอบกลับไม่ถูกต้อง');
    sent.set(p.workspaceId, content);p.cloudRevision=revision;await bridge().storeCloudState(p.workspaceId,{cloudScope:scope,cloudRevision:revision,cloudAutosave:true,cloudSyncPaused:false,lastCloudSavedAt:Date.now(),cloudSavedChange:changedAt});
    status('บันทึกคลาวด์แล้ว · รุ่น ' + revision + ' · ' + new Date().toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok'}));
    if ($('workDialog').open)await listCloud();if($('workDialog').open)await localList();
  }
  function schedule() {
    clearTimeout(timer); const p = bridge()?.project(); if (!p?.cloudAutosave || !FontCloud.connected()) return;
    timer = setTimeout(() => { if (busy) { queued = true; return; } run(() => upload()); }, 1500);
  }
  $('workspaceName').onchange=()=>{try{const p=bridge().project();if(p){p.workspaceName=name();bridge().workChanged();}}catch(e){status(e.message);}};
  $('workOpen').onclick = open; $('workClose').onclick = () => $('workDialog').close();
  $('workCreate').onclick = () => { try { const p = bridge().project(), rows = bridge().workRows(); const task = TranslationTasks.create(p,rows,$('workTaskName').value,bridge().workFilter()); bridge().resumeWork(task.id); renderTasks(); } catch(e) { status(e.message); } };
  $('workFileSave').onclick = () => { try { const p=bridge().project(); p.workspaceName=name(); bridge().workChanged(); $('export').click(); } catch(e) { status(e.message); } };
  $('workCloudSave').onclick=()=>run(async()=>{const p=bridge().project();if(!p)throw Error('เปิดไฟล์งานก่อน');p.cloudSyncPaused=false;p.cloudAutosave=true;await upload(true);});
  $('workCloudRefresh').onclick=()=>run(listCloud);
  $('workPauseCurrent').onclick = () => { const p=bridge().project(),t=TranslationTasks.active(p);if(t){TranslationTasks.finish(p,t.id,'paused');bridge().workChanged();} };
  $('workCancelCurrent').onclick = () => { const p=bridge().project(),t=TranslationTasks.active(p);if(t){TranslationTasks.finish(p,t.id,'cancelled');bridge().workChanged();} };
  $('workDrafts').onclick = () => { const p=bridge().project();$('workDraftRows').replaceChildren();for(const e of p?.entries||[])if(e.contextual&&e.contextual!==e.translation){const row=document.createElement('p');row.textContent='#'+e.id+' · '+e.category+' · '+e.contextual+' ';row.append(button('ไปแก้ร่าง',()=>{$('workDraftDialog').close();$('workDialog').close();window.RomTranslateBridge.goToEntry(e.id);$('importDraftPanel').open=true;}));$('workDraftRows').append(row);}$('workDraftDialog').showModal(); };
  $('workDraftClose').onclick = () => $('workDraftDialog').close();
  async function syncConnected(onProgress=()=>{}){
    if(busy){const since=Date.now();while(busy&&Date.now()-since<20000){onProgress(0,'รอบันทึกงานปัจจุบันก่อนซิงก์');await new Promise(resolve=>setTimeout(resolve,100));}if(busy)throw Error('กำลังบันทึกงาน กรุณารอสักครู่แล้วซิงก์อีกครั้ง');}
    busy=true;renderCurrent();
    try{onProgress(0,'กำลังคืนงานในเครื่องก่อนอ่านคลาวด์');if(typeof bridge()?.startupReady!=='function')throw Error('ไฟล์เว็บที่โหลดเป็นคนละรุ่น กรุณาปิดแท็บนี้แล้วเปิด https://sixzower.github.io/RomTranslate/ ใหม่ หรือใช้ index.html รุ่นล่าสุด');await bridge().startupReady();onProgress(0,'กำลังอ่านรายการโปรเจกต์');const scope=await FontCloud.workspaceScope();const cloudRows=await listCloud(),resumeWarnings=[];const waitingSince=Date.now();while(bridge().isLoading()&&Date.now()-waitingSince<60000){onProgress(5,'รอเปิด ROM ในเครื่องก่อนคืนงานคลาวด์');await new Promise(resolve=>setTimeout(resolve,100));}if(bridge().isLoading())throw Error('ROM ยังเปิดไม่เสร็จ กรุณาซิงก์คลังอีกครั้งหลังเปิด ROM');try{await autoResume(cloudRows,scope);}catch(e){const current=bridge().project(),item=current?cloudRows.find(r=>r.workspace_id===current.workspaceId):cloudRows.slice().sort((a,b)=>(Date.parse(b.updated_at)||0)-(Date.parse(a.updated_at)||0))[0];resumeWarnings.push({id:item?.workspace_id,name:item?.name||'โปรเจกต์ล่าสุด',kind:'resume',message:'ดึงงานอัตโนมัติยังไม่สำเร็จ: '+e.message+' · เปิด โปรเจกต์ Cloud เพื่อเลือกงานอีกครั้ง'});}onProgress(10,'อ่านรายการโปรเจกต์บนคลาวด์แล้ว');const current=bridge().project(),{rows:locals,issues:localIssues}=localRecords(await bridge().localWorkspaces());const rows=new Map(locals.map(p=>[p.workspaceId,p]));if(current){TranslationTasks.ensure(current);current.font=FontPresets.data();rows.set(current.workspaceId,current);}
      const warnings=[...resumeWarnings,...localIssues];let completed=0;const planned=[...rows.values()].filter(p=>!resumeWarnings.some(w=>w.id===p.workspaceId)&&p.workspaceId!==bridge().pendingWorkspace()?.workspaceId&&!p.cloudSyncPaused&&(!p.cloudScope||p.cloudScope===scope));onProgress(20,'กำลังสำรอง '+planned.length+' โปรเจกต์');
      for(const p of planned){if(p.cloudSyncPaused||p.cloudScope&&p.cloudScope!==scope)continue;p.cloudAutosave=true;try{await upload(false,p);}catch(e){if(/รุ่นใหม่กว่า/.test(e.message)){warnings.push({id:p.workspaceId,name:p.workspaceName||p.title,message:e.message});}else warnings.push({id:p.workspaceId,name:p.workspaceName||p.title,message:e.message});}onProgress(20+70*(++completed)/planned.length,'ตรวจการสำรอง '+completed+'/'+planned.length+' โปรเจกต์แล้ว');}
      onProgress(95,'กำลังตรวจรายการโปรเจกต์ล่าสุด');await listCloud();onProgress(100,'ตรวจรายการโปรเจกต์ครบแล้ว');if(warnings.length)status(warnings[0].message);return {pendingProjects:warnings};
    }finally{busy=false;renderCurrent();if(queued){queued=false;schedule();}}
  }
  window.addEventListener('romtranslate:project-changed',e=>{renderCurrent();const p=bridge().project();if(!p)return;if(e.detail?.initial&&p.cloudRevision>0)sent.set(p.workspaceId,serialized(p).content);if(FontCloud.connected()&&!p.cloudSyncPaused){p.cloudAutosave=true;schedule();}});
  window.addEventListener('online',schedule);window.addEventListener('romtranslate:view',renderCurrent);
  window.addEventListener('romtranslate:cloud-connection',()=>{if(!FontCloud.connected())clearTimeout(timer);else{const p=bridge().project();if(p&&!p.cloudSyncPaused){p.cloudAutosave=true;schedule();}}renderCurrent();});
  return {renderCurrent,open,syncConnected,localList,saveForRom:async()=>{if(busy)throw Error('กำลังบันทึกโปรเจกต์ กรุณารอสักครู่');busy=true;renderCurrent();try{await upload(true);}finally{busy=false;renderCurrent();}}};
})();
window.WorkManager=WorkManager;
