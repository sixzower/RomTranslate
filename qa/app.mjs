import {FORMAT, MANIFEST, header, sha256, validateManifest, auditROM, filterEntries, hex} from './core.mjs?v=1.0.0';
import * as store from './store.mjs?v=1.0.0';
import * as emulator from './emulator.mjs?v=1.0.0';
const $ = id => document.getElementById(id);
const labels = {story:'บทสนทนา / เนื้อเรื่อง','extra-story':'บทพูดและข้อมูลเพิ่มเติม',description:'คำอธิบาย',battle:'ข้อความต่อสู้',menu:'เมนู','intro-warning':'คำเตือนเริ่มเกม','opening-narration':'เกริ่นเรื่อง'};
const reviewLabels = {unseen:'ยังไม่ตรวจในเกม',passed:'ตรวจแล้ว ผ่าน',issue:'พบปัญหา'};
let project = null, rom = null, view = 'overview', selectedId = null, page = 0, busy = false, controller = null, toastTimer;
let saveQueue = Promise.resolve(), draftImage = null, gameState = {}, initialized = false;
const count = value => Number(value).toLocaleString('th-TH');
const date = value => new Date(value).toLocaleString('th-TH', {dateStyle:'short',timeStyle:'short'});
const element = (tag, text, className) => { const el = document.createElement(tag); if (text != null) el.textContent = text; if (className) el.className = className; return el; };
const rowById = id => project?.manifest?.entries.find(row => row.id === id);
const rows = () => project?.manifest?.entries || [];
const matched = () => !!project?.manifest && project.hash === project.manifest.romSHA256;
function badge(text, kind='neutral') { return element('span', text, 'badge '+kind); }
function toast(message, kind='good') { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').dataset.kind = kind; $('toast').hidden = false; toastTimer = setTimeout(() => $('toast').hidden = true, 4500); }
function notice(message, title='ยังทำรายการนี้ไม่ได้') { $('noticeTitle').textContent = title; $('noticeMessage').textContent = message; if (!$('noticeDialog').open) $('noticeDialog').showModal(); }
function action(fn) { return async event => { try { await fn(event); } catch (error) { if (error.name !== 'AbortError') notice(error.message || String(error)); } }; }
function confirm(text, title='ยืนยันการทำรายการ') {
  $('confirmTitle').textContent = title; $('confirmText').textContent = text;
  return new Promise(resolve => {
    let accepted = false;
    $('confirmYes').onclick = () => { accepted = true; $('confirmDialog').close(); };
    $('confirmNo').onclick = () => $('confirmDialog').close();
    $('confirmDialog').addEventListener('close', () => resolve(accepted), {once:true});
    $('confirmDialog').showModal();
  });
}
function requireProject() { if (!project || !rom) throw Error('เปิด ROM ก่อนเริ่มงาน'); }
function setView(name) {
  if (!['overview','texts','game','issues'].includes(name)) return;
  view = name;
  for (const item of document.querySelectorAll('[data-view]')) {
    item.classList.toggle('active', item.dataset.view === name);
    if (item.dataset.view === name) item.setAttribute('aria-current','page'); else item.removeAttribute('aria-current');
  }
  for (const key of ['overview','texts','game','issues']) $(key+'View').hidden = key !== name;
  emulator.setActive(name === 'game');
  renderGame();
}
function download(blob, name) { const url = URL.createObjectURL(blob), anchor = element('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
function jsonDownload(value, name) { download(new Blob([JSON.stringify(value)], {type:'application/json'}), name); }
function progress(done, total, detail) {
  if (detail) $('operationDetail').textContent = detail;
  if (total > 0) { const percent = Math.min(100, Math.floor(done / total * 100)); $('operationProgress').value = percent; $('operationPercent').textContent = percent+'%'; }
  else { $('operationProgress').removeAttribute('value'); $('operationPercent').textContent = '—'; }
}
async function operation(title, fn) {
  if (busy) throw Error('รอรายการที่กำลังทำอยู่ หรือกด × เพื่อยกเลิกก่อน');
  busy = true; controller = new AbortController();
  $('operationTitle').textContent = title; $('operationHint').textContent = 'เปอร์เซ็นต์อิงข้อมูลที่อ่านหรือรายการที่ตรวจจริง ไม่ใช่เวลาประมาณ';
  progress(0, 0, 'กำลังเตรียมข้อมูล…'); $('operationDialog').showModal();
  try { return await fn(controller.signal); }
  finally { busy = false; controller = null; $('operationDialog').close(); renderGame(); }
}
function abortIf(signal) { if (signal.aborted) throw new DOMException('ยกเลิกแล้ว','AbortError'); }
async function readFile(file, signal, max = 128 * 1024 * 1024) {
  if (file.size > max) throw Error('ไฟล์ใหญ่เกินขนาดที่รองรับ');
  abortIf(signal);
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    const cancel = () => reader.abort();
    signal.addEventListener('abort',cancel,{once:true});
    reader.onprogress = event => progress(event.loaded,event.total,'กำลังอ่าน '+file.name);
    reader.onload = () => { signal.removeEventListener('abort',cancel); progress(file.size,file.size,'อ่านไฟล์แล้ว'); resolve(reader.result); };
    reader.onerror = () => { signal.removeEventListener('abort',cancel); reject(reader.error); };
    reader.onabort = () => { signal.removeEventListener('abort',cancel); reject(new DOMException('ยกเลิกแล้ว','AbortError')); };
    reader.readAsArrayBuffer(file);
  });
}
async function saveProject() {
  if (!project) return;
  project.savedAt = Date.now();
  const snapshot = structuredClone(project), hash = project.hash;
  $('savedStatus').textContent = 'กำลังบันทึก…'; $('savedStatus').dataset.kind = '';
  const job = saveQueue.catch(() => {}).then(async () => { await store.put('project:'+hash,snapshot); await store.put('active',hash); });
  saveQueue = job;
  try {
    await job;
    if (project?.hash === hash) { $('savedStatus').textContent = 'บันทึกบนเครื่องแล้ว · '+date(snapshot.savedAt); $('savedStatus').dataset.kind = 'good'; }
  } catch (error) {
    $('savedStatus').textContent = 'บันทึกในเครื่องไม่สำเร็จ · ดาวน์โหลดสำรองงาน'; $('savedStatus').dataset.kind = 'error';
    throw Error('บันทึกไม่สำเร็จ อาจมีพื้นที่ไม่พอหรือเบราว์เซอร์ปิดกั้นการเก็บข้อมูล กรุณาดาวน์โหลดสำรองงานก่อนปิดเว็บ');
  }
}
function newProject(hash, name, info) { return {format:FORMAT,hash,name,header:info,manifest:null,audit:null,reviews:{},notes:[],resolved:{},checkpoints:[],savedAt:Date.now()}; }
async function openROM(file) {
  await operation('เปิดไฟล์ ROM', async signal => {
    const bytes = new Uint8Array(await readFile(file,signal,33554432)), info = header(bytes);
    progress(0,0,'กำลังระบุฉบับ ROM ด้วย SHA-256…');
    const hash = await sha256(bytes); abortIf(signal);
    const existing = await store.get('project:'+hash); abortIf(signal);
    const next = existing || newProject(hash,file.name,info);
    await store.put('rom:'+hash, bytes); abortIf(signal);
    emulator.stop(); project = next; rom = bytes; selectedId = null; page = 0;
    await saveProject(); render(); setView('overview');
  });
  toast('เปิด ROM แล้ว · '+project.name);
}
function validateWork(value) {
  if (!value || value.format !== FORMAT || !/^[a-f0-9]{64}$/.test(value.hash) || typeof value.name !== 'string') throw Error('ไฟล์งานตรวจไม่ถูกต้อง');
  if (value.manifest) validateManifest(value.manifest);
  if (value.manifest && value.manifest.romSHA256 !== value.hash) throw Error('ข้อมูลประกอบในงานตรวจเป็นคนละฉบับ ROM');
  validateReviewData(value);
  if (!Array.isArray(value.checkpoints) || value.checkpoints.length > 10 || value.checkpoints.some(p => !p || typeof p.name !== 'string' || p.name.length > 80 || !Number.isFinite(p.at) || typeof p.id !== 'string')) throw Error('ข้อมูลจุดทดสอบไม่ถูกต้อง');
}
function validateReviewData(value) {
  if (!value.reviews || typeof value.reviews !== 'object' || Array.isArray(value.reviews) || Object.values(value.reviews).some(r => !r || !['passed','issue','unseen'].includes(r.status) || !Number.isFinite(r.at))) throw Error('ข้อมูลสถานะการตรวจไม่ถูกต้อง');
  if (!Array.isArray(value.notes) || value.notes.length > 10000 || value.notes.some(n => !n || typeof n.id !== 'string' || typeof n.message !== 'string' || n.message.length > 4000 || typeof n.kind !== 'string' || !Number.isFinite(n.at) || (n.rowId != null && typeof n.rowId !== 'string') ||
    (n.image != null && (typeof n.image !== 'string' || n.image.length > 2000000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(n.image))))) throw Error('รายละเอียดรายงานไม่ถูกต้อง');
}
async function importData(file) {
  // Read/validate before asking about replacement, and never commit a partially parsed file.
  let value;
  await operation('อ่านข้อมูลคำแปล / งานตรวจ', async signal => { const buffer = await readFile(file,signal); abortIf(signal); value = JSON.parse(new TextDecoder().decode(buffer)); });
  if (value.format === MANIFEST) {
    requireProject(); validateManifest(value);
    if (value.romSHA256 !== project.hash) throw Error('ข้อมูลคำแปลนี้เป็นคนละฉบับกับ ROM ที่เปิดอยู่ กรุณาเลือกไฟล์คู่กัน');
    if (project.manifest && !await confirm('แทนที่ข้อมูลประกอบคำแปลเดิม? สถานะที่ตรวจไว้จะคงอยู่เฉพาะ ID ที่ยังมีในไฟล์ใหม่')) return;
    const ids = new Set(value.entries.map(r => r.id));
    project.manifest = value; project.audit = null; project.resolved = {};
    project.reviews = Object.fromEntries(Object.entries(project.reviews).filter(([id]) => ids.has(id)));
    selectedId = null; page = 0; await saveProject(); render();
    toast('จับคู่ข้อมูลแล้ว '+count(value.entries.length)+' ข้อความ'); return;
  }
  if (value.format === 'sixz-qa-report/v1') {
    requireProject(); validateReviewData(value);
    if (value.romSHA256 !== project.hash) throw Error('รายงานนี้เป็นคนละฉบับกับ ROM ที่เปิด');
    if (!await confirm('รวมรายงานนี้กับงานปัจจุบัน? สถานะข้อความจะเลือกข้อมูลที่ตรวจล่าสุด')) return;
    for (const [id,r] of Object.entries(value.reviews)) if (rowById(id) && (!project.reviews[id] || r.at > project.reviews[id].at)) project.reviews[id] = r;
    const notes = new Map(project.notes.map(n => [n.id,n])); for (const note of value.notes) if (!notes.has(note.id)) notes.set(note.id,note);
    project.notes = [...notes.values()]; await saveProject(); render(); toast('รวมรายงานแล้ว'); return;
  }
  validateWork(value);
  if (!await confirm('เปิดงานตรวจ “'+value.name+'”? งานปัจจุบันเก็บอยู่บนเครื่องตามเดิม หากเป็นงานฉบับเดียวกัน ข้อมูลจะถูกแทนที่ด้วยสำเนานี้','เปิดงานตรวจจากไฟล์')) return;
  await operation('เปิดงานตรวจ', async signal => {
    const bytes = value.romBase64 ? store.fromBase64(value.romBase64) : await store.get('rom:'+value.hash);
    if (!bytes) throw Error('สำเนานี้ไม่ได้รวม ROM กรุณาเปิด .gba ฉบับเดียวกันก่อน แล้วนำเข้างานตรวจอีกครั้ง');
    header(bytes); progress(0,0,'กำลังตรวจว่า ROM ตรงกับงานที่สำรอง…');
    if (await sha256(bytes) !== value.hash) throw Error('ROM ในสำเนาไม่ตรงกับ SHA-256 ที่ระบุ');
    const checkpoints = value.checkpoints.map(c => ({...c, bytes:store.fromBase64(c.data, 4*1024*1024)}));
    for (const c of checkpoints) delete c.data;
    abortIf(signal);
    const next = {...value, checkpoints, header:header(bytes), audit:null, resolved:{}};
    delete next.romBase64;
    await store.put('rom:'+value.hash,bytes); abortIf(signal);
    emulator.stop(); project = next; rom = bytes; selectedId = null; page = 0;
    await saveProject(); render(); setView('overview');
  });
  toast('เปิดงานตรวจแล้ว · ตรวจไฟล์อีกครั้งเพื่อยืนยันผลล่าสุด');
}
function render() {
  $('emptyState').hidden = !!project; $('loadedOverview').hidden = !project;
  $('projectName').textContent = project?.manifest?.game || project?.name || 'พื้นที่ตรวจคำแปลของคุณ';
  $('projectStatus').replaceChildren(element('i',null,'status-dot'+(project?' ready':'')), document.createTextNode(project ? (matched()?'จับคู่ข้อมูลคำแปลแล้ว':'เปิด ROM แล้ว · ยังไม่มีข้อมูลคำแปล') : 'ยังไม่ได้เปิดไฟล์เกม'));
  for (const id of ['forgetProject','openBackup','downloadBackup','auditButton','overviewPlay','exportReport','newIssue']) $(id).disabled = !project;
  if (project) {
    const list = rows(), passed = list.filter(r => project.reviews[r.id]?.status === 'passed').length;
    const percent = list.length ? Math.floor(passed/list.length*100) : 0;
    $('fileName').textContent = project.name; $('fileDetails').textContent = project.header.code+' · '+(project.header.size/1048576).toFixed(2)+' MB';
    $('romHash').textContent = project.hash; $('fontName').textContent = project.manifest?.fontName || 'ยังไม่มีข้อมูล';
    $('profileBadge').textContent = matched() ? (project.manifest.profile || project.header.code) : project.header.code+' · ตรวจทั่วไป';
    $('totalTexts').textContent = list.length ? count(list.length) : '—';
    $('reviewedTexts').replaceChildren(document.createTextNode(count(passed)+' '),element('em','/ '+count(list.length)));
    $('reviewPercent').textContent = list.length ? 'ตรวจด้วยตาแล้ว '+percent+'%' : 'เพิ่มข้อมูลประกอบคำแปลก่อน';
    $('coverageBar').value = percent; $('coverageValue').textContent = percent+'%';
    $('coverageText').textContent = count(passed)+' จาก '+count(list.length)+' ข้อความ ผ่านการตรวจในเกมด้วยตาของคุณ';
    $('manifestStatus').textContent = project.manifest ? 'ข้อมูลคำแปลฉบับ '+String(project.manifest.build || 'ไม่ระบุ')+' · SHA-256 ตรงกับ ROM' : 'ยังเปิดเกมได้ แต่ต้องเพิ่มข้อมูลประกอบก่อนตรวจคำแปลและฟอนต์';
    renderAudit();
  }
  $('navTextCount').textContent = count(rows().length);
  const categories = [...new Set(rows().map(r => r.kind))], old = $('categoryFilter').value;
  $('categoryFilter').replaceChildren(new Option('ทุกหมวด',''),...categories.map(k => new Option(labels[k] || k,k)));
  if (categories.includes(old)) $('categoryFilter').value = old;
  $('textAvailability').textContent = matched() ? 'แสดงเฉพาะข้อความที่มีในข้อมูลประกอบ ไม่ใช้จำนวนนี้รับรองว่าแปลครบทั้งเกม' : 'เพิ่มข้อมูลประกอบคำแปลฉบับเดียวกับ ROM เพื่อดูรายการ · ไม่มีการเดารหัสภาษาไทยจาก ROM อื่น';
  renderTexts(); renderInspector(); renderIssues(); renderCheckpoints(); renderGame();
}
function renderAudit() {
  const audit = project.audit;
  $('auditSummary').replaceChildren();
  if (!audit) {
    $('auditBadge').textContent = 'ยังไม่ตรวจ'; $('auditBadge').className = 'badge neutral';
    $('auditSummary').append(element('p','เริ่มตรวจเพื่อเทียบไบต์คำแปล ตำแหน่งอ้างอิง และพื้นที่ฟอนต์','muted'));
    $('auditTime').textContent = 'ยังไม่ได้ตรวจไฟล์'; $('auditScope').textContent = 'ผ่านการตรวจไฟล์ ยังต้องตรวจภาพและบริบทในเกม';
    return;
  }
  const errors = audit.issues.filter(i => i.severity === 'error').length, warnings = audit.issues.length-errors;
  $('auditBadge').textContent = errors ? 'พบข้อผิดพลาด' : warnings ? 'ควรตรวจเพิ่ม' : audit.matched ? 'ตรวจข้อมูลผ่าน' : 'ตรวจทั่วไปแล้ว';
  $('auditBadge').className = 'badge '+(errors?'error':warnings?'warning':audit.matched?'good':'neutral');
  for (const check of audit.checks) { const line = element('div',null,'check-row'+(check.passed?'':' error')); line.append(element('span',check.passed?'✓':'×'),element('div',check.label)); $('auditSummary').append(line); }
  if (audit.matched) { const line = element('div',null,'check-row'); line.append(element('span','✓'),element('div','เทียบข้อมูล '+count(audit.checkedEntries)+' ข้อความแล้ว')); $('auditSummary').append(line); }
  $('auditTime').textContent = 'ตรวจล่าสุด '+date(audit.at); $('auditScope').textContent = audit.scope;
}
function renderTexts() {
  const filtered = filterEntries(rows(),$('textSearch').value,$('categoryFilter').value,$('reviewFilter').value,project?.reviews || {});
  const pages = Math.max(1,Math.ceil(filtered.length/50)); page = Math.min(page,pages-1);
  $('pageNumber').textContent = (page+1)+' / '+pages; $('textCount').textContent = count(filtered.length)+' รายการ';
  $('previousPage').disabled = !page; $('nextPage').disabled = page+1 >= pages;
  $('textList').replaceChildren();
  if (!filtered.length) $('textList').append(element('p',rows().length?'ไม่พบข้อความตามตัวกรอง':'ยังไม่มีข้อมูลคำแปล','empty-message'));
  for (const row of filtered.slice(page*50,page*50+50)) {
    const status = project.reviews[row.id]?.status || 'unseen', button = element('button',null,'text-row'+(row.id===selectedId?' active':''));
    button.dataset.row = row.id;
    const meta = element('div',null,'text-row-meta'); meta.append(element('span',row.id+' · '+(labels[row.kind]||row.kind)),badge(reviewLabels[status],status==='passed'?'good':status==='issue'?'error':'neutral'));
    button.append(meta,element('div',row.source,'source-line'),element('div',row.translation || '(คำแปลว่าง)','translation-line'));
    button.onclick = () => { selectedId=row.id; renderTexts(); renderInspector(); renderGame(); if (innerWidth<=760) $('inspector').scrollIntoView({behavior:'smooth',block:'start'}); };
    $('textList').append(button);
  }
}
function fact(label,value) { const div=element('div'); div.append(element('dt',label),element('dd',String(value))); return div; }
function renderInspector() {
  const row = rowById(selectedId), panel = $('inspector'); panel.replaceChildren();
  if (!row) { const empty=element('div',null,'empty-inspector'); empty.append(element('span','↖'),element('p','เลือกข้อความเพื่อดูรายละเอียด')); panel.append(empty); return; }
  const meta=element('div',null,'entry-meta'); meta.append(element('span',row.id,'mono'),badge(reviewLabels[project.reviews[row.id]?.status || 'unseen']));
  panel.append(meta,element('h4','ต้นฉบับ'),element('div',row.source,'source-copy'),element('h4','คำแปล'),element('div',row.translation,'target-copy'));
  const facts=element('dl',null,'file-facts'); facts.append(fact('ตำแหน่งคำแปล',hex(row.offset)),fact('ขนาดจริง',row.length+' ไบต์'+(row.layout?.maxBytes?' / ช่อง '+row.layout.maxBytes+' ไบต์':'')),fact('พื้นที่ที่ระบุ',row.layout?.width ? row.layout.width+' px · '+row.layout.lines+' บรรทัด':'ยังไม่มีข้อจำกัดรายหน้าต่าง'));
  panel.append(facts);
  const buttons=element('div',null,'button-row');
  for (const [text,fn,css] of [['✓ ตรวจแล้ว ผ่าน',() => markReview('passed'),'primary'],['แจ้งปัญหา',() => openIssue(row.id)],['ยังไม่ตรวจ',() => markReview('unseen')]]) { const b=element('button',text,css); b.onclick=action(fn); buttons.append(b); }
  panel.append(buttons);
  const gameButton=element('button','ไปทดสอบในเกม →','text-button'); gameButton.onclick=()=>setView('game'); panel.append(gameButton);
  const glyphs=project.manifest.glyphs;
  if (glyphs?.length) {
    panel.append(element('h4','ตัวอย่างรูปฟอนต์จากข้อมูลประกอบ'),element('p','ใช้ดูรูปอักษรเท่านั้น การตัดขอบ สี และระยะจริงต้องตรวจในเกม','hint'));
    const canvas=element('canvas'); canvas.width=320; canvas.height=80; panel.append(canvas); drawGlyphPreview(canvas,row.translation,glyphs);
  }
  const details=element('details'),summary=element('summary','ไบต์ข้อความใน ROM'); details.append(summary,element('p',[...rom.slice(row.offset,row.offset+Math.min(row.length,512))].map(v=>v.toString(16).padStart(2,'0')).join(' '),'hex-bytes')); panel.append(details);
}
function drawGlyphPreview(canvas,text,glyphs) {
  const ctx=canvas.getContext('2d'); ctx.fillStyle='#e0e9d8';ctx.fillRect(0,0,320,80);
  const choices=[...new Map(glyphs.map(g=>[g.cluster,g])).values()].sort((a,b)=>b.cluster.length-a.cluster.length);
  const clean=text.replace(/\{[^}]+\}/g,' ').normalize('NFD').replace(/ํา/g,'ํา');
  let x=8,y=5;
  for(let i=0;i<clean.length && y<60;) {
    if(clean[i]==='\n'){x=8;y+=18;i++;continue;}
    const g=choices.find(g=>clean.startsWith(g.cluster.normalize('NFD'),i));
    const width=g?.width ?? (clean[i]===' '?3:7);
    if(x+width>310){x=8;y+=18;if(y>=60)break;}
    if(g){for(let gy=0;gy<16;gy++)for(let gx=0;gx<16;gx++)if(g.pixels[gy][gx]){ctx.fillStyle=g.pixels[gy][gx]===1?'#152515':'#8e9d89';ctx.fillRect(x+gx,y+gy,1,1);}i+=g.cluster.normalize('NFD').length;}
    else {ctx.fillStyle='#152515';ctx.font='10px monospace';ctx.fillText(clean[i],x,y+13);i++;}
    x+=width;
  }
}
async function markReview(status) { requireProject(); if (!rowById(selectedId)) return; project.reviews[selectedId]={status,at:Date.now()}; await saveProject(); render(); toast(status==='passed'?'บันทึกว่าตรวจข้อความนี้ในเกมแล้ว':'อัปเดตสถานะการตรวจแล้ว'); }
function allIssues() { return project ? [...(project.audit?.issues || []).map(i=>({...i,automatic:true,resolved:!!project.resolved[i.id]})),...project.notes] : []; }
function renderIssues() {
  const all=allIssues(), open=all.filter(i=>!i.resolved), shown=all.filter(i=>$('issueFilter').value==='all'||($('issueFilter').value==='resolved'?i.resolved:!i.resolved));
  $('navIssueCount').textContent=count(open.length); $('problemCount').textContent=project?.audit||project?.notes.length?count(open.length):'—';
  $('issueCount').textContent=count(open.length)+' จุดที่ยังต้องตรวจ · ทั้งหมด '+count(all.length)+' จุด';
  $('issueList').replaceChildren();
  if(!shown.length) $('issueList').append(element('div',project?.audit?'ไม่มีรายการตามตัวกรอง · ยังต้องตรวจภาพและบริบทในเกม':'ยังไม่มีรายงาน เริ่มตรวจไฟล์ หรือแจ้งปัญหาจากฉากที่เล่น','panel empty-message'));
  for(const issue of shown){
    const card=element('article',null,'panel issue-card'+(issue.resolved?' resolved':'')),body=element('div',null,'issue-body');
    body.append(badge(issue.resolved?'ตรวจรายการนี้แล้ว':issue.automatic?(issue.severity==='warning'?'ควรตรวจเพิ่ม':'ผลตรวจไฟล์'):'พบระหว่างเล่น',issue.resolved?'good':issue.severity==='warning'?'warning':'error'),element('h3',issue.automatic?'จุดตรวจจากไฟล์ ROM':issueTypeLabel(issue.kind)),element('p',issue.message));
    const row=rowById(issue.rowId); if(row)body.append(element('p',row.id+' · '+row.source.slice(0,160),'source-snippet'));
    const actions=element('div',null,'issue-actions');
    if(row){const b=element('button','ดูข้อความ');b.onclick=()=>{selectedId=row.id;$('textSearch').value=row.id;$('categoryFilter').value='';$('reviewFilter').value='';page=0;renderTexts();renderInspector();renderGame();setView('texts');};actions.append(b);}
    const resolved=element('button',issue.resolved?'เปิดตรวจอีกครั้ง':'ทำเครื่องหมายว่าตรวจแล้ว');resolved.onclick=action(async()=>{if(issue.automatic)project.resolved[issue.id]=!issue.resolved;else issue.resolved=!issue.resolved;await saveProject();renderIssues();});actions.append(resolved);
    if(!issue.automatic){const del=element('button','ลบรายงาน');del.onclick=action(async()=>{if(await confirm('ลบรายงานนี้พร้อมภาพประกอบ?')){project.notes=project.notes.filter(n=>n.id!==issue.id);await saveProject();renderIssues();}});actions.append(del);}
    body.append(actions);card.append(body);if(issue.image){const img=element('img');img.src=issue.image;img.alt='ภาพปัญหาในเกม';card.append(img);} $('issueList').append(card);
  }
}
function issueTypeLabel(kind){return {clipping:'ตัวอักษร / สระถูกตัด',overflow:'ข้อความล้นช่อง',missing:'ข้อความยังไม่ได้แปล',meaning:'ความหมาย / บริบท',font:'ฟอนต์ / ระยะอักษร',other:'ปัญหาอื่น ๆ'}[kind]||kind;}
async function openIssue(id=null,capture=false){
  requireProject(); $('issueForm').reset();$('issueRow').value=id||'';draftImage=null;
  if(capture){const image=emulator.screenshot();if(image)draftImage='data:image/png;base64,'+await store.toBase64(await image.arrayBuffer());else toast('จับภาพไม่สำเร็จ ยังบันทึกรายละเอียดปัญหาได้','warning');}
  $('issueScreenshot').hidden=!draftImage;if(draftImage)$('issueScreenshot').src=draftImage;else $('issueScreenshot').removeAttribute('src');
  $('issueDialog').showModal();$('issueNote').focus();
}
function renderGame(){
  $('gameLaunch').disabled=!project||busy; $('gameLaunch').textContent=gameState.game?'เปิด ROM นี้ใหม่':'เริ่มทดสอบ ROM';
  const ready=gameState.game&&gameState.hash===project?.hash;
  for(const id of ['gamePause','gameReset','gameSound','checkpointSave','captureIssue','exportSav','importSav'])$(id).disabled=!ready||busy;
  $('gamePause').textContent=gameState.paused?'เล่นต่อ':'พักเกม';$('gameSound').textContent=gameState.sound?'ปิดเสียง':'เปิดเสียง';
  $('screenPlaceholder').hidden=ready;$('gameDot').className='status-dot'+(ready?' ready':'');$('gameLabel').textContent=ready?(gameState.paused?'พักเกม':'กำลังทดสอบ'):'ยังไม่ได้เริ่มเกม';
  const row=rowById(selectedId);$('gameSelectedText').textContent=row?row.translation:'เลือกจากหน้า “ตรวจข้อความ” แล้วกลับมาเทียบกับฉากจริง';$('gameMarkPassed').disabled=!row;$('gameSelectedIssue').disabled=!row;
}
function renderCheckpoints(){
  const list=project?.checkpoints||[];$('checkpointCount').textContent=list.length+' / 10';$('checkpointList').replaceChildren();
  if(!list.length)$('checkpointList').append(element('p','ยังไม่มีจุดทดสอบ','muted'));
  for(const point of list){const item=element('div',null,'checkpoint-item'),copy=element('div');copy.append(element('strong',point.name),element('small',date(point.at)));const open=element('button','เปิดฉาก');open.disabled=busy;
    open.onclick=action(async()=>{if(gameState.game&&!await confirm('กลับไปจุดทดสอบ “'+point.name+'”? ความคืบหน้าหลังจุดนี้จะถูกย้อนกลับในเกมทดสอบ'))return;setView('game');await operation('เปิดจุดทดสอบ',async signal=>{progress(0,0,'กำลังโหลดฉากที่บันทึก…');if(!gameState.game||gameState.hash!==project.hash)await emulator.play(rom,project.hash);abortIf(signal);await emulator.restoreCheckpoint(point.bytes,project.hash);});toast('เปิดจุดทดสอบแล้ว');});
    const del=element('button','×','icon-button');del.setAttribute('aria-label','ลบจุดทดสอบ '+point.name);del.onclick=action(async()=>{if(await confirm('ลบจุดทดสอบ “'+point.name+'”?')){project.checkpoints=project.checkpoints.filter(p=>p.id!==point.id);await saveProject();renderCheckpoints();}});item.append(copy,open,del);$('checkpointList').append(item);}
}
async function launch(){requireProject();if(gameState.game&&!await confirm('เปิด ROM ใหม่ในตัวทดสอบ? จุดทดสอบที่บันทึกไว้ยังอยู่'))return;setView('game');await operation('เตรียมตัวทดสอบเกม',async signal=>{progress(0,0,'กำลังโหลด mGBA และ ROM…');await emulator.play(rom,project.hash);if(signal.aborted){emulator.stop();abortIf(signal);}});$('gameStatus').textContent='เปิด '+project.name+' แล้ว · บันทึกฉากสำคัญเป็นจุดทดสอบเพื่อกลับมาตรวจซ้ำ';$('gameStatus').dataset.kind='good';}
async function audit(){requireProject();await operation('ตรวจไฟล์ ROM',async signal=>{const result=await auditROM(rom,project.manifest,{signal,onProgress:(n,total)=>progress(n,total,'กำลังตรวจข้อมูล '+count(n)+' / '+count(total)+' รายการ')});abortIf(signal);project.audit=result;project.resolved={};await saveProject();render();});toast(project.audit.issues.length?'ตรวจเสร็จ มีรายการให้ตรวจเพิ่ม':'ตรวจไฟล์เสร็จแล้ว',project.audit.issues.length?'warning':'good');}
async function backup(){requireProject();await saveQueue;await operation('เตรียมสำรองงานตรวจ',async signal=>{const out=structuredClone(project);delete out.header;out.audit=null;out.resolved={};progress(0,0,'กำลังรวมข้อมูลและจุดทดสอบ…');out.checkpoints=await Promise.all(project.checkpoints.map(async p=>({id:p.id,name:p.name,at:p.at,data:await store.toBase64(p.bytes)})));if($('backupIncludeRom').checked)out.romBase64=await store.toBase64(rom);abortIf(signal);jsonDownload(out,'Sixz-QA-'+project.hash.slice(0,8)+'-'+new Date().toISOString().slice(0,10)+'.sixz-qa.json');});$('backupDialog').close();toast('ดาวน์โหลดงานตรวจแล้ว');}
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>setView(button.dataset.view);
for(const id of ['openRom','emptyOpen'])$(id).onclick=()=>$('romInput').click();
for(const id of ['openData','manifestOpen','textsImport'])$(id).onclick=()=>$('dataInput').click();
$('romInput').onchange=action(async()=>{const file=$('romInput').files[0];try{if(file)await openROM(file);}finally{$('romInput').value='';}});
$('dataInput').onchange=action(async()=>{const file=$('dataInput').files[0];try{if(file)await importData(file);}finally{$('dataInput').value='';}});
for(const id of ['auditButton'])$(id).onclick=action(audit);
for(const id of ['gameLaunch','overviewPlay'])$(id).onclick=action(launch);
$('overviewIssues').onclick=()=>setView('issues');
for(const id of ['textSearch','categoryFilter','reviewFilter'])$(id).addEventListener(id==='textSearch'?'input':'change',()=>{page=0;renderTexts();});
$('previousPage').onclick=()=>{page--;renderTexts();};$('nextPage').onclick=()=>{page++;renderTexts();};
$('issueFilter').onchange=renderIssues;
$('newIssue').onclick=action(()=>openIssue(selectedId));$('captureIssue').onclick=action(()=>openIssue(selectedId,true));$('gameSelectedIssue').onclick=action(()=>openIssue(selectedId,gameState.game));$('gameMarkPassed').onclick=action(()=>markReview('passed'));
$('issueForm').onsubmit=action(async event=>{event.preventDefault();requireProject();const message=$('issueNote').value.trim();if(!message)throw Error('กรอกรายละเอียดปัญหาก่อน');const rowId=$('issueRow').value||null;project.notes.unshift({id:crypto.randomUUID(),message,rowId,kind:$('issueType').value,image:draftImage,at:Date.now(),resolved:false});if(rowById(rowId))project.reviews[rowId]={status:'issue',at:Date.now()};await saveProject();$('issueDialog').close();render();toast('บันทึกปัญหาแล้ว');});
$('exportReport').onclick=action(()=>{requireProject();jsonDownload({format:'sixz-qa-report/v1',romSHA256:project.hash,game:project.name,build:project.manifest?.build,exportedAt:Date.now(),scope:project.audit?.scope,automaticChecks:project.audit,reviews:project.reviews,notes:project.notes},'Sixz-QA-report-'+project.hash.slice(0,8)+'.json');toast('ส่งออกรายงานแล้ว · ไม่มี ROM อยู่ในรายงาน');});
$('checkpointSave').onclick=action(async()=>{requireProject();const name=$('checkpointName').value.trim();if(!name){$('checkpointName').focus();throw Error('ตั้งชื่อจุดทดสอบก่อนบันทึก');}if(project.checkpoints.length>=10)throw Error('เก็บได้สูงสุด 10 จุด ลบจุดที่ไม่ใช้ก่อน');await operation('บันทึกจุดทดสอบ',async signal=>{progress(0,0,'กำลังเก็บสถานะเกม…');const bytes=await emulator.checkpoint();abortIf(signal);project.checkpoints.unshift({id:crypto.randomUUID(),name,at:Date.now(),bytes});await saveProject();});$('checkpointName').value='';renderCheckpoints();toast('บันทึกจุดทดสอบแล้ว');});
$('gamePause').onclick=emulator.pause;$('gameReset').onclick=action(async()=>{if(await confirm('เริ่มเกมทดสอบใหม่?'))emulator.reset();});$('gameSound').onclick=emulator.toggleSound;$('gameSpeed').onchange=()=>emulator.speed($('gameSpeed').value);
$('gameFullscreen').onclick=action(async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.screen-frame').requestFullscreen();});
$('exportSav').onclick=action(async()=>download(new Blob([await emulator.getSave()]),'Sixz-QA-'+project.hash.slice(0,8)+'.sav'));
$('importSav').onclick=()=>$('savInput').click();$('savInput').onchange=action(async()=>{const file=$('savInput').files[0];try{if(!file)return;if(![512,8192,32768,65536,131072].includes(file.size))throw Error('ขนาดไฟล์ .sav ไม่ถูกต้อง');if(!await confirm('ใช้เซฟนี้แทนเซฟเกมทดสอบปัจจุบัน? ไฟล์ .sav ไม่มีข้อมูลยืนยันว่าเป็นเกมฉบับเดียวกัน กรุณาตรวจให้ตรงก่อน'))return;await emulator.importSave(new Uint8Array(await file.arrayBuffer()));toast('นำเข้าเซฟเกมทดสอบแล้ว');}finally{$('savInput').value='';}});
$('openBackup').onclick=action(()=>{requireProject();$('backupDialog').showModal();});$('downloadBackup').onclick=action(backup);$('helpOpen').onclick=()=>$('helpDialog').showModal();$('sidebarHelp').onclick=()=>$('helpDialog').showModal();
$('forgetProject').onclick=action(async()=>{requireProject();if(!await confirm('ลบ ROM รายงาน และจุดทดสอบของงานนี้จากเบราว์เซอร์นี้? ดาวน์โหลดสำรองก่อนหากยังต้องใช้','ลบงานนี้จากเครื่อง'))return;await saveQueue;await store.removeProject(project.hash);await store.put('active',null);emulator.stop();project=null;rom=null;selectedId=null;$('savedStatus').textContent='ลบงานจากเครื่องแล้ว';$('savedStatus').dataset.kind='';render();setView('overview');});
$('operationClose').onclick=()=>{controller?.abort();$('operationDialog').close();};$('operationDialog').addEventListener('cancel',()=>controller?.abort());
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>button.closest('dialog').close();
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom){if(dialog.id==='operationDialog')controller?.abort();dialog.close();}}});
function theme(name){document.documentElement.dataset.theme=name;$('themeToggle').textContent=name==='dark'?'☼':'☾';$('themeToggle').setAttribute('aria-label',name==='dark'?'เปลี่ยนโหมดสว่าง':'เปลี่ยนโหมดมืด');$('themeToggle').title=$('themeToggle').getAttribute('aria-label');}
try{theme(localStorage.getItem('sixz-qa-theme')||'dark');}catch{theme('dark');}
$('themeToggle').onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';theme(next);try{localStorage.setItem('sixz-qa-theme',next);}catch{}};
let dragDepth=0;document.addEventListener('dragenter',event=>{if(event.dataTransfer.types.includes('Files')){event.preventDefault();dragDepth++;$('dropOverlay').hidden=false;}});document.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault();});document.addEventListener('dragleave',()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)$('dropOverlay').hidden=true;});window.addEventListener('blur',()=>{dragDepth=0;$('dropOverlay').hidden=true;});
async function openFiles(files){
  if(!initialized)throw Error('รอโหลดงานเดิมก่อน');
  const list=[...files],games=list.filter(f=>/\.gba$/i.test(f.name)),data=list.filter(f=>/\.json$/i.test(f.name));
  if(games.length>1||data.length>1||games.length+data.length!==list.length)throw Error('วาง ROM ได้ครั้งละหนึ่งไฟล์ พร้อมข้อมูลประกอบ .json หนึ่งไฟล์');
  if(games[0])await openROM(games[0]);if(data[0])await importData(data[0]);
}
document.addEventListener('drop',action(async event=>{event.preventDefault();dragDepth=0;$('dropOverlay').hidden=true;await openFiles(event.dataTransfer.files);}));
emulator.onState(state=>{gameState=state;renderGame();});window.addEventListener('qa:game-error',event=>{$('gameStatus').textContent=event.detail;$('gameStatus').dataset.kind='error';notice(event.detail);});
async function restore(){
  // Block file inputs until restore completes so a late restore cannot replace a newly opened ROM.
  $('openRom').disabled=true;$('emptyOpen').disabled=true;$('openData').disabled=true;
  try{const hash=await store.get('active');if(hash){const saved=await store.get('project:'+hash),bytes=await store.get('rom:'+hash);if(saved&&bytes){project=saved;rom=new Uint8Array(bytes);$('savedStatus').textContent='เปิดงานที่บันทึกไว้ · '+date(saved.savedAt);$('savedStatus').dataset.kind='good';}}}
  catch{notice('เปิดงานที่บันทึกในเบราว์เซอร์ไม่ได้ คุณยังเปิด ROM ใหม่และนำเข้าสำเนางานตรวจได้');}
  finally{initialized=true;$('openRom').disabled=false;$('emptyOpen').disabled=false;$('openData').disabled=false;render();}
}
render();restore();
