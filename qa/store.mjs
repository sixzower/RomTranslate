const DB = 'sixz-rom-qa-v1';
let opened;
function database() {
  if (!opened) opened = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('data');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { opened = null; reject(request.error); };
  });
  return opened;
}
export async function get(key) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction('data').objectStore('data').get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function put(key, value) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('data', 'readwrite');
    tx.objectStore('data').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || Error('บันทึกไม่สำเร็จ'));
  });
}
export async function removeProject(hash) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('data', 'readwrite'), store = tx.objectStore('data');
    for (const key of ['rom:', 'project:']) store.delete(key + hash);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
export const toBase64 = bytes => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(new Blob([bytes]));
});
export function fromBase64(text, max = 33554432) {
  if (typeof text !== 'string' || text.length > Math.ceil(max / 3) * 4 + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw Error('ข้อมูลไฟล์ในสำเนาไม่ถูกต้อง');
  return Uint8Array.from(atob(text), char => char.charCodeAt(0));
}
