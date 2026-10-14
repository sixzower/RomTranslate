/* Progress counts canonical ROM entries, never spreadsheet rows or AI drafts. */
const TranslationProgress=(()=>{
 function validSelection(value){return value===undefined||(Array.isArray(value)&&value.length<=200&&value.every(x=>typeof x==='string'&&x.length>0&&x.length<=200)&&new Set(value).size===value.length);}
 function visible(text){return (text||'').replace(/\{(?:CTRL|VAR|DYNAMIC|EXTRA|KEY|GLYPH)(?::[^}]*)?\}|\{(?:PARA|SCROLL)\}/gi,'').trim();}
 function eligible(entry){return !!entry.verified&&entry.family!=='unclassified'&&entry.storage!=='unverified'&&!!visible(entry.source);}
 function translated(entry){const text=visible(entry.translation);return !!text&&text!==visible(entry.source);}
 function groups(project){const map=new Map();for(const e of project?.entries||[]){if(!eligible(e))continue;let row=map.get(e.category);if(!row){row={category:e.category,family:e.family,total:0,done:0};map.set(e.category,row);}row.total++;if(translated(e))row.done++;}return [...map.values()].map(r=>({...r,remaining:r.total-r.done}));}
 function selection(project,rows=groups(project)){const allowed=new Set(rows.map(r=>r.category));return project?.progressCategories===undefined?[...allowed]:(validSelection(project.progressCategories)?project.progressCategories.filter(c=>allowed.has(c)):[]);}
 function stats(project){const rows=groups(project),selected=new Set(selection(project,rows));let total=0,done=0;for(const r of rows)if(selected.has(r.category)){total+=r.total;done+=r.done;}return {groups:rows,selected:[...selected],total,done,remaining:total-done,percent:total?done/total*100:0};}
 return {validSelection,eligible,translated,groups,selection,stats};
})();
if(typeof module!=="undefined")module.exports=TranslationProgress;
