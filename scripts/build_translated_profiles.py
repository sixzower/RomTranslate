"""Generate non-ROM reader metadata from locally approved build manifests.
No source sentences, translations, ROM binaries, or credentials are published.
"""
from pathlib import Path
import json,hashlib
ROOT=Path('/workspace/artifacts');OUT=Path(__file__).resolve().parent.parent
families=[('azoth-sixz','Azoth','azoth',{'normal':2,'secondary':3}),('odyssey-sixz','Odyssey','odyssey',{'normal':2,'secondary':3}),('glazed-sixz','Glazed','glazed',{'normal':1,'secondary':7})]
profiles=[];seen={}
for folder,label,engine,fonts in families:
 for D in sorted((ROOT/folder).glob('translation-*')):
  if not D.is_dir():continue
  try:
   rs=json.loads((D/'translations.json').read_text());s=json.loads((D/'font-slots.json').read_text());roms=list(D.glob('*.gba'))
   if not roms:continue
   # Release copies in artifacts certify delivery, rather than unpublished trial binaries.
   rom=next((r for r in roms if (ROOT/r.name).exists() or (ROOT/r.name.replace('-preview','')).exists()),None)
   if rom is None:continue
   b=rom.read_bytes();sha=hashlib.sha256(b).hexdigest()
   delivered=ROOT/rom.name
   if not delivered.exists():delivered=ROOT/rom.name.replace('-preview','')
   if hashlib.sha256(delivered.read_bytes()).hexdigest()!=sha:continue
   if engine=='azoth':storage={'table':s['table']};ranges=[[s['table'],4096]];ranges += [[g['offset'],65] for g in json.loads((D/'rendered-glyphs.json').read_text())]
   elif engine=='odyssey':storage={k:s[k] for k in ['glyphBank','widthBank','secondaryGlyphBank','secondaryWidthBank']};ranges=[[s['glyphBank'],32768],[s['widthBank'],512],[s['secondaryGlyphBank'],32768],[s['secondaryWidthBank'],512]]
   else:storage={'glyphBank':s['primary'],'widthBank':s['pw'],'secondaryGlyphBank':s['secondary'],'secondaryWidthBank':s['sw']};ranges=[[s['primary'],32768],[s['pw'],512],[s['secondary'],32768],[s['sw'],512]]
   rows={}
   for r in rs:
    off=r['outputOffset'];n=r['encodedBytes'];assert 0<=off and 1<n and off+n<=len(b) and b[off+n-1]==255
    kind=r.get('kind','dialogue');meta=[off,n,kind,r.get('layoutWidth',0)]
    if off in rows:assert rows[off][1]==n
    else:rows[off]=meta
   # Split-script dialogue chunks are independently editable; caller/script remain untouched.
   split=D/'split-dialogues.json'
   if split.exists():
    for parent in json.loads(split.read_text()):
     for c in parent['chunks']:rows[c['outputOffset']]=[c['outputOffset'],c['encodedBytes'],'dialogue',208]
   rows=sorted(rows.values());end=0
   for x in rows:assert x[0]>=end;end=x[0]+x[1]
   slots=[]
   for cluster,slot in s['slots']:
    variant='default'
    if engine=='odyssey' and ':' in cluster:variant,cluster=cluster.split(':',1)
    slots.append([cluster,slot,variant])
   # Font bytes + header are immutable during text-only editing; hash identifies re-opened exports.
   ranges=[[0,192]]+ranges;signature=hashlib.sha256(b''.join(b[o:o+n] for o,n in ranges)).hexdigest()
   core={'engine':engine,'fonts':fonts,'storage':storage,'slots':slots,'ranges':ranges,'signature':signature,'size':len(b),'rows':rows}
   key=hashlib.sha256(json.dumps(core,separators=(',',':')).encode()).hexdigest()
   if key in seen:seen[key]['hashes'].append(sha);seen[key]['builds'].append(D.name)
   else:
    p={**core,'id':key[:20],'label':label,'builds':[D.name],'hashes':[sha]};profiles.append(p);seen[key]=p
  except (FileNotFoundError,KeyError,AssertionError,TypeError) as e:
   print('skip',D.name,engine,type(e).__name__)
(OUT/'translated-rom-profiles.js').write_text('/* Verified metadata only; no ROM bytes or source dialogue. */\nconst TranslatedRomProfiles='+json.dumps(profiles,ensure_ascii=False,separators=(',',':'))+';\nif(typeof module!=="undefined")module.exports=TranslatedRomProfiles;\n')
print('profiles',len(profiles),'releases',sum(len(x['hashes']) for x in profiles),'bytes',(OUT/'translated-rom-profiles.js').stat().st_size)
