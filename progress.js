/* Progress counts canonical ROM entries, never spreadsheet rows or AI drafts. */
const TranslationProgress=(()=>{
 function validSelection(value){return value===undefined||(Array.isArray(value)&&value.length<=200&&value.every(x=>typeof x==='string'&&x.length>0&&x.length<=200)&&new Set(value).size===value.length);}
 function visible(text){return (text||'').replace(/\{(?:CTRL|VAR|DYNAMIC|EXTRA|KEY|GLYPH)(?::[^}]*)?\}|\{(?:PARA|SCROLL)\}/gi,'').trim();}
 function eligible(entry){return !!entry.verified&&entry.family!=='unclassified'&&entry.storage!=='unverified'&&!!visible(entry.source);}
 function translated(entry){const text=visible(entry.translation);return !!text&&(text!==visible(entry.source)||entry.translationChoice==='keep-source'&&entry.translation===entry.source);}
 const KEEP_CATEGORIES=new Set(['ไอเท็ม / ชื่อ','ไอเท็ม / ชื่อพหูพจน์','ชื่อโปเกมอน / ชื่อ','ชื่อเทรนเนอร์ / ชื่อ','ท่า / ชื่อ','ความสามารถ / ชื่อ','ชื่อโปเกมอน / นิสัย','เมนู / ตัวเลือกนิสัย','เมนู / ชื่อสถานที่']);
 const OPTIONAL_CATEGORIES=new Set(['ชื่อเทรนเนอร์ / ประเภทเทรนเนอร์','ชื่อโปเกมอน / กลุ่มโปเกเด็กซ์','เมนู / ริบบอน']);
 const POLICIES={translate:{name:'เนื้อหาที่แนะนำให้แปล',hint:'บทสนทนา เมนู และคำอธิบาย ช่วยให้อ่านและเล่นเข้าใจ'},keep:{name:'ชื่อเฉพาะ · แนะนำคงภาษาอังกฤษ',hint:'ชื่อไอเท็ม โปเกมอน เทรนเนอร์ ท่า ความสามารถ นิสัย และสถานที่ คงอังกฤษเพื่อเทียบคู่มือได้ง่าย เลือกแปลเองได้'},optional:{name:'เลือกแปลได้ตามสไตล์',hint:'ประเภทเทรนเนอร์ กลุ่มโปเกเด็กซ์ และริบบอน แปลได้โดยไม่เปลี่ยนชื่อเฉพาะ'}};
 function policy(category){return KEEP_CATEGORIES.has(category)?'keep':OPTIONAL_CATEGORIES.has(category)?'optional':'translate';}
 // Work groups only change navigation. Canonical category keys stay intact in
 // workspaces, targets, Excel identities and ROM recovery data.
 const WORK=[
  ['story','dialogue','เนื้อเรื่องและบทพูด NPC','บทนำ เหตุการณ์ และข้อความพูดทั่วไป',['บทสนทนา / NPC','บทสนทนา / บทนำ','บทสนทนา / ข้อความหน้าจอ','บทสนทนา / ข้อความเหตุการณ์','บทสนทนา / ข้อความประกอบ']],
  ['trainer-talk','dialogue','บทพูดเทรนเนอร์','รวมก่อนสู้ หลังสู้ และเงื่อนไขเริ่มสู้',['บทสนทนา / ก่อนสู้เทรนเนอร์','บทสนทนา / หลังสู้เทรนเนอร์','บทสนทนา / เงื่อนไขสู้เทรนเนอร์']],
  ['battle','dialogue','ข้อความการต่อสู้','การต่อสู้ แบตเทิลฟรอนเทียร์ และคำอธิบายพฤติกรรม',['บทสนทนา / การต่อสู้','บทสนทนา / แบตเทิลฟรอนเทียร์','บทสนทนา / นิสัยโปเกมอน']],
  ['activities','dialogue','กิจกรรมและรายการทีวี','บทพูดการประกวดและรายการโทรทัศน์',['บทสนทนา / การประกวด','บทสนทนา / รายการโทรทัศน์']],
  ['calls','dialogue','บทพูดทางโทรศัพท์','รวมสายโทรศัพท์เนื้อเรื่องและเทรนเนอร์',['บทสนทนา / สายโทรศัพท์','บทสนทนา / สายโทรศัพท์เทรนเนอร์']],
  ['system','menu','เมนูและข้อความระบบ','เมนูหลัก ตัวเลือก PokéNav และข้อความแจ้งเตือน',['เมนู / เมนูหลัก','เมนู / ข้อความเมนู','เมนู / ข้อความระบบ','เมนู / ข้อความหน้าจอ','เมนู / ตัวเลือกเมนู','เมนู / PokéNav','เมนู / โปเกมอนและไอเท็ม']],
  ['services','menu','การบันทึกและเชื่อมต่อ','บันทึก ของขวัญ และการสื่อสารกับผู้เล่น',['เมนู / บันทึกและของขวัญ','เมนู / เชื่อมต่อผู้เล่น']],
  ['menu-activities','menu','เมนูกิจกรรมและสร้างประโยค','ตัวเลือกแบตเทิลฟรอนเทียร์และคำศัพท์สร้างประโยค',['เมนู / แบตเทิลฟรอนเทียร์','เมนู / คำศัพท์สร้างประโยค']],
  ['item-descriptions','items','คำอธิบายไอเท็ม','รวมผลไอเท็มและคำอธิบายของตกแต่ง ไม่รวมชื่อ',['ไอเท็ม / คำอธิบาย','ไอเท็ม / คำอธิบายของตกแต่ง']],
  ['move-descriptions','moves','คำอธิบายท่า','รวมการต่อสู้ การประกวด และคำแนะนำ ไม่รวมชื่อท่า',['ท่า / คำอธิบาย','ท่า / คำอธิบายประกวด','ท่า / คำอธิบายคำแนะนำ']],
  ['ability-descriptions','abilities','คำอธิบายความสามารถ','อธิบายผลและเงื่อนไข ไม่รวมชื่อความสามารถ',['ความสามารถ / คำอธิบาย']],
  ['pokedex','pokemon','เนื้อหาโปเกเด็กซ์','รายละเอียดโปเกมอน ไม่รวมชื่อและกลุ่มโปเกเด็กซ์',['ชื่อโปเกมอน / ข้อมูลโปเกเด็กซ์']],
  ['trainer-info','trainers','ข้อมูลเทรนเนอร์','ข้อมูลประวัติและรายละเอียด ไม่รวมชื่อ',['ชื่อเทรนเนอร์ / ข้อมูลเทรนเนอร์']],
  ['trainer-classes','trainers','ประเภทเทรนเนอร์','เช่น Youngster หรือ Gym Leader เลือกแปลได้',['ชื่อเทรนเนอร์ / ประเภทเทรนเนอร์']],
  ['dex-groups','pokemon','กลุ่มโปเกเด็กซ์','คำเรียกกลุ่ม เช่น Seed Pokémon เลือกแปลได้',['ชื่อโปเกมอน / กลุ่มโปเกเด็กซ์']],
  ['ribbons','menu','ริบบอน','ชื่อและข้อความริบบอน เลือกตามสไตล์คำแปล',['เมนู / ริบบอน']],
  ['item-names','items','ชื่อไอเท็ม','รวมชื่อเอกพจน์และพหูพจน์ คงอังกฤษเพื่อเทียบคู่มือ',['ไอเท็ม / ชื่อ','ไอเท็ม / ชื่อพหูพจน์']],
  ['pokemon-names','pokemon','ชื่อโปเกมอน','แนะนำคงชื่ออังกฤษ ไม่รวมเนื้อหาโปเกเด็กซ์',['ชื่อโปเกมอน / ชื่อ']],
  ['trainer-names','trainers','ชื่อเทรนเนอร์','ชื่อบุคคล แนะนำคงชื่ออังกฤษ',['ชื่อเทรนเนอร์ / ชื่อ']],
  ['move-names','moves','ชื่อท่า','แนะนำคงอังกฤษเพื่อเทียบข้อมูลท่าได้ง่าย',['ท่า / ชื่อ']],
  ['ability-names','abilities','ชื่อความสามารถ','แนะนำคงอังกฤษเพื่อเทียบข้อมูลความสามารถ',['ความสามารถ / ชื่อ']],
  ['natures','pokemon','ชื่อนิสัยโปเกมอน','เช่น Adamant หรือ Timid แนะนำคงอังกฤษ',['ชื่อโปเกมอน / นิสัย']],
  ['nature-options','menu','ตัวเลือกนิสัยและค่าสถานะ','ป้ายชื่อนิสัยและค่าสถานะในเมนู แนะนำคงอังกฤษ',['เมนู / ตัวเลือกนิสัย']],
  ['places','menu','ชื่อสถานที่','ชื่อเมืองและสถานที่ แนะนำคงอังกฤษเพื่อเทียบแผนที่',['เมนู / ชื่อสถานที่']]
 ].map(([id,family,label,hint,categories])=>({key:'work:'+id,family,label,hint,categories}));
 const byWork=new Map(WORK.map(w=>[w.key,w])),byCategory=new Map(WORK.flatMap(w=>w.categories.map(c=>[c,w])));
 function definition(value){return byWork.get(value)||byCategory.get(value)||null;}
 function categoryMatches(category,filter,family){return filter==='all'||filter==='proper-names'&&policy(category)==='keep'||filter===category||filter===family||definition(category)?.key===filter;}
 function workGroups(project,rows=groups(project)){const selected=new Set(selection(project,rows)),map=new Map();for(const row of rows){const def=definition(row.category)||{key:row.category,label:row.category.split(' / ').slice(1).join(' / ')||row.category,hint:'เลือกดูหรือแปลเฉพาะหมวดนี้',family:row.family},key=def.key;let group=map.get(key);if(!group){group={...def,policy:row.policy,categories:[],rows:[],total:0,done:0,selectedTotal:0,selectedDone:0};map.set(key,group);}group.categories.push(row.category);group.rows.push(row);group.total+=row.total;group.done+=row.done;if(selected.has(row.category)){group.selectedTotal+=row.total;group.selectedDone+=row.done;}}const order=new Map(WORK.map((w,i)=>[w.key,i]));return [...map.values()].map(g=>({...g,remaining:g.total-g.done,selectedRemaining:g.selectedTotal-g.selectedDone})).sort((a,b)=>(order.get(a.key)??999)-(order.get(b.key)??999));}
 const presets=[
  {id:'pokemon-th',name:'แปลไทยแนว Sword & Shield',hint:'แปลบทพูด เมนู คำอธิบาย โปเกเด็กซ์ และข้อมูลเทรนเนอร์ · คงชื่อเฉพาะเป็นอังกฤษ ปรับหมวดย่อยได้'},
  {id:'story-menu',name:'เฉพาะเนื้อเรื่องและเมนู',hint:'แปลบทพูดและเมนูระบบก่อน · ยังไม่รวมคำอธิบายไอเท็ม ท่า ความสามารถ และโปเกเด็กซ์'}
 ];
 function presetSelection(project,id){if(!presets.some(p=>p.id===id))throw Error('ไม่พบชุดเป้าหมาย');return groups(project).filter(row=>policy(row.category)!=='keep'&&(id!=='story-menu'||['dialogue','menu'].includes(row.family))).map(row=>row.category);}
 function matchingPreset(project){const selected=new Set(selection(project));return presets.find(p=>{const rows=presetSelection(project,p.id);return rows.length===selected.size&&rows.every(c=>selected.has(c));})?.id||'custom';}
 function recommended(project){return groups(project).filter(r=>policy(r.category)!=='keep').map(r=>r.category);}
 function matches(entry,category){return categoryMatches(entry.category,category,entry.family)&&(category!=='proper-names'||eligible(entry));}
 function groups(project){const map=new Map();for(const e of project?.entries||[]){if(!eligible(e))continue;let row=map.get(e.category);if(!row){row={category:e.category,family:e.family,policy:policy(e.category),total:0,done:0};map.set(e.category,row);}row.total++;if(translated(e))row.done++;}return [...map.values()].map(r=>({...r,remaining:r.total-r.done}));}
 function selection(project,rows=groups(project)){const allowed=new Set(rows.map(r=>r.category));return project?.progressCategories===undefined?[...allowed]:(validSelection(project.progressCategories)?project.progressCategories.filter(c=>allowed.has(c)):[]);}
 function stats(project){const rows=groups(project),selected=new Set(selection(project,rows));let total=0,done=0;for(const r of rows)if(selected.has(r.category)){total+=r.total;done+=r.done;}return {groups:rows,selected:[...selected],total,done,remaining:total-done,percent:total?done/total*100:0};}
 return {presets,presetSelection,matchingPreset,definition,categoryMatches,workGroups,policy,policies:POLICIES,recommended,matches,validSelection,eligible,translated,groups,selection,stats};
})();
if(typeof module!=="undefined")module.exports=TranslationProgress;
