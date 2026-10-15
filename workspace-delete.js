/* Retry a deletion only with its original revision; reconcile lost responses by reading the scoped list. */
const WorkspaceDelete=(()=>{
 function uncertain(cause){const e=Error('ยังยืนยันผลลบไม่ได้ · หยุดสำรองโปรเจกต์นี้ชั่วคราวเพื่อไม่ให้ส่งกลับซ้ำ งานในเครื่องยังอยู่ · เชื่อมต่อแล้วรีเฟรชรายการก่อนลองลบอีกครั้ง');e.uncertainDelete=true;e.networkFailure=!!cause?.networkFailure;e.cause=cause;return e;}
 async function remove(item,request,notify=()=>{}){
  const revision=Number(item.revision);if(!item.workspace_id||!Number.isSafeInteger(revision)||revision<1)throw Error('รายการโปรเจกต์ไม่ถูกต้อง กรุณารีเฟรชก่อนลบ');
  for(let attempt=0;attempt<2;attempt++){
   try{await request('delete',{p_id:item.workspace_id,p_expected:revision});return;}catch(e){
    if(!e.networkFailure)throw e;
    notify('การตอบกลับสะดุด กำลังตรวจว่าลบสำเร็จแล้วหรือยัง…');
    let rows;try{rows=await request('list');}catch(checkError){throw uncertain(checkError);}
    if(!Array.isArray(rows)||rows.some(r=>!r||typeof r.workspace_id!=='string'||!Number.isSafeInteger(Number(r.revision))||Number(r.revision)<1))throw uncertain();
    const row=rows.find(r=>r.workspace_id===item.workspace_id);if(!row)return;
    if(Number(row.revision)!==revision)throw Error('Workspace version conflict: โปรเจกต์มีรุ่นใหม่กว่า กรุณารีเฟรชก่อนลบ');
    if(attempt===1){const failure=Error('สำเนายังอยู่บนคลาวด์ แต่คำขอลบยังส่งไม่สำเร็จ · หยุดสำรองโปรเจกต์นี้ชั่วคราว งานในเครื่องยังอยู่ · ลองเชื่อมต่อแล้วลบอีกครั้ง');failure.networkFailure=true;throw failure;}
    notify('สำเนายังอยู่ กำลังลองลบอีกครั้ง…');
   }
  }
 }
 return {remove};
})();
if(typeof module!=='undefined')module.exports=WorkspaceDelete;
