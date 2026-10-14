# RomTranslate 0.8.0

Static Thai ROM translation workspace. The game stays on the user's device. Live site: https://sixzower.github.io/RomTranslate/ . The downloadable `download/index.html` supports local editing and Excel; threaded mGBA testing uses the live site.

## Default font

The default Thai font is the user's **Thai font 8x16 (Arabic digits)** from `files.zip`. Its original JSON, PNG atlas/preview and 4bpp bytes are in `fonts/`. `scripts/build_user_font.py` validates JSON against the supplied 4bpp and bundles browser modules. It needs only Python 3. No Noto/Siam Retro font assets, rendering code or generation dependencies remain.

Thai marks compose with the supplied base pixels. The game variant removes one vertical gap to fit its 15-pixel renderer; a 12-pixel variant fits the native small-font bank. Existing Latin game glyphs remain intact. Native Thai glyphs have an 8-pixel advance.

External font presets accept JSON using this same 8×16 schema: `name`, `glyphWidth: 8`, `glyphHeight: 16`, and `glyphs`, each with a unique `char` and 16 `rows` of eight binary digits. All 85 default characters are required; uploads are limited to 1 MB and 256 glyphs. **รูปแบบไฟล์ฟอนต์** opens details and downloads a template. PNG/BIN alone lack character mapping; extract JSON from ZIP, or convert TTF/OTF/WOFF to the template. Presets persist in this browser/device via IndexedDB. Project JSON and new translated ROM exports carry their active font snapshot for another device. The original 8x16 atlas/data/4bpp exports are retained unchanged. No license was declared in the user archive; do not invent one.

`legacy-glyph-map.js` contains read-only fingerprints and Unicode candidates for decoding previous web exports. It contains no old bitmap pixels and is never used to render the default font. Ambiguous legacy glyphs are reported for manual review.

## Categories and limits

The original Pokémon Imperium v1.3.1 must have SHA-256:

`79bfd6266f7980452c864a20ffe47783b8bb91ec9957174ed416b77d3facb3a0`

The current scan finds 25,719 entries:

| Category | Entries |
| --- | ---: |
| Dialogue | 4,425 |
| Menu | 202 |
| Items: names / descriptions / plural names | 1,843 |
| Moves: names / descriptions | 1,763 |
| Abilities: names / descriptions | 654 |
| Pokémon names / Pokédex group labels / descriptions | 4,143 |
| Trainer names / classes | 925 |
| Unclassified candidates | 11,764 |

Pokémon includes 1,434 names, 1,434 Pokédex group labels and 1,275 unique descriptions; shared description owners are retained. Additional verified menu labels include Money, HP, PP, Type and battle stats. **ตรวจหมวดหมู่** shows category totals and unclassified samples; those candidates are not all confirmed game strings and remain excluded from translation exports/builds.

Trainer names include 859 populated records and 66 class labels. One empty record is skipped. Item names are already present: **ไอเท็ม / ชื่อ**, with a dedicated shortcut for its 858 names. Family tabs and subcategory dropdowns allow precise exports. Main-menu Bag is `$DF17EC`; Time is `$DF1844`.

Names are inline fields, not unlimited text: Pokémon names use a 13-byte field, trainer names a conservative 12-byte writable range, trainer classes 16 bytes, item singular names 20 and plural names 22, ability names 19. Font controls and the terminating byte count toward those limits. Some Thai names must be shortened. Adjacent stats, party data, item effects and prices are preserved. NPC dialogue names are also present in dialogue text; not every separate name system in the hack has been identified.

Pointer text relocates into a verified 3 MB blank region. The builder checks the original SHA, source, ordered special tokens, pointer values, bytes and conservative screen bounds. 724 native empty glyph slots are available across four font banks, with image deduplication; this is a finite capacity. Occupied glyphs and reserved extra-symbol codes are preserved. Dialogue wraps at 208 px with scrolling; descriptions have conservative pixel/line limits. Text variables and original callers still need game review.

## Excel / AI workflow

1. Choose a category and filters, then **ส่งออก Excel** for a range or all filtered verified rows.
2. The filename includes the selected category. The workbook includes a Thai category-summary tab, `Instructions`, `Glossary` and the import-compatible `Translations` sheet.
3. Copy the complete Thai AI prompt from `Instructions`, attach the XLSX to an assistant that can edit Excel files, and ask it to fill only `translation`. The shared dialogue rules cover game setting and emotion, confirmed speaker age/gender/relationships, neutral pronouns when context is unknown, glossary consistency, intact tokens/IDs/source (including literal `\n` and placeholders), byte/pixel/line limits, real XLSX output and honest handling of ambiguous/oversized batches. Set the game context/genre in Settings; both the per-entry prompt and Excel Instructions use it.
4. Import the returned XLSX. IDs + offsets + source + original SHA match rows even after reordering. Formulas, duplicates, identity/token errors and byte/pixel overflow are reported. Errors block application. Download the Issues workbook to request corrections.
5. Build and play the translated ROM. AI output is not automatically proof of in-game correctness.

Status labels have red/green text with no colored badge background; selected rows and Day/Dark modes have readable variants. The bottom font preview/status panels can be dragged vertically or collapsed, with persisted local sizes. Drag the separator between the text list and editor horizontally to resize the left column; arrow keys also work. Narrow screens stack the columns.

In the active running game tester, hold Space to double the selected speed (1× → 2×, 4× → 8×). Release Space, switch tabs or leave the window to restore the selected speed. Text inputs and dialogs do not activate the shortcut.

## Open a translated test ROM

Version 0.7.0 and newer outputs include compressed recovery data in verified free ROM space: translations, speaker labels, glossary and original bytes overwritten outside the free pool. Opening that `.gba` directly restores the exact original buffer, verifies its SHA, and shows canonical English source with Thai translations. Build again from the restored original, so editing does not stack patches. The output remains 32 MB and contains no API keys. Recovery data uses spare pool space and can fail with a clear error if space is exhausted. It is not an emulator savestate. Version 0.8.0 additionally preserves the active font and game-context setting.

Legacy 0.5/0.6 test files lack this recovery data. If the original is already open, the website can pair it with the test ROM. Otherwise it asks for the exact original `.gba`. Glyph fingerprints read Thai back from changed inline fields/relocated pointers; a saved project helps resolve ambiguous shapes. Unknown/ambiguous glyphs and token mismatches are reported under **ข้อมูล ROM**. Review these drafts before rebuilding. Keep the original and JSON project as backups; an old binary alone cannot always recover the intended spelling from identical glyph images.

**ย้อนคืน / ทำซ้ำ / ประวัติ / จุดสำรอง** retain up to 60 transactions and 8 checkpoints within 4 MB. Excel/project imports create checkpoints. JSON and IndexedDB preserve history; import JSON before opening the matching original on another device to recover it. Browser API settings support HTTPS OpenAI-compatible Chat Completions with CORS; keys stay in memory and are not exported. Live credentials are not supplied; API paths use mocks in tests.

## Development and tests

Runtime libraries are vendored, with license/integrity records in `vendor/`. Node.js and Python 3 suffice; no npm install is needed.

```sh
npm run check
npm run bundle
npm run dev
```

Bundle refreshes both `/workspace/artifacts/index.html` and `download/index.html` on every update. For Codex Web, deliver the GitHub Download raw file link; workspace paths and cloud localhost are not user-accessible downloads. See PUBLISHING.md.

The ROM is not distributed. Pass the original file path:

```sh
node tests/imperium.test.cjs /path/to/original.gba
node tests/sheet.test.cjs /path/to/original.gba
node tests/recovery-names-font.cjs /path/to/original.gba
node tests/quality-history.cjs /path/to/original.gba
node tests/presets-layout-prompt.cjs /path/to/original.gba
```

Browser tests use cloud Playwright/Chromium and an internal server on port 5175. Run sheet tests first for workbook fixtures. `tests/browser.cjs` checks the standalone release; `tests/workflow.cjs` builds and plays Thai in mGBA; `tests/recovery-browser.cjs` exercises new ROM reopening, edits, category export naming, name tabs and legacy pairing. The recovery-browser legacy fixture is the earlier menu test output, so retain it outside the repository before generating a new menu-coverage output.

A full playthrough, every battle/summary caller and every long localized name are not verified. Screenshots of item/move/ability labels in diagnostic intro scenes check the native printer, not those original menu callers. Native headless tooling remains outside application dependencies. Never commit ROMs, saves or credentials.
