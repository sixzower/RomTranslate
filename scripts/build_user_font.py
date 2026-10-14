"""Bundle the user's bitmap font. No system font or legacy Thai font is used."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
data=json.loads((root/'fonts/thai_font_data.json').read_text())
assert data['glyphWidth']==8 and data['glyphHeight']==16
assert all(len(g['rows'])==16 and all(len(r)==8 and set(r)<={'0','1'} for r in g['rows']) for g in data['glyphs'])
raw=(root/'fonts/thai_font_4bpp.bin').read_bytes();expected=[]
for g in data['glyphs']:
 for top in [0,8]:
  for y in range(top,top+8):
   for x in range(0,8,2):expected.append(int(g['rows'][y][x])|(int(g['rows'][y][x+1])<<4))
assert raw==bytes(expected),'User JSON and 4bpp differ'
(root/'game-font.js').write_text('/* Default font supplied by the user. */\nconst GameFont=(()=>{let DATA='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n'+(root/'scripts/game_font_runtime.js').read_text()+'\n})();\nif(typeof module!=="undefined")module.exports=GameFont;\n')
(root/'pixel-font.js').write_text('/* User 8x16 bitmap font and original 4bpp export. */\nconst PixelFont=(()=>{let FONT='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';let TILES='+json.dumps(list(raw),separators=(',',':'))+';\n'+(root/'scripts/user_pixel_runtime.js').read_text()+'\n})();\n')
