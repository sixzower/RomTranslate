/* Durable projects stay in IndexedDB; this module coordinates and confirms writes. */
const CloudSafety=(()=>{
 const stable=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))):v;
 const canonical=v=>JSON.stringify(stable(v));
 const samePayload=(a,b)=>canonical(a)===canonical(b);
 async function putConfirmed(request,args){
  try{return Number(await request('put',args));}catch(original){
   if(!original.networkFailure&&!/version conflict|57014|HTTP 50[0234]/i.test(original.message))throw original;
   let saved;try{saved=(await request('get',{p_id:args.p_id}))?.[0];}catch{original.uncertainSave=true;throw original;}
   if(saved&&Number(saved.revision)>args.p_expected&&samePayload(saved.payload,args.p_payload))return Number(saved.revision);
   if(!saved&&args.p_expected>0||saved&&Number(saved.revision)!==args.p_expected)throw Object.assign(Error('Workspace version conflict: cloud changed during save'),{workspaceConflict:true});
   // A fresh read confirmed the old revision. One CAS retry is safe; re-read
   // again after a lost reply rather than marking an unconfirmed write saved.
   try{return Number(await request('put',args));}catch(second){
    try{const final=(await request('get',{p_id:args.p_id}))?.[0];if(final&&Number(final.revision)>args.p_expected&&samePayload(final.payload,args.p_payload))return Number(final.revision);}catch{}
    second.uncertainSave=true;throw second;
   }
  }
 }
 async function lease(scope,work){
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('romtranslate-writers-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('leases');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const owner=crypto.randomUUID(),key='writer:'+scope;
  const change=mode=>new Promise((resolve,reject)=>{const tx=db.transaction('leases','readwrite'),store=tx.objectStore('leases'),r=store.get(key);let ok=false;r.onsuccess=()=>{const item=r.result,now=Date.now();if(mode==='claim'&&(!item||!Number.isFinite(item.until)||item.until<now)||mode!=='claim'&&item?.owner===owner){ok=true;if(mode==='release')store.delete(key);else store.put({owner,until:now+90000},key);}};tx.oncomplete=()=>resolve(ok);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
  let timer;try{if(!await change('claim'))return false;let held=true;timer=setInterval(()=>change('renew').then(ok=>{held=ok;}).catch(()=>{held=false;}),15000);await work(async()=>{if(!held||!await change('renew')){held=false;throw Error('สิทธิ์ส่งงานเปลี่ยนไปอีกแท็บ · งานในเครื่องยังอยู่');}});return true;}finally{clearInterval(timer);await change('release').catch(()=>{});db.close();}
 }
 async function withWriter(scope,work){
  if(globalThis.navigator?.locks)return navigator.locks.request('romtranslate-writer:'+scope,{ifAvailable:true},async lock=>{if(!lock)return false;await work(()=>{});return true;});
  return lease(scope,work);
 }
 async function manifest(p){
  const entries=(p.entries||[]).filter(e=>['translation','speaker','literal','contextual','translationChoice'].some(k=>e[k])).map(e=>({id:e.id,source:e.source,translation:e.translation||'',speaker:e.speaker||'',literal:e.literal||'',contextual:e.contextual||'',choice:e.translationChoice||''})).sort((a,b)=>a.id-b.id);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical({rom:p.romHash,entries,font:p.font,fontLibrary:p.fontLibrarySnapshot,goals:[...(p.progressCategories||[])].sort()})));
  return {digest:[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join(''),translations:entries.filter(e=>e.translation.trim()||e.choice==='keep-source').length,font:p.font?.name||'ฟอนต์เริ่มต้น',goals:(p.progressCategories||[]).length};
 }
 return {canonical,samePayload,putConfirmed,withWriter,manifest};
})();
if(typeof window!=='undefined')window.CloudSafety=CloudSafety;
if(typeof module!=='undefined')module.exports=CloudSafety;
