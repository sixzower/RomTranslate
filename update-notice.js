/* Update only after local persistence and pending authenticated cloud writes finish. */
const UpdateNotice=(()=>{
 const $=id=>document.getElementById(id);let checking=false,latest=null,lastCheck=0;
 const newer=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);if(x.length!==3||y.length!==3||[...x,...y].some(n=>!Number.isSafeInteger(n)||n<0))return false;for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i];}return false;};
 async function check(){
  if(checking||!/^https?:$/.test(location.protocol)||!navigator.onLine||document.hidden||Date.now()-lastCheck<60000)return;checking=true;lastCheck=Date.now();
  try{const url=new URL(location.pathname.endsWith('/download/index.html')?'../release.json':'release.json',location.href),response=await fetch(url,{cache:'no-store'});if(!response.ok)return;const data=await response.json();if(data.format!=='RomTranslate release v1'||!newer(data.version,AppRelease.version))return;latest=data.version;$('updateApply').hidden=false;$('updateMessage').textContent='มีเว็บรุ่นใหม่ '+latest+' (ตอนนี้ใช้รุ่น '+AppRelease.version+')';$('updateBanner').hidden=false;}catch{}finally{checking=false;}
 }
 async function apply(){
  if(!latest)return;const button=$('updateApply');button.disabled=true;
  try{const bridge=window.RomTranslateBridge,p=bridge.project();$('updateMessage').textContent='กำลังเก็บงานก่อนอัปเดต…';await bridge.flushLocal();
   if(p&&FontCloud.authenticated()&&(p.cloudSavedChange||0)<(p.lastChangedAt||0)){if(!FontCloud.connected())throw Error('งานเก็บในเครื่องแล้ว ยังรอส่งคลาวด์ · เชื่อมคลังให้สำเร็จก่อนอัปเดต');await WorkManager.saveForRom();}
   if(bridge.project()!==p)throw Error('โปรเจกต์เปลี่ยนระหว่างเตรียมอัปเดต กรุณากดอีกครั้ง');
   if(p){await bridge.flushLocal();if((p.lastLocalSavedChange||0)<(p.lastChangedAt||0)||FontCloud.authenticated()&&(p.cloudSavedChange||0)<(p.lastChangedAt||0))throw Error('มีการแก้ไขใหม่ที่ยังไม่บันทึก กรุณารอแล้วกดอัปเดตอีกครั้ง');const cached=await bridge.cachedRom(p.romHash),available=cached?.bytes&&await RomCore.fingerprint(cached.bytes)===p.romHash;if(!available&&!p.cloudRomReady)throw Error('ยังไม่มี ROM สำรองพร้อมเปิดหลังรีเฟรช · กดสำรองตอนนี้ให้ครบก่อนอัปเดต');}
   const next=new URL(location.href);next.searchParams.set('v',latest);location.assign(next.href);
  }catch(e){$('updateMessage').textContent=e.message;}finally{button.disabled=false;}
 }
 // After an update finishes, tell the user which version they are now running.
 function announceUpdated(){
  try{const key='romtranslate-last-version',previous=localStorage.getItem(key);localStorage.setItem(key,AppRelease.version);
   if(previous&&previous!==AppRelease.version&&newer(AppRelease.version,previous)){$('updateApply').hidden=true;$('updateMessage').textContent='อัปเดตเสร็จแล้ว · ตอนนี้ใช้รุ่น '+AppRelease.version+' (จากรุ่น '+previous+')';$('updateBanner').hidden=false;$('updateBanner').dataset.kind='updated';}}catch{}
 }
 $('updateApply').onclick=apply;$('updateDismiss').onclick=()=>{$('updateBanner').hidden=true;delete $('updateBanner').dataset.kind;};announceUpdated();
 window.addEventListener('focus',check);setInterval(check,15*60*1000);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();
 return {check,apply,newer,announceUpdated};
})();
