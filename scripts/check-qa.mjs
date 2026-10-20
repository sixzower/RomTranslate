import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
const version=JSON.parse(fs.readFileSync('package.json')).version;
assert.equal(JSON.parse(fs.readFileSync('release.json')).version,version);
assert(html.includes('qa/app.mjs?v='+version));
assert(html.includes('qa/style.css?v='+version));
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate DOM IDs');
for(const file of ['qa/app.mjs','qa/emulator.mjs']){
 const js=fs.readFileSync(file,'utf8');
 for(const [,id] of js.matchAll(/(?:\$|getElementById)\('([^']+)'\)/g))assert(ids.includes(id),file+': Missing DOM ID '+id);
 for(const [,mod] of js.matchAll(/(?:from\s+|import\()['"]([.][^'"]+)/g))assert(fs.existsSync(path.resolve(path.dirname(file),mod.split('?')[0])),file+': Missing module '+mod);
}
for(const [,file] of html.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g)){
 if(file.startsWith('data:')||file.startsWith('http'))continue;
 assert(fs.existsSync(file),'Missing asset '+file);
}
assert(!/supabase|exceljs|app\.js\?/.test(html),'Old translation/cloud code still loaded');
assert(!fs.existsSync('legacy.html'),'Legacy translation page still exposed');
console.log('PASS release version, DOM references, module/asset paths, and translation/cloud UI removal');
