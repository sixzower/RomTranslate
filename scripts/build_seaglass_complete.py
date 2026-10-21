"""Build an explicitly labelled, usable Seaglass supplement; never call drawn pixels ROM extractions.
The verified original remains a separate preset. Uses only Python's standard library.
"""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
source=json.loads((root/'fonts/seaglass-th.json').read_text())
font=json.loads(json.dumps(source)); by={g['char']:g for g in font['glyphs']}; supplements={}
def design(char,base=None,add=(),remove=(),pattern=None,y=7):
 ink={(x,y) for y,row in enumerate(by[base]['nativePixels']) for x,v in enumerate(row) if v=='1'} if base else set()
 if pattern is not None:ink={(x+1,y+dy) for dy,row in enumerate(pattern) for x,v in enumerate(row) if v=='1'}
 ink.difference_update(remove);ink.update(add)
 assert ink and all(0<=x<15 and 0<=y<15 for x,y in ink),char
 p=[[0]*16 for _ in range(16)]
 for x,y in ink:
  p[y][x]=1
  if y+1<16 and (x+1,y+1) not in ink:p[y+1][x+1]=2
 glyph={'char':char,'rows':[''.join('1' if v==1 else '0' for v in row[:8]) for row in p],'nativePixels':[''.join(map(str,row)) for row in p],'advance':min(16,max(x for x,y in ink)+3)}
 supplements[char]=glyph
# Small serif/notch differences and descenders drawn to match the source's 5-row body.
# These are design decisions, NOT Unicode identities inferred from unused ROM sprites.
design('ฃ','ข',add=[(1,6),(2,6)],remove=[(2,7)])
design('ฅ','ค',add=[(2,6),(4,6)],remove=[(3,7)])
design('ฆ',pattern=['010010','101010','011010','010111','010010'])
design('ฌ',pattern=['01110101','10001101','10101101','10011110','11000101'])
design('ฎ','ก',add=[(5,12),(5,13),(4,14),(3,14)])
design('ฏ','ก',add=[(5,12),(5,13),(4,14),(2,14),(1,13)])
design('ฐ','ร',add=[(1,13),(2,14),(3,13),(4,14),(5,13)])
design('ฑ',pattern=['010010','101101','011001','010001','010001'])
design('ฒ',pattern=['01010101','10101101','10101101','10111110','11000101'])
design('ฤ','ภ',add=[(5,12),(5,13),(5,14)])
design('ฦ','ล',add=[(5,12),(5,13),(5,14)])
design('ฬ','พ',add=[(5,5),(5,6),(3,6),(4,7)])
design('ฯ',pattern=['01110','01001','00111','00001','00001'])
design('ฺ',add=[(3,14)])
design('฿',pattern=['11110','10101','11110','10101','11110'],y=7,add=[(3,5),(3,6),(3,12),(3,13)])
design('ๅ','า',add=[(4,12),(4,13),(4,14)])
design('๎',pattern=['00100','01010','10001'],y=1)
# Sara am is nikhahit + sara aa; the old preset incorrectly displayed only sara aa.
# Retain both source components and their original shadows here (not a drawn glyph).
p=[[0]*16 for _ in range(16)]
for ch in ['า','ํ']:
 for y,row in enumerate(by[ch]['nativePixels']):
  for x,v in enumerate(row):
   if v=='1' or v=='2' and p[y][x]!=1:p[y][x]=int(v)
supplements['ำ']={'char':'ำ','rows':[''.join('1' if v==1 else '0' for v in row[:8]) for row in p],'nativePixels':[''.join(map(str,row)) for row in p],'advance':by['า']['advance']}
font['glyphs']=[supplements.get(g['char'],g) for g in font['glyphs']]
font['name']='ไทยเงานุ่ม · Seaglass ครบชุด'
font['supplementedChars']=''.join(g['char'] for g in font['glyphs'] if g['char'] in supplements)
font['sourceNote']='Seaglass TH v1.1.3: ภาพที่จับคู่ได้ดึงจาก ROM; อักษรที่ขาด 17 ตัววาดเสริม และ ำ ประกอบจาก า + ํ ไม่ใช่ภาพต้นฉบับครบทุกตัว'
font['nativeBasis']=json.dumps([[g['char'],g['rows'],g['nativePixels']] for g in font['glyphs']],ensure_ascii=False,separators=(',',':'))
(root/'fonts/seaglass-th-complete.json').write_text(json.dumps(font,ensure_ascii=False,indent=2)+'\n')
# No duplicate source pixels in the detection profile: only the 18 labelled supplements.
(root/'fonts/seaglass-th-supplements.json').write_text(json.dumps({'sourceROM':'ff82e88ad4d8511587ab39efdcc4e701955dce193231df4fcffc5f3f4a57257d','note':font['sourceNote'],'glyphs':list(supplements.values())},ensure_ascii=False,indent=2)+'\n')
presets=[{'id':ident,'font':json.loads((root/f'fonts/{ident}.json').read_text())} for ident in ['sword-shield-th','seaglass-th']]
presets.append({'id':'seaglass-th-complete','font':font})
(root/'bundled-fonts.js').write_text('/* Native source presets and explicitly labelled Seaglass supplements; no ROM data. */\nconst BundledFonts='+json.dumps(presets,ensure_ascii=False,separators=(',',':'))+';\n')
print('Seaglass complete: 17 designed glyphs + sara am composed from original components; original preset preserved.')
