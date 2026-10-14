"""Extract verified native ROM font pixels; source ROMs stay outside the repository.
Usage: python3 scripts/extract_hack_fonts.py DIRECTORY_WITH_MATCHING_ROMS
Requires Pillow for the complete indexed source atlas PNGs.
"""
from pathlib import Path
from PIL import Image
import json,hashlib,sys
if len(sys.argv)!=2:raise SystemExit(__doc__)
root=Path(__file__).resolve().parent.parent; src=Path(sys.argv[1]); template=json.loads((root/'fonts/thai_font_data.json').read_text()); presets=[]; provenance=[]
configs=[('sword-shield-th','ไทยเส้นคม · Sword 14px',src/'Sword_and_Shield_Ultimate_Plus_-_TH_v1.7_Nonplae.gba',0xb34000,0xb3c000,14,True),('seaglass-th','ไทยเงานุ่ม · Seaglass 15px',src/'Pokemon-Emerald-Seaglass-v1.1.3_-TH.gba',0xf20000,0xf30000,15,False)]
for ident,name,path,bank,widthbank,height,jp in configs:
 rom=path.read_bytes(); expected={'sword-shield-th':'9f6cd04a499a56a5fbb453b4f66ff45fa2b15fa5ef440983b4c093b2fe77327c','seaglass-th':'ff82e88ad4d8511587ab39efdcc4e701955dce193231df4fcffc5f3f4a57257d'}; assert hashlib.sha256(rom).hexdigest()==expected[ident], 'Unsupported ROM version'; mapping={}; glyphs=[]
 def pixels(code,latin=False):
  base=0x1f3100 if latin and jp else bank
  pos=base+((code//8)*512+(code%8)*32 if jp and not latin else code*64)
  deltas=[0,16,256,272] if jp and not latin else [0,16,32,48]
  out=[[0]*16 for _ in range(16)]
  for t,d in enumerate(deltas):
   raw=rom[pos+d:pos+d+16]
   for y in range(8):
    for x in range(8):
     v=raw[y*2+(x<4)]>>(6-x%4*2)&3
     out[t//2*8+y][t%2*8+x]=v if v in [1,2] else 0
  return out
 # Keep the complete source bank as an indexed sheet, including currently unmapped sprites.
 count=512 if jp else 1024
 atlas=Image.new('RGBA',(256,count//16*16))
 for code in range(count):
  for y,row in enumerate(pixels(code)):
   for x,v in enumerate(row):
    if v in (1,2):atlas.putpixel((code%16*16+x,code//16*16+y),(255,255,255,255) if v==1 else (64,64,64,255))
 atlas.save(root/f'fonts/{ident}-source.png')
 def extract(c,code,region=None,latin=False):
  p=pixels(code,latin)
  if region:p=[[v if region[0]<=y<=region[1] else 0 for v in row] for y,row in enumerate(p)]
  mapping[c]={'glyph':code,'region':region,'bank':hex(0x1f3100 if latin and jp else bank)}
  return p
 if jp:
  for c in template['glyphs']:
   ch=c['char'];u=ord(ch)
   if 0xe01<=u<=0xe32:mapping[ch]=(u-0xe00,None,False)
   elif 0xe34<=u<=0xe3a:mapping[ch]=(u-0xe01,None,False)
   elif 0xe40<=u<=0xe4e:mapping[ch]=(u-0xe06,None,False)
  mapping['ำ']=(0x32,None,False)
 else:
  # Only visually verified characters/regions; do not substitute other fonts for unmapped glyphs.
  bases={'ก':0x4f,'ข':0x11d,'ค':0x64,'ง':0x44,'จ':0x4a,'ฉ':0x126,'ช':0x127,'ซ':0x128,'ญ':0x186,'ณ':0x12a,'ด':0x12b,'ต':0x12f,'ถ':0x133,'ท':0x136,'ธ':0x48,'น':0x4e,'บ':0x4c,'ป':0x6c,'ผ':0x14e,'ฝ':0x151,'พ':0x154,'ฟ':0x157,'ภ':0x18e,'ม':0x5e,'ย':0x4d,'ร':0x6b,'ล':0x173,'ว':0x66,'ศ':0x1b1,'ษ':0x178,'ส':0x40,'ห':0x43,'อ':0x49,'ฮ':0x1bb,'า':0x46,'ำ':0x46,'ะ':0x4b,'เ':0x47,'แ':0x6d,'โ':0x88,'ไ':0x5f,'ใ':0x17e,'ๆ':0x17f}
  plain={'ก','ข','ง','จ','ญ','ณ','ธ','น','บ','ป','ผ','พ','ฟ','ม','ย','ร','ว','ห','อ','า','ำ','ะ','เ','แ','โ','ไ','ใ','ๆ','ศ'}
  mapping={c:(code,None if c in plain else (7,15),False) for c,code in bases.items()}
  # Upper/lower shapes taken from verified ก combinations, at native coordinates.
  for c,code in {'ั':0x118,'ิ':0x11a,'ี':0x2e3,'ึ':0x335,'ื':0x201,'่':0x11c,'้':0x182,'๋':0x28d,'์':0x1c3,'ํ':0x119}.items():mapping[c]=(code,(0,6),False)
  mapping['็']=(0x11b,(0,6),False)
  mapping['๊']=(0x360,(0,4),False)
  for c,code in {'ุ':0x1cb,'ู':0x25f}.items():mapping[c]=(code,(13,15),False)
 for i in range(10):mapping[str(i)]=(0xa1+i,None,jp)
 mapping[' ']=(0,None,jp)
 specs=dict(mapping);mapping={}
 for i,g in enumerate(template['glyphs']):
  ch=g['char']; spec=specs.get(ch)
  p=extract(ch,*spec) if spec else [[0]*16 for _ in range(16)]
  rows=[''.join('1' if v==1 else '0' for v in row[:8]) for row in p]
  code=spec[0] if spec else 0; w=rom[(0x1fb100 if spec and spec[2] else widthbank)+code] if spec else 8
  glyphs.append({'char':ch,'rows':rows,'nativePixels':[''.join(map(str,row)) for row in p],'advance':max(1,min(16,w)),**({'unavailable':True} if not spec else {})})
 font={'name':name,'glyphWidth':8,'glyphHeight':16,'spacing':'native','shadow':'source','layout':'native','nativeHeight':height,'glyphs':glyphs}
 # Preserve verified precomposed native images when their ink is exactly a union of mapped components.
 native={}; composite_sources={}; letters=[g for g in glyphs if ord(g['char']) in range(0xe01,0xe2f) and not g.get('unavailable')]
 marks=[g for g in glyphs if g['char'] in 'ัิีึืุู่้๋์ํ' and not g.get('unavailable')]
 pool={tuple(''.join('1' if v==1 else '0' for v in row) for row in pixels(code)):code for code in range(512 if jp else 1024)}
 def inkset(p):return {(x,y) for y,row in enumerate(p) for x,v in enumerate(row) if v==1 or v=='1'}
 def normalized(points):
  if not points:return frozenset()
  left=min(x for x,y in points);top=min(y for x,y in points)
  return frozenset((x-left,y-top) for x,y in points)
 # Identify a single mark only when the full base is unchanged and the remaining ink
 # matches a unique extracted mark under translation. Retain original pixels and width.
 patterns={}
 for m in marks:patterns.setdefault(normalized(inkset(m['nativePixels'])),[]).append(m['char'])
 for a in letters:
  base=inkset(a['nativePixels'])
  for code in range(512 if jp else 1024):
   original=pixels(code);points=inkset(original)
   if base and base < points:
    candidates=patterns.get(normalized(points-base),[])
    if len(candidates)==1 and all(y<7 if candidates[0] not in 'ุู' else y>=12 for x,y in points-base):
     cluster=a['char']+candidates[0]
     composite_sources.setdefault(cluster,code)
     native.setdefault(cluster,{'pixels':[''.join(map(str,row)) for row in original],'advance':max(1,min(16,rom[widthbank+code]))})
 if native:font['nativeComposites']=native;font['nativeBasis']=json.dumps([[g['char'],g['rows'],g['nativePixels']] for g in glyphs],ensure_ascii=False,separators=(',',':'))
 presets.append({'id':ident,'font':font});(root/f'fonts/{ident}.json').write_text(json.dumps(font,ensure_ascii=False,indent=2)+'\n')
 provenance.append({'id':ident,'name':name,'romSHA256':hashlib.sha256(rom).hexdigest(),'graphicsBank':hex(bank),'widthBank':hex(widthbank),'layout':'eight-glyph blocks / tile offsets 0,16,256,272' if jp else 'linear64 / tile offsets 0,16,32,48','nativeHeight':height,'palette':{'foreground':1,'shadow':2,'transparent':[0,3]},'mapping':mapping,'unmapped':[g['char'] for g in glyphs if g.get('unavailable')],'verifiedComposites':len(native),'compositeMapping':composite_sources,'limits':'No substituted pixels. Regional extraction is listed explicitly; 12px output is scaled. Unmapped Unicode characters block rendering until designed by the user. Exact source combinations retained where matched; other combinations are composed from extracted parts.'})
 print(name,'mapped',len(mapping),'missing',provenance[-1]['unmapped'],'composites',len(native))
(root/'bundled-fonts.js').write_text('/* Extracted font pixels only; no ROM data bundled. See fonts/hack-font-provenance.json. */\nconst BundledFonts='+json.dumps(presets,ensure_ascii=False,separators=(',',':'))+';\n')
(root/'fonts/hack-font-provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n')
