const RomTranslateViews=(()=>{
 let active='translation';
 const views={translation:['translationView','translationTab'],game:['emulatorView','emulatorTab'],font:['fontEditorView','fontEditorTab']};
 function show(name){if(!views[name])return;active=name;for(const [key,[panel,button]]of Object.entries(views)){document.getElementById(panel).hidden=key!==name;document.getElementById(button).classList.toggle('active',key===name);document.getElementById(button).setAttribute('aria-pressed',String(key===name));}window.dispatchEvent(new CustomEvent('romtranslate:view',{detail:name}));}
 for(const [name,[,button]]of Object.entries(views))document.getElementById(button).onclick=()=>show(name);
 return {show,current:()=>active};
})();
