"""Create the downloadable single-file application on every update."""
from pathlib import Path
import re, json
root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
version = json.loads((root / 'package.json').read_text())['version']
# Version local assets so deployed HTML cannot silently reuse an old app module.
html = re.sub(r'(src="(?!vendor/|coi-serviceworker)[^"?]+\.js)(?:\?[^"]*)?"', lambda m: m[1] + '?v=' + version + '"', html)
html = re.sub(r'href="style\.css(?:\?[^"]*)?"', 'href="style.css?v=' + version + '"', html)
(root / 'index.html').write_text(html)
css = (root / 'style.css').read_text()
# Standalone downloads use local system fonts and do not require network access.
css = re.sub(r"@import url\([^;]+;\s*", '', css, count=1)
js = (root / 'app.js').read_text().replace('</script', '<\\/script')
html = re.sub(r'<link rel="stylesheet" href="style\.css(?:\?[^"]*)?">', lambda _: '<style>' + css + '</style>', html)
for name in ('theme.js', 'vendor/exceljs.min.js', 'imperium-profile.js', 'game-font.js', 'rom-core.js', 'legacy-glyph-map.js', 'pixel-font.js', 'history.js', 'quality.js', 'xlsx-loader.js', 'sheet.js', 'bundled-fonts.js', 'font-presets.js', 'progress.js', 'translation-tasks.js', 'views.js', 'font-editor.js', 'sheet-batches.js', 'rom-patch.js', 'sheet-progress.js', 'ui-operations.js', 'app.js', 'patch-ui.js', 'font-cloud.js', 'workspace-schema.js', 'work-manager.js', 'ui-shell.js'):
    js = (root / name).read_text().replace('</script', '<\\/script')
    html = re.sub(r'<script src="' + re.escape(name) + r'(?:\?[^"]*)?"></script>', lambda _: '<script>' + js + '</script>', html)
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
