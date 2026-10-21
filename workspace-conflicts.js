/* Values are displayed as text; no game text or workbook content is executable. */
const WorkspaceConflicts=(()=>{
 const $=id=>document.getElementById(id);let finish=null;
 const fields={translation:'คำแปล',speaker:'ผู้พูด',literal:'ร่างแปล',contextual:'ร่างตามบริบท',translationChoice:'การคงต้นฉบับ',font:'ฟอนต์',fontLibrarySnapshot:'คลังฟอนต์ทั้งชุด',glossary:'คำศัพท์อ้างอิง',genre:'แนวเกม',namePolicy:'รูปแบบชื่อเฉพาะ',progressCategories:'เป้าหมายการแปล'};
 const display=(key,value)=>key==='fontLibrarySnapshot'?(value?.fonts||[]).map(row=>row.font.name+' · '+(value.manifest.items.find(i=>i.id===row.id)?.locked?'ล็อก':'แก้ไขได้')).join('\n')||'ไม่มีชุดคลังฟอนต์':key==='font'?(value?.name||'ฟอนต์ไม่ระบุชื่อ'):typeof value==='string'?value:JSON.stringify(value,null,2);
 function choose(error,project){
  if(finish)return Promise.resolve(null);const rows=$('workspaceConflictRows'),choices={},details=error.details||[],sources=new Map((project.entries||[]).map(e=>[String(e.id),e.source]));let page=0;
  function render(){rows.replaceChildren();for(const item of details.slice(page*50,(page+1)*50)){const section=document.createElement('section'),title=document.createElement('strong'),source=document.createElement('p'),[id,field]=item.key.split(':');title.textContent=(fields[field||id]||item.label)+(field?' · #'+id:'');source.textContent=sources.get(id)||'';section.append(title,source);
   for(const side of ['local','remote']){const label=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span'),value=document.createElement('pre');input.type='radio';input.name='choice-'+item.key;input.value=side;input.checked=choices[item.key]===side;text.textContent=side==='local'?'ในเครื่องนี้':'บนคลาวด์';value.textContent=display(item.key,item[side]);label.append(input,text,value);input.onchange=()=>{choices[item.key]=side;summary();};section.append(label);}rows.append(section);
  }summary();}
  function summary(){const n=Object.keys(choices).length;$('workspaceConflictApply').disabled=n!==details.length;$('workspaceConflictStatus').textContent='เลือกแล้ว '+n+'/'+details.length+' ช่อง · หน้า '+(page+1)+'/'+Math.max(1,Math.ceil(details.length/50));$('workspaceConflictPrev').disabled=page===0;$('workspaceConflictNext').disabled=(page+1)*50>=details.length;}
  for(const [id,side]of [['workspaceConflictUseLocal','local'],['workspaceConflictUseRemote','remote']])$(id).onclick=()=>{for(const item of details)choices[item.key]=side;render();};
  $('workspaceConflictPrev').onclick=()=>{if(page>0){page--;render();}};$('workspaceConflictNext').onclick=()=>{if((page+1)*50<details.length){page++;render();}};
  render();const promise=new Promise(resolve=>{finish=resolve;});$('workspaceConflictDialog').showModal();$('workspaceConflictApply').onclick=()=>{if($('workspaceConflictApply').disabled)return;const resolve=finish;finish=null;$('workspaceConflictDialog').close();resolve(choices);};return promise;
 }
 $('workspaceConflictDialog').addEventListener('cancel',()=>{const resolve=finish;finish=null;resolve?.(null);});
 return {choose};
})();
