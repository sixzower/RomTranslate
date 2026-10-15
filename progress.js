/* Progress counts canonical ROM entries, never spreadsheet rows or AI drafts. */
const TranslationProgress=(()=>{
 function validSelection(value){return value===undefined||(Array.isArray(value)&&value.length<=200&&value.every(x=>typeof x==='string'&&x.length>0&&x.length<=200)&&new Set(value).size===value.length);}
 function visible(text){return (text||'').replace(/\{(?:CTRL|VAR|DYNAMIC|EXTRA|KEY|GLYPH)(?::[^}]*)?\}|\{(?:PARA|SCROLL)\}/gi,'').trim();}
 function eligible(entry){return !!entry.verified&&entry.family!=='unclassified'&&entry.storage!=='unverified'&&!!visible(entry.source);}
 function translated(entry){const text=visible(entry.translation);return !!text&&(text!==visible(entry.source)||entry.translationChoice==='keep-source'&&entry.translation===entry.source);}
 const KEEP_CATEGORIES=new Set(['ไอเท็ม / ชื่อ','ไอเท็ม / ชื่อพหูพจน์','ชื่อโปเกมอน / ชื่อ','ชื่อเทรนเนอร์ / ชื่อ','ท่า / ชื่อ','ความสามารถ / ชื่อ','ชื่อโปเกมอน / นิสัย','เมนู / ตัวเลือกนิสัย']);
 const OPTIONAL_CATEGORIES=new Set(['ชื่อเทรนเนอร์ / ประเภทเทรนเนอร์','ชื่อโปเกมอน / กลุ่มโปเกเด็กซ์','เมนู / ริบบอน']);
 const POLICIES={translate:{name:'เนื้อหาที่แนะนำให้แปล',hint:'บทสนทนา เมนู และคำอธิบาย ช่วยให้อ่านและเล่นเข้าใจ'},keep:{name:'ชื่อเฉพาะ · แนะนำคงภาษาอังกฤษ',hint:'ชื่อไอเท็ม โปเกมอน เทรนเนอร์ ท่า ความสามารถ และนิสัย คงอังกฤษเพื่อเทียบคู่มือได้ง่าย เลือกแปลเองได้'},optional:{name:'เลือกแปลได้ตามสไตล์',hint:'ประเภทเทรนเนอร์ กลุ่มโปเกเด็กซ์ และริบบอน แปลได้โดยไม่เปลี่ยนชื่อเฉพาะ'}};
 function policy(category){return KEEP_CATEGORIES.has(category)?'keep':OPTIONAL_CATEGORIES.has(category)?'optional':'translate';}
 function recommended(project){return groups(project).filter(r=>policy(r.category)!=='keep').map(r=>r.category);}
 function matches(entry,category){return category==='all'||category==='proper-names'&&policy(entry.category)==='keep'&&eligible(entry)||category===entry.family||category===entry.category;}
 function groups(project){const map=new Map();for(const e of project?.entries||[]){if(!eligible(e))continue;let row=map.get(e.category);if(!row){row={category:e.category,family:e.family,policy:policy(e.category),total:0,done:0};map.set(e.category,row);}row.total++;if(translated(e))row.done++;}return [...map.values()].map(r=>({...r,remaining:r.total-r.done}));}
 function selection(project,rows=groups(project)){const allowed=new Set(rows.map(r=>r.category));return project?.progressCategories===undefined?[...allowed]:(validSelection(project.progressCategories)?project.progressCategories.filter(c=>allowed.has(c)):[]);}
 function stats(project){const rows=groups(project),selected=new Set(selection(project,rows));let total=0,done=0;for(const r of rows)if(selected.has(r.category)){total+=r.total;done+=r.done;}return {groups:rows,selected:[...selected],total,done,remaining:total-done,percent:total?done/total*100:0};}
 return {policy,policies:POLICIES,recommended,matches,validSelection,eligible,translated,groups,selection,stats};
})();
if(typeof module!=="undefined")module.exports=TranslationProgress;
