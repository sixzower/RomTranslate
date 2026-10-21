"""Extract Quetzal Thai 1.0.3 font shapes only; never bundle its ROM."""
import sys,json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parent.parent
rom=Path(sys.argv[1]).read_bytes();bank=0x1d9b600
assert hashlib.sha256(rom).hexdigest()=='8ee0cdd47237e0e454445f191a56e52c7a6babc9dab76271aa78f0e8a822a011','Unsupported Quetzal ROM version'
def pixels(code):
 raw=rom[bank+code*64:bank+(code+1)*64];p=[[0]*8 for _ in range(16)]
 for tile in [0,2]:
  for y in range(8):
   for x in range(8):p[tile//2*8+y][x]=(raw[tile*16+y*2+(1 if x<4 else 0)]>>(6-(x%4)*2))&3==1
 return p
shapes={};sources={};adapted={}
def extract(char,code,region=None,dy=0):
 p=pixels(code);out=[[0]*8 for _ in range(16)]
 for y in range(16):
  for x in range(8):
   if p[y][x] and (region is None or region[0]<=y<=region[1]) and 0<=y+dy<16:out[y+dy][x]=1
 shapes[char]=out;sources[char]={'glyph':hex(code),'region':region,'verticalShift':dy}
letters='กขคฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ'
assert len(letters)==42
for i,c in enumerate(letters):extract(c,0x208+i)
for c,code in {'โ':0x200,'ๆ':0x201,'แ':0x202,'เ':0x203,'ใ':0x204,'ไ':0x205,'า':0x206,'ะ':0x207}.items():extract(c,code)
for c,code in {'ิ':0x232,'ี':0x255,'ึ':0x273,'ั':0x418}.items():extract(c,code,(0,4),1 if c=='ี' else 0)
for c,code in {'่':0x337,'้':0x354,'๊':0x451,'๋':0x4bb,'์':0x48b,'็':0x400}.items():extract(c,code,(0,4),-2)
for c,code in {'ุ':0x38c,'ู':0x3c9}.items():extract(c,code,(12,15))
for i in range(10):extract(str(i),0xa1+i)
shapes[' ']=[[0]*8 for _ in range(16)];sources[' ']={'glyph':'0x000'}
def derived(c,base,edits,why):
 shapes[c]=[r[:] for r in shapes[base]]
 for x,y,value in edits:shapes[c][y][x]=value
 adapted[c]={'base':base,'reason':why}
derived('ฃ','ข',[(2,6,0),(3,6,1)],'Obsolete consonant absent from source; adapted ข')
derived('ฅ','ค',[(2,6,0),(3,6,1)],'Obsolete consonant absent from source; adapted ค')
derived('ฤ','ถ',[(5,12,1),(5,13,1)],'Rare consonant absent from source; adapted ถ')
derived('ฦ','ภ',[(5,12,1),(5,13,1)],'Rare consonant absent from source; adapted ภ')
derived('ๅ','า',[(2,12,1),(2,13,1)],'Long vowel absent from source; extended า')
derived('ื','ี',[(2,3,1)],'Separated two-tick vowel reconstructed from source ี style')
derived('ำ','า',[],'Source shape of า; renderer decomposes ำ into ํ + า')
for c,points,why in [('ํ',[(3,1),(4,1),(3,2),(4,2)],'Nikhahit positioned for renderer normalization'),('ฺ',[(3,12),(4,12),(3,13),(4,13)],'Rare below dot absent from source'),('ฯ',[(0,6),(1,6),(3,6),(1,7),(2,7),(3,7),(3,8),(3,9),(3,10),(3,11)],'Paiyannoi absent from source'),('฿',[(2,4),(2,5),(2,6),(2,7),(2,8),(2,9),(2,10),(2,11),(2,12),(0,5),(1,5),(3,5),(4,6),(0,7),(1,7),(3,7),(4,8),(0,9),(1,9),(3,9)],'Baht symbol absent from source'),('๎',[(4,1),(3,2),(4,3),(3,4)],'Rare yamakkan absent from source')]:
 shapes[c]=[[0]*8 for _ in range(16)]
 for x,y in points:shapes[c][y][x]=1
 adapted[c]={'reason':why}
old=json.loads((root/'fonts/thai_font_data.json').read_text());glyphs=[]
for i,g in enumerate(old['glyphs']):
 c=g['char'];assert c in shapes,c
 p=shapes[c];rows=[[0]*8 for _ in range(16)]
 for y,row in enumerate(p):
  for x,v in enumerate(row):
   if v:rows[y if y<=4 else y+1][x]=1
 glyphs.append({**g,'glyphIndex':i,'tileIndex':i*2,'rows':[''.join(map(str,r)) for r in rows]})
data={**old,'name':'Quetzal TH 1.0.3 — adapted 8×16','spacing':'compact','shadow':'down-right','glyphs':glyphs}
(root/'fonts/thai_font_data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
raw=bytes(int(g['rows'][y][x])|int(g['rows'][y][x+1])<<4 for g in glyphs for top in [0,8] for y in range(top,top+8) for x in range(0,8,2))
(root/'fonts/thai_font_4bpp.bin').write_bytes(raw)
im=Image.new('RGBA',(128,((len(glyphs)+15)//16)*16))
for i,g in enumerate(glyphs):
 for y,row in enumerate(g['rows']):
  for x,v in enumerate(row):
   if v=='1':im.putpixel((i%16*8+x,i//16*16+y),(255,255,255,255))
im.save(root/'fonts/thai_font_8x16.png')
preview=Image.new('RGB',(16*44,6*46),'#628eaa');d=ImageDraw.Draw(preview)
for i,g in enumerate(glyphs):
 x=i%16*44;y=i//16*46;d.text((x,y),g['unicode'][2:],fill='yellow')
 for yy,row in enumerate(shapes[g['char']]):
  for xx,v in enumerate(row):
   if v:d.rectangle((x+xx*2,y+12+yy*2,x+xx*2+1,y+13+yy*2),fill='white')
preview.save(root/'fonts/thai_font_preview.png')
(root/'fonts/quetzal-font-provenance.json').write_text(json.dumps({'source':'Pokemon-Quetzal-TH-v1.0.3.gba','sha256':hashlib.sha256(rom).hexdigest(),'bank':hex(bank),'extracted':sources,'adapted':adapted,'notes':'Ink index 1 only; source background/shadow excluded. Marks separated from precomposed glyphs; tones moved up for stacking; inverse vertical mapping for RomTranslate native renderer. Rare absent shapes adapted, not claimed direct extraction. No ROM included.'},ensure_ascii=False,indent=2)+'\n')
print('Extracted',len(sources),'adapted',len(adapted),'total',len(glyphs))
