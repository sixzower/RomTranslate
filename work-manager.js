/* Portable work files and private cloud copies use the existing font connection. */
const WorkManager = (() => {
  const $ = id => document.getElementById(id), bridge = () => window.RomTranslateBridge;
  let busy = false, foregroundBusy = false, card = null, queued = false, timer = null, latestCloud = null, remoteReady = false, awaitingRom = null, pollingRom = false;
  let urgentTargets=false,queuedSince=0,pendingConflict=null,verifiedDisplayId=null;
  const sent = new Map(),resumedScopes=new Set(),backupFailures=new Map();
  const newest=rows=>rows.slice().sort((a,b)=>(typeof b.updated_at==='number'?b.updated_at:Date.parse(b.updated_at)||0)-(typeof a.updated_at==='number'?a.updated_at:Date.parse(a.updated_at)||0)||Number(b.revision)-Number(a.revision));
  async function retainLatest(id,revision,scope){
    const request=async(action,args)=>{if(await FontCloud.workspaceScope()!==scope)throw Error('คลังเปลี่ยนระหว่างจัดเก็บงาน กรุณาเชื่อมต่อใหม่');return FontCloud.workspaceRequest(action,args);};
    const rows=await request('list');if(!Array.isArray(rows))throw Error('อ่านรายการเพื่อตรวจงานล่าสุดไม่ได้');
    const keep=rows.find(r=>r.workspace_id===id);
    if(!keep||Number(keep.revision)!==Number(revision)||newest(rows)[0]?.workspace_id!==id)throw Error('คลาวด์มีงานรุ่นใหม่กว่า จึงยังไม่ลบสำเนาเก่า · รีเฟรชรายการก่อน');
    for(const item of rows){if(item.workspace_id===id)continue;
      const latest=await request('list');if(newest(latest)[0]?.workspace_id!==id||Number(latest.find(r=>r.workspace_id===id)?.revision)!==Number(revision))throw Error('งานคลาวด์เปลี่ยนระหว่างจัดเก็บ จึงหยุดลบสำเนาเก่า');
      await WorkspaceDelete.remove(item,request,status);sent.delete(item.workspace_id);
      await bridge().storeCloudState(item.workspace_id,{cloudAutosave:false,cloudSyncPaused:true,cloudDeletePending:false});
    }
  }
  async function sharedWorkspace(p,scope){
    if(p.cloudScope&&p.cloudScope!==scope)throw Error('งานในเครื่องอยู่คนละคลัง · ยังไม่รวมงานข้ามคลัง');
    const stamp=p.lastChangedAt,current=bridge().project();
    const rows=newest(await FontCloud.workspaceRequest('list'));
    const item=rows[0];if(!item)return p;
    if(item.rom_sha256!==p.romHash)throw Error('คลังมีโปรเจกต์หลักของ ROM อีกไฟล์ · ยังไม่ส่งงานในเครื่องไปแทนที่');
    const saved=(await FontCloud.workspaceRequest('get',{p_id:item.workspace_id}))?.[0];
    if(await FontCloud.workspaceScope()!==scope||bridge().project()!==current||p.lastChangedAt!==stamp)throw Error('งานเปลี่ยนระหว่างซิงก์ · จะบันทึกรอบถัดไป');
    if(!saved?.payload||saved.payload.workspaceId!==item.workspace_id||saved.payload.romHash!==p.romHash)throw Error('อ่านโปรเจกต์หลักไม่สำเร็จ · ยังไม่ส่งงานไปแทนที่');
    if(p.workspaceId===item.workspace_id&&Number(saved.revision)===Number(p.cloudRevision)){if(window.CloudSafety?.samePayload(serialized(p).payload,saved.payload))sent.set(p.workspaceId,serialized(p).content);return p;}
    const local=TranslationTasks.portable(p);
    // Merge unsent fields against the last confirmed server snapshot.
    let merged;try{merged=WorkspaceSync.reconcile(local,saved.payload,p.cloudBase||null);}catch(e){if(e.workspaceConflict){await bridge().flushLocal?.();pendingConflict={error:e,local,remote:saved.payload,base:p.cloudBase||null,revision:Number(saved.revision),scope,project:p,stamp};renderCurrent();e.message='มีข้อมูลขัดกัน '+e.details.length+' ช่อง · กดเลือกคำแปลที่ขัดกัน งานทั้งสองฉบับยังอยู่';}throw e;}
    const payload={...merged,history:structuredClone(p.history),cloudRevision:Number(saved.revision),cloudScope:scope,cloudAutosave:true,cloudSyncPaused:false,cloudBase:structuredClone(saved.payload)};
    const guard=()=>FontCloud.authenticated()&&bridge().project()===current&&p.lastChangedAt===stamp;
    if(current!==p)throw Error('โปรเจกต์ในเครื่องยังไม่เปิด · เปิดงานหลักก่อนซิงก์');
    if(await bridge().loadWorkspace(payload,{guard,requireRom:true})!==true)throw Error('ยังเปิดโปรเจกต์หลักไม่ได้ · งานเดิมยังอยู่');
    const active=bridge().project();await bridge().storeCloudState(active.workspaceId,{cloudBase:structuredClone(saved.payload),openedBackup:{workspaceId:item.workspace_id,name:item.name||payload.workspaceName||payload.title,revision:Number(saved.revision),savedAt:Date.parse(item.updated_at)||0}});
    if(local.workspaceId!==active.workspaceId)await bridge().storeCloudState(local.workspaceId,{cloudAutosave:false,cloudSyncPaused:true});
    status('ใช้โปรเจกต์หลักเดียวกันแล้ว · รวมคำแปลที่ไม่ซ้ำกันไว้ครบ','success');return active;
  }
  async function loadCloudItem(item){
    const own=!bridge().project()&&RomCloud.beginResume?.();try{
    const scope=await FontCloud.workspaceScope(),result=await FontCloud.workspaceRequest('get',{p_id:item.workspace_id}),saved=result?.[0];
    if(!saved?.payload||saved.payload.workspaceId!==item.workspace_id||saved.payload.romHash!==item.rom_sha256)throw Error('ไม่พบไฟล์งานและ ROM ที่ตรงกับรายการ กรุณารีเฟรช');
    if(await FontCloud.workspaceScope()!==scope)throw Error('คลังเปลี่ยนแล้ว กรุณาเปิดรายการใหม่');
    if(bridge().project()?.romHash===saved.payload.romHash){await sharedWorkspace(bridge().project(),scope);$('workDialog').close();return true;}
    status('กำลังเปิด ROM และคำแปลล่าสุด…');
    const payload={...saved.payload,cloudRevision:Number(saved.revision),cloudScope:scope,cloudAutosave:true,cloudSyncPaused:false,cloudDeletePending:false,lastCloudSavedAt:Date.parse(item.updated_at)||Date.now(),cloudSavedChange:saved.payload.lastChangedAt||0};
    let loaded;try{loaded=await bridge().loadWorkspace(payload,{requireRom:true});}catch(e){if(!e.romRequired)throw e;
      if(!bridge().project()&&!bridge().pendingWorkspace())await bridge().autoResumeWorkspace(payload,()=>FontCloud.authenticated()&&!bridge().project()&&!bridge().pendingWorkspace(),null);
      if(!bridge().project()&&bridge().pendingWorkspace()?.workspaceId===payload.workspaceId){awaitingRom={id:payload.workspaceId,hash:payload.romHash,scope};resumedScopes.delete(scope);}
      await inspectCloudRom(item);status('คำแปลยังอยู่ · รอเครื่องเดิมสำรองไฟล์เกมให้ครบ');return false;}
    if(loaded!==true)throw Error('ยังเปิด ROM ไม่สำเร็จ · งานเดิมยังอยู่ กรุณาลองอีกครั้ง');
    await bridge().storeCloudState(payload.workspaceId,{cloudBase:structuredClone(saved.payload),openedBackup:{workspaceId:item.workspace_id,name:item.name||payload.workspaceName||payload.title,revision:Number(saved.revision),savedAt:Date.parse(item.updated_at)||0}});$('workDialog').close();$('fontCloudDialog').close();$('cloudManageDialog').close();status('เปิด ROM และคำแปลล่าสุดแล้ว','success');bridge().toast('เปิด ROM พร้อมคำแปลล่าสุดแล้ว ทำงานต่อได้เลย');
    }finally{if(own)RomCloud.endResume?.();}
  }
  function setText(id,value,kind){const node=$(id);const target=node.querySelector(':scope > .button-label')||node;if(target.textContent!==value)target.textContent=value;if(kind)node.dataset.kind=kind;}
  function status(message,kind='pending') {if(busy&&!foregroundBusy&&/^(กำลัง|ตรวจการสำรอง|อ่านรายการ|ตรวจรายการ)/.test(message))return;setText('workStatus',message,kind);}
  function button(label, action) { const b = document.createElement('button'); b.textContent = label; b.onclick = action; return b; }
  function time(value){return new Date(value).toLocaleString('th-TH',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Bangkok'});}
  function renderOrigin(p){
    const node=$('workOriginBadge'),revision=$('workRevisionBadge');if(!node)return;node.hidden=!p;if(revision)revision.hidden=!p;
    if(!p){node.textContent='';if(revision)revision.textContent='';return;}
    const origin=p.openedBackup,saved=p.lastCloudSavedAt||((origin?.workspaceId===p.workspaceId&&origin?.savedAt)||0),failure=backupFailures.get(p.workspaceId),waiting=(p.cloudSavedChange||0)<(p.lastChangedAt||0);
    setText('workOriginBadge',failure?'สำรองบนคลาวด์ไม่สำเร็จ':p.cloudSyncPaused?'สำรองบนคลาวด์ · หยุดชั่วคราว':!FontCloud.connected()?'สำรองบนคลาวด์ · รอเชื่อมคลัง':waiting?'สำรองบนคลาวด์ · รอส่งข้อมูล':saved?'สำรองบนคลาวด์ · '+time(saved):'สำรองบนคลาวด์ · ยังไม่ได้สำรอง');
    node.title=(p.title||p.workspaceName||'')+(saved?' · สำรองล่าสุด '+time(saved):'')+(failure?' · '+failure:'');node.dataset.kind=failure?'error':saved&&!waiting?'success':'info';
    const number=p.cloudRevision||(origin?.workspaceId===p.workspaceId?origin?.revision:0);if(revision){revision.hidden=!number;revision.textContent=number?' · งานรุ่น '+number:'';revision.title='รุ่นงานล่าสุดที่ยืนยันจากคลาวด์แล้ว';}
  }
  function backupStatus(p){$('backupStatus').hidden=!p;renderOrigin(p);const local=$('localSaveStatus'),cloud=$('cloudSaveStatus'),badge=$('autosaveBadge');badge.hidden=!p;if(!p){setText('localSaveStatus','ยังไม่ได้เปิดโปรเจกต์');setText('cloudSaveStatus','ยังไม่ได้เปิดโปรเจกต์');setText('autosaveBadge','บันทึกไว้บนเครื่อง · ยังไม่ได้เปิดงาน');return;}const pending=(p.lastLocalSavedChange||0)<(p.lastChangedAt||0);setText('localSaveStatus',pending?'กำลังบันทึก…':p.lastLocalSavedAt?'บันทึกแล้ว · '+time(p.lastLocalSavedAt):'รอบันทึกครั้งแรก');setText('autosaveBadge',p.lastLocalSavedAt?' · '+time(p.lastLocalSavedAt)+(pending?' · กำลังบันทึกล่าสุด…':''):' · รอบันทึกครั้งแรก');local.dataset.kind=pending?'pending':p.lastLocalSavedAt?'success':'info';badge.dataset.kind=local.dataset.kind;badge.title=local.textContent;
    cloud.dataset.kind=p.cloudDeletePending?'warning':p.cloudSyncPaused?'info':!FontCloud.connected()?FontCloud.authenticated?.()?'error':'info':(p.cloudSavedChange||0)<(p.lastChangedAt||0)?'pending':p.lastCloudSavedAt&&p.cloudRomReady?'success':p.lastCloudSavedAt?'warning':'info';
    const failure=backupFailures.get(p.workspaceId);if(failure){cloud.dataset.kind='error';setText('cloudSaveStatus','สำรองยังไม่สำเร็จ · งานในเครื่องยังอยู่ · '+failure);return;}
    const suffix=p.lastCloudSavedAt?' · ล่าสุด '+time(p.lastCloudSavedAt):'';setText('cloudSaveStatus',p.cloudDeletePending?'รอตรวจผลลบสำเนา · หยุดสำรองชั่วคราว':p.cloudSyncPaused?'หยุดสำรองงานนี้'+suffix:!FontCloud.connected()?'รอเชื่อมคลังส่วนตัว'+suffix:(p.cloudSavedChange||0)<(p.lastChangedAt||0)?((p.lastLocalSavedChange||0)>=(p.lastChangedAt||0)?'บันทึกในเครื่องแล้ว · รอส่งคลาวด์':'กำลังเก็บงานในเครื่อง')+suffix:p.lastCloudSavedAt?(p.cloudRomReady?'ROM และคำแปลสำรองครบแล้ว':'คำแปลสำรองแล้ว · ROM ยังไม่พร้อม')+suffix:'ยังไม่ได้สำรอง');
  }
  function renderCloudContext(p){
    const connected=FontCloud.connected(),connecting=!connected&&FontCloud.isBusy?.();setText('workConnectionLabel',connected?'เชื่อมต่อแล้ว':connecting?'กำลังเชื่อม':'ยังไม่เชื่อมคลัง',connected?'success':connecting?'pending':FontCloud.authenticated?.()?'error':'info');
    const context=$('workCurrentContext');context.hidden=!p;if(p)setText('workCurrentContext',p.workspaceId===latestCloud?.workspace_id?'กำลังทำงานนี้อยู่':'กำลังทำงาน: '+(p.workspaceName||p.title));
  }
  function renderCurrent() {
    bridge()?.refreshProgress?.();
    if(pendingConflict&&bridge()?.project()!==pendingConflict.project)pendingConflict=null;
    if($('workResolveConflict')){$('workResolveConflict').hidden=!pendingConflict;$('workResolveConflict').textContent='เลือกคำแปลที่ขัดกัน'+(pendingConflict?' ('+pendingConflict.error.details.length+')':'');}
    const p = bridge()?.project(), task = TranslationTasks.active(p);backupStatus(p);renderCloudContext(p);if($('workVerification')&&verifiedDisplayId!==(p?.workspaceId||null)){verifiedDisplayId=p?.workspaceId||null;setText('workVerification',p?.cloudVerifiedAt?'เคยตรวจรุ่น '+p.cloudVerifiedRevision+' เมื่อ '+time(p.cloudVerifiedAt)+' · กดตรวจอีกครั้งเพื่อยืนยันข้อมูลปัจจุบัน':'');$('workVerification').dataset.state='pending';}if($('workVerify'))$('workVerify').disabled=foregroundBusy||!p||!FontCloud.connected();if($('workResolveConflict'))$('workResolveConflict').disabled=foregroundBusy;if($('workVerification')&&p?.cloudVerifiedAt&&((p.cloudVerifiedChange||0)<(p.lastChangedAt||0)||Number(p.cloudRevision)>Number(p.cloudVerifiedRevision))){setText('workVerification','มีการเปลี่ยนแปลงหลังตรวจครั้งล่าสุด · กดตรวจความพร้อมข้ามเครื่องอีกครั้ง');$('workVerification').dataset.state='pending';}for(const button of document.querySelectorAll('#workCloudRows button,#workCloudActions button'))button.disabled=foregroundBusy;
    $('workBanner').hidden = !task || RomTranslateViews.current()!=='translation';
    if($('cloudBackupRetry'))$('cloudBackupRetry').hidden=!p||!!p.cloudRomReady&&!p.cloudSyncPaused&&(p.cloudSavedChange||0)>=(p.lastChangedAt||0);
    if($('cloudBackupRetry'))$('cloudBackupRetry').disabled=foregroundBusy||!p||!FontCloud.connected();
    if($('workCloudRefresh'))$('workCloudRefresh').disabled=foregroundBusy||!FontCloud.connected();
    $('workSystemSave').disabled=foregroundBusy||FontCloud.isBusy?.()||!p;
    $('romCloudOpen').disabled=foregroundBusy||FontCloud.connected()&&(!latestCloud||!remoteReady&&p?.romHash!==latestCloud.rom_sha256);
    setText('romCloudOpen',!FontCloud.connected()?'เชื่อมคลังส่วนตัว':!latestCloud?'ยังไม่มีงานบนคลาวด์':remoteReady||p&&p.romHash===latestCloud.rom_sha256?'เปิดงานต่อ':'รอไฟล์เกมบนคลาวด์');
    if (task) { const s = TranslationTasks.stats(p, task); $('workBannerText').textContent = 'กำลังดูชุด: '+task.name + ` · แปลแล้ว ${s.done}/${s.total} · เหลือ ${s.remaining}`; }
  }
  function localRecords(records){
    if(!Array.isArray(records))throw Error('อ่านรายการโปรเจกต์ในเครื่องไม่สำเร็จ');
    const rows=[],issues=[...(records.invalidRecords||[])];
    for(let i=0;i<records.length;i++){const p=records[i];if(p&&TranslationTasks.uuid(p.workspaceId))rows.push(p);else issues.push({id:'local:invalid-'+i,name:'ไฟล์งานในเครื่อง',kind:'local',message:'ข้ามรายการงานที่ว่างหรือไม่มีรหัสโปรเจกต์ · ไม่ได้ลบข้อมูลเดิม'});}
    return {rows,issues};
  }
  async function open() {
    $('workDialog').showModal();renderCurrent();await run(async()=>{status('กำลังโหลดโปรเจกต์…');if(FontCloud.connected()){await listCloud();status('');}else status('บันทึกในเครื่องอัตโนมัติ · เชื่อมคลังส่วนตัวเพื่อสำรองข้ามเครื่อง');});
  }
  async function run(action,{foreground=true}={}) {
    if (busy){status('กำลังจัดการโปรเจกต์ กรุณารอสักครู่');return;} busy = true; foregroundBusy=foreground; renderCurrent();
    try { await action(); } catch (e) { status(e.message,'error');setText('cloudSaveStatus','ยังไม่ยืนยันการสำรอง · งานในเครื่องยังอยู่ · '+e.message,'error');if(e.networkFailure)FontCloud.reportError(e.message);if(foreground){if($('workDialog').open)window.UiShell?.notify(e.message,true);else bridge().toast(e.message,'error');} }
    finally { busy = false; foregroundBusy=false; renderCurrent(); if (queued) { queued = false; schedule(); } }
  }
  async function inspectCloudRom(item){
    if(!$('cloudRomState').textContent){$('cloudRomState').dataset.state='checking';setText('cloudRomState','กำลังตรวจไฟล์เกมบนคลาวด์…');}
    try{const {metadata:m}=await RomCloud.locate({workspaceId:item.workspace_id,romHash:item.rom_sha256});if(latestCloud?.workspace_id!==item.workspace_id)return;
      if(m?.ready){remoteReady=true;setText('cloudRomHint','');$('cloudRomState').dataset.state='ready';setText('cloudRomState','ไฟล์เกมและคำแปลพร้อมเปิด · '+(m.size/1048576).toFixed(0)+' MB');}
      else{remoteReady=false;$('cloudRomState').dataset.state='waiting';const count=new Set(m?.present||[]).size,total=m?.chunks||0;const percent=total?Math.floor(count/total*100):0;setText('cloudRomState',m?'ไฟล์เกมยังสำรองไม่ครบ · '+percent+'% ('+count+'/'+total+' ส่วน)':'พบคำแปล · ยังไม่มีไฟล์เกมบนคลาวด์');setText('cloudRomHint','เปิดเว็บที่เครื่องเดิมให้สำรอง ROM ครบก่อน มือถือจะเปิดงานให้เอง ไม่ต้องเลือกไฟล์ในมือถือ');}
    }catch(e){remoteReady=false;$('cloudRomState').dataset.state='error';setText('cloudRomState',e.romSetupMissing?'ยังไม่ได้ติดตั้งที่เก็บไฟล์เกม':'ตรวจไฟล์เกมไม่สำเร็จ');setText('cloudRomHint',e.message);}
    renderCurrent();
  }
  async function removeCloudItem(item){
    if(!confirm('ลบโปรเจกต์ “'+item.name+'” และไฟล์เกมบนคลาวด์? งานในเครื่องยังอยู่'))return;
    status('กำลังลบโปรเจกต์…');const scope=await FontCloud.workspaceScope();clearTimeout(timer);
    await bridge().storeCloudState(item.workspace_id,{cloudAutosave:false,cloudSyncPaused:true,cloudDeletePending:true});
    const request=async(action,args)=>{if(await FontCloud.workspaceScope()!==scope)throw Error('คลังเปลี่ยนระหว่างลบ กรุณาเปิดรายการใหม่');return FontCloud.workspaceRequest(action,args);};
    await WorkspaceDelete.remove(item,request,status);sent.delete(item.workspace_id);
    await bridge().storeCloudState(item.workspace_id,{cloudRevision:0,cloudSyncPaused:true,cloudAutosave:false,cloudDeletePending:false,lastCloudSavedAt:0,cloudSavedChange:0});
    await listCloud();status('ลบโปรเจกต์และไฟล์เกมบนคลาวด์แล้ว · งานในเครื่องยังอยู่','success');
  }
  async function listCloud(){
    const result=await FontCloud.workspaceRequest('list');if(!Array.isArray(result))throw Error('อ่านรายการไฟล์งานไม่สำเร็จ');const rows=newest(result),item=rows[0];
    const changed=latestCloud?.workspace_id!==item?.workspace_id||latestCloud?.rom_sha256!==item?.rom_sha256;latestCloud=item||null;
    if(changed){remoteReady=false;card=null;$('workCloudRows').replaceChildren();$('workCloudActions').replaceChildren();setText('cloudRomState','');setText('cloudRomHint','');}
    if(item){
      if(!card){const row=document.createElement('article'),info=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small');row.className='project-card';row.dataset.workspaceId=item.workspace_id;info.className='project-card-info';info.append(title,meta);row.append(info);$('workCloudRows').replaceChildren(row);card={title,meta};
        $('workCloudActions').replaceChildren(button('ลบโปรเจกต์บนคลาวด์',()=>run(()=>removeCloudItem({...latestCloud}))));
      }
      const stamp='บันทึกล่าสุด '+time(item.updated_at);if(card.title.textContent!==item.name)card.title.textContent=item.name;if(card.meta.textContent!==stamp)card.meta.textContent=stamp;
      await inspectCloudRom(item);
    }else{if($('workCloudRows').textContent!=='ยังไม่มีงานบนคลาวด์')$('workCloudRows').textContent='ยังไม่มีงานบนคลาวด์';setText('cloudRomState','เปิด ROM ใหม่ที่เครื่องที่ต้องการเริ่มแปล แล้วเชื่อมคลังเพื่อสำรอง');$('cloudRomState').dataset.state='empty';}
    renderCurrent();return rows;
  }
  async function autoResume(rows,scope){
    if((resumedScopes.has(scope)&&!bridge().project())||bridge().isLoading())return;
    const staged=bridge().pendingWorkspace();if(staged&&(!awaitingRom||awaitingRom.scope!==scope||awaitingRom.id!==staged.workspaceId))return;
    if(bridge().project())return;
    const current=bridge().project(),clean=p=>p&&!p.cloudSyncPaused&&p.cloudScope===scope&&p.cloudRevision>0&&(p.cloudSavedChange||0)>=(p.lastChangedAt||0);
    // Never switch away from active work. A clean copy of the same workspace
    // can receive its newer cloud revision once on connection.
    const candidates=rows.slice().sort((a,b)=>(Date.parse(b.updated_at)||0)-(Date.parse(a.updated_at)||0)||String(a.workspace_id).localeCompare(String(b.workspace_id)));
    const item=current?(clean(current)?candidates.find(r=>r.workspace_id===current.workspaceId&&Number(r.revision)>current.cloudRevision):null):candidates[0];
    if(!item){resumedScopes.add(scope);return;}
    const stamp=current?.lastChangedAt,guard=()=>FontCloud.authenticated()&&!bridge().isLoading()&&bridge().pendingWorkspace()===staged&&bridge().project()===current&&(!current||current.lastChangedAt===stamp&&clean(current));
    const result=await FontCloud.workspaceRequest('get',{p_id:item.workspace_id}),saved=result?.[0];
    if(!guard())return;
    if(!saved?.payload||saved.payload.workspaceId!==item.workspace_id)throw Error('ไม่พบไฟล์งานคลาวด์ที่ตรงกับรายการ');
    const payload={...saved.payload,cloudRevision:Number(saved.revision),cloudScope:scope,cloudAutosave:true,cloudSyncPaused:false,cloudDeletePending:false,lastCloudSavedAt:Date.parse(item.updated_at)||Date.now(),cloudSavedChange:saved.payload.lastChangedAt||0};
    let cloudBytes=null;if(window.RomCloud&&!current){const cached=await bridge().cachedRom(payload.romHash).catch(()=>null);if(!cached?.bytes)try{cloudBytes=await RomCloud.forResume(payload,{strict:true});}catch(e){if(e.romRequired){if(guard()){await bridge().autoResumeWorkspace(payload,guard,null,staged);if(bridge().pendingWorkspace()?.workspaceId===payload.workspaceId)awaitingRom={id:payload.workspaceId,hash:payload.romHash,scope};}throw Error(e.message+' · เปิดเว็บที่เครื่องเดิม กดสำรองตอนนี้ให้ไฟล์เกมครบ แล้วมือถือจะเปิดงานต่อให้อัตโนมัติ');}if(e.name!=='AbortError')throw e;resumedScopes.add(scope);awaitingRom=null;status('ยกเลิกเปิดงานอัตโนมัติแล้ว');return;}if(!guard())return;}RomCloud.resumeStage?.('นำคำแปลมาแสดง');if(await bridge().autoResumeWorkspace(payload,guard,cloudBytes,staged)){await bridge().storeCloudState(payload.workspaceId,{cloudBase:structuredClone(saved.payload),openedBackup:{workspaceId:item.workspace_id,name:item.name||payload.workspaceName||payload.title,revision:Number(saved.revision),savedAt:Date.parse(item.updated_at)||0}});awaitingRom=null;resumedScopes.add(scope);status('เปิดงานล่าสุดอัตโนมัติแล้ว · '+(payload.workspaceName||payload.title));}else if(!bridge().project()&&bridge().pendingWorkspace()?.workspaceId===payload.workspaceId){awaitingRom={id:payload.workspaceId,hash:payload.romHash,scope};status('รอ ROM สำรอง · พร้อมแล้วจะเปิดงานให้อัตโนมัติ');}
  }
  async function pollAwaitingRom(){
    const waiting=awaitingRom;if(!waiting||busy||pollingRom||!FontCloud.connected()||document.hidden)return;
    if(bridge().project()||bridge().pendingWorkspace()?.workspaceId!==waiting.id){awaitingRom=null;return;}
    pollingRom=true;
    try{
      if(await FontCloud.workspaceScope()!==waiting.scope){awaitingRom=null;return;}
      const metadata=await RomCloud.readyInfo(waiting.id,waiting.hash);
      if(!metadata?.ready||metadata.sha256!==waiting.hash)return;
      if(awaitingRom!==waiting||bridge().project()||bridge().pendingWorkspace()?.workspaceId!==waiting.id)return;
      await syncConnected();
    }catch(e){status('ยังรอ ROM สำรอง · ระบบจะตรวจอีกครั้งอัตโนมัติ');}
    finally{pollingRom=false;}
  }
  window.addEventListener('romtranslate:cloud-resume-cancelled',()=>{if(awaitingRom)resumedScopes.add(awaitingRom.scope);awaitingRom=null;});
  window.addEventListener('focus',pollAwaitingRom);window.addEventListener('online',pollAwaitingRom);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollAwaitingRom();});
  setInterval(pollAwaitingRom,60000);
  function serialized(p) { const payload = TranslationTasks.portable(p); delete payload.cloudRevision; delete payload.history; return {payload, content:JSON.stringify(payload)}; }
  async function upload(manual=false,target=bridge().project(),options={}){
    const scope=await FontCloud.workspaceScope();
    const work=async assertWriter=>{await bridge().flushLocal?.();try{backupFailures.delete(target.workspaceId);await uploadInner(manual,target,{...options,assertWriter,writerScope:scope});}catch(e){backupFailures.set(bridge().project()?.workspaceId||target.workspaceId,e.message);throw e;}};
    const ran=window.CloudSafety?await CloudSafety.withWriter(scope,work):(await work(()=>{}),true);
    if(!ran){queued=true;status('อีกแท็บกำลังบันทึก · งานในเครื่องรอส่ง');}
  }
  async function uploadInner(manual = false, target = bridge().project(), options={}) {
    let p = target; if (!p) throw Error('เปิด ROM / ไฟล์งานก่อน');
    if (!manual && (!p.cloudAutosave||p.cloudSyncPaused)) return;
    const scope = await FontCloud.workspaceScope();
    if(options.writerScope&&scope!==options.writerScope)throw Error('คลังเปลี่ยนระหว่างรอคิว · งานในเครื่องยังอยู่');
    if (p.cloudScope !== scope) {
      if (!manual && p.cloudScope) { status('ไฟล์นี้อยู่คนละคลัง ไม่ย้ายคลังอัตโนมัติ'); return; }
      p.cloudScope = scope; p.cloudRevision = 0;
    }
    p=await sharedWorkspace(p,scope);
    const changedAt=p.lastChangedAt||Date.now();const {payload, content} = serialized(p);
    if (!manual && sent.get(p.workspaceId) === content){await bridge().storeCloudState(p.workspaceId,{cloudSavedChange:changedAt});await finishBackup(p,p.cloudRevision,scope,options);renderCurrent();return;}
    if (new TextEncoder().encode(content).length > 16*1024*1024) throw Error('ไฟล์งานคลาวด์ต้องไม่เกิน 16 MB ดาวน์โหลด JSON สำรองได้');
    status('กำลังบันทึกไฟล์งานบนคลาวด์…');
    let revision;
    try { await options.assertWriter?.();const args={p_id:p.workspaceId,p_expected:p.cloudRevision||0,p_payload:payload};const request=async(action,value)=>{await options.assertWriter?.();if(await FontCloud.workspaceScope()!==scope)throw Error('คลังเปลี่ยนระหว่างบันทึก');return FontCloud.workspaceRequest(action,value);};revision=window.CloudSafety?await CloudSafety.putConfirmed(request,args):Number(await request('put',args)); }
    catch (e) { if (/Workspace version conflict/.test(e.message)) { queued=true;throw Error('คลาวด์เปลี่ยนระหว่างบันทึก · เก็บงานในเครื่องแล้ว กำลังรอรวมกับฉบับล่าสุด'); } throw e; }
    if (!Number.isSafeInteger(revision) || revision < 1) throw Error('เวอร์ชันไฟล์งานตอบกลับไม่ถูกต้อง');
    sent.set(p.workspaceId, content);p.cloudRevision=revision;await bridge().storeCloudState(p.workspaceId,{cloudScope:scope,cloudRevision:revision,cloudAutosave:true,cloudSyncPaused:false,cloudDeletePending:false,lastCloudSavedAt:Date.now(),cloudSavedChange:changedAt,cloudBase:structuredClone(payload)});
    await finishBackup(p,revision,scope,options);
    status('บันทึกคลาวด์แล้ว · รุ่น ' + revision + ' · ' + new Date().toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok'}),'success');
    if ($('workDialog').open)await listCloud();
  }
  async function finishBackup(p,revision,scope,options){
    try{
      if(!window.RomCloud?.ensure)throw Error('ระบบสำรอง ROM ยังไม่พร้อม กรุณาเปิดเว็บรุ่นล่าสุด');
      await RomCloud.ensure(p,{interactive:!!options.interactive,onProgress:(value,message)=>{status(message);if($('cloudSaveStatus')&&(!p.cloudRomReady||options.interactive))setText('cloudSaveStatus',message);options.onProgress?.(value,message);}});
      await bridge().storeCloudState(p.workspaceId,{cloudRomReady:true});
      await retainLatest(p.workspaceId,revision,scope);
    }catch(e){throw Error('คำแปลบันทึกแล้ว แต่ยังสำรองงานครบชุดไม่สำเร็จ: '+e.message);}
  }
  function schedule({urgent=false}={}) {
    urgentTargets ||= urgent;
    clearTimeout(timer); const p = bridge()?.project(); if (!p?.cloudAutosave || !FontCloud.connected()) return;
    queuedSince||=Date.now();const delay=urgentTargets||!p.cloudRevision?1500:Math.min(12000,Math.max(0,30000-(Date.now()-queuedSince)));timer=setTimeout(()=>{if(busy){queued=true;return;}urgentTargets=false;queuedSince=0;run(()=>upload(),{foreground:false});},delay);
  }
  async function verifyCloud(){
    const p=bridge().project();if(!p)throw Error('เปิดโปรเจกต์ก่อนตรวจ');const scope=await FontCloud.workspaceScope(),stamp=p.lastChangedAt;
    const saved=(await FontCloud.workspaceRequest('get',{p_id:p.workspaceId}))?.[0],metadata=await RomCloud.readyInfo(p.workspaceId,p.romHash);
    if(await FontCloud.workspaceScope()!==scope||bridge().project()!==p||p.lastChangedAt!==stamp)throw Error('งานเปลี่ยนระหว่างตรวจ กรุณาตรวจใหม่');
    if(!saved?.payload||!metadata?.ready||metadata.sha256!==p.romHash)throw Error('คำแปลหรือ ROM บนคลาวด์ยังสำรองไม่ครบ · กดสำรองตอนนี้ก่อนตรวจ');
    const local=await CloudSafety.manifest(bridge().workSnapshot()),remote=await CloudSafety.manifest(saved.payload);
    const latest=await FontCloud.workspaceRequest('list');if(await FontCloud.workspaceScope()!==scope||bridge().project()!==p||p.lastChangedAt!==stamp||Number(latest.find(r=>r.workspace_id===p.workspaceId)?.revision)!==Number(saved.revision))throw Error('งานเปลี่ยนระหว่างตรวจ กรุณาตรวจใหม่');
    if(local.digest!==remote.digest)throw Error('ข้อมูลในเครื่องกับคลาวด์ยังไม่ตรงกัน · งานในเครื่องยังอยู่ กดสำรองหรือเลือกคำแปลที่ขัดกันก่อน');
    await bridge().storeCloudState(p.workspaceId,{cloudVerifiedAt:Date.now(),cloudVerifiedRevision:Number(saved.revision),cloudVerifiedChange:stamp});
    verifiedDisplayId=p.workspaceId;setText('workVerification','ตรวจตรงกันแล้ว · '+time(p.cloudVerifiedAt)+' · รุ่น '+saved.revision+' · คำแปล '+remote.translations.toLocaleString()+' รายการ · ROM '+(metadata.size/1048576).toFixed(0)+' MB ผ่าน SHA-256 · ฟอนต์ '+remote.font+' · เป้าหมาย '+remote.goals+' หมวด');
    $('workVerification').dataset.state='ready';bridge().toast('ROM คำแปล ฟอนต์ และเป้าหมายบนคลาวด์ตรงกันแล้ว','success');return remote;
  }
  if($('workVerify'))$('workVerify').onclick=()=>run(verifyCloud);
  if($('workResolveConflict'))$('workResolveConflict').onclick=async()=>{
    const packet=pendingConflict;if(!packet)return;const choices=await WorkspaceConflicts.choose(packet.error,packet.local);if(!choices)return;
    await run(async()=>{const p=bridge().project();if(p!==packet.project||p.lastChangedAt!==packet.stamp||await FontCloud.workspaceScope()!==packet.scope)throw Error('งานเปลี่ยนระหว่างเลือก · กรุณาซิงก์แล้วเลือกจากข้อมูลล่าสุด');
      const saved=(await FontCloud.workspaceRequest('get',{p_id:packet.remote.workspaceId}))?.[0];if(Number(saved?.revision)!==packet.revision)throw Error('อีกเครื่องบันทึกฉบับใหม่แล้ว · กรุณาซิงก์ก่อนเลือกอีกครั้ง');
      const merged=WorkspaceSync.reconcile(packet.local,packet.remote,packet.base,choices),payload={...merged,history:structuredClone(p.history),cloudRevision:packet.revision,cloudScope:packet.scope,cloudAutosave:true,cloudSyncPaused:false,cloudBase:packet.remote};
      const guard=()=>bridge().project()===p&&p.lastChangedAt===packet.stamp;
      if(await bridge().loadWorkspace(payload,{guard,requireRom:true})!==true)throw Error('ยังใช้คำแปลที่เลือกไม่ได้ · งานเดิมยังอยู่');pendingConflict=null;await upload(true,bridge().project());status('บันทึกคำแปลที่เลือกแล้ว');
    });
  };
  $('workSystemSave').onclick=()=>FontCloud.saveAll();
  $('workOpen').onclick = open; $('workClose').onclick = () => $('workDialog').close();
  if($('workCloudRefresh'))$('workCloudRefresh').onclick=()=>run(listCloud);
  $('romCloudOpen').onclick=()=>{if(!FontCloud.connected()){FontCloud.open();return;}return run(async()=>{const rows=await listCloud();if(!rows.length)throw Error('ยังไม่มีโปรเจกต์บนคลาวด์');await loadCloudItem(rows[0]);});};
  if($('cloudBackupRetry'))$('cloudBackupRetry').onclick=()=>run(async()=>{await upload(true,bridge().project(),{interactive:true});await listCloud();});
  $('workPauseCurrent').onclick = () => { const p=bridge().project(),t=TranslationTasks.active(p);if(t){TranslationTasks.finish(p,t.id,'paused');bridge().workChanged();} };
  $('workCancelCurrent').onclick = () => { const p=bridge().project(),t=TranslationTasks.active(p);if(t){TranslationTasks.finish(p,t.id,'cancelled');bridge().workChanged();} };
  async function syncConnected(onProgress=()=>{},{forceResume=false}={}){
    if(busy){const since=Date.now();while(busy&&Date.now()-since<20000){onProgress(0,'รอบันทึกงานปัจจุบันก่อนซิงก์');await new Promise(resolve=>setTimeout(resolve,100));}if(busy)throw Error('กำลังบันทึกงาน กรุณารอสักครู่แล้วซิงก์อีกครั้ง');}
    busy=true;renderCurrent();
    try{if(!bridge().project()&&!bridge().isLoading())RomCloud.beginResume?.();onProgress(0,'กำลังคืนงานในเครื่องก่อนอ่านคลาวด์');if(typeof bridge()?.startupReady!=='function')throw Error('ไฟล์เว็บที่โหลดเป็นคนละรุ่น กรุณาปิดแท็บนี้แล้วเปิด https://sixzower.github.io/RomTranslate/ ใหม่ หรือใช้ index.html รุ่นล่าสุด');await bridge().startupReady();if(!bridge().project()&&!bridge().isLoading())RomCloud.beginResume?.();onProgress(0,'กำลังอ่านรายการโปรเจกต์');const scope=await FontCloud.workspaceScope();if(forceResume)resumedScopes.delete(scope);const cloudRows=await listCloud(),resumeWarnings=[];if(forceResume){const staged=bridge().pendingWorkspace();if(staged&&cloudRows.some(r=>r.workspace_id===staged.workspaceId&&r.rom_sha256===staged.romHash))awaitingRom={id:staged.workspaceId,hash:staged.romHash,scope};}const waitingSince=Date.now();while(bridge().isLoading()&&Date.now()-waitingSince<60000){onProgress(5,'รอเปิด ROM ในเครื่องก่อนคืนงานคลาวด์');await new Promise(resolve=>setTimeout(resolve,100));}if(bridge().isLoading())throw Error('ROM ยังเปิดไม่เสร็จ กรุณาซิงก์คลังอีกครั้งหลังเปิด ROM');try{await autoResume(cloudRows,scope);}catch(e){const current=bridge().project(),item=current?cloudRows.find(r=>r.workspace_id===current.workspaceId):cloudRows.slice().sort((a,b)=>(Date.parse(b.updated_at)||0)-(Date.parse(a.updated_at)||0))[0];resumeWarnings.push({id:item?.workspace_id,name:item?.name||'โปรเจกต์ล่าสุด',kind:'resume',message:'ดึงงานอัตโนมัติยังไม่สำเร็จ: '+e.message+' · เปิด โปรเจกต์ Cloud เพื่อเลือกงานอีกครั้ง'});}if(bridge().project()&&cloudRows.length&&!resumeWarnings.length)try{await sharedWorkspace(bridge().project(),scope);}catch(e){resumeWarnings.push({id:bridge().project().workspaceId,message:e.message});}onProgress(10,'อ่านรายการโปรเจกต์บนคลาวด์แล้ว');const current=bridge().project(),{rows:locals,issues:localIssues}=localRecords(await bridge().localWorkspaces());const rows=new Map(locals.map(p=>[p.workspaceId,p]));if(current){TranslationTasks.ensure(current);current.font=FontPresets.data();rows.set(current.workspaceId,current);}
      const warnings=[...resumeWarnings,...localIssues];let completed=0;const candidate=current||(!cloudRows.length?newest([...rows.values()].map(p=>({...p,updated_at:p.lastChangedAt||p.lastLocalSavedAt||0})))[0]:null);const planned=(candidate?[candidate]:[]).filter(p=>!resumeWarnings.some(w=>w.id===p.workspaceId)&&p.workspaceId!==bridge().pendingWorkspace()?.workspaceId&&!p.cloudSyncPaused&&(!p.cloudScope||p.cloudScope===scope));onProgress(20,'กำลังสำรอง '+planned.length+' โปรเจกต์');
      for(const p of planned){if(p.cloudSyncPaused||p.cloudScope&&p.cloudScope!==scope)continue;p.cloudAutosave=true;try{await upload(false,p,{onProgress:(value,message)=>onProgress(20+70*(completed+value/100)/planned.length,message)});}catch(e){if(/รุ่นใหม่กว่า/.test(e.message)){warnings.push({id:p.workspaceId,name:p.workspaceName||p.title,message:e.message});}else warnings.push({id:p.workspaceId,name:p.workspaceName||p.title,message:e.message});}onProgress(20+70*(++completed)/planned.length,'ตรวจการสำรอง '+completed+'/'+planned.length+' โปรเจกต์แล้ว');}
      if(!candidate&&!resumeWarnings.length&&cloudRows.length){const latest=newest(cloudRows)[0];try{const m=await RomCloud.info(latest.workspace_id);if(m?.ready&&m.sha256===latest.rom_sha256)await retainLatest(latest.workspace_id,latest.revision,scope);}catch(e){warnings.push({id:latest.workspace_id,name:latest.name,kind:'cleanup',message:'งานล่าสุดยังอยู่ แต่ยังจัดเก็บสำเนาเก่าไม่ครบ: '+e.message});}}
      onProgress(95,'กำลังตรวจรายการโปรเจกต์ล่าสุด');await listCloud();onProgress(100,'ตรวจรายการโปรเจกต์ครบแล้ว');if(warnings.length)status(warnings[0].message,'warning');return {pendingProjects:warnings};
    }finally{RomCloud.endResume?.();busy=false;renderCurrent();if(queued){queued=false;schedule();}}
  }
  window.addEventListener('romtranslate:project-changed',e=>{renderCurrent();const p=bridge().project();if(!p)return;if(FontCloud.connected()&&!p.cloudSyncPaused){p.cloudAutosave=true;schedule({urgent:e.detail?.targets===true});}});
  async function followShared(){if(busy||!FontCloud.connected()||document.hidden)return;try{await syncConnected();}catch(e){status(e.message,'error');}}
  window.addEventListener('focus',followShared);setInterval(followShared,60000);
  window.addEventListener('online',schedule);document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});window.addEventListener('romtranslate:view',renderCurrent);
  window.addEventListener('romtranslate:cloud-connection',()=>{if(!FontCloud.connected())clearTimeout(timer);else{const p=bridge().project();if(p&&!p.cloudSyncPaused){p.cloudAutosave=true;schedule();}}renderCurrent();});
  return {renderCurrent,open,syncConnected,verifyCloud,saveForRom:async(options={})=>{if(busy)throw Error('กำลังบันทึกโปรเจกต์ กรุณารอสักครู่');busy=true;renderCurrent();try{await upload(true,bridge().project(),options);}finally{busy=false;renderCurrent();}}};
})();
window.WorkManager=WorkManager;
