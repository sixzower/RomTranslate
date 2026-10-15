"""Create the downloadable single-file application on every update."""
from pathlib import Path
import re, json, base64, hashlib
from html import escape
root = Path(__file__).resolve().parent.parent
# Keep one-time admin SQL and its copyable browser version synchronized.
font_sql = (root / 'cloud/font-code-library.sql').read_text().split('-- Only SQL Editor/admin can create a vault;')[0]
admin_sql = '-- One-time shared admin setup. Preserves existing vaults, fonts and workspaces.\n' + font_sql + '\n' + (root / 'cloud/workspace-library.sql').read_text() + '\n' + (root / 'cloud/admin-library.sql').read_text()
(root / 'cloud/admin-setup.sql').write_text(admin_sql)
(root / 'admin-schema.js').write_text('/* One-time admin setup SQL; no plaintext password or private vault code. */\nconst AdminSchema=' + json.dumps(admin_sql, ensure_ascii=False) + ';\n')
(root / 'cloud/admin-link-upgrade.sql').write_text('-- Upgrade old-vault adoption; run once in the same Supabase SQL Editor. Preserves all existing data and the admin password.\n' + (root / 'cloud/admin-library.sql').read_text())
# Include only verified mappings, never the source ROM.
font_profiles = json.loads((root / 'fonts/hack-font-provenance.json').read_text())
quetzal = json.loads((root / 'fonts/quetzal-font-provenance.json').read_text())
font_profiles.append({'id':'quetzal-th-native','name':'Quetzal TH 1.0.3 — รูปต้นฉบับ','romSHA256':quetzal['sha256'],'graphicsBank':quetzal['bank'],'widthBank':'0x1daf600','count':1280,'nativeHeight':15,'mapping':{char:{'glyph':int(spec['glyph'],16),'region':spec.get('region'),'bank':quetzal['bank']} for char,spec in quetzal['extracted'].items()},'compositeMapping':{},'notes':'Native pixels, shadows and widths, without the adaptations or vertical shifts of the default font. Unmapped characters are not invented.'})
(root / 'rom-font-profiles.js').write_text('/* Verified source mappings only; no ROM bytes. */\nconst RomFontProfiles=' + json.dumps(font_profiles, ensure_ascii=False, separators=(',', ':')) + ';\nif(typeof module!=="undefined")module.exports=RomFontProfiles;\n')
html = (root / 'index.html').read_text()
version = json.loads((root / 'package.json').read_text())['version']
# Version local assets so deployed HTML cannot silently reuse an old app module.
html = re.sub(r'(src="(?!vendor/|coi-serviceworker)[^"?]+\.js)(?:\?[^"]*)?"', lambda m: m[1] + '?v=' + version + '"', html)
html = re.sub(r'href="style\.css(?:\?[^"]*)?"', 'href="style.css?v=' + version + '"', html)
(root / 'index.html').write_text(html)
css = (root / 'style.css').read_text()
prompt_font = (root / 'fonts/Prompt-Regular.ttf').read_bytes()
assert hashlib.sha256(prompt_font).hexdigest() == 'dbd497803cec3caffbc6b7f599ca6fed8beea0ed7e0ad1e098130c5ebbc4fd42', 'Prompt font checksum mismatch'
css = css.replace("url('fonts/Prompt-Regular.ttf')", "url('data:font/ttf;base64," + base64.b64encode(prompt_font).decode() + "')")
# Standalone downloads use local system fonts and do not require network access.
css = re.sub(r"@import url\([^;]+;\s*", '', css, count=1)
js = (root / 'app.js').read_text().replace('</script', '<\\/script')
html = re.sub(r'<link rel="stylesheet" href="style\.css(?:\?[^"]*)?">', lambda _: '<style>' + css + '</style>', html)
for name in ('theme.js', 'vendor/exceljs.min.js', 'imperium-profile.js', 'game-font.js', 'rom-core.js', 'legacy-glyph-map.js', 'pixel-font.js', 'history.js', 'quality.js', 'xlsx-loader.js', 'sheet.js', 'bundled-fonts.js', 'font-presets.js', 'progress.js', 'translation-tasks.js', 'views.js', 'font-editor.js', 'sheet-batches.js', 'rom-patch.js', 'sheet-import-batch.js', 'sheet-progress.js', 'ui-operations.js', 'app.js', 'patch-ui.js', 'cloud-config.js', 'admin-schema.js', 'font-cloud.js', 'workspace-schema.js', 'work-manager.js', 'rom-font-profiles.js', 'rom-font.js', 'rom-font-ui.js', 'ui-shell.js', 'row-selection.js', 'remaining-overview.js'):
    js = (root / name).read_text().replace('</script', '<\\/script')
    html = re.sub(r'<script src="' + re.escape(name) + r'(?:\?[^"]*)?"></script>', lambda _: '<script>' + js + '</script>', html)
html = html.replace('</body>', '<template id="prompt-font-license"><pre>' + escape('\n'.join(line.rstrip() for line in (root / 'fonts/Prompt-OFL.txt').read_text().splitlines())) + '</pre></template></body>')
html = re.sub(r'<script type="module" src="emulator\.js(?:\?[^"]*)?"></script>', lambda _: '<script>'+ (root / 'scripts' / 'offline_emulator.js').read_text() +'</script>', html)
html = html.replace('<script>window.coi={quiet:true};</script><script src="coi-serviceworker.js"></script>', '')
out = Path('/workspace/artifacts/index.html')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html)
release = root / 'download' / 'index.html'
release.parent.mkdir(parents=True, exist_ok=True)
release.write_text(html)
print(out)
print(release)
