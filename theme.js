/* Theme controls work independently of ROM parsing, font rendering and app startup. */
const RomTheme=(()=>{
 const button=document.getElementById('themeToggle'),key='romtranslate.theme';
 function apply(dark,persist=true){document.body.dataset.theme=dark?'dark':'day';button.innerHTML=dark?'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A9 9 0 0 1 9.8 3.5a9 9 0 1 0 10.7 10.7Z"/></svg>';const label=dark?'เปลี่ยนเป็นโหมดกลางวัน':'เปลี่ยนเป็นโหมดกลางคืน';button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(dark));if(persist)try{localStorage.setItem(key,dark?'dark':'day');}catch{}window.dispatchEvent(new Event('romtranslate:theme'));}
 let initial=false;try{initial=localStorage.getItem(key)==='dark';}catch{}button.type='button';button.addEventListener('click',()=>apply(document.body.dataset.theme!=='dark'));apply(initial,false);
 window.addEventListener('storage',event=>{if(event.key===key)apply(event.newValue==='dark',false);});return {apply};
})();
