/* A lightweight content checksum tracks user review, not security or AI correctness. */
const TranslationReview=(()=>{
 const cache=new WeakMap();
 function checksum(text){let a=2166136261,b=2246822519;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,3266489917);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
 function context(project){const f=project?.font;return checksum(JSON.stringify([f?.spacing||'compact',f?.glyphs?.map(g=>[g.char,g.rows]).sort((a,b)=>a[0].charCodeAt(0)-b[0].charCodeAt(0))||[],project?.glossary||'',project?.genre||'ผจญภัยโปเกมอน แฟนตาซีร่วมสมัย',...(f?.shadow&&f.shadow!=='none'?[f.shadow]:[])]));}
 function signature(entry,key){return checksum(JSON.stringify([entry.id,entry.source,entry.translation,entry.speaker||'',key]));}
 function valid(value){if(value===undefined||value==='')return true;if(typeof value!=='string'||value.length>500)return false;try{const r=JSON.parse(value);return r.v===1&&/^[a-f0-9]{16}$/.test(r.signature)&&Number.isFinite(r.at)&&r.at>0;}catch{return false;}}
 function isReviewed(entry,project,key){if(!entry.review||!valid(entry.review)||!TranslationProgress.eligible(entry)||!TranslationProgress.translated(entry))return false;key=key||context(project);const before=cache.get(entry),input=[entry.source,entry.translation,entry.speaker||'',entry.review,key];if(before&&input.every((v,i)=>v===before.input[i]))return before.value;const value=JSON.parse(entry.review).signature===signature(entry,key);cache.set(entry,{input,value});return value;}
 function mark(project,entries){const key=context(project),at=Date.now();return entries.filter(e=>TranslationProgress.eligible(e)&&TranslationProgress.translated(e)).map(e=>({id:e.id,review:JSON.stringify({v:1,at,signature:signature(e,key)})}));}
 function summary(project,entries=project?.entries||[]){const key=context(project);let translated=0,reviewed=0;for(const e of entries){if(!TranslationProgress.eligible(e)||!TranslationProgress.translated(e))continue;translated++;if(isReviewed(e,project,key))reviewed++;}return {translated,reviewed,remaining:translated-reviewed};}
 return {context,valid,isReviewed,mark,summary};
})();
if(typeof module!=='undefined')module.exports=TranslationReview;
