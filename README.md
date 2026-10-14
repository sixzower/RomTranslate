# RomTranslate 0.14.1

Static Thai ROM translation workspace. The game stays on the user's device. Live site: https://sixzower.github.io/RomTranslate/ . The downloadable `download/index.html` supports local editing and Excel; threaded mGBA testing uses the live site.

## Default font

The default Thai font is the user's **Thai font 8x16 (Arabic digits)** from `files.zip`. Its original JSON, PNG atlas/preview and 4bpp bytes are in `fonts/`. `scripts/build_user_font.py` validates JSON against the supplied 4bpp and bundles browser modules. It needs only Python 3. No Noto/Siam Retro font assets, rendering code or generation dependencies remain.

Thai marks compose with the supplied base pixels. The game variant removes one vertical gap to fit its 15-pixel renderer; a 12-pixel variant fits the native small-font bank. Existing Latin game glyphs remain intact. Thai glyphs now default to **compact** spacing: trim the horizontal blank margin of the entire composed cluster (base plus marks), keep its internal alignment, and advance by the ink width plus one pixel of clearance. Narrow vowels consequently use less room. The same widths feed layout checks, browser previews and the native ROM width tables. **ระยะเดิม 8px** retains the original fixed advance and bitmap position. Both modes keep the source atlas/4bpp pixels intact; the render/ROM variant alone trims margins.

External font presets accept JSON using this same 8×16 schema: `name`, `glyphWidth: 8`, `glyphHeight: 16`, and `glyphs`, each with a unique `char` and 16 `rows` of eight binary digits. Optional `spacing` is `compact` (default) or `fixed`; invalid values are rejected. All 85 default characters are required; uploads are limited to 1 MB and 256 glyphs. **รูปแบบไฟล์ฟอนต์** opens details and downloads a template. PNG/BIN alone lack character mapping; extract JSON from ZIP, or convert TTF/OTF/WOFF to the template. Presets persist in this browser/device via IndexedDB. Project JSON and new translated ROM exports carry their active font snapshot for another device. The original 8x16 atlas/4bpp pixels are retained unchanged. JSON exports additionally carry the selected `spacing` mode. No license was declared in the user archive; do not invent one.

`legacy-glyph-map.js` contains read-only fingerprints and Unicode candidates for decoding previous web exports. It contains no old bitmap pixels and is never used to render the default font. Ambiguous legacy glyphs are reported for manual review.

## Font design room

**ห้องออกแบบฟอนต์** works before opening any ROM. Choose a glyph from the searchable character library and draw on the 8×16 grid with mouse, touch or keyboard. Pencil/eraser, right-click erase, continuous drag interpolation, row/column shifting, horizontal flip, glyph copy/paste, clear and restore are supported. Each stroke is one undo transaction; undo/redo retains at most 40 full snapshots within 2 MB per session.

The room edits a separate draft. Its sample and glyph previews show the raw bitmap and the native 15px/12px adaptation without changing the active font. Combining marks use a base consonant for native single-glyph previews; invalid mark placement or bounds show a message. The game keeps native Latin digits and spaces; those draft glyphs can be exported, while only Thai clusters are installed in ROMs.

Draft font, starting reference, saved reference, character selection and sample persist in this browser's localStorage, independently of a ROM. Export JSON, transparent PNG atlas and matching top/bottom GBA 4bpp BIN without applying the draft. **บันทึกเป็น preset และใช้ฟอนต์นี้** validates and applies it via the existing preset system; project and ROM exports then include that font. The font modal applies spacing immediately through presets; the studio spacing control edits the draft until it is saved. Download JSON backups because clearing browser data deletes local drafts/presets. Switching to the room pauses emulator execution and releases held game keys/speed boost.

## Categories and limits

The original Pokémon Imperium v1.3.1 must have SHA-256:

`79bfd6266f7980452c864a20ffe47783b8bb91ec9957174ed416b77d3facb3a0`

The current scan finds 25,719 entries:

| Category | Entries |
| --- | ---: |
| Dialogue | 4,425 |
| Menu | 205 |
| Items: names / descriptions / plural names | 1,843 |
| Moves: names / descriptions | 1,763 |
| Abilities: names / descriptions | 654 |
| Pokémon names / Pokédex group labels / descriptions | 4,143 |
| Trainer names / classes | 925 |
| Unclassified candidates | 11,761 |

Pokémon includes 1,434 names, 1,434 Pokédex group labels and 1,275 unique descriptions; shared description owners are retained. Additional verified menu labels include Money, HP, PP, Type and battle stats. **ตรวจหมวดหมู่** shows category totals and unclassified samples; those candidates are not all confirmed game strings and remain excluded from translation exports/builds.

Trainer names include 859 populated records and 66 class labels. One empty record is skipped. Item names are already present: **ไอเท็ม / ชื่อ**, with a dedicated shortcut for its 858 names. Family tabs and subcategory dropdowns allow precise exports. Main-menu Bag is `$DF17EC`; Time is `$DF1844`.

Names are inline fields, not unlimited text: Pokémon names use a 13-byte field, trainer names a conservative 12-byte writable range, trainer classes 16 bytes, item singular names 20 and plural names 22, ability names 19. Font controls and the terminating byte count toward those limits. Some Thai names must be shortened. Adjacent stats, party data, item effects and prices are preserved. NPC dialogue names are also present in dialogue text; not every separate name system in the hack has been identified.

Pointer text relocates into a verified 3 MB blank region. The builder checks the original SHA, source, ordered special tokens, pointer values, bytes and conservative screen bounds. 724 native empty glyph slots are available across four font banks, with image deduplication; this is a finite capacity. Occupied glyphs and reserved extra-symbol codes are preserved. Dialogue wraps at 208 px with scrolling; descriptions have conservative pixel/line limits. Text variables and original callers still need game review.

## Excel / AI workflow

1. Choose a category and filters, then **ส่งออก Excel** for a single start/count, explicit inclusive ranges such as `1-200, 201-400`, automatic batches of 200 (editable), or all filtered verified rows in one file.
2. The filename includes the selected category. The workbook includes a Thai category-summary tab, `Instructions`, `Glossary` and the import-compatible `Translations` sheet.
3. Copy the complete Thai AI prompt from `Instructions`, attach the XLSX to an assistant that can edit Excel files, and ask it to fill only `translation`. The shared dialogue rules cover game setting and emotion, confirmed speaker age/gender/relationships, neutral pronouns when context is unknown, glossary consistency, intact tokens/IDs/source (including literal `\n` and placeholders), byte/pixel/line limits, real XLSX output and honest handling of ambiguous/oversized batches. Set the game context/genre in Settings; both the per-entry prompt and Excel Instructions use it.
4. Import the returned XLSX. IDs + offsets + source + original SHA match rows even after reordering. Formulas, duplicates, identity/token errors and byte/pixel overflow are reported. Errors block application. Download the Issues workbook to request corrections.
5. Build and play the translated ROM. AI output is not automatically proof of in-game correctness.

Each explicit range is a separate workbook; multiple workbooks download as one UTF-8 ZIP with `batch-index.json`. Single-workbook exports download directly as XLSX. Filenames include category and padded start/end positions; each Instructions sheet and AI prompt identifies its batch, range and scope total. The manifest lists immutable entry IDs for each file. IDs are not replaced with batch positions, so translated files can be imported one at a time, even with reordered rows.

Batch positions start at 1 within the filtered **verified** entry list, excluding the spreadsheet header. Overlapping/repeated ranges, invalid bounds and more than 200 files per request are rejected. Automatic splitting includes the final short batch. Export freezes the row list, source, translation and prompt metadata when its dialog opens, so batches from that request cannot shift or overlap while workbooks are generated. Cancel stops before download and produces no partial archive. A ZIP uses stored entries because XLSX workbooks are already compressed; no new runtime dependency is needed.

If filtering by **ยังไม่แปล**, reopening the dialog after importing translations creates a new filtered list with new positions. Download all desired batches together from one snapshot when allocating separate AI jobs. Splitting makes each AI request smaller; it does not guarantee correct translation. Unclassified candidates remain excluded.

Category tabs and the category/subcategory dropdown show completed final-translation counts, and the active category has a completed/total summary. Counts use canonical verified text entries rather than linguistic word segmentation; AI drafts, English copies and code-only entries do not increment them. The displayed category total remains its actual row count, so it can include a code-only entry excluded from the progress denominator.

The list compares wrapped English source with an editable Thai column. Click the English text (or focus it and press Enter/Space) to copy the complete canonical source, including control codes and newlines, and select its row. Editing there selects that row, synchronizes the main editor/preview, updates counts/status/progress and uses the same autosave, history, XLSX/project and ROM paths as the main editor. Multiline typing keeps focus; filtering is refreshed after leaving the inline editor so a row does not disappear during typing. Unverified candidate cells are disabled. Tables scroll within the left pane on narrow layouts and the existing separator can widen the list.

Status labels have red/green text with no colored badge background; selected rows and Day/Dark modes have readable variants. The bottom font preview/status panels can be dragged vertically or collapsed, with persisted local sizes. Drag the separator between the text list and editor horizontally to resize the left column; arrow keys also work. Narrow screens stack the columns.

In the active running game tester, hold Space to double the selected speed (1× → 2×, 4× → 8×). Release Space, switch tabs or leave the window to restore the selected speed. Text inputs and dialogs do not activate the shortcut.

## Translation progress

A compact progress bar appears after loading a ROM. **เลือกส่วนที่จะแปล / ดูงานที่เหลือ** selects whole families or individual subcategories and shows completed/total/remaining counts; **ดูที่เหลือ** opens the corresponding unfinished rows. The target affects progress only and does not delete translations or alter normal Excel export filters. Empty selection shows 0%, not 100%.

Progress is actual final translation entries divided by eligible canonical entries in selected categories. AI drafts, blank text, source-identical text, changes to control codes alone, code-only sources and unverified candidates do not count. Shared pointers and reimporting the same spreadsheet do not multiply completed work. It updates after typing, using an AI draft, Excel/project import, undo/redo, checkpoint restore and ROM recovery. Completion measures filled translations, not linguistic quality or passing build validation.

The supplied ROM has 13,957 eligible work entries; the menu target has 204. Its displayed menu list still contains 205 entries because one is a player-name variable with no literal text to translate. The target persists in project JSON, browser autosave and newly built ROM recovery data; older exports default to all eligible categories.

Control-prefixed text is translated without changing its codes: `{CTRL:01 06}{CTRL:03 07}Auto Run` becomes `{CTRL:01 06}{CTRL:03 07}วิ่งอัตโนมัติ`. Keep separate rows when codes differ, even for the same visible words. Instructions and the shared web/Excel AI prompt include this example; imports reject lost/changed/reordered codes. Sources with codes alone stay unchanged or have blank translation.

## Review workflow and navigation

**ตรวจรูปแบบ** checks tokens, encoded bytes, pixel/line bounds, font capacity and glossary consistency; it does not certify meaning. **จุดที่ต้องแก้ถัดไป** refreshes the audit and cycles through unique error entries first (then warnings), selecting the correct category/page and clearing filters that would hide the target.

**ตรวจแล้ว / ยืนยันชุด** confirms user review of inclusive ranges such as `1-200`, or all current filtered verified entries. Blank/code-only sources are skipped; rows with automatic errors are excluded and counted in the dialog. A single-entry confirmation is also available. Review is optional: it does not block ROM export or change the translation percentage. Tabs, dropdowns, list rows and the progress summary separately report translated and user-reviewed work. **ยังไม่ตรวจ** filters translated entries needing user review.

Review stamps bind to source/translation/speaker plus font pixels/spacing, glossary and effective game genre using a content checksum (not a security signature). Changing final text or speaker clears only that entry's stamp through the same history transaction; undo/checkpoint restore can restore it. Changing font/terminology/context makes old stamps stale until their original context is restored or the user rechecks them. AI draft edits do not invalidate final-text review. JSON, IndexedDB and new ROM recovery data preserve stamps; old projects/ROMs start unreviewed. XLSX imports clear review only for actually changed final text/speaker and never let AI mark rows reviewed.

The duplicate name shortcut buttons were removed; exact name/description subcategories remain in the category dropdown. **เครื่องมือ** groups font presets, glossary, category coverage and AI settings. AI literal/context panels collapse and persist their open state, leaving more room for source/Thai comparison. Existing quill/theme, font design room, emulator, history and Excel batch features remain available.

## Open a translated test ROM

Version 0.7.0 and newer outputs include compressed recovery data in verified free ROM space: translations, speaker labels, glossary and original bytes overwritten outside the free pool. Opening that `.gba` directly restores the exact original buffer, verifies its SHA, and shows canonical English source with Thai translations. Build again from the restored original, so editing does not stack patches. The output remains 32 MB and contains no API keys. Recovery data uses spare pool space and can fail with a clear error if space is exhausted. It is not an emulator savestate. Version 0.8.0 additionally preserves the active font and game-context setting; version 0.9.0 also preserves the selected progress categories. Version 0.13.0 stores spacing in the font snapshot. Older ROM snapshots without spacing reopen as fixed 8px to match their binary; choose compact in the font modal and rebuild to change the actual game. Old project/preset JSON without spacing adopts the new compact default.

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
node tests/progress-controls.cjs /path/to/original.gba
node tests/font-editor.cjs /path/to/original.gba
node tests/sheet-batches.cjs /path/to/original.gba
node tests/inline-translation.cjs /path/to/original.gba
node tests/font-spacing.cjs /path/to/original.gba
node tests/review.cjs /path/to/original.gba
```

Browser tests use cloud Playwright/Chromium and an internal server on port 5175. Run sheet tests first for workbook fixtures. `tests/browser.cjs` checks the standalone release; `tests/workflow.cjs` builds and plays Thai in mGBA; `tests/recovery-browser.cjs` exercises new ROM reopening, edits, category export naming, name tabs and legacy pairing. The recovery-browser legacy fixture is the earlier menu test output, so retain it outside the repository before generating a new menu-coverage output.

The managed cloud Chromium blocks navigation to `file://` URLs with `ERR_BLOCKED_BY_ADMINISTRATOR`; the standalone font studio is functionally tested through the internal HTTP server. Direct local-file opening is not verified in that browser.

Version 0.14.0 additionally plays a translated test ROM from a new game into the house, opens the actual field menu (Thai Bag/Save/Exit/Time) and the actual bag with empty inventory. Evidence and precise coverage are in `proofs/real-screen-checks.json`. Items and Close Bag were observed as unclassified labels and their three canonical pointer entries are now verified menu export targets. This does not certify every item name/description, battle, summary or Pokédex screen.

A full playthrough, every battle/summary caller and every long localized name are not verified. Screenshots of item/move/ability labels in diagnostic intro scenes check the native printer, not those original menu callers. Native headless tooling remains outside application dependencies. Never commit ROMs, saves or credentials.

Version 0.14.1 adds optional 1px font shadows (down-right, down-left, down or right) in the font studio. Shadows are applied after composing Thai marks and encoded as native palette index 2; game screens choose the actual shadow color. Drafts, presets, JSON and ROM recovery preserve the direction. PNG/BIN exports remain the original monochrome 8×16 source shapes; keep JSON with them. Shadows are clipped at the native 12/15px vertical boundary and their horizontal bounds are included in character advance.
