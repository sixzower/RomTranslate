// Byte/layout auto-fit. Runs in plain Node with a synthetic ROM (all Latin widths 6px,
// every font slot blank), so it needs no copyrighted game data.
const assert=require('node:assert/strict');
const RomCore=require('../rom-core'),GameFont=require('../game-font');
global.RomCore=RomCore;global.GameFont=GameFont;
const TranslationQuality=require('../quality');global.TranslationQuality=TranslationQuality;
const TextFitter=require('../text-fitter');global.TextFitter=TextFitter;
const SheetImportBatch=require('../sheet-import-batch');global.SheetImportBatch=SheetImportBatch;
const rom=new Uint8Array(32*1024*1024);
for(const font of RomCore.profile.fonts)for(let i=0;i<256;i++)rom[font.widths+i]=6;
const description=(source,capacity,extra={})=>({id:1,offset:'$1',verified:true,family:'abilities',role:'คำอธิบาย',source,capacity,translation:'',translationChoice:'',...extra});
const check=entry=>text=>TranslationQuality.entry(entry,text,rom,'');
const lines=text=>RomCore.layoutEntry(description('x',99),text,rom).split('\n');
const segments=new Intl.Segmenter('th',{granularity:'word'});
const composed=text=>text.replace(/\u0e4d([\u0e48-\u0e4b]?)\u0e32/g,'$1\u0e33');

// 1. Wrapping breaks between words, never inside one.
{
 const text='เพิ่มพลังโจมตีของผู้ใช้เมื่อถูกโจมตีด้วยท่าต่อสู้ทุกประเภท';
 const rows=lines(text);assert(rows.length>1);
 const words=new Set([...segments.segment(text)].map(s=>s.segment));
 for(const row of rows){
  const parts=[...segments.segment(row)].map(s=>s.segment).filter(w=>w.trim());
  // every wrapped row must consist only of whole words of the original sentence
  for(const word of parts)assert(words.has(word),`word "${word}" was cut mid-word in ${JSON.stringify(rows)}`);
 }
 assert.equal(rows.join(''),text,'wrapping must not add or drop characters');
 // A single word wider than the screen is still split rather than overflowing.
 const long='ก'.repeat(60);const split=lines(long);assert(split.length>1);assert.equal(split.join(''),long);
 // Control blocks stay in place and in order.
 const coded=RomCore.layoutEntry(description('{VAR:01} x',99),'{VAR:01}ได้รับความเสียหายอย่างหนัก{PARA}ต่อไป',rom);
 assert.deepEqual(RomCore.tokens(coded),['{VAR:01}','{PARA}']);
 // Latin words wrap on spaces too.
 const english=RomCore.layoutEntry(description('x',99),'Boosts the Attack stat of the user when it is hit by a move',rom).split('\n');
 for(const row of english)assert(!/^\S*[a-z]$/.test(row)||english.every(r=>r.split(' ').every(w=>'Boosts the Attack stat of the user when it is hit by a move'.split(' ').includes(w))),english.join('|'));
}

// 2. Lossless fitting: spaces/soft breaks only, nothing else changes.
{
 const entry=description('Raises the Attack stat of the user.',36);
 const text='เพิ่ม พลังโจมตี ของ ผู้ใช้';
 assert(check(entry)(text).issues.some(i=>i.code==='bytes'),'fixture must overflow');
 const result=TextFitter.fit(entry,text,{check:check(entry),level:'safe'});
 assert(result.ok,JSON.stringify(result));assert.equal(result.text.replace(/ /g,''),text.replace(/ /g,''));assert(result.steps.every(s=>['tidy','reflow','spaces'].includes(s)));
 // Spaces are removed from the end first, and only as many as needed.
 const roomy=description('x',38);const mild=TextFitter.fit(roomy,text,{check:check(roomy),level:'safe'});
 assert(mild.ok);assert.equal((mild.text.match(/ /g)||[]).length,2,'only as many spaces as needed are removed: '+mild.text);assert(mild.text.startsWith('เพิ่ม พลังโจมตี '),'earliest spacing is kept');
}

// 3. Compact wording applies only on word boundaries and only when it helps.
{
 const entry=description('Uses the item.',28,{family:'abilities'});
 const long='ทำการโจมตีและใช้งานไอเท็มหลังจากนั้นเพิ่มขึ้น';
 const result=TextFitter.fit(entry,long,{check:check(entry),level:'compact'});
 assert(result.changed&&result.after.size<result.before.size,JSON.stringify(result));
 assert(!result.text.includes('ทำการ')&&result.text.includes('โจมตี'));
 // "ทำการบ้าน" (homework) must keep its word.
 const home=description('x',20);const kept=TextFitter.fit(home,'ทำการบ้านเสร็จแล้วทำการโจมตี',{check:check(home),level:'compact'});
 assert(kept.text.includes('ทำการบ้าน'),kept.text);
 // The safe level never rewrites wording.
 assert.equal(TextFitter.fit(entry,long,{check:check(entry),level:'safe'}).text,long);
 // Text that already fits is untouched at every level.
 const fits=description('x',200);for(const level of TextFitter.levels){const r=TextFitter.fit(fits,'ทำการโจมตี ครับ',{check:check(fits),level});assert.equal(r.text,'ทำการโจมตี ครับ');assert(!r.changed);}
}

// 4. Politeness particles are removed only at the aggressive level, and only at clause ends.
{
 const entry=description('x',30);const text='ไปกันเถอะครับ ขอบคุณค่ะ';
 assert.equal(TextFitter.fit(entry,text,{check:check(entry),level:'compact'}).text.includes('ครับ'),true);
 const result=TextFitter.fit(entry,text,{check:check(entry),level:'aggressive'});
 assert(!result.text.includes('ครับ')&&!result.text.includes('ค่ะ'),result.text);
 assert(result.text.includes('ไปกันเถอะ')&&result.text.includes('ขอบคุณ'));
 const word=description('x',12);assert(TextFitter.fit(word,'ครับครัวคะแนนค่ะ',{check:check(word),level:'aggressive'}).text.includes('ครัว'),'"ครัว" and "คะแนน" are not particles');
}

// 5. Control codes keep their order and are never edited.
{
 const entry=description('{CTRL:01 06}Auto Run {VAR:01}',24);
 const text='{CTRL:01 06}ทำการ  วิ่ง โดยอัตโนมัติ {VAR:01} ครับ';
 const result=TextFitter.fit(entry,text,{check:check(entry),level:'aggressive'});
 assert.deepEqual(RomCore.tokens(result.text),RomCore.tokens(text));assert(result.text.startsWith('{CTRL:01 06}'));
}

// 6. A row the fitter cannot rescue is reported honestly and never truncated.
{
 const entry=description('Ok',6);const text='ข้อความนี้ยาวเกินไปมากจริงๆและไม่มีคำให้ย่อเลย';
 const result=TextFitter.fit(entry,text,{check:check(entry),level:'aggressive'});
 assert(!result.ok&&!result.fits);assert(result.text.replace(/\s/g,'')===text,'content must survive');
}

// 6b. Glyphs the game font cannot draw are replaced instead of blocking the build.
{
 const entry=description('"Hello" - he said...',60,{family:'dialogue',role:undefined});
 const text='"สวัสดี" — เขาพูด ๑๒ ครั้ง~ 😀';
 assert(check(entry)(text).issues.some(i=>i.code==='font'),'fixture must be unencodable');
 const result=TextFitter.fit(entry,text,{check:check(entry),level:'safe'});
 assert(result.ok,JSON.stringify(result.issues)+result.text);
 assert.equal(result.text.replace(/\s+/g,' ').trim(),'“สวัสดี” - เขาพูด 12 ครั้ง-');
 // Characters with no safe replacement are left for a human, never silently dropped.
 assert.equal(TextFitter.substituteChar('€'),null);
}

// 6c. Dropped control codes are restored only where the position is certain.
{
 const entry=description('{CTRL:01 06}{CTRL:03 07}Auto Run',40);
 const lead=TextFitter.fit(entry,'วิ่งอัตโนมัติ',{check:check(entry),level:'safe'});
 assert.equal(lead.text,'{CTRL:01 06}{CTRL:03 07}วิ่งอัตโนมัติ');assert(lead.ok);
 const two=description('First line.{SCROLL}Second line.',60,{family:'dialogue',role:undefined});
 assert.equal(TextFitter.restoreCodes(two.source,'บรรทัดแรก\nบรรทัดสอง'),'บรรทัดแรก{SCROLL}บรรทัดสอง');
 assert.equal(TextFitter.restoreCodes(two.source,'บรรทัดแรก\nสอง\nสาม'),'บรรทัดแรก\nสอง\nสาม','ambiguous line counts stay untouched');
 const middle=description('Hi {VAR:01}!',20);
 assert.equal(TextFitter.restoreCodes(middle.source,'สวัสดี!'),'สวัสดี!','a lost mid-sentence variable cannot be placed');
}

// 6d. Ellipsis saves two bytes per "..." and new wording rules are boundary safe.
{
 const entry=description('x',14);
 const result=TextFitter.fit(entry,'ไม่นะ...',{check:check(entry),level:'safe'});
 assert(result.text.includes('…')&&!result.text.includes('...'),result.text);
 const wording=description('x',24);
 const r=TextFitter.fit(wording,'เกิดขึ้นอย่างปลอดภัยเพียงแค่นี้',{check:check(wording),level:'compact'});
 assert(!r.text.includes('เกิดขึ้น')&&r.text.includes('ปลอดภัย')&&!r.text.includes('อย่างปลอดภัย'),r.text);
}

// 6b. Glossary wording: a common variant is swapped for the glossary's Thai term, whole words only.
{
 const entry=description('Trainer',200,{family:'dialogue',role:'',source:'You are a Trainer.'});
 const glossary='Trainer=เทรนเนอร์';
 const checkG=text=>TranslationQuality.entry(entry,text,rom,glossary);
 const text='เธอคือผู้ฝึกโปเกมอน';assert(checkG(text).issues.some(i=>i.code==='glossary'),'fixture must warn');
 const result=TextFitter.fit(entry,text,{check:checkG,level:'safe',glossary});
 assert(result.text.includes('เทรนเนอร์')&&!result.text.includes('ผู้ฝึก'),result.text);assert(!result.issues.some(i=>i.code==='glossary'));
 // Unknown wording is never guessed, and an unrelated source leaves the text alone.
 const other=TextFitter.fit(entry,'เธอคือนักสู้',{check:checkG,level:'safe',glossary});assert.equal(other.text,'เธอคือนักสู้');
 const plain=description('You win',200,{family:'dialogue',role:'',source:'You win'});
 assert.equal(TextFitter.harmonizeGlossary(plain.source,'ผู้ฝึกโปเกมอน',glossary),'ผู้ฝึกโปเกมอน');
}

// 7. End to end through the import repair used by both Excel import and the prebuild report.
(async()=>{
 const entry=description('Raises the Attack stat of the user when hit by a move.',76,{id:77,offset:'$4D'});
 const project={entries:[entry],glossary:''};
 const text='ทำการเพิ่ม พลังโจมตี ของผู้ใช้ หลังจากถูกโจมตีด้วยท่าต่างๆ';
 const issues=TranslationQuality.entry(entry,text,rom,'').issues.map(i=>({...i,id:77}));
 assert(issues.some(i=>i.severity==='error'));
 const report={changes:[{id:77,translation:text}],issues,missing:[],unchanged:0};
 const repaired=await SheetImportBatch.repair(report,project,rom,null,{check(){},combined(){},level:'compact'});
 const final=repaired.changes[0].translation;
 assert.equal(repaired.issues.filter(i=>i.severity==='error').length,0,JSON.stringify(repaired.issues)+final);
 assert.deepEqual(RomCore.tokens(final),RomCore.tokens(text));assert(final.length<text.length+4);
 // Safe level alone leaves wording alone but still gives a valid layout where possible.
 const safe=await SheetImportBatch.repair(report,project,rom,null,{check(){},combined(){},level:'safe'});
 assert(composed(safe.changes[0].translation).includes('ทำการ'));
 // Whole-project path used by "ตรวจคำแปลก่อนสร้าง ROM".
 const saved={...entry,translation:text,verified:true};
 const run=await TranslationQuality.repairAsync({entries:[saved],glossary:''},rom,{level:'compact'});
 assert.equal(run.fixed,1);assert.equal(run.remaining,0);assert(run.updates[0].translation!==text);
 // A row that only breaks the glossary (a warning) is fixed by the same button.
 const g={...description('Trainer',200,{id:78,family:'dialogue',role:'',source:'You are a Trainer.'}),translation:'เธอคือผู้ฝึกโปเกมอน'};
 const gRun=await TranslationQuality.repairAsync({entries:[g],glossary:'Trainer=เทรนเนอร์'},rom,{level:'compact'});
 assert.equal(gRun.fixed,1);assert(gRun.updates[0].translation.includes('เทรนเนอร์'));assert.equal(gRun.report.rows.filter(r=>r.code==='glossary').length,0);
 console.log('PASS text fitter: word-aware wrapping, lossless spacing, boundary-safe compact wording, opt-in particles, token safety, honest failure and import/prebuild repair.');
})().catch(e=>{console.error(e);process.exit(1);});
