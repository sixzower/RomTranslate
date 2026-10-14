"""Create compact licensed Thai bitmap data for Emerald's 16x16 glyph engine."""
from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFont
from fontTools.ttLib import TTFont
root=Path(__file__).resolve().parent.parent
src=Path('/usr/share/fonts/truetype/noto/NotoLoopedThai-Bold.ttf');font=ImageFont.truetype(str(src),12,layout_engine=ImageFont.Layout.BASIC)
ft=TTFont(src);cmap=ft.getBestCmap();scale=12/ft['head'].unitsPerEm;anchors={};marks={}
for lookup in ft['GPOS'].table.LookupList.Lookup:
 if lookup.LookupType!=4:continue
 for sub in lookup.SubTable:
  for name,record in zip(sub.BaseCoverage.glyphs,sub.BaseArray.BaseRecord):anchors[name]=[{'x':round(a.XCoordinate*scale),'y':round(a.YCoordinate*scale)}if a else None for a in record.BaseAnchor]
  for name,record in zip(sub.MarkCoverage.glyphs,sub.MarkArray.MarkRecord):marks[name]={'class':record.Class,'x':round(record.MarkAnchor.XCoordinate*scale),'y':round(record.MarkAnchor.YCoordinate*scale)}
glyphs={}
for cp in range(0xe01,0xe5c):
 if cp not in cmap or cp==0xe33:continue
 c=chr(cp);im=Image.new('L',(16,18));ImageDraw.Draw(im).text((0,12),c,font=font,fill=255,anchor='ls');rows=[sum(1<<(15-x)for x in range(16)if im.getpixel((x,y))>=110)for y in range(18)];name=cmap[cp];mark=marks.get(name)
 glyphs[c]={'rows':rows,'width':round(font.getlength(c))+1 if not mark else 0,'mark':bool(mark),'anchors':anchors.get(name,[]),'markAnchor':mark}
data={'name':'Siam Retro GBA','license':'OFL-1.1','licenseText':(root/'fonts/OFL.txt').read_text(),'nativeHeight':18,'renderHeight':15,'glyphs':glyphs}
(root/'game-font.js').write_text('/* Compact Siam Retro GBA bitmap derivative; SIL OFL 1.1. */\nconst GameFont=(()=>{const DATA='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n'+(root/'scripts/game_font_runtime.js').read_text()+'\n})();\nif(typeof module!=="undefined")module.exports=GameFont;\n')
