#!/usr/bin/env python3
"""Build a private QA sidecar from a Sixz translation build; never publishes a ROM.
Usage: python3 scripts/qa-manifest.py BUILD_DIRECTORY OUTPUT.qa-manifest.json
"""
import collections
import hashlib
import json
import pathlib
import sys


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build(directory):
    directory = pathlib.Path(directory)
    project = json.loads((directory / 'project.json').read_text())
    matches = [p for p in directory.glob('*.gba') if digest(p.read_bytes()) == project['outputSHA256']]
    if len(matches) != 1:
        raise ValueError('Expected exactly one ROM matching project.outputSHA256')
    rom = matches[0].read_bytes()
    translations = json.loads((directory / 'translations.json').read_text())
    entries = {}
    for row in translations:
        offset, length = row['outputOffset'], row['encodedBytes']
        if offset < 0 or offset + length > len(rom) or rom[offset + length - 1] != 255:
            raise ValueError(f'Invalid text extent: {row}')
        key = (offset, length)
        if key not in entries:
            entries[key] = {'id': f'TEXT-{offset:07X}', 'offset': offset, 'length': length,
                            'sha256': digest(rom[offset:offset + length]),
                            'source': row['source'], 'translation': row['translation'],
                            'kind': row['kind'], 'sites': []}
            if row.get('layout'):
                entries[key]['layout'] = row['layout']
        entry = entries[key]
        if entry['source'] != row['source'] or entry['translation'] != row['translation']:
            raise ValueError('Conflicting translations at same output position')
        site = row['site']
        if int.from_bytes(rom[site:site + 4], 'little') != 0x08000000 + offset:
            raise ValueError(f'Pointer does not target declared text: {site:X}')
        if site not in entry['sites']:
            entry['sites'].append(site)
    slots = json.loads((directory / 'font-slots.json').read_text())
    regions = []
    for name, field, length in [('Sixz primary pixels', 'glyphBank', 512 * 64),
                                ('Sixz primary advances', 'widthBank', 512),
                                ('Sixz secondary pixels', 'secondaryGlyphBank', 512 * 64),
                                ('Sixz secondary advances', 'secondaryWidthBank', 512)]:
        offset = slots[field]
        regions.append({'name': name, 'offset': offset, 'length': length,
                        'sha256': digest(rom[offset:offset + length])})
    glyphs = json.loads((directory / 'rendered-glyphs.json').read_text())
    return {'format': 'sixz-translation-manifest/v1', 'game': project['game'],
            'profile': 'Odyssey 4.0.3 / FireRed / Sixz', 'build': project['version'],
            'romSHA256': project['outputSHA256'], 'sourceSHA256': project['sourceSHA256'],
            'fontName': project['approvedFontName'] + ' · 8×16',
            'coverageNote': project['coverage'], 'fontRegions': regions,
            'glyphs': [{k: g[k] for k in ['cluster', 'width', 'pixels']} for g in glyphs],
            'entries': list(entries.values())}


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    result = build(sys.argv[1])
    target = pathlib.Path(sys.argv[2])
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')))
    print(f'{len(result["entries"])} text blocks, {sum(len(r["sites"]) for r in result["entries"])} references, {target.stat().st_size} bytes -> {target}')
