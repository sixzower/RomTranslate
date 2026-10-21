// Every change must ship a new version: package.json, release.json, release-info.js, the
// "เว็บ x.y.z" label and the versioned asset URLs must agree (run scripts/bundle.py).
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=f=>fs.readFileSync(f,'utf8'),version=JSON.parse(read('package.json')).version;
assert.match(version,/^\d+\.\d+\.\d+$/);
assert.equal(JSON.parse(read('release.json')).version,version,'release.json is stale — run python3 scripts/bundle.py');
assert.equal(JSON.parse(read('release-info.js').replace(/^const AppRelease=/,'').replace(/;\s*$/,'')).version,version,'release-info.js is stale');
const html=read('index.html');
assert(html.includes('เว็บ '+version+'</span>'),'index.html version label is stale');
assert(html.includes('style.css?v='+version),'versioned asset URL is stale');
assert(read('download/index.html').includes('เว็บ '+version),'download/index.html is stale');
assert(read('README.md').includes('('+version+')'),'README needs a section headed with '+version);
const notice=read('update-notice.js');assert(notice.includes('announceUpdated')&&notice.includes('อัปเดตเสร็จแล้ว · ตอนนี้ใช้รุ่น'),'update-notice must announce the new version');
console.log('PASS release version',version,'is consistent and announced after update.');
