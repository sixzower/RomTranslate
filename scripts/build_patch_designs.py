"""Two complete patch-site designs sharing the verified local patch engine."""
from pathlib import Path
import json
R=Path(__file__).resolve().parent.parent
V=json.loads((R/'package.json').read_text())['version']
games=json.loads((R/'patch/catalog.json').read_text())['games']
arrow='<svg class="mini-arrow" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10V8h2V6h2V4H3V2h7v7H8V6H6v2H4v2Z"/></svg>'
ball='<svg class="brand-ball" viewBox="0 0 28 28" aria-hidden="true"><path fill="currentColor" d="M8 1h12v3h4v4h3v12h-3v4h-4v3H8v-3H4v-4H1V8h3V4h4Z"/><path fill="#e56f63" d="M8 5h12v3h3v4H5V8h3Z"/><path fill="#f5f2e8" d="M5 16h18v4h-3v3H8v-3H5Z"/><path fill="currentColor" d="M10 9h8v3h3v5h-3v3h-8v-3H7v-5h3Z"/><path fill="#f5f2e8" d="M12 12h4v4h-4Z"/></svg>'
upload='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M12 3h8v4h4v4h-6v10h-4V11H8V7h4ZM4 21h4v6h16v-6h4v10H4Z"/></svg>'
down='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2h4v9h4v3h-3v3H9v-3H6v-3h4ZM3 19h18v3H3Z"/></svg>'
def header(theme):
 other='collection' if theme=='handheld' else 'handheld'
 label='ไปห้องสะสม' if theme=='handheld' else 'ไปเครื่องเกม'
 return f'''<header class="site-header"><a class="brand" href="./" aria-label="LoongPlaeDo หน้าแรก">{ball}<span>LoongPlaeDo<small>THAI TRANSLATION PATCHER</small></span></a><nav aria-label="เมนูหลัก"><a href="#library">เลือกเกม</a><a class="active" href="#patcher">แพตช์เกม</a><a href="../{other}/">{label} {arrow}</a></nav><span class="header-credit">By LoongPlaeDo</span></header>'''
def cards(theme):
 result=[]
 for i,g in enumerate(games):
  selected=' is-selected' if i==0 else ''
  if theme=='handheld':
   content=f'''<span class="mini-cover world-{g['id']}"><span class="cover-name"><small>Pokémon</small><strong>{g['title']}</strong></span><span class="mini-badge">TH v.{g['version']}</span></span><span class="card-meta">0{i+1} <span>GAME BOY ADVANCE</span></span>'''
  else:
   content=f'''<span class="cartridge-case case-{g['id']}"><span class="case-ridges"></span><span class="case-art world-{g['id']}"><span class="case-title"><small>Pokémon</small><strong>{g['title']}</strong></span><span class="case-edition">THAI EDITION · v.{g['version']}</span></span><span class="case-contacts"></span></span><span class="wood-plaque">Pokémon<br><strong>{g['title']}</strong></span>'''
  result.append(f'''<button type="button" class="game-card{selected}" data-game="{g['id']}" aria-pressed="{'true' if i==0 else 'false'}" aria-label="เลือก Pokémon {g['title']}">{content}</button>''')
 return '\n'.join(result)
def drop():
 return f'''<label class="dropzone" id="dropzone" for="rom"><input type="file" id="rom" accept=".gba" aria-describedby="base-note status">{upload}<strong id="drop-title">วางไฟล์ ROM ตรงนี้</strong><span id="drop-description">หรือ <span class="file-link">เลือกไฟล์จากเครื่อง</span></span><small>.GBA · ประมวลผลบนเครื่องคุณ</small></label>'''
def action():
 return f'''<div class="status" id="status" data-kind="idle" role="status" aria-live="polite"><span id="status-icon" aria-hidden="true">○</span><span id="status-text">เลือกไฟล์เพื่อเริ่มตรวจสอบ</span></div><progress id="progress" hidden aria-label="ความคืบหน้าการรับแพตช์"></progress><button type="button" class="download-button" id="download" disabled>{down}<span id="download-label">เลือกไฟล์ ROM ก่อน</span></button><button type="button" id="cancel" class="cancel-button" hidden>ยกเลิก</button><p class="result" id="result" hidden></p><p class="privacy">ไฟล์เกมไม่ถูกอัปโหลดขึ้นเซิร์ฟเวอร์</p>'''
def summary():
 return '''<div class="selected-game"><strong id="selected-name">Pokémon Odyssey</strong><span id="selected-version">TH v.1.0</span></div><div class="base-note" id="base-note"><span>ใช้ ROM ต้นฉบับ</span><strong id="base-name">Odyssey v4.0.3</strong></div>'''
def patcher(theme):
 if theme=='handheld':
  body=f'''<ol class="step-track" aria-label="ขั้นตอนแพตช์"><li><b>1</b>เลือกเกม</li><li><b>2</b>เลือกไฟล์ ROM</li><li><b>3</b>ดาวน์โหลด GBA</li></ol>{summary()}{drop()}{action()}'''
 else:
  body=f'''<div class="patch-workflow"><div class="game-column"><h3><b>1</b>เลือกเกม</h3><div class="selected-thumbnail screen-art" aria-hidden="true"></div>{summary()}<a class="change-game" href="#library">เปลี่ยนตลับเกม ↑</a></div><div class="file-column"><h3><b>2</b>เลือกไฟล์ ROM</h3>{drop()}</div><div class="download-column"><h3><b>3</b>ดาวน์โหลด GBA</h3>{action()}</div></div>'''
 return f'''<section class="patcher" id="patcher" aria-labelledby="patch-title" aria-busy="false"><div class="patch-heading"><h2 id="patch-title">{ball}<span>{'แพตช์เกม' if theme=='handheld' else 'PATCH YOUR GAME'}</span></h2><span class="patch-note"><i></i> GBA ROM → THAI PATCH</span></div>{body}<div class="bps-row"><span>มีแอปแพตช์อยู่แล้ว?</span><a id="bps-link" aria-disabled="true">ดาวน์โหลด .BPS {arrow}</a></div><noscript><p>เปิด JavaScript ในเบราว์เซอร์เพื่อใช้ระบบแพตช์</p></noscript></section>'''
def help_section():
 return '''<section class="help" id="how" aria-labelledby="how-title"><h2 id="how-title">ก่อนออกเดินทาง</h2><details><summary>ต้องใช้ไฟล์ ROM แบบไหน?</summary><p>ใช้ ROM ของภาคและรุ่นที่ระบุในช่องแพตช์ ไม่ใช่ FireRed หรือ Emerald เปล่า ระบบตรวจข้อมูลจริงในไฟล์ ชื่อไฟล์ต่างกันได้ แต่เนื้อหาต้องตรงรุ่น หากเป็น ZIP ให้แตกเป็น .gba ก่อน</p><p>Azoth รองรับ English Beta7 และฉบับไทยรุ่น 011/012 สำหรับอัปเดตเป็น TH v.2.3</p></details><details><summary>เปิดเล่นกับเซฟเดิมอย่างไร?</summary><p>เก็บสำเนาไฟล์บันทึกเดิม เปิด ROM ที่ดาวน์โหลด แล้วโหลดเซฟในเกม อีมูเลเตอร์บางตัวต้องตั้งชื่อไฟล์เซฟให้ตรงกับ ROM หากกำลังตรวจการแก้ฟอนต์ ให้เริ่มใหม่หรือใช้เซฟในเกมแทน Save State รุ่นก่อน</p></details></section>'''
def footer(theme):
 return f'''<footer><a class="footer-brand" href="./">LoongPlaeDo</a><span>Thai translations · By LoongPlaeDo</span><span>เว็บ {V} · <a href="../../">เครื่องมือ ROM</a></span></footer>'''
def document(theme):
 if theme=='handheld':
  main=f'''<main class="console-layout"><aside class="library" id="library" aria-labelledby="library-title"><h2 id="library-title"><span aria-hidden="true">▦</span> เลือกเกม</h2><div class="game-list" id="games">{cards(theme)}</div><div class="hardware" aria-hidden="true"><div class="dpad"><i></i></div><span>LONG PLAY.<br>NEW ADVENTURE.</span><div class="speaker"><i></i><i></i><i></i></div></div></aside><div class="main-stage"><section class="lcd-panel" aria-label="เกมที่เลือก"><div class="lcd-chrome"><span>LOONGPLAEDO / ADVANCE</span><span class="power-dot">POWER <i></i></span></div><div class="screen-art"><div class="screen-logo"><span>THAI EDITION</span><h1 data-selected-title>Pokémon Odyssey</h1></div><span class="screen-credit">แพตช์ภาษาไทย<small>By LoongPlaeDo</small></span><span class="scanlines" aria-hidden="true"></span></div><div class="screen-caption"><div><strong data-selected-title>Pokémon Odyssey</strong><p data-selected-description>การผจญภัยครั้งใหม่ รออยู่ในตลับเดิม</p></div><span data-selected-version>TH v.1.0</span></div></section>{patcher(theme)}</div></main>{help_section()}'''
 else:
  leaves=''.join(f'<ellipse cx="{x}" cy="{y}" rx="10" ry="5" transform="rotate({a} {x} {y})"/>' for x,y,a in [(25,15,-20),(37,25,30),(12,40,-40),(45,48,20),(24,67,-40),(55,76,30),(71,20,-10),(79,41,25),(88,66,-30)])
  main=f'''<main><section class="collection-room" aria-label="ห้องสะสมเกม"><div class="room-intro"><span class="eyebrow">THAI TRANSLATION PATCHER</span><h1>Loong<span>PlaeDo</span></h1><p>เกมในความทรงจำ<br>พร้อมภาษาไทย<br>ให้คุณกลับมาเล่นอีกครั้ง</p><span class="intro-rule"></span><small>GBA ROM<br>THAI PATCH<br>BY LOONGPLAEDO</small></div><div class="shelf-stage" id="library"><h2 class="sr-only">เลือกตลับเกม</h2><svg class="ivy" viewBox="0 0 110 100" aria-hidden="true"><path d="M100 0Q26 12 34 95M70 0Q68 33 83 82" fill="none" stroke="#42583b" stroke-width="3"/><g fill="#445d3d">{leaves}</g></svg><div class="shelf-games" id="games">{cards(theme)}</div><div class="shelf-board" aria-hidden="true"></div><span class="shelf-label">THE GAME COLLECTION / 01—03</span></div></section>{patcher(theme)}<div class="room-landscape" aria-hidden="true"><span>TAKE YOUR TIME.<br>ENJOY THE ADVENTURE.</span></div>{help_section()}</main>'''
 return f'''<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="{'#e6e8ed' if theme=='handheld' else '#201a16'}"><meta name="description" content="LoongPlaeDo แพตช์ภาษาไทย Pokémon Odyssey, Glazed และ Azoth ทำงานบนเครื่อง ไม่อัปโหลด ROM"><title>LoongPlaeDo — {'Handheld OS' if theme=='handheld' else 'Game Collection'}</title><link rel="icon" href="../assets/club.svg" type="image/svg+xml"><link rel="stylesheet" href="../designs.css?v={V}"></head><body class="{theme}-theme" data-game="odyssey"><a class="skip" href="#patcher">ข้ามไปแพตช์เกม</a><div class="site-shell">{header(theme)}{main}{footer(theme)}</div><script src="../app.js?v={V}" defer></script></body></html>'''
for theme in ['handheld','collection']:
 d=R/'patch'/theme;d.mkdir(parents=True,exist_ok=True);(d/'index.html').write_text(document(theme))
(R/'patch/index.html').write_text('''<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LoongPlaeDo — เลือกบรรยากาศ</title><script>location.replace('handheld/'+location.hash);</script></head><body><h1>LoongPlaeDo</h1><p><a href="handheld/">เปิดหน้า Handheld OS</a> · <a href="collection/">เปิดหน้า Game Collection</a></p></body></html>''')
print('Built Handheld OS and Game Collection with shared local patch engine')
