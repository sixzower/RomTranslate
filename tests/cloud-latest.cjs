const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const oldId='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
async function scenario(mode){
 const nodes=new Map(),node=name=>{if(!nodes.has(name))nodes.set(name,{open:false,hidden:false,disabled:false,textContent:'',dataset:{},children:[],addEventListener:()=>{}});return nodes.get(name);};
 const project={workspaceId:id,cloudRevision:2,cloudScope:'scope',cloudAutosave:true,lastChangedAt:10},copies=new Map([[oldId,{workspace_id:oldId,revision:1,updated_at:'2026-01-01T00:00:00Z'}],[id,{workspace_id:id,revision:2,updated_at:'2026-02-01T00:00:00Z'}]]),removed=[],paused=[];let lists=0,scope='scope';
 const bridge={project:()=>project,pendingWorkspace:()=>null,storeCloudState:async(key,data)=>{if(key===id)Object.assign(project,data);else paused.push([key,data]);}},FontCloud={connected:()=>true,workspaceScope:async()=>scope,workspaceRequest:async(action,args)=>{
  if(action==='get')return [{revision:2,payload:{...project}}];
  if(action==='put'){if(mode==='save-failure')throw Error('save failed');copies.set(id,{workspace_id:id,revision:3,updated_at:'2026-03-01T00:00:00Z'});return 3;}
  if(action==='list'){lists++;if(lists===3&&mode==='keeper-changed')copies.get(id).revision=4;
   const result=structuredClone([...copies.values()]);if(lists===3&&mode==='old-changed')copies.get(oldId).revision=4;if(lists===1&&mode==='scope-changed')scope='other';return result;}
  if(action==='delete'){assert.equal(scope,'scope');if(copies.get(args.p_id).revision!==args.p_expected)throw Error('Workspace version conflict');copies.delete(args.p_id);removed.push(args.p_id);return;}
  throw Error('Unexpected action '+action);
 }};
 const context=vm.createContext({structuredClone,console,Map,Set,Date,Number,JSON,TextEncoder,Error,setTimeout,clearTimeout,setInterval:()=>{},FontCloud,document:{getElementById:node,querySelectorAll:()=>[],addEventListener:()=>{}},TranslationTasks:{active:()=>null,portable:p=>({...p})},RomTranslateViews:{current:()=> 'translation'},RomCloud:{ensure:async()=>{if(mode==='rom-failure')throw Error('ROM transfer failed');}},window:{RomCloud:{ensure:true},RomTranslateBridge:bridge,addEventListener:()=>{}}});
 vm.runInContext(fs.readFileSync('workspace-delete.js','utf8'),context);vm.runInContext(fs.readFileSync('work-manager.js','utf8'),context);
 const save=context.window.WorkManager.saveForRom();
 if(mode==='ok'){await save;assert.deepEqual(removed,[oldId]);assert.equal(copies.size,1);assert.equal(paused[0][1].cloudSyncPaused,true);}
 else {await assert.rejects(save,mode==='save-failure'?/save failed/:mode==='scope-changed'?/คลังเปลี่ยน|งานเปลี่ยน/:/คำแปลบันทึกแล้ว/);assert.deepEqual(removed,[]);assert.equal(copies.size,2);assert.equal(paused.length,0);}
}
(async()=>{for(const mode of ['ok','save-failure','rom-failure','keeper-changed','old-changed','scope-changed'])await scenario(mode);console.log('PASS latest-only retention: confirmed save precedes deletion; failed save/ROM upload, changed keeper revision, concurrent old-project edit and library switch preserve copies; removed local work pauses.');})().catch(e=>{console.error(e);process.exit(1)});
