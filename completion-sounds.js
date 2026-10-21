/* Short local Web Audio tones; no downloads and no effect on cloud success. */
const CompletionSounds=(()=>{
 let context=null,enabled=true;const waiting=new Set(),key='romtranslate.completionSounds.v1';
 try{enabled=localStorage.getItem(key)!=='off';}catch{}
 const control=document.getElementById('completionSound');if(control)control.checked=enabled;
 if(control)control.onchange=()=>{enabled=control.checked;waiting.clear();try{localStorage.setItem(key,enabled?'on':'off');}catch{}};
 function emit(kind){
  if(!enabled||!context||context.state!=='running')return false;
  try{const notes=({upload:[660,880,1100],connected:[587,784],'import-success':[659,831,1047],'import-error':[392,311,247]})[kind],start=context.currentTime;
   notes.forEach((frequency,i)=>{const oscillator=context.createOscillator(),gain=context.createGain(),at=start+i*.11;oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.055,at+.012);gain.gain.exponentialRampToValueAtTime(.001,at+.13);oscillator.connect(gain);gain.connect(context.destination);oscillator.start(at);oscillator.stop(at+.15);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};});
   window.dispatchEvent(new CustomEvent('romtranslate:completion-sound',{detail:{kind}}));return true;
  }catch{return false;}
 }
 async function unlock(){if(!enabled)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;context||=new Audio();if(context.state==='suspended')await context.resume();if(context.state==='running'){for(const kind of waiting)emit(kind);waiting.clear();}}catch{}}
 document.addEventListener('pointerdown',unlock,{passive:true,capture:true});document.addEventListener('keydown',unlock,{capture:true});
 function play(kind){if(!enabled||!['connected','upload','import-success','import-error'].includes(kind))return false;if(kind.startsWith('import-')){waiting.delete('import-success');waiting.delete('import-error');}if(emit(kind))return true;waiting.add(kind);return false;}
 return {play};
})();
window.CompletionSounds=CompletionSounds;
