import {header} from './core.mjs?v=1.0.0';
let factory, core, initializing, game = false, paused = false, active = false, sound = false, hash = '', romPath = '', savePath = '';
const canvas = () => document.getElementById('gameCanvas');
let listener = () => {}, saveTimer;
const state = () => ({game, paused, sound, hash});
const update = () => listener(state());
export function onState(fn) { listener = fn; update(); }
function release() {
  if (core) for (const key of ['Up','Down','Left','Right','A','B','L','R','Start','Select']) core.buttonUnpress(key);
  document.querySelectorAll('[data-key]').forEach(b => b.classList.remove('held'));
}
async function init() {
  if (!crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') throw Error('เบราว์เซอร์ยังไม่พร้อมรันเกม ลองรีเฟรชหนึ่งครั้ง หรือใช้ Chrome / Edge รุ่นล่าสุด');
  if (!initializing) initializing = (async () => {
    factory ||= (await import('../vendor/mgba.js')).default;
    const module = await factory({canvas: canvas(), print: () => {}, printErr: s => console.warn('mGBA:', s)});
    await module.FSInit();
    module.toggleInput(false); module.setLogger(() => {}); module.setVolume(0);
    module.addCoreCallbacks({saveDataUpdatedCallback: () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => module.FSSync().catch(() => window.dispatchEvent(new CustomEvent('qa:game-error', {detail: 'บันทึกเซฟเกมในเครื่องไม่สำเร็จ กรุณาส่งออก .sav ก่อนปิดเว็บ'}))), 500); }, coreCrashedCallback: () => { game = false; update(); window.dispatchEvent(new CustomEvent('qa:game-error', {detail: 'เกมหยุดทำงาน ลองเปิด ROM ใหม่และบันทึกรายงานปัญหา'})); }});
    core = module;
    return module;
  })().catch(error => { initializing = null; throw error; });
  return initializing;
}
export async function play(bytes, digest) {
  header(bytes);
  const module = await init();
  stop(); hash = digest;
  romPath = module.filePaths().gamePath + '/qa-' + digest + '.gba';
  savePath = module.filePaths().savePath + '/qa-' + digest + '.sav';
  module.FS.writeFile(romPath, bytes);
  if (!module.loadGame(romPath, savePath)) throw Error('mGBA เปิด ROM ไม่สำเร็จ');
  game = true; paused = !active;
  module.setFastForwardMultiplier(Number(document.getElementById('gameSpeed').value));
  module.setVolume(sound ? 0.5 : 0);
  if (paused) module.pauseGame();
  if (!sound || paused) module.pauseAudio();
  canvas().focus(); update();
}
export function stop() {
  release();
  if (core && game) { core.pauseGame(); core.pauseAudio(); core.quitGame(); }
  if (core && romPath) { try { core.FS.unlink(romPath); } catch {} }
  game = false; hash = ''; update();
}
export function setActive(value) {
  active = value; release();
  if (core && game) {
    if (!active) { core.pauseGame(); core.pauseAudio(); }
    else if (!paused) { core.resumeGame(); if (sound) core.resumeAudio(); }
  }
}
export function pause() {
  if (!game) return;
  paused = !paused; release();
  if (paused) { core.pauseGame(); core.pauseAudio(); }
  else if (active) { core.resumeGame(); if (sound) core.resumeAudio(); }
  update();
}
export function reset() {
  if (!game) return;
  release(); core.quickReload(); paused = false;
  if (!active) core.pauseGame();
  if (!sound || !active) core.pauseAudio(); update();
}
export function toggleSound() {
  sound = !sound;
  if (core) {
    core.setVolume(sound ? 0.5 : 0);
    if (sound && game && active && !paused) core.resumeAudio(); else core.pauseAudio();
  }
  update();
}
export function speed(value) { if (core) core.setFastForwardMultiplier(Number(value)); }
export async function getSave() {
  if (!game) throw Error('เปิดเกมก่อน');
  const bytes = core.getSave();
  if (!bytes?.length) throw Error('ยังไม่มีเซฟเกม กรุณาบันทึกจากเมนูภายในเกมก่อน');
  return new Uint8Array(bytes);
}
export async function importSave(bytes) {
  if (!game) throw Error('เปิดเกมก่อนนำเข้าเซฟ');
  if (![512,8192,32768,65536,131072].includes(bytes.length)) throw Error('ขนาดไฟล์ .sav ไม่ถูกต้อง');
  release(); core.pauseGame();
  core.FS.writeFile(savePath, bytes);
  await core.FSSync(); reset();
}
export async function checkpoint() {
  if (!game) throw Error('เปิดเกมและไปยังฉากที่ต้องการก่อน');
  release();
  if (!core.forceAutoSaveState()) throw Error('สร้างจุดทดสอบไม่สำเร็จ');
  const saved = core.getAutoSaveState();
  if (!saved?.data?.length) throw Error('ตัวเล่นเกมยังไม่ส่งข้อมูลจุดทดสอบ');
  return new Uint8Array(saved.data);
}
export async function restoreCheckpoint(bytes, digest) {
  if (!game || digest !== hash) throw Error('จุดทดสอบนี้ต้องใช้กับ ROM ฉบับเดิมเท่านั้น');
  release();
  await core.uploadAutoSaveState(core.autoSaveStateName, bytes);
  if (!core.loadAutoSaveState()) throw Error('จุดทดสอบนี้เปิดไม่สำเร็จ');
  paused = false;
  if (active) core.resumeGame(); else core.pauseGame();
  if (!sound || !active) core.pauseAudio(); update();
}
export function screenshot() {
  if (!game) return null;
  // Native PNG avoids blank captures from a WebGL back buffer.
  const path = '/data/screenshots/sixz-qa.png';
  try { if (core.screenshot('sixz-qa.png')) return new Blob([core.FS.readFile(path)], {type: 'image/png'}); } catch {}
  return null;
}
const keys = {ArrowUp:'Up', ArrowDown:'Down', ArrowLeft:'Left', ArrowRight:'Right', KeyZ:'A', KeyX:'B', KeyA:'L', KeyS:'R', Enter:'Start', ShiftLeft:'Select', ShiftRight:'Select'};
document.addEventListener('keydown', event => {
  if (!game || !active || paused || document.querySelector('dialog[open]') || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(event.target.tagName)) return;
  if (keys[event.code]) { event.preventDefault(); if (!event.repeat) core.buttonPress(keys[event.code]); }
});
document.addEventListener('keyup', event => { if (core && keys[event.code]) core.buttonUnpress(keys[event.code]); });
document.querySelectorAll('[data-key]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (!game || !active || paused) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    core.buttonPress(button.dataset.key); button.classList.add('held');
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type, () => {
    if (core) core.buttonUnpress(button.dataset.key); button.classList.remove('held');
  });
});
window.addEventListener('blur', release);
document.addEventListener('visibilitychange', () => { if (document.hidden && game && !paused) pause(); });
