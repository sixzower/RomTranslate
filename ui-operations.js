/* One visible foreground operation; cancellation is acknowledged before unlocking. */
const UiOperations = (() => {
  const $ = id => document.getElementById(id); let active = null;
  const controls = ['openRom','import','export','workOpen','buildRom','sheetExport','sheetImport','patchOpen','emuBuild','emuOpen','qualityButton','qualityNext'];
  function update(event = {}) {
    const bar = $('operationProgress'), labels = {scan:'อ่านข้อความต้นฉบับ',validate:'ตรวจคำแปล',write:'เขียนข้อความ',finish:'เก็บข้อมูลสำหรับเปิดแก้ต่อ',done:'เสร็จแล้ว'};
    const ranges = {audit:[0,99],scan:[0,40],validate:[40,75],write:[75,90],finish:[90,99],done:[100,100]};
    $('operationDetail').textContent = event.message || labels[event.phase] || 'กำลังทำงาน…';
    if (ranges[event.phase] && event.total) { const [a,b]=ranges[event.phase];bar.value=a+Math.min(1,event.completed/event.total)*(b-a); }
    else bar.removeAttribute('value');
  }
  function cancel() { if (!active?.cancellable) return;active.controller.abort();$('operationCancel').disabled=true;$('operationDetail').textContent='กำลังยกเลิก…'; }
  $('operationCancel').onclick=cancel;
  $('operationDialog').addEventListener('cancel',e=>{e.preventDefault();cancel();});
  async function run(title,work,{cancellable=false}={}) {
    if (active) throw Error('มีงานกำลังทำอยู่ กรุณารอหรือยกเลิกงานเดิม');
    const controller=new AbortController(),prior=controls.map(id=>[$(id),$(id)?.disabled]);
    active={controller,cancellable};$('operationTitle').textContent=title;update();$('operationCancel').hidden=!cancellable;$('operationCancel').disabled=false;
    for(const [node]of prior)if(node)node.disabled=true;
    $('operationDialog').showModal();
    try { await new Promise(resolve=>setTimeout(resolve,0));const result=await work(controller.signal,update);$('operationCancel').disabled=true;update({phase:'done',completed:1,total:1});await new Promise(resolve=>setTimeout(resolve,80));return result; }
    finally { active=null;$('operationDialog').close();for(const [node,disabled]of prior)if(node)node.disabled=disabled;window.RomTranslateBridge?.refreshUI?.(); }
  }
  return {run,update,get busy(){return !!active;}};
})();
