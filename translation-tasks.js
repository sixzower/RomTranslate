/* Work scopes contain canonical IDs, never worksheet row numbers or ROM bytes. */
const TranslationTasks = (() => {
  const statuses = ['active', 'paused', 'completed', 'cancelled'];
  const uuid = s => typeof s === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s);
  const text = (s, max) => typeof s === 'string' && s.length <= max;
  function valid(tasks) {
    return tasks === undefined || Array.isArray(tasks) && tasks.length <= 100 && new Set(tasks.map(t => t?.id)).size === tasks.length && tasks.every(t =>
      t && uuid(t.id) && text(t.name, 100) && t.name.trim() && statuses.includes(t.status) &&
      Array.isArray(t.entryIds) && t.entryIds.length > 0 && t.entryIds.length <= 100000 && new Set(t.entryIds).size === t.entryIds.length &&
      t.entryIds.every(id => Number.isInteger(id) && id >= 192 && id < 33554432) &&
      Number.isFinite(t.createdAt) && Number.isFinite(t.updatedAt) && (t.position === undefined || t.entryIds.includes(t.position)) &&
      t.filter && text(t.filter.category, 200) && text(t.filter.search, 10000) && ['all', 'source', 'translation'].includes(t.filter.searchField) && typeof t.filter.untranslated === 'boolean' &&
      (t.exportOptions === undefined || validOptions(t.exportOptions)));
  }
  function validOptions(o) {
    return o && ['single', 'ranges', 'batches'].includes(o.mode) && ['start', 'count', 'size'].every(k => Number.isSafeInteger(Number(o[k])) && Number(o[k]) >= 1 && Number(o[k]) <= 100000) && text(o.ranges, 4000) && typeof o.all === 'boolean';
  }
  function validView(v){return v&&text(v.category,200)&&text(v.search,10000)&&['all','source','translation'].includes(v.searchField)&&typeof v.untranslated==='boolean'&&Number.isSafeInteger(v.position)&&v.position>=192&&Number.isSafeInteger(v.page)&&v.page>=0&&v.page<=100000;}
  function active(p) { return p?.workTasks?.find(t => t.id === p.activeWorkTask && t.status === 'active') || null; }
  function hydrate(p, saved) {
    if (!valid(saved.workTasks) || saved.workspaceId !== undefined && !uuid(saved.workspaceId) || saved.workspaceName !== undefined && !text(saved.workspaceName, 100)) throw Error('ข้อมูลไฟล์งาน / งานค้างไม่ถูกต้อง');
    const ids = new Set(p.entries.filter(e => e.verified).map(e => e.id));
    if (saved.workTasks?.some(t => t.entryIds.some(id => !ids.has(id)))) throw Error('งานค้างมีรหัสข้อความที่ไม่ตรงกับ ROM');
    for(const key of ['lastChangedAt','lastLocalSavedAt','lastLocalSavedChange','lastCloudSavedAt','cloudSavedChange','lastExportedAt'])p[key]=Number.isFinite(saved[key])&&saved[key]>=0?saved[key]:undefined;
    p.viewState=validView(saved.viewState)?structuredClone(saved.viewState):undefined;
    p.workTasks = structuredClone(saved.workTasks || []);
    p.workspaceId = saved.workspaceId || crypto.randomUUID();
    p.workspaceName = saved.workspaceName?.trim() || p.title.replace(/\.gba$/i, '').slice(0,100);
    p.activeWorkTask = saved.activeWorkTask;
    if (!active(p)) p.activeWorkTask = null;
    p.cloudSyncPaused=saved.cloudSyncPaused===true;p.cloudAutosave = saved.cloudAutosave === true;p.cloudScope=typeof saved.cloudScope==='string'&&/^[a-f0-9]{64}$/.test(saved.cloudScope)?saved.cloudScope:undefined;
    p.cloudRevision = Number.isSafeInteger(saved.cloudRevision) && saved.cloudRevision >= 0 ? saved.cloudRevision : 0;
  }
  function ensure(p) {
    p.workspaceId ||= crypto.randomUUID(); p.workspaceName ||= p.title.replace(/\.gba$/i, '').slice(0,100); p.workTasks ||= [];
    return p;
  }
  function resume(p, id) {
    const task = p.workTasks?.find(t => t.id === id);
    if (!task || ['cancelled', 'completed'].includes(task.status)) throw Error('งานนี้ปิดหรือยกเลิกแล้ว');
    for (const t of p.workTasks) if (t.status === 'active') t.status = 'paused';
    task.status = 'active'; task.updatedAt = Date.now(); p.activeWorkTask = id; return task;
  }
  function create(p, entries, name, filter, exportOptions) {
    ensure(p);
    if (p.workTasks.length >= 100) throw Error('เก็บได้ 100 งานต่อไฟล์ กรุณาลบงานที่จบแล้ว');
    const canonical = new Map(p.entries.map(e => [e.id, e]));
    const task = {id: crypto.randomUUID(), name: String(name).trim().slice(0, 100), status: 'paused', entryIds: [...new Set(entries.filter(e => canonical.get(e.id)?.verified).map(e => e.id))], filter: structuredClone(filter), createdAt: Date.now(), updatedAt: Date.now(), position: entries[0]?.id, ...(exportOptions ? {exportOptions: structuredClone(exportOptions)} : {})};
    if (!valid([task])) throw Error('ระบุชื่อและเลือกข้อความที่ตรวจสอบแล้วก่อนสร้างงาน');
    p.workTasks.push(task); return resume(p, task.id);
  }
  function finish(p, id, status) {
    if (!['paused', 'cancelled', 'completed'].includes(status)) throw Error('สถานะงานไม่ถูกต้อง');
    const task = p.workTasks?.find(t => t.id === id); if (!task) throw Error('ไม่พบงาน');
    task.status = status; task.updatedAt = Date.now(); if (p.activeWorkTask === id) p.activeWorkTask = null;
  }
  function rows(p, task = active(p)) {
    if (!task) return [];
    const byId = new Map(p.entries.map(e => [e.id, e])); return task.entryIds.map(id => byId.get(id)).filter(Boolean);
  }
  function stats(p, task) {
    const entries = rows(p, task).filter(TranslationProgress.eligible), done = entries.filter(TranslationProgress.translated).length;
    return {total: entries.length, done, remaining: entries.length - done};
  }
  function portable(p) {
    ensure(p);
    const fields = ['translation', 'speaker', 'literal', 'contextual', 'translationChoice'];
    const edited = p.entries.filter(e => fields.some(k => e[k]));
    if (!edited.length) edited.push(p.entries.find(e => e.verified) || p.entries[0]);
    return {workspaceFormat: 'RomTranslate workspace v1', version: 2, title: p.title, romHash: p.romHash,
      workspaceId: p.workspaceId, workspaceName: p.workspaceName, cloudScope:p.cloudScope, cloudRevision:p.cloudRevision||0, cloudAutosave: p.cloudAutosave === true,cloudSyncPaused:p.cloudSyncPaused===true,
      viewState:validView(p.viewState)?structuredClone(p.viewState):undefined,glossary: p.glossary || '', genre: p.genre || '', font: structuredClone(p.font),
      progressCategories: p.progressCategories?.slice(), workTasks: structuredClone(p.workTasks), activeWorkTask: p.activeWorkTask || null,
      entries: edited.map(e => ({id: e.id, romOffset: e.romOffset, source: e.source, translation: e.translation || '', speaker: e.speaker || '', literal: e.literal || '', contextual: e.contextual || '', translationChoice: e.translationChoice || ''})),
      history: structuredClone(p.history)};
  }
  function splitImport(report) {
    if (report.issues.some(i => i.severity === 'error' && i.code === 'identity')) throw Error('ต้องแก้รหัส / ต้นฉบับ / โค้ดในตารางก่อนนำเข้า');
    const blocked = new Set(report.issues.filter(i => i.severity === 'error').map(i => Number(i.id)));
    const allBlocked = report.issues.some(i => i.severity === 'error' && i.row === 0);
    return {changes: report.changes.filter(c => !allBlocked && !blocked.has(c.id)),
      drafts: report.changes.filter(c => allBlocked || blocked.has(c.id)).map(c => ({id: c.id, contextual: c.translation}))};
  }
  return {valid, uuid, validOptions, active, ensure, hydrate, create, resume, finish, rows, stats, portable, splitImport};
})();
if (typeof module !== 'undefined') module.exports = TranslationTasks;
