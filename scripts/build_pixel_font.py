"""Generate the renamed OFL bitmap derivative used by the standalone app."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
root=Path(__file__).resolve().parent.parent
source=Path('/usr/share/fonts/truetype/noto/NotoLoopedThai-Bold.ttf')
font=ImageFont.truetype(str(source),16,layout_engine=ImageFont.Layout.BASIC)
fallbacks=[]
for name in ('NotoSans-Bold.ttf','NotoSansSymbols-Bold.ttf','NotoSansSymbols2-Regular.ttf'):
 path=source.parent/name
 fallbacks.append((ImageFont.truetype(str(path),12,layout_engine=ImageFont.Layout.BASIC),TTFont(path).getBestCmap()))
ft=TTFont(source); cmap=ft.getBestCmap(); factor=16/ft['head'].unitsPerEm
anchors={}; marks={}
for lookup in ft['GPOS'].table.LookupList.Lookup:
 if lookup.LookupType!=4:continue
 for sub in lookup.SubTable:
  for name,record in zip(sub.BaseCoverage.glyphs,sub.BaseArray.BaseRecord):
   anchors[name]=[{'x':round(a.XCoordinate*factor),'y':round(a.YCoordinate*factor)} if a else None for a in record.BaseAnchor]
  for name,record in zip(sub.MarkCoverage.glyphs,sub.MarkArray.MarkRecord):
   marks[name]={'class':record.Class,'x':round(record.MarkAnchor.XCoordinate*factor),'y':round(record.MarkAnchor.YCoordinate*factor)}
chars=''.join(chr(c) for c in range(0xe01,0xe5c) if c in cmap)+''.join(chr(c)for c in range(32,127))+'éÉ…“”‘’♂♀¥×▶'
glyphs={}
for char in dict.fromkeys(chars):
 if char=='ำ':continue
 chosen=font if ord(char) in cmap else next((f for f,c in fallbacks if ord(char) in c),None)
 if chosen is None:raise ValueError('No glyph for '+char)
 image=Image.new('L',(16,24));d=ImageDraw.Draw(image)
 d.text((0,16),char,font=chosen,fill=255,anchor='ls')
 binary=image.point(lambda v:255 if v>=110 else 0)
 rows=[sum(1<<(15-x)for x in range(16)if binary.getpixel((x,y)))for y in range(24)]
 name=cmap.get(ord(char));mark=marks.get(name)
 glyphs[char]={'rows':rows,'width':max(1,round(chosen.getlength(char)))+1 if not mark else 0,'mark':bool(mark),'anchors':anchors.get(name,[]),'markAnchor':mark}
 if char==' ':glyphs[char]['width']=5
copyright=Path('/usr/share/doc/fonts-noto-core/copyright').read_text()
section=copyright.split('\nLicense: OFL-1.1\n')[2].split('\nLicense: GPL')[0]
license='Copyright 2010,2012-2020 Google Inc.; 2015-2020 Google LLC.\nBitmap modifications: RomTranslate contributors, 2026.\n\nSIL OPEN FONT LICENSE Version 1.1\n'+ '\n'.join('' if l.strip()=='.' else l[1:] if l.startswith(' ') else l for l in section.splitlines())
(root/'fonts'/'OFL.txt').write_text(license)
metadata={'name':'Siam Retro','version':2,'license':'OFL-1.1','copyright':'Copyright Google Inc./Google LLC; bitmap modifications RomTranslate contributors 2026.','source':'Renamed bitmap derivative of Noto Looped Thai Bold (16px), Noto Sans Bold / Symbols 2 (12px), with custom pixel layout and shadow rendering.','licenseText':license,'tileWidth':16,'tileHeight':24,'bodyHeight':9,'layout':{'lineHeight':28,'topPadding':5,'baseline':16,'toneOffsetWithAboveVowel':-4,'saraAmDecomposition':'ํา'},'description':'Looped, bold Thai pixel font prototype with a one-pixel shadow. Not installed in the ROM. Tiles use foreground palette index 1, shadow index 2; other pixels transparent.','glyphs':glyphs}
(root/'fonts'/'siam-retro.json').write_text(json.dumps(metadata,ensure_ascii=False,separators=(',',':')))
(root/'pixel-font.js').write_text('/* Siam Retro bitmap derivative. SIL OFL 1.1; full license in data().licenseText. */\nconst PixelFont=(()=>{\nconst FONT='+json.dumps(metadata,ensure_ascii=False,separators=(',',':'))+';\n'+(root/'scripts'/'pixel_renderer.js').read_text()+'\n})();\n')
print('Generated',len(glyphs),'glyphs')
