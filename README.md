# RomTranslate 0.5.0

Thai ROM translation workspace based on the user's desktop reference. Static, local processing: the game is not uploaded to a server.

## Use the website

Open https://sixzower.github.io/RomTranslate/ and select the original Pokémon Imperium v1.3.1 ROM. A first automatic reload prepares the browser game tester. The workspace starts empty; its title is the uploaded filename.

Choose **บทสนทนา / เมนู / ไอเท็ม / ท่า / ความสามารถ**. Each category can be narrowed to names, descriptions or plural item names. Search/status filters and pagination are available. The count shows filtered results / all scanned results so different filters are not confused with different ROM contents.

### Translate a category using Excel and an external AI

1. Choose a category and optional search/status filter.
2. Click **ส่งออก Excel**. Choose a starting row and batch size, or export all filtered rows. Nearby-context expansion and unverified scan candidates are excluded.
3. Give the `.xlsx` to your assistant. Ask it to change only `translation`, retaining `rom_sha256`, `entry_id`, `rom_offset`, `source` and all special tokens. Instructions are also inside the workbook. Smaller batches help with the external AI's context/output limits.
4. Import the returned `.xlsx` with **นำเข้าคำแปล Excel**. Review the changes, then apply them. Reordered rows are matched by ID + offset + source + original ROM SHA-256, not row position. Source/hash/token changes, formulas and duplicate IDs/headers are rejected before any changes are applied. Blank translations preserve existing work.
5. Names have byte limits shown in `max_bytes`; oversized drafts can be imported but must be shortened before building. The import preview warns about estimated overflow.

IndexedDB autosave and version-2 JSON project export/import retain translations. Reopen the original ROM to resume. Game data and API keys are not included in project JSON or Excel exports.

### Build and test the ROM

**สร้าง ROM ทดสอบ** writes an independent 32 MB copy. **ทดสอบเล่น GBA → สร้างและเล่น ROM ที่แปล** builds and opens it directly. An existing translated `.gba` can also be opened in the tester. Pause/resume, reset, speed selection, mute/unmute, touch controls, fullscreen, and `.sav` export/import are provided. Keyboard arrows move; Z=A, X=B, Enter=Start, Shift=Select, A/S=L/R. Emulator arrows do not move the translation editor's selection.

The tester uses vendored `@thenick775/mgba-wasm` 2.5.1 (MPL-2.0). Its threads require cross-origin isolation. `coi-serviceworker.js` (MIT) provides the necessary same-origin headers on GitHub Pages; it does not cache or upload the ROM. The live website and a current browser are required for this tester. The downloadable single HTML retains offline editing/Excel features and opens the live website for GBA play.

## ROM scope and bounds

`imperium-profile.js` pins the original user file's SHA-256:

`79bfd6266f7980452c864a20ffe47783b8bb91ec9957174ed416b77d3facb3a0`

The adapter validates the exact original ROM before Thai installation. Native font-table addresses, inline name fields, description pointers and move-table pointers were examined against this ROM. The source layout of item names was checked carefully: the 20-byte singular and 22-byte plural fields are separate, and the description pointer is 8 bytes before the singular name. Item effects and prices are not used as writable name padding.

The latest decoder handles additional glyph/control tokens, finding 21,894 unique entries:

| Category | Unique entries |
| --- | ---: |
| Dialogue including introduction | 4,425 |
| Recognized menu labels | 62 |
| Item names / descriptions / plural names | 1,843 |
| Move names / descriptions | 1,763 |
| Ability names / descriptions | 654 |
| Unclassified scan candidates | 13,147 |

Unclassified candidates are not exported for translation or accepted for patching. This is not a claim that every text system or menu label in the hack has been identified. Known names, descriptions and pointers are added by verified table structure; shared descriptions are one entry with multiple owners/pointers.

Thai is rendered using licensed, compact **Siam Retro GBA** cluster glyphs in existing empty Latin font slots. Vowels and tones are composed before encoding; no UTF-8 is written into the game. Occupied font glyphs and all extra-symbol codes found in scanned text are preserved. The current original ROM has 543 usable cluster slots over normal/narrow/short font banks. The builder reports an error if this capacity is exceeded. It never truncates translations or replaces used glyphs to make them fit.

Pointer strings relocate into a verified unused 3 MB `0xFF` area. Original strings are retained, including shared substrings. Inline names must fit their field. The builder checks ordered control-token preservation, known pointer values, original source, capacity, and free-space bytes before producing output. Dialogue wraps at 208 pixels and adds scroll controls for long text. Additional conservative text limits protect menu/name/description buffers; names and dense menu layouts still require in-game review.

Actual emulator validation demonstrated a translated **เริ่มเกม** main menu and **สวัสดี! ขอโทษที่ให้รอนะ** introduction, with continuation to the next page. Five-category edits and their allowed byte ranges were checked, but an entire playthrough and every item/move/ability screen have not been exhaustively tested. Do not describe all ROM text as translated or all gameplay as verified.

## AI API

Settings supports a browser-CORS-capable HTTPS OpenAI Chat Completions API, model and session-only key. Requests send selected/context text and glossary, not the ROM. Without a key, generation buttons provide copyable prompts for an external assistant. Live API credentials are not provided by this project; API success/error paths use mock responses in tests. Bulk XLSX translation needs no API key in the app.

## Develop / release

Node.js and Python 3 are enough to run the app. Runtime libraries are vendored with their licenses and registry integrity records in `vendor/SOURCES.json`.

```sh
npm run check
npm run bundle
npm run dev
```

The bundle writes `/workspace/artifacts/index.html` and `download/index.html`. Refresh and publish the latter with every update as requested. In Codex Web, `/workspace` paths are not download attachments; use the GitHub file's **Download raw file** action. See PUBLISHING.md.

`pixel-font.js` provides the larger preview/atlas variant of Siam Retro, an OFL-1.1 bitmap derivative of Noto Looped Thai Bold with embedded Latin/symbol glyphs. The actual ROM uses `game-font.js`'s compact 15-pixel variant. Full source licenses are embedded in data and included in `fonts/OFL.txt`. Regeneration scripts use system Noto fonts, Pillow and fontTools; browsers do not need those tools.

## Validation

The ROM is intentionally absent from this repository. Pass the original file's path:

```sh
node tests/imperium.test.cjs '/path/to/original.gba'
node tests/sheet.test.cjs '/path/to/original.gba'
```

These exercise every extracted codec round trip, bounded Thai writes, font-slot preservation, pointer relocation, adjacent-field protection and real XLSX import/export with reordered rows and malformed inputs.

Browser tests use the cloud-provided Playwright/Chromium. Serve the source on port 5175 (or set `ROMTRANSLATE_TEST_URL`); `tests/workflow.cjs` verifies the service-worker isolation path without special server headers, filtered workbook export, imported translations, building and playing that ROM in mGBA, visible translated menu/dialogue, input isolation, pause/resume, audio toggle and reset. `tests/browser.cjs` tests the single-file release on the same server under `/download/index.html`, including persistence, category filtering and project import/export. `tests/mgba_runner.c` is the native mGBA 0.10.5 harness used during font research; native tooling is outside the application dependency path.
