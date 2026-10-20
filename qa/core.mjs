export const FORMAT = 'sixz-rom-qa/v1';
export const MANIFEST = 'sixz-translation-manifest/v1';
export const hex = n => '0x' + n.toString(16).toUpperCase().padStart(6, '0');
export async function sha256(bytes) {
  const result = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(result)].map(v => v.toString(16).padStart(2, '0')).join('');
}
export function header(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 0xc0 || bytes.length > 32 * 1024 * 1024)
    throw Error('เลือก ROM GBA ขนาด 192 ไบต์–32 MB');
  if (bytes[0xb2] !== 0x96) throw Error('ไฟล์นี้ไม่มีส่วนหัว GBA ที่รองรับ');
  const str = (offset, size) => String.fromCharCode(...bytes.slice(offset, offset + size)).replace(/\0/g, '').trim();
  let sum = 0x19;
  for (let i = 0xa0; i <= 0xbc; i++) sum += bytes[i];
  return {title: str(0xa0, 12), code: str(0xac, 4), size: bytes.length,
    checksumValid: ((-sum) & 255) === bytes[0xbd]};
}
const bounded = (n, max = 0x2000000) => Number.isSafeInteger(n) && n >= 0 && n <= max;
const hashOK = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function validateManifest(value) {
  if (!value || value.format !== MANIFEST) throw Error('ต้องเป็นข้อมูลประกอบคำแปล .qa-manifest.json ไม่ใช่ไฟล์สำรองงานจากเว็บเดิม');
  if (!hashOK(value.romSHA256) || !Array.isArray(value.entries) || value.entries.length > 100000)
    throw Error('ข้อมูลคำแปลไม่มี SHA-256 หรือจำนวนรายการไม่ถูกต้อง');
  const ids = new Set();
  for (const row of value.entries) {
    if (typeof row.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(row.id) || ['constructor','prototype'].includes(row.id) || ids.has(row.id) || typeof row.source !== 'string' || typeof row.translation !== 'string' ||
      row.source.length > 100000 || row.translation.length > 100000 || !bounded(row.offset) ||
      !bounded(row.length, 100000) || !row.length || row.offset + row.length > 0x2000000 || !hashOK(row.sha256) ||
      (row.sites && (!Array.isArray(row.sites) || row.sites.length > 100000 || row.sites.some(site => !bounded(site, 0x1fffffc)))))
      throw Error('พบรายการคำแปลไม่สมบูรณ์: ' + String(row.id || 'ไม่มี ID').slice(0, 80));
    if (row.layout && (typeof row.layout !== 'object' || ['width', 'lines', 'maxBytes'].some(k => row.layout[k] != null && (!bounded(row.layout[k], 100000) || !row.layout[k]))))
      throw Error('ข้อมูลขนาดช่องไม่ถูกต้อง: ' + row.id);
    ids.add(row.id);
  }
  if (value.fontRegions != null && (!Array.isArray(value.fontRegions) || value.fontRegions.length > 32 || value.fontRegions.some(r =>
    !bounded(r.offset) || !bounded(r.length) || !r.length || r.offset + r.length > 0x2000000 || !hashOK(r.sha256))))
    throw Error('ข้อมูลพื้นที่ฟอนต์ไม่ถูกต้อง');
  // Glyph data is used only for a labelled reference preview, never as proof of live rendering.
  if (value.glyphs != null && (!Array.isArray(value.glyphs) || value.glyphs.length > 4096 || value.glyphs.some(g =>
    typeof g.cluster !== 'string' || g.cluster.length > 32 || !bounded(g.width, 32) || !Array.isArray(g.pixels) || g.pixels.length !== 16 ||
    g.pixels.some(line => !Array.isArray(line) || line.length !== 16 || line.some(p => ![0,1,2,3].includes(p))))))
    throw Error('รูปตัวอักษรในข้อมูลประกอบไม่ถูกต้อง');
  return value;
}
export function commandWarnings(row) {
  const tokens = text => text.match(/\{(?:PLAYER|RIVAL|STR_VAR_[123]|VAR:[^}]+|BUFFER:[^}]+|CTRL:[^}]+)\}/g) || [];
  const wanted = tokens(row.source), actual = tokens(row.translation);
  const counts = new Map();
  for (const token of actual) counts.set(token, (counts.get(token) || 0) + 1);
  return wanted.filter(token => { const n = counts.get(token) || 0; counts.set(token, n - 1); return n <= 0; });
}
export async function auditROM(bytes, manifest, {onProgress = () => {}, signal} = {}) {
  const info = header(bytes), issues = [], checks = [];
  const issue = (kind, message, rowId = null, severity = 'error') => issues.push({id: kind + ':' + (rowId || issues.length), kind, message, rowId, severity});
  const abort = () => { if (signal?.aborted) throw new DOMException('ยกเลิกการตรวจแล้ว', 'AbortError'); };
  abort(); onProgress(0, 1);
  const digest = await sha256(bytes); abort();
  checks.push({label: 'ส่วนหัว GBA', passed: info.checksumValid});
  if (!info.checksumValid) issue('header', 'ค่า checksum ส่วนหัวไม่ตรง ควรตรวจไฟล์ต้นทาง');
  if (!manifest) {
    onProgress(1, 1);
    return {romSHA256: digest, at: Date.now(), checks, issues, matched: false, checkedEntries: 0, totalEntries: 0,
      scope: 'ตรวจส่วนหัวแล้ว · เพิ่มข้อมูลประกอบคำแปลเพื่อตรวจข้อความและฟอนต์'};
  }
  validateManifest(manifest);
  if (digest !== manifest.romSHA256) {
    issue('wrong-rom', 'ROM กับข้อมูลคำแปลเป็นคนละฉบับ จึงหยุดตรวจตำแหน่งข้อความเพื่อป้องกันผลที่คลาดเคลื่อน');
    onProgress(1, 1);
    return {romSHA256: digest, at: Date.now(), checks, issues, matched: false, checkedEntries: 0,
      totalEntries: manifest.entries.length, scope: 'SHA-256 ไม่ตรง · ยังไม่ได้ตรวจคำแปล'};
  }
  const regions = manifest.fontRegions || [], total = manifest.entries.length + regions.length;
  let done = 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < manifest.entries.length; i += 64) {
    abort();
    const rows = manifest.entries.slice(i, i + 64);
    const hashes = await Promise.all(rows.map(r => r.offset + r.length <= bytes.length ? sha256(bytes.subarray(r.offset, r.offset + r.length)) : null));
    rows.forEach((row, j) => {
      if (!hashes[j]) issue('range', 'ตำแหน่งข้อความอยู่นอก ROM', row.id);
      else if (hashes[j] !== row.sha256) issue('text-bytes', 'ไบต์คำแปลไม่ตรงกับฉบับที่สร้างไว้', row.id);
      if (hashes[j] && bytes[row.offset + row.length - 1] !== 0xff) issue('terminator', 'ไม่พบรหัสจบข้อความที่ตำแหน่งระบุ', row.id);
      for (const site of row.sites || []) if (site + 4 > bytes.length || view.getUint32(site, true) !== 0x08000000 + row.offset)
        issue('pointer-' + site, 'ตำแหน่งอ้างอิง ' + hex(site) + ' ไม่ได้ชี้ไปคำแปลนี้', row.id);
      if (!row.translation.trim() && row.source.trim()) issue('empty', 'คำแปลว่าง ต้องตรวจว่าตั้งใจคงต้นฉบับหรือไม่', row.id, 'warning');
      if (row.layout?.maxBytes && row.length > row.layout.maxBytes) issue('bytes', `ใช้ ${row.length}/${row.layout.maxBytes} ไบต์ เกินช่องที่ระบุ`, row.id);
      const missing = commandWarnings(row);
      if (missing.length) issue('commands', 'ตรวจคำสั่งที่ต้นฉบับมี: ' + [...new Set(missing)].join(' '), row.id, 'warning');
    });
    done += rows.length; onProgress(done, total);
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  for (const region of regions) {
    abort();
    const passed = region.offset + region.length <= bytes.length && await sha256(bytes.subarray(region.offset, region.offset + region.length)) === region.sha256;
    checks.push({label: String(region.name || 'พื้นที่ฟอนต์'), passed});
    if (!passed) issue('font', 'ข้อมูลฟอนต์ไม่ตรง: ' + String(region.name || hex(region.offset)));
    onProgress(++done, total);
  }
  abort(); onProgress(total || 1, total || 1);
  return {romSHA256: digest, at: Date.now(), checks, issues, matched: true, checkedEntries: manifest.entries.length,
    totalEntries: manifest.entries.length, scope: 'ตรวจไบต์ ตำแหน่งอ้างอิง และพื้นที่ฟอนต์ตามข้อมูลประกอบ · ยังไม่ยืนยันภาพทุกฉากในเกม'};
}
export function filterEntries(entries, query = '', category = '', review = '', reviews = {}) {
  const term = query.trim().toLocaleLowerCase();
  return entries.filter(row => (!category || row.kind === category) && (!review || (reviews[row.id]?.status || 'unseen') === review) &&
    (!term || [row.id, row.source, row.translation, hex(row.offset)].some(s => s.toLocaleLowerCase().includes(term))));
}
