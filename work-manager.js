/* Portable work files and private cloud copies use the existing font connection. */
const WorkManager = (() => {
  const $ = id => document.getElementById(id), bridge = () => window.RomTranslateBridge;
  let busy = false, queued = false, timer = null;
  const sent = new Map();
  function status(message) { $('workStatus').textContent = message;$('workInlineStatus').textContent=message; $('workCloudBadge').textContent = message; }
  function button(label, action) { const b = document.createElement('button'); b.textContent = label; b.onclick = action; return b; }
  function name() { const value = $('workspaceName').value.trim(); if (!value || value.length > 100) throw Error('ใส่ชื่อไฟล์งาน 1–100 ตัวอักษร'); return value; }
  function time(value){return new Date(value).toLocaleString('th-TH',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Bangkok'});}
  function backupStatus(p){const local=$('localSaveStatus'),cloud=$('cloudSaveStatus'),file=$('fileBackupStatus'),badge=$('autosaveBadge');if(!p){local.textContent='ยังไม่ได้เปิดโปรเจกต์';cloud.textContent='ยังไม่ได้เปิดโปรเจกต์';file.textContent='ยังไม่ได้ส่งออก';badge.textContent='บันทึกงานอัตโนมัติ';return;}const pending=(p.lastLocalSavedChange||0)<(p.lastChangedAt||0);local.textContent=pending?'กำลังบันทึก…':p.lastLocalSavedAt?'บันทึกแล้ว · '+time(p.lastLocalSavedAt):'รอบันทึกครั้งแรก';badge.textContent=pending?'กำลังบันทึก…':p.lastLocalSavedAt?'บันทึกแล้ว '+new Date(p.lastLocalSavedAt).toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok'}):'บันทึกงานอัตโนมัติ';badge.title=local.textContent;
    const suffix=p.lastCloudSavedAt?' · ล่าสุด '+time(p.lastCloudSavedAt):'';cloud.textContent=p.cloudSyncPaused?'หยุดสำรองงานนี้'+suffix:!FontCloud.connected()?'รอเชื่อมคลังส่วนตัว'+suffix:(p.cloudSavedChange||0)<(p.lastChangedAt||0)?'มีการแก้ไข รอสำรอง'+suffix:p.lastCloudSavedAt?'สำรองแล้ว'+suffix:'ยังไม่ได้สำรอง';file.textContent=p.lastExportedAt?'ส่งออกล่าสุด '+time(p.lastExportedAt):'ยังไม่เคยส่งออก (ไม่จำเป็น ต้องการเก็บสำรองเองค่อยดาวน์โหลด)';
  }
  function renderCurrent() {
    const p = bridge()?.project(), task = TranslationTasks.active(p);backupStatus(p);
    $('workBanner').hidden = !task || RomTranslateViews.current()!=='translation';
    $('workCreate').disabled = !p; $('workFileSave').disabled = !p; $('workCloudSave').disabled = !p || busy || !FontCloud.connected();
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
  async function localList() {
    try { const rows = await bridge().localWorkspaces(); $('workLocalRows').replaceChildren();
      for (const p of rows) { const row = document.createElement('p'); row.textContent = (p.workspaceName || p.title) + ' ';
        row.append(button('เปิดงานในเครื่อง', async () => { try { await bridge().loadWorkspace(p); $('workDialog').close(); } catch (e) { status(e.message); } })); row.append(button('ลบงานในเครื่อง',async()=>{if(!confirm('ลบไฟล์งานนี้จากเครื่อง? สำเนาคลาวด์ยังอยู่'))return;try{clearTimeout(timer);await bridge().removeLocalWorkspace(p.workspaceId);sent.delete(p.workspaceId);await localList();status('ลบงานในเครื่องแล้ว');}catch(e){status(e.message);}}));$('workLocalRows').append(row); }
    } catch (e) { status('อ่านงานในเครื่องไม่สำเร็จ: ' + e.message); }
  }
  async function open() {
    const p = bridge().project(); $('workspaceName').value = p?.workspaceName || p?.title.replace(/\.gba$/i, '') || '';
    $('workTaskName').value = TranslationTasks.active(p)?.name || 'งาน ' + ($('categoryFilter').selectedOptions[0]?.textContent || 'แปลเกม');

    $('workDialog').showModal(); renderCurrent(); renderTasks(); await localList();
    if (FontCloud.connected()) await run(listCloud); else status('ไฟล์งาน JSON ใช้ข้ามเครื่องได้ทันที หรือเชื่อมคลังส่วนตัวเพื่อเก็บบนคลาวด์');
  }
  async function run(action) {
    if (busy) return; busy = true; renderCurrent();
    try { await action(); } catch (e) { status(e.message);if(!/รุ่นใหม่กว่า/.test(e.message))FontCloud.reportError(e.message);if($('workDialog').open)window.UiShell?.notify(e.message,true); }
    finally { busy = false; renderCurrent(); if (queued) { queued = false; schedule(); } }
  }
  async function listCloud() {
    const rows = await FontCloud.workspaceRequest('list'); if (!Array.isArray(rows)) throw Error('อ่านรายการไฟล์งานไม่สำเร็จ');
    $('workCloudRows').replaceChildren();
    for (const item of rows) {
      const row = document.createElement('p');row.dataset.workspaceId=item.workspace_id; row.textContent = `${item.name} · งานค้าง ${item.pending_tasks} · ${new Date(item.updated_at).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'})} `;
      row.append(button('เปิดไฟล์งานนี้', () => run(async () => {
        const result = await FontCloud.workspaceRequest('get', {p_id: item.workspace_id}); const saved = result?.[0];
        if (!saved?.payload) throw Error('ไม่พบไฟล์งานบนคลาวด์');
        await bridge().loadWorkspace({...saved.payload, cloudRevision: Number(saved.revision),cloudScope:await FontCloud.workspaceScope(),cloudSyncPaused:false,lastCloudSavedAt:Date.parse(item.updated_at)||Date.now()}); $('workDialog').close();$('fontCloudDialog').close();
        status('เปิดไฟล์งานคลาวด์แล้ว ถ้ายังไม่ได้เปิด ROM ให้เลือก ROM ต้นฉบับเดียวกัน');
      })));
      row.append(button('ลบสำเนาคลาวด์', () => {
        if (!confirm('ลบสำเนาคลาวด์ “' + item.name + '”? คำแปลในเครื่องและไฟล์ JSON ยังอยู่')) return;
        run(async () => { const p = bridge().project(); if (p?.workspaceId === item.workspace_id) { p.cloudAutosave = false;p.cloudSyncPaused=true; bridge().workChanged(); }
          await FontCloud.workspaceRequest('delete', {p_id:item.workspace_id,p_expected:Number(item.revision)});await bridge().storeCloudState(item.workspace_id,{cloudRevision:0,cloudSyncPaused:true,cloudAutosave:false,lastCloudSavedAt:0,cloudSavedChange:0});sent.delete(item.workspace_id);await listCloud(); status('ลบสำเนาคลาวด์แล้ว งานในเครื่องยังอยู่'); });
      }));
      $('workCloudRows').append(row);
    }
    if (!rows.length) $('workCloudRows').textContent = 'คลังนี้ยังไม่มีไฟล์งาน';
    status('อ่านคลาวด์แล้ว · ' + rows.length + ' ไฟล์งาน');
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
    if ($('fontCloudDialog').open)await listCloud();if($('workDialog').open)await localList();
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
  async function syncConnected(){
    if(busy){queued=true;throw Error('กำลังบันทึกงาน กรุณารอสักครู่แล้วซิงก์อีกครั้ง');}
    busy=true;renderCurrent();
    try{const scope=await FontCloud.workspaceScope();await listCloud();const current=bridge().project(),locals=await bridge().localWorkspaces();const rows=new Map(locals.map(p=>[p.workspaceId,p]));if(current){TranslationTasks.ensure(current);current.font=FontPresets.data();rows.set(current.workspaceId,current);}
      const warnings=[];
      for(const p of rows.values()){if(p.cloudSyncPaused||p.cloudScope&&p.cloudScope!==scope)continue;p.cloudAutosave=true;try{await upload(false,p);}catch(e){if(/รุ่นใหม่กว่า/.test(e.message)){warnings.push(e.message);continue;}throw e;}}
      await listCloud();if(warnings.length)status(warnings[0]);
    }finally{busy=false;renderCurrent();if(queued){queued=false;schedule();}}
  }
  window.addEventListener('romtranslate:project-changed',e=>{renderCurrent();const p=bridge().project();if(!p)return;if(e.detail?.initial&&p.cloudRevision>0)sent.set(p.workspaceId,serialized(p).content);if(FontCloud.connected()&&!p.cloudSyncPaused){p.cloudAutosave=true;schedule();}});
  window.addEventListener('online',schedule);window.addEventListener('romtranslate:view',renderCurrent);
  window.addEventListener('romtranslate:cloud-connection',()=>{if(!FontCloud.connected())clearTimeout(timer);else{const p=bridge().project();if(p&&!p.cloudSyncPaused){p.cloudAutosave=true;schedule();}}renderCurrent();});
  return {renderCurrent,open,syncConnected,localList};
})();
window.WorkManager=WorkManager;
