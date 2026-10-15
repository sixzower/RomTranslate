/* Independent script-operand audit for the pinned source ROM. No ROM/text bytes
 * are saved to the repository. Layouts: pret/pokeemerald asm/macros/event.inc (including expansion/1.9.0 two-trainer layout),
 * include/constants/battle_setup.h and data/script_cmd_table.inc.
 * node scripts/audit_imperium_scripts.cjs ORIGINAL.gba [/tmp/commands.json]
 * The inspected script/data region is specific to this source hash, not BPEE.
 */
const fs=require('node:fs'),R=require('../rom-core');
function discover(bytes){const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),records=[],counts=[2,2,2,1,3,2,3,3,3,2,2,2,2];
 const text=offset=>{if(offset<192||offset>=bytes.length)return null;const d=R.decode(bytes,offset);return d&&d.letters>0&&!/[^A-Za-z0-9\sÀéÉ&+=;¿¡%()<>!?\.\-·…“”‘’'♂♀¥,×\/:▶]/.test(d.plain)?d:null;};
 for(let command=0x280000;command<0x389000;command++){const opcode=bytes[command];
  if(opcode===0x5c&&bytes[command+1]<=12&&view.getUint16(command+2,true)>0&&view.getUint16(command+2,true)<=860&&view.getUint16(command+4,true)<256){const type=bytes[command+1],texts=[];for(let n=0;n<counts[type];n++){const site=command+6+n*4,offset=view.getUint32(site,true)-0x8000000;if(!text(offset))break;texts.push({site,offset,role:type===3||n===1?'หลังสู้เทรนเนอร์':n===2?'เงื่อนไขสู้เทรนเนอร์':'ก่อนสู้เทรนเนอร์'});}if(texts.length===counts[type])records.push({command,opcode,type,texts});}
  if(opcode===0x5c&&bytes[command+1]===13&&[2,8].every(n=>view.getUint16(command+n,true)>0&&view.getUint16(command+n,true)<=860)){const texts=[4,10].map(n=>({site:command+n,offset:view.getUint32(command+n,true)-0x8000000,role:'หลังสู้เทรนเนอร์'}));if(texts.every(t=>text(t.offset)))records.push({command,opcode,type:13,texts});}
  if([0xdf,0x67,0x9b,0xdb].includes(opcode)){const site=command+1,offset=view.getUint32(site,true)-0x8000000,d=text(offset);if(d&&offset>=0x280000&&d.letters>=3)records.push({command,opcode,texts:[{site,offset,role:opcode===0xdf?'สายโทรศัพท์':'ข้อความหน้าจอ'}]});}
  if(opcode===0xe4){const site=command+1,offset=view.getUint32(site,true)-0x8000000,d=text(offset);if(d&&d.letters>=1&&view.getUint16(command+5,true)<0x8000)records.push({command,opcode,family:'menu',texts:[{site,offset,role:offset>=0x2b27a0&&offset<0x2b2c60?'ตัวเลือกนิสัย':'ตัวเลือกเมนู'}]});}
  if(opcode===0x85&&bytes[command+1]<=2){const site=command+2,offset=view.getUint32(site,true)-0x8000000,d=text(offset);if(d&&d.letters>=3)records.push({command,opcode,texts:[{site,offset,role:'ข้อความประกอบ'}]});}
 }return records;
}
module.exports={discover};
if(require.main===module)(async()=>{if(!process.argv[2])throw Error('Pass the original Imperium 1.3.1 ROM');const bytes=new Uint8Array(fs.readFileSync(process.argv[2]));if(await R.fingerprint(bytes)!==R.profile.sha256)throw Error('Requires the exact verified source ROM');const commands=discover(bytes),rows=await R.scan(bytes),byOffset=new Map(rows.map(e=>[e.id,e])),issues=[];for(const r of commands)for(const t of r.texts){const e=byOffset.get(t.offset);if(!e?.verified||e.source!==R.decode(bytes,t.offset).source||e.storage==='pointer'&&!e.pointerSites.includes(t.site))issues.push(t);}if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(commands,null,2));console.log(JSON.stringify({commands:commands.length,targets:new Set(commands.flatMap(r=>r.texts.map(t=>t.offset))).size,missing:issues.length,sample:issues.slice(0,5)},null,2));if(issues.length)process.exitCode=1;})().catch(e=>{console.error(e);process.exit(1)});
