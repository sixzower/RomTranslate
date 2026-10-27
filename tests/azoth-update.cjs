const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const D='/workspace/artifacts/azoth-sixz',expected=fs.readFileSync(D+'/translation-013/Pokemon_Azoth_Mercury_Beta7-Sixz-TH-013.gba');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],uploads=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')uploads.push(r.url());});
 await page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:5176')+'/azoth-update.html');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.locator('#download').isDisabled());
 for(const version of ['011','012','013']){
  await page.locator('#rom').setInputFiles(D+'/translation-'+version+'/Pokemon_Azoth_Mercury_Beta7-Sixz-TH-'+version+'.gba');await page.waitForFunction(()=>document.getElementById('status').dataset.kind==='success');assert.equal(await page.locator('#download').isDisabled(),false);
  const pending=page.waitForEvent('download');await page.locator('#download').click();const download=await pending,output='/tmp/azoth-web-from-'+version+'.gba';await download.saveAs(output);assert.equal(download.suggestedFilename(),'Pokemon Azoth Mercury - TH v.2.3 By LoongPlaeDo.gba');assert(fs.readFileSync(output).equals(expected));console.log(version+' -> 013 actual browser GBA download byte-exact');
 }
 await page.locator('#rom').setInputFiles(D+'/source/Pokemon_Azoth_Mercury_English_Beta7.gba');await page.waitForFunction(()=>document.getElementById('status').dataset.kind==='error');assert(await page.locator('#download').isDisabled());
 await page.locator('#rom').setInputFiles({name:'wrong.gba',mimeType:'application/octet-stream',buffer:Buffer.alloc(100)});await page.waitForFunction(()=>document.getElementById('status').dataset.kind==='error');assert(await page.locator('#download').isDisabled());
 assert.deepEqual(errors,[]);assert.deepEqual(uploads,[]);console.log('Wrong version/size rejected, no ROM uploads, mobile layout and JS errors PASS');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
