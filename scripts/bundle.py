"""Create the downloadable single-file application on every update."""
from pathlib import Path
import re
root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
css = (root / 'style.css').read_text()
# Standalone downloads use local system fonts and do not require network access.
css = re.sub(r"@import url\([^;]+;\s*", '', css, count=1)
js = (root / 'app.js').read_text().replace('</script', '<\\/script')
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + css + '</style>')
for name in ('rom-core.js', 'pixel-font.js', 'app.js'):
    js = (root / name).read_text().replace('</script', '<\\/script')
    html = html.replace(f'<script src="{name}"></script>', '<script>' + js + '</script>')
out = Path('/workspace/artifacts/index.html')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html)
release = root / 'download' / 'index.html'
release.parent.mkdir(parents=True, exist_ok=True)
release.write_text(html)
print(out)
print(release)
