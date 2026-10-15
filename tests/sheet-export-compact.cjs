const assert=require('node:assert/strict'),fs=require('node:fs');
global.ExcelJS=require('../vendor/exceljs.min');global.RomCore=require('../rom-core');const Sheet=require('../sheet');
(async()=>{
 const entries=await RomCore.scan(new Uint8Array(fs.readFileSync(process.argv[2]))),base=entries.find(e=>e.source==='New Game');assert(base);
 const rows=[{...base},{...base,id:base.id+1,translation:'เริ่มเกม'},{...base,id:base.id+2,translationChoice:'keep-source'}],project={title:'Imperium.gba',romHash:entries.romHash,entries:rows};
 const batch={index:1,total:2,start:1,end:3,scopeTotal:6},bytes=await Sheet.exportXlsx(project,rows,'เมนู',batch),wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);
 assert.deepEqual(wb.worksheets.map(s=>s.name),['Prompt','Instructions','Translations']);const prompt=Sheet.aiPrompt(project,'เมนู',batch);assert.equal(wb.getWorksheet('Prompt').getCell('A3').value,prompt);assert(prompt.includes('และ \\n ที่เป็นรหัส'));assert(prompt.includes('โค้ด \\n ตามต้นฉบับ'));assert(!prompt.includes('\\\\n'));
 let occurrences=0;for(const ws of wb.worksheets)ws.eachRow(r=>r.eachCell(c=>{if(c.value===prompt)occurrences++;}));assert.equal(occurrences,1);
 const info=wb.getWorksheet('Instructions');assert.equal(info.getCell('B3').value,project.romHash);assert.equal(info.getCell('B4').value,'เมนู');assert.equal(info.getCell('B5').value,3);assert(info.getSheetValues().some(r=>r?.[1]==='หมวด: '+base.category&&r[2]==='3 รายการ'));
 const ws=wb.getWorksheet('Translations');assert.deepEqual(ws.getRow(1).values.slice(1),Sheet.headers);assert(ws.sheetProtection.sheet);assert(!ws.sheetProtection.hashValue);assert.notEqual(ws.getCell('F2').protection?.locked,false);assert.equal(ws.getCell('G2').protection.locked,false);assert.notEqual(ws.getCell('G3').protection?.locked,false);assert.notEqual(ws.getCell('G4').protection?.locked,false);assert.equal(ws.getCell('G2').dataValidation.formulae[0],10000);
 ws.getCell('G2').value='เริ่ม';const imported=await Sheet.readXlsx(await wb.xlsx.writeBuffer(),project);assert.equal(imported.changes.find(c=>c.id===base.id).translation,'เริ่ม');
 const glossaryWb=new ExcelJS.Workbook();await glossaryWb.xlsx.load(await Sheet.exportXlsx({...project,glossary:'Potion = ยา\r\n\nBag = กระเป๋า'},rows,'เมนู'));assert.equal(glossaryWb.getWorksheet('Glossary').rowCount,3);assert.equal(glossaryWb.getWorksheet('Glossary').getCell('A3').value,'Bag = กระเป๋า');
 console.log('PASS compact export, single prompt, stable identity metadata, category counts, optional glossary, editable cells and import roundtrip');
})().catch(e=>{console.error(e);process.exit(1)});
