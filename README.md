# RomTranslate

Thai ROM translation workspace matching the user's desktop reference, distributed as a single downloadable `index.html` after every update.

## Run and bundle

Node.js and Python 3 are required for development. No application dependencies.

```sh
cd /workspace/RomTranslate
npm run check
npm run bundle
npm run dev
```

`npm run bundle` produces `/workspace/artifacts/index.html` with all scripts/styles embedded and no remote font requests. Generate this single-file release after every update as requested; the build also saves `download/index.html` in the repository for download through GitHub. Codex Web in this session cannot expose workspace paths as downloadable attachments; do not present local file links as downloads. See PUBLISHING.md for the prepared GitHub Pages path, which requires source publication and user settings before a live site can be verified. The Python server on port 5173 is for development only. Direct file opening is intended, but the cloud Chromium policy blocks `file://`, so browser validation uses HTTP. Browser storage / clipboard support varies on local files; JSON export remains available.

## Actual supported workflow

The workspace is empty until a ROM is opened; no sample game or translation is preloaded. The title uses the ROM filename. Day/dark mode persists locally. Opening a matching BPEE ROM scans pointer-referenced, uncompressed English Gen III strings. Dialogue candidates with the `loadword 0; callstd` script pattern are separated from other candidates. This is a heuristic, not a complete extraction of every string or proof each candidate is used by the game. Compressed, custom-encoded and short strings may be omitted.

Search, field/category/status filters, nearby entries, pagination, navigation, speaker context, glossary, editable AI drafts, copy/apply buttons, JSON import/export and IndexedDB autosave are implemented. Projects are bound to the original ROM SHA-256. Reopening the same ROM restores translations. Loading a project before the ROM stages it until the matching ROM is opened. ROM data and AI credentials are not saved in project JSON. Old sample-project format v1 is intentionally unsupported in this release.

## ROM writing limits

`rom-core.js` uses the English character map documented by [pret/pokeemerald](https://github.com/pret/pokeemerald/blob/master/charmap.txt). Build writes translated strings in place to a copy, retains original size, requires the original source and exact ordered control tokens, and rejects longer text, unsupported glyphs, non-script candidates, overlaps and pointer targets inside strings. The uploaded Pokémon Imperium v1.3.1 was used for tests: 19,962 non-overlapping candidates, 4,356 with script-pointer patterns. Every candidate round-trips through the codec to its original bytes.

A browser-exported English test at offset `$28B434` changed exactly 32 bytes, all within the original 35-byte string. Emulator gameplay has not been tested. This is experimental in-place English patching, not a confirmed playable Thai ROM generator. Thai writes are blocked because the ROM does not yet have the Thai encoding/font renderer. Do not bypass the rejection or write UTF-8 into the ROM.

## Thai pixel font

`pixel-font.js` contains the OFL-1.1 **Siam Retro** bitmap prototype, 16×24 glyph cells, a renamed bitmap derivative of Noto Looped Thai Bold, with Thai consonants, vowels and tone marks. Preview overlays combining glyphs and decomposes sara am. PNG atlas, glyph JSON and GBA 4bpp tiles can be exported. Latin glyphs are embedded bitmap data too. The preview uses bold looped Thai shapes with a one-pixel dark shadow. Source font license and copyright are included in JSON and `fonts/OFL.txt`. `scripts/build_pixel_font.py` regenerates the font from the system Noto Looped Thai Bold font using Pillow/fontTools. The bitmap is not injected into the game. Production integration needs a game-specific glyph mapping, Thai mark layout, line breaking and ROM renderer changes.

## AI

Settings accepts an HTTPS OpenAI-compatible base URL, model and API key. Keys remain in memory for this session only. Requests send selected/context text and glossary, never the ROM, to the configured service. The service must support browser CORS. Literal/context buttons perform Chat Completions requests when configured; without credentials they open a copyable prompt for an external assistant. Auto-translate operates only with configured credentials. Success and HTTP error paths were tested with mocked responses. No real paid API was called; provider credentials are still needed for live AI.

## Validation

```sh
node tests/rom.test.cjs '/path/to/pokemon Imperium (v1.3.1).gba'
```

This fixture-specific test verifies all extracted codec round trips, a bounded English patch, and rejection of Thai, overlength, changed source, changed control codes and interior pointers. The ROM is not included in this repository.

`tests/browser.cjs` uses the cloud-provided Playwright and `/usr/bin/chromium`. Serve the bundle from `/workspace/artifacts` on port 5174, then run it with the ROM path. It validates actual upload/download, SHA-bound projects, persistence, themes, controls, mock AI responses/errors, and font exports. This development test setup is optional and not a dependency of the downloadable web application.
