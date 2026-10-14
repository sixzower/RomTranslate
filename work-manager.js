/* Portable work files and private cloud copies use the existing font connection. */
const WorkManager = (() => {
  const $ = id => document.getElementById(id), bridge = () => window.RomTranslateBridge;
  let busy = false, queued = false, timer = null;
  const sent = new Map();
  function status(message) { $('workStatus').textContent = message; $('workCloudBadge').textContent = message; }
  function button(label, action) { const b = document.createElement('button'); b.textContent = label; b.onclick = action; return b; }
  function name() { const value = $('workspaceName').value.trim(); if (!value || value.length > 100) throw Error('ใส่ชื่อไฟล์งาน 1–100 ตัวอักษร'); return value; }
  function renderCurrent() {
    const p = bridge()?.project(), task = TranslationTasks.active(p);
    $('workBanner').hidden = !task || RomTranslateViews.current()!=='translation';
    $('workCreate').disabled = !p; $('workFileSave').disabled = !p; $('workCloudSave').disabled = !p || busy;
    $('workCloudRefresh').disabled = busy; $('workDrafts').disabled = !p?.entries.some(e => e.contextual && e.contextual !== e.translation);
    if (task) { const s = TranslationTasks.stats(p, task); $('workBannerText').textContent = task.name + ` · แปลแล้ว ${s.done}/${s.total} · เหลือ ${s.remaining}`; }
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
        row.append(button('เปิดงานในเครื่อง', async () => { try { await bridge().loadWorkspace(p); $('workDialog').close(); } catch (e) { status(e.message); } })); $('workLocalRows').append(row); }
    } catch (e) { status('อ่านงานในเครื่องไม่สำเร็จ: ' + e.message); }
  }
  async function open() {
    const p = bridge().project(); $('workspaceName').value = p?.workspaceName || p?.title.replace(/\.gba$/i, '') || '';
    $('workTaskName').value = TranslationTasks.active(p)?.name || 'งาน ' + ($('categoryFilter').selectedOptions[0]?.textContent || 'แปลเกม');
    $('workAutosync').checked = p?.cloudAutosave === true;
    $('workDialog').showModal(); renderCurrent(); renderTasks(); await localList();
    if (FontCloud.connected()) await run(listCloud); else status('ไฟล์งาน JSON ใช้ข้ามเครื่องได้ทันที หรือเชื่อมคลังส่วนตัวเพื่อเก็บบนคลาวด์');
  }
  async function run(action) {
    if (busy) return; busy = true; renderCurrent();
    try { await action(); } catch (e) { status(e.message);if($('workDialog').open)window.UiShell?.notify(e.message,true); }
    finally { busy = false; renderCurrent(); if (queued) { queued = false; schedule(); } }
  }
  async function listCloud() {
    const rows = await FontCloud.workspaceRequest('list'); if (!Array.isArray(rows)) throw Error('อ่านรายการไฟล์งานไม่สำเร็จ');
    $('workCloudRows').replaceChildren();
    for (const item of rows) {
      const row = document.createElement('p'); row.textContent = `${item.name} · งานค้าง ${item.pending_tasks} · ${new Date(item.updated_at).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'})} `;
      row.append(button('เปิดไฟล์งานนี้', () => run(async () => {
        const result = await FontCloud.workspaceRequest('get', {p_id: item.workspace_id}); const saved = result?.[0];
        if (!saved?.payload) throw Error('ไม่พบไฟล์งานบนคลาวด์');
        await bridge().loadWorkspace({...saved.payload, cloudRevision: Number(saved.revision)}); $('workDialog').close();
        status('เปิดไฟล์งานคลาวด์แล้ว ถ้ายังไม่ได้เปิด ROM ให้เลือก ROM ต้นฉบับเดียวกัน');
      })));
      row.append(button('ลบสำเนาคลาวด์', () => {
        if (!confirm('ลบสำเนาคลาวด์ “' + item.name + '”? คำแปลในเครื่องและไฟล์ JSON ยังอยู่')) return;
        run(async () => { const p = bridge().project(); if (p?.workspaceId === item.workspace_id) { p.cloudAutosave = false; $('workAutosync').checked = false; bridge().workChanged(); }
          await FontCloud.workspaceRequest('delete', {p_id:item.workspace_id,p_expected:Number(item.revision)});if(p?.workspaceId===item.workspace_id){await bridge().cloudSaved(item.workspace_id,0);sent.delete(item.workspace_id);}await listCloud(); status('ลบสำเนาคลาวด์แล้ว งานในเครื่องยังอยู่'); });
      }));
      $('workCloudRows').append(row);
    }
    if (!rows.length) $('workCloudRows').textContent = 'คลังนี้ยังไม่มีไฟล์งาน';
    status('อ่านคลาวด์แล้ว · ' + rows.length + ' ไฟล์งาน');
  }
  function serialized(p) { const payload = TranslationTasks.portable(p); delete payload.cloudRevision; return {payload, content:JSON.stringify(payload)}; }
  async function upload(manual = false) {
    const p = bridge().project(); if (!p) throw Error('เปิด ROM / ไฟล์งานก่อน');
    if (!manual && !p.cloudAutosave) return;
    const scope = await FontCloud.workspaceScope();
    if (p.cloudScope !== scope) {
      if (!manual) { status('คลังที่เชื่อมต่อเปลี่ยนไป กดบันทึกคลาวด์เองก่อนเปิดซิงก์งานนี้'); return; }
      p.cloudScope = scope; p.cloudRevision = 0;
    }
    const {payload, content} = serialized(p);
    if (!manual && sent.get(p.workspaceId) === content) return;
    if (new TextEncoder().encode(content).length > 16*1024*1024) throw Error('ไฟล์งานคลาวด์ต้องไม่เกิน 16 MB ดาวน์โหลด JSON สำรองได้');
    status('กำลังบันทึกไฟล์งานบนคลาวด์…');
    let revision;
    try { revision = Number(await FontCloud.workspaceRequest('put', {p_id:p.workspaceId,p_expected:p.cloudRevision || 0,p_payload:payload})); }
    catch (e) { if (/Workspace version conflict/.test(e.message)) { p.cloudAutosave = false; $('workAutosync').checked = false; bridge().workChanged(); throw Error('อีกเครื่องมีไฟล์งานรุ่นใหม่กว่า หยุดซิงก์เพื่อไม่ทับข้อมูล ดาวน์โหลด JSON ของเครื่องนี้ไว้ แล้วรีเฟรชรายการและเปิดฉบับคลาวด์ก่อน'); } throw e; }
    if (!Number.isSafeInteger(revision) || revision < 1) throw Error('เวอร์ชันไฟล์งานตอบกลับไม่ถูกต้อง');
    sent.set(p.workspaceId, content); await bridge().cloudSaved(p.workspaceId, revision);
    status('บันทึกคลาวด์แล้ว · รุ่น ' + revision + ' · ' + new Date().toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok'}));
    if ($('workDialog').open) { await listCloud(); await localList(); }
  }
  function schedule() {
    clearTimeout(timer); const p = bridge()?.project(); if (!p?.cloudAutosave || !FontCloud.connected()) return;
    timer = setTimeout(() => { if (busy) { queued = true; return; } run(() => upload()); }, 1500);
  }
  $('workOpen').onclick = open; $('workClose').onclick = () => $('workDialog').close();
  $('workCreate').onclick = () => { try { const p = bridge().project(), rows = bridge().workRows(); const task = TranslationTasks.create(p,rows,$('workTaskName').value,bridge().workFilter()); bridge().resumeWork(task.id); renderTasks(); } catch(e) { status(e.message); } };
  $('workFileSave').onclick = () => { try { const p=bridge().project(); p.workspaceName=name(); bridge().workChanged(); $('export').click(); } catch(e) { status(e.message); } };
  $('workCloudSave').onclick = () => run(async () => { const p=bridge().project();p.workspaceName=name();p.cloudAutosave=$('workAutosync').checked;bridge().workChanged();await upload(true); });
  $('workAutosync').onchange = () => { const p=bridge().project();if(!p)return;p.cloudAutosave=$('workAutosync').checked;bridge().workChanged();if(!p.cloudAutosave){clearTimeout(timer);status('หยุดซิงก์อัตโนมัติแล้ว สำเนาคลาวด์เดิมยังอยู่');} };
  $('workCloudRefresh').onclick = () => run(listCloud);
  $('workConnect').onclick = () => { $('workDialog').close(); FontCloud.open(); };
  $('workCopySql').onclick = async () => { try { await navigator.clipboard.writeText(WorkspaceSchema); status('คัดลอก SQL แล้ว เปิด Supabase → SQL Editor → วางและ Run ครั้งเดียว แล้วกลับมารีเฟรชรายการ'); } catch { $('workSqlText').value=WorkspaceSchema;$('workSqlText').hidden=false;$('workSqlText').select();status('เลือก SQL แล้ว กด Ctrl/Cmd+C'); } };
  $('workPauseCurrent').onclick = () => { const p=bridge().project(),t=TranslationTasks.active(p);if(t){TranslationTasks.finish(p,t.id,'paused');bridge().workChanged();} };
  $('workCancelCurrent').onclick = () => { const p=bridge().project(),t=TranslationTasks.active(p);if(t){TranslationTasks.finish(p,t.id,'cancelled');bridge().workChanged();} };
  $('workDrafts').onclick = () => { const p=bridge().project();$('workDraftRows').replaceChildren();for(const e of p?.entries||[])if(e.contextual&&e.contextual!==e.translation){const row=document.createElement('p');row.textContent='#'+e.id+' · '+e.category+' · '+e.contextual+' ';row.append(button('ไปแก้ร่าง',()=>{$('workDraftDialog').close();$('workDialog').close();window.RomTranslateBridge.goToEntry(e.id);}));$('workDraftRows').append(row);}$('workDraftDialog').showModal(); };
  $('workDraftClose').onclick = () => $('workDraftDialog').close();
  window.addEventListener('romtranslate:project-changed', e => {renderCurrent();if(e.detail?.initial){const p=bridge().project();if(p){const snapshot=serialized(p);sent.set(p.workspaceId,snapshot.content);};}else schedule();});
  window.addEventListener('online', schedule);window.addEventListener('romtranslate:view',renderCurrent);
  window.addEventListener('romtranslate:cloud-connection', () => { if(!FontCloud.connected())clearTimeout(timer);renderCurrent(); });
  return {renderCurrent, open};
})();
window.WorkManager = WorkManager;
