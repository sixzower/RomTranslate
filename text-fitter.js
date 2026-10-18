/* Automatic fitting of Thai translations into the game's byte, width and line limits.
 *
 * The fitter never invents text and never touches control codes ({VAR:..}, {CTRL:..},
 * {PARA}, ...). It proceeds from the least to the most invasive change and stops as
 * soon as the entry fits, so text that already fits is left alone:
 *
 *   safe        lossless: join soft line breaks, collapse/drop spaces between Thai words
 *   compact     + well-known shorter Thai wording with the same meaning (ใช้งาน → ใช้ ...)
 *   aggressive  + sentence-final politeness particles (ครับ ค่ะ นะ ...)
 *
 * A change is kept only when the caller's `check(text)` says it is a strict improvement,
 * so a rule can never make an entry worse. */
const TextFitter=(()=>{
 const LEVELS=['safe','compact','aggressive'];
 const FIT_CODES=new Set(['bytes','width','lines']);
 const SEGMENTER=typeof Intl!=='undefined'&&Intl.Segmenter?new Intl.Segmenter('th',{granularity:'word'}):null;
 const THAI='\\u0e01-\\u0e4e',THAI_CHAR=new RegExp(`[${'\\u0e01-\\u0e4e'}]`);
 // The project stores wrapped text with sara am split (ํ + า); rules are written in the composed form.
 const compose=text=>text.normalize('NFC').replace(/\u0e4d([\u0e48-\u0e4b]?)\u0e32/g,'$1\u0e33');
 const mapText=(text,fn)=>text.split(/(\{[^}]*\})/g).map(part=>part.startsWith('{')?part:fn(part)).join('');

 // Rules replace whole Thai words only: a match must start and end on a word boundary found
 // by Intl.Segmenter (when available), so e.g. ทำการ is dropped in "ทำการโจมตี" but a
 // lookahead keeps "ทำการบ้าน" intact. Each rule is [id, regex, replacement].
 const COMPACT=[
  ['ไม่สามารถที่จะ',/ไม่สามารถที่จะ/g,'ไม่สามารถ'],
  ['ต้องการที่จะ',/ต้องการที่จะ/g,'ต้องการ'],
  ['พยายามที่จะ',/พยายามที่จะ/g,'พยายาม'],
  ['ตัดสินใจที่จะ',/ตัดสินใจที่จะ/g,'ตัดสินใจ'],
  ['เพื่อที่จะ',/เพื่อที่จะ/g,'เพื่อ'],
  ['จำเป็นต้อง',/จำเป็นต้อง/g,'ต้อง'],
  ['ทำการ',/ทำการ(?!บ้าน|ค้า|เกษตร)/g,''],
  ['ใช้งาน',/ใช้งาน/g,'ใช้'],
  ['หลังจากนั้น',/หลังจากนั้น/g,'จากนั้น'],
  ['หลังจาก',/หลังจาก(?!นั้น)/g,'หลัง'],
  ['ก่อนที่จะ',/ก่อนที่จะ/g,'ก่อน'],
  ['ในขณะที่',/ในขณะที่/g,'ขณะที่'],
  ['ถึงแม้ว่า',/ถึงแม้ว่า|ถึงแม้/g,'แม้'],
  ['เพราะว่า',/เพราะว่า/g,'เพราะ'],
  ['เพิ่มขึ้น',/เพิ่มขึ้น/g,'เพิ่ม'],
  ['ลดลง',/ลดลง/g,'ลด'],
  ['อย่างมาก',/เป็นอย่างมาก|อย่างมาก/g,'มาก'],
  ['อย่างรวดเร็ว',/อย่างรวดเร็ว/g,'เร็ว'],
  ['อย่างต่อเนื่อง',/อย่างต่อเนื่อง/g,'ต่อเนื่อง'],
  ['โดยอัตโนมัติ',/โดยอัตโนมัติ|อย่างอัตโนมัติ/g,'อัตโนมัติ'],
  ['ในทันที',/ในทันที|โดยทันที/g,'ทันที'],
  ['ฝ่ายตรงข้าม',/ฝ่ายตรงข้าม/g,'คู่ต่อสู้'],
  ['ของตัวเอง',/ของตัวเอง/g,'ของตน'],
  ['ตนเอง',/ตนเอง/g,'ตน'],
  ['กรุณารอสักครู่',/กรุณารอสักครู่/g,'โปรดรอ'],
  ['กรุณา',/กรุณา/g,'โปรด'],
  ['เพียงแค่',/เพียงแค่/g,'แค่'],
  ['ในเวลาเดียวกัน',/ในเวลาเดียวกัน/g,'พร้อมกัน'],
  ['ประสบความสำเร็จ',/ไม่ประสบความสำเร็จ|ประสบความสำเร็จ/g,m=>m.startsWith('ไม่')?'ล้มเหลว':'สำเร็จ'],
  ['ให้ความช่วยเหลือ',/ให้ความช่วยเหลือ/g,'ช่วย'],
  ['เกิดขึ้น',/เกิดขึ้น/g,'เกิด'],
  ['ปรากฏขึ้น',/ปรากฏขึ้น/g,'ปรากฏ'],
  ['ต้องการจะ',/ต้องการจะ/g,'ต้องการ'],
  ['อยากจะ',/อยากจะ/g,'อยาก'],
  ['โดยปกติแล้ว',/โดยปกติแล้ว|โดยทั่วไป/g,m=>m==='โดยทั่วไป'?'ทั่วไป':'ปกติ'],
  ['ด้วยเช่นกัน',/ด้วยเช่นกัน/g,'ด้วย'],
  ['อย่าง+คำคุณศัพท์',/อย่าง(?=แน่นอน|ชัดเจน|สมบูรณ์|เต็มที่|ปลอดภัย|ง่ายดาย|ราบรื่น)/g,''],
 ];
 // Particles are matched as whole words (Intl.Segmenter), so "คะแนน" and "ครัว" are safe.
 const POLITE=[
  ['คำลงท้าย',/นะครับ|นะคะ|นะค่ะ|นะจ๊ะ|ครับ|ค่ะ|คะ|จ้ะ|จ๊ะ|จ้า/g,''],
 ];

 // Characters the game font cannot draw, with the nearest supported replacement.
 const GLYPH_MAP={'’':"'",'—':'-','–':'-','―':'-','−':'-','~':'-','〜':'-','～':'-','[':'(',']':')','【':'(','】':')','「':'“','」':'”','『':'“','』':'”','*':'','#':'','_':' ','|':' ','\\':'/','‼':'!!','⁉':'!?','♪':'','♥':'','★':'','☆':'','※':'','\u00a0':' ','\u3000':' ','๏':'','๚':'','๛':''};
 function substituteChar(c,previous){
  if(/[๐-๙]/.test(c))return String.fromCharCode(c.charCodeAt(0)-0x0e50+48);
  if(c==='"')return !previous||/[\s(\[{“‘]/.test(previous)?'“':'”';
  if(Object.hasOwn(GLYPH_MAP,c))return GLYPH_MAP[c];
  const folded=c.normalize('NFKC');if(folded!==c&&folded)return folded;
  if(/\p{Extended_Pictographic}|[\ufe0f\u200d\u20e3\u200b-\u200f]/u.test(c))return '';
  return null;
 }
 function replaceGlyph(text,target){
  const out=[];let previous='';
  for(const part of text.split(/(\{[^}]*\})/g)){
   if(part.startsWith('{')){out.push(part);previous='}';continue;}
   let piece='';for(const c of part){if(c===target||c.length===2&&c[0]===target){const r=substituteChar(c,previous);if(r===null)return null;piece+=r;if(r)previous=r.at(-1);}else{piece+=c;previous=c;}}out.push(piece);
  }
  return out.join('');
 }
 // Codes the AI dropped: put back leading/trailing codes and {PARA}/{SCROLL} breaks when the
 // number of text lines matches exactly. Anything else (a lost {VAR:..} mid-sentence) is left alone.
 const TOKEN=/\{(?:VAR|DYNAMIC|EXTRA|KEY|GLYPH):[0-9a-f]{2}\}|\{CTRL:[0-9a-f ]+\}|\{PARA\}|\{SCROLL\}/gi;
 const BREAK=/^\{(?:PARA|SCROLL)\}$/i;
 const tokensOf=text=>text.match(TOKEN)||[];
 function edges(text){
  const parts=text.split(new RegExp(`(${TOKEN.source})`,'gi')),lead=[],trail=[];
  let i=0;while(i<parts.length&&(parts[i]===''||new RegExp(`^${TOKEN.source}$`,'i').test(parts[i]))){if(parts[i])lead.push(parts[i]);i++;}
  let j=parts.length-1;while(j>=i&&(parts[j]===''||new RegExp(`^${TOKEN.source}$`,'i').test(parts[j]))){if(parts[j])trail.unshift(parts[j]);j--;}
  return {lead,trail,body:parts.slice(i,j+1).join('')};
 }
 const isSubsequence=(small,big)=>{let at=0;for(const item of small){at=big.indexOf(item,at);if(at<0)return false;at++;}return true;};
 function restoreCodes(source,text){
  if(JSON.stringify(tokensOf(source))===JSON.stringify(tokensOf(text)))return text;
  const src=edges(source),got=edges(text);
  if(!isSubsequence(got.lead,src.lead)||!isSubsequence(got.trail,src.trail))return text;
  let body=got.body;const wanted=tokensOf(src.body),present=tokensOf(body);
  if(wanted.length&&!present.length&&wanted.every(t=>BREAK.test(t))){
   const lines=body.split(/\n+/).map(x=>x.trim()).filter(Boolean);
   if(lines.length!==wanted.length+1)return text;
   body=lines.reduce((out,line,index)=>out+(index?wanted[index-1]:'')+line,'');
  }
  const next=src.lead.join('')+body+src.trail.join('');
  return JSON.stringify(tokensOf(next))===JSON.stringify(tokensOf(source))?next:text;
 }
 const ELLIPSIS=/\.{3,}|。{2,}|…{2,}/g;
 const compactPunctuation=text=>mapText(text,part=>part.replace(ELLIPSIS,'…'));

 // Glossary terms: when the source has the English term but the Thai text uses a common
 // variant spelling/synonym of the glossary's Thai word, swap it (whole words only).
 const TERM_VARIANTS=[
  ['เทรนเนอร์','ผู้ฝึกโปเกมอน','ผู้ฝึกสอนโปเกมอน','เทรนเนอ'],
  ['โปเกมอน','โปเกม่อน','โปเกมอนส์','โปเกมอง'],
  ['ไอเท็ม','ไอเทม','ไอเท็มส์','ไอเทมส์'],
  ['โปเกบอล','โปเกบอลล์','โปเกบอล์','โปเก้บอล'],
  ['ศูนย์โปเกมอน','โปเกมอนเซ็นเตอร์','ศูนย์พักโปเกมอน'],
  ['ยิม','จิม'],
 ];
 const escapeRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 function harmonizeGlossary(source,text,glossary){
  let out=compose(text);
  for(const line of String(glossary||'').split('\n')){
   const n=line.indexOf('=');if(n<1)continue;
   const term=line.slice(0,n).trim(),thai=compose(line.slice(n+1).trim());
   if(!term||!thai||!new RegExp(`(?<![A-Za-z])${escapeRe(term)}(?![A-Za-z])`,'i').test(source||'')||out.includes(thai))continue;
   const group=TERM_VARIANTS.find(g=>g.includes(thai));if(!group)continue;
   const variants=group.filter(v=>v!==thai).sort((a,b)=>b.length-a.length);
   out=applyRule(out,['glossary',new RegExp(variants.map(escapeRe).join('|'),'g'),thai]);
  }
  return out;
 }
 function boundaries(part){
  if(!SEGMENTER)return null;
  const set=new Set([0,part.length]);
  for(const s of SEGMENTER.segment(part)){set.add(s.index);set.add(s.index+s.segment.length);}
  return set;
 }
 function applyRule(text,[,re,to]){
  return mapText(compose(text),part=>{
   const bounds=boundaries(part);
   // Without a word segmenter we cannot tell word edges apart, so no wording is changed.
   if(!bounds)return part;
   return part.replace(re,(...args)=>{const match=args[0],offset=args.at(-2);return bounds.has(offset)&&bounds.has(offset+match.length)?(typeof to==='function'?to(match):to):match;});
  });
 }
 // "word\nword": a soft line break inside running text. Thai joins without a space.
 function joinSoftLines(text){
  return mapText(text,part=>part.replace(/(\S)[ \t]*\n[ \t]*(?=\S)/g,(match,last,offset,whole)=>last+(THAI_CHAR.test(last)&&THAI_CHAR.test(whole[offset+match.length])?'':' ')));
 }
 function tidySpaces(text){
  return mapText(text,part=>part.replace(/\r\n?/g,'\n').replace(/[​﻿]/g,'').replace(/[ \t ]+/g,' ').replace(/ *\n */g,'\n').replace(new RegExp(`[ ]+(?=ๆ)`,'g'),''))
   .replace(/^[ \n]+|[ \n]+$/g,'');
 }
 const THAI_SPACE=new RegExp(`(?<=[${THAI}])[ \\t]+(?=[${THAI}])`,'g');

 // Lower is better. `fit` counts byte/width/line errors, `other` anything else the fitter
 // cannot influence (control codes, unsupported glyphs), `excess` how far over we are.
 function score(result,entry){
  const errors=result.issues.filter(issue=>issue.severity==='error'),fit=errors.filter(issue=>FIT_CODES.has(issue.code)).length;
  const limit=entry.capacity||entry.maxBytes||Infinity,spec=result.spec||{width:Infinity,lines:Infinity};
  const bytes=Math.max(0,(result.bytes||0)-limit),width=Math.max(0,(result.metrics?.width||0)-spec.width),lines=spec.scroll?0:Math.max(0,(result.metrics?.lines||0)-spec.lines);
  return {fit,other:errors.length-fit,excess:bytes+width+lines*16,size:result.bytes||0};
 }
 const better=(a,b)=>a.other<=b.other&&(a.fit<b.fit||a.fit===b.fit&&(a.excess<b.excess||a.excess===b.excess&&a.size<b.size));

 /* fit(entry, text, {check, level}) → {text, ok, changed, steps, before, after}
  * check(text) must return RomCore.checkEntry-style {issues, bytes, metrics, spec}. */
 function fit(entry,text,{check,level='compact',glossary=''}={}){
  if(typeof check!=='function')throw Error('TextFitter ต้องมีฟังก์ชันตรวจ');
  const rank=Math.max(0,LEVELS.indexOf(level)),steps=[];
  let current=text,result=check(current),now=score(result,entry);const before=now;
  const finish=()=>({text:current,ok:now.fit===0&&now.other===0,fits:now.fit===0,changed:current!==text,steps,before,after:now,issues:result.issues});
  // `force` accepts a change that removes a blocking error even though hidden byte/width
  // errors may appear once the row can be measured at all.
  const attempt=(next,label,force=false)=>{
   if(next===current)return false;
   let nextResult;try{nextResult=check(next);}catch{return false;}
   const next_=score(nextResult,entry);
   if(!(force?(typeof force==='function'?force(nextResult):next_.other<now.other):better(next_,now)))return false;
   current=next;result=nextResult;now=next_;steps.push(label);return true;
  };
  const done=()=>now.fit===0;
  // 0. Glossary wording (a warning, but one the user asked to be consistent).
  const glossaryCount=r=>r.issues.filter(i=>i.code==='glossary').length;
  if(glossary&&glossaryCount(result))attempt(harmonizeGlossary(entry.source,current,glossary),'glossary',r=>{const s=score(r,entry);return glossaryCount(r)<glossaryCount(result)&&s.fit<=now.fit&&s.other<=now.other;});
  // 1. Blocking problems first: dropped codes, then glyphs the font cannot draw.
  if(now.other){
   attempt(restoreCodes(entry.source||'',current),'codes',true);
   for(let guard=0;guard<40;guard++){
    const issue=result.issues.find(i=>i.code==='font'&&i.severity==='error'),match=issue&&/สำหรับ “(.*?)”(?: —|$)|ไม่รองรับ (\S+)$/su.exec(issue.message);if(!match)break;
    const next=replaceGlyph(current,match[1]||match[2]);if(next===null||!attempt(next,'glyph',nr=>!nr.issues.some(i=>i.message===issue.message)))break;
   }
  }
  if(done())return finish();
  attempt(compactPunctuation(current),'ellipsis');
  if(done())return finish();
  // 2. Spacing and line breaks are only touched when the entry does not fit.
  attempt(tidySpaces(current),'tidy');
  if(!done())attempt(joinSoftLines(current),'reflow');
  const dropSpaces=()=>{
   const base=current,spaces=[...base.matchAll(THAI_SPACE)];if(!spaces.length||done())return;
   // Drop spaces from the end first so the opening words keep their natural spacing.
   for(let count=1;count<=spaces.length;count++){
    let next=base;for(const match of spaces.slice(-count).reverse())next=next.slice(0,match.index)+next.slice(match.index+match[0].length);
    if(attempt(next,'spaces')&&done())return;
   }
  };
  dropSpaces();
  if(rank>=1)for(const rule of COMPACT){if(done())break;attempt(applyRule(current,rule),rule[0]);}
  if(rank>=2)for(const rule of POLITE){if(done())break;attempt(applyRule(current,rule),rule[0]);}
  if(rank>=1&&!done())dropSpaces();
  return finish();
 }
 return {fit,levels:LEVELS,rules:{compact:COMPACT.map(r=>r[0]),aggressive:POLITE.map(r=>r[0])},joinSoftLines,tidySpaces,restoreCodes,harmonizeGlossary,replaceGlyph,substituteChar,score};
})();
if(typeof module!=='undefined')module.exports=TextFitter;
