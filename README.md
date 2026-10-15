# RomTranslate 0.23.0

Static Thai ROM translation workspace. The game stays on the user's device. Live site: https://sixzower.github.io/RomTranslate/ . The downloadable `download/index.html` supports local editing and Excel; threaded mGBA testing uses the live site.

## Default font

The default Thai font is **Quetzal TH 1.0.3 — adapted 8×16**, extracted from the user's Quetzal ROM and adapted to the editor's bitmap schema. JSON, monochrome PNG/4bpp exports, preview and extraction provenance are in `fonts/`. `scripts/build_user_font.py` verifies JSON against the exported 4bpp bytes and bundles the browser modules using Python's standard library. The optional extractor additionally uses Pillow and requires the exact privately supplied source ROM; no ROM is shipped.

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

## Automatic checks and issue navigation

Version 0.17.1 removes the manual reviewed/confirmation workflow, per-row review badges, review counters, unreviewed filter, review dialog and checksum module. The table now shows only translated/untranslated status, category completed counts and translation progress. No confirmation step is required to translate, export Excel, build ROM or create BPS patches.

Automatic checks remain: ordered control tokens, bytes, font support and screen bounds. The current-entry format indicator and **ตรวจรูปแบบ / จุดที่ต้องแก้ถัดไป** help locate errors directly. Issue navigation clears filters as needed to show the relevant entry. Tools remain grouped and AI panels stay collapsible.

Old project/ROM review fields and old history/checkpoint deltas are accepted as inert compatibility data so previous translations and undo remain readable. New edits do not generate or invalidate review stamps; old fields do not affect status, counts, filtering or building.

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
node tests/review-removal.cjs /path/to/original.gba
```

Browser tests use cloud Playwright/Chromium and an internal server on port 5175. Run sheet tests first for workbook fixtures. `tests/browser.cjs` checks the standalone release; `tests/workflow.cjs` builds and plays Thai in mGBA; `tests/recovery-browser.cjs` exercises new ROM reopening, edits, category export naming, name tabs and legacy pairing. The recovery-browser legacy fixture is the earlier menu test output, so retain it outside the repository before generating a new menu-coverage output.

The managed cloud Chromium blocks navigation to `file://` URLs with `ERR_BLOCKED_BY_ADMINISTRATOR`; the standalone font studio is functionally tested through the internal HTTP server. Direct local-file opening is not verified in that browser.

Version 0.14.0 additionally plays a translated test ROM from a new game into the house, opens the actual field menu (Thai Bag/Save/Exit/Time) and the actual bag with empty inventory. Evidence and precise coverage are in `proofs/real-screen-checks.json`. Items and Close Bag were observed as unclassified labels and their three canonical pointer entries are now verified menu export targets. This does not certify every item name/description, battle, summary or Pokédex screen.

A full playthrough, every battle/summary caller and every long localized name are not verified. Screenshots of item/move/ability labels in diagnostic intro scenes check the native printer, not those original menu callers. Native headless tooling remains outside application dependencies. Never commit ROMs, saves or credentials.

Version 0.14.1 adds optional 1px font shadows (down-right, down-left, down or right) in the font studio. Shadows are applied after composing Thai marks and encoded as native palette index 2; game screens choose the actual shadow color. Drafts, presets, JSON and ROM recovery preserve the direction. PNG/BIN exports remain the original monochrome 8×16 source shapes; keep JSON with them. Shadows are clipped at the native 12/15px vertical boundary and their horizontal bounds are included in character advance.

## Private font cloud (0.15.0)

Open Font studio → คลังฟอนต์คลาวด์. Supply your Supabase project URL and publishable/anon key; never use a service_role/secret key. Run [cloud/font-library.sql](cloud/font-library.sql) in that project's SQL Editor first. This creates only `romtranslate_font_library` and its owner-only RLS policies, separate from other apps' tables. Existing Supabase projects can be reused; Auth accounts are shared across apps in that project. Do not change existing Auth/site settings for this feature. Email/password signup uses the project's existing email confirmation rules; after confirming, return to RomTranslate and sign in. Existing users can sign in directly.

Use the same URL, public key and account on each device. Sign-in downloads saved fonts without changing the active font; select a cloud font with ใช้ฟอนต์นี้. Successful local preset saves sync automatically while signed in. Focus/online events refresh the library, and a manual sync button retries failures. Unsaved pixel drafts and ROM/translation data stay local. Revisions have content-derived IDs; edits add a new font instead of overwriting an older version. Deleting a local preset does not delete its cloud copy. This release has no remote-delete UI.

Public connection config is stored in localStorage; access/refresh tokens are in sessionStorage for this tab, with refresh support. Passwords are never stored. Signing out leaves downloaded presets available locally. Default bundled fonts are not uploaded. Offline failures retain local presets and surface a retryable status in the studio. HTTPS is required for Supabase. This setup is optional; the editor and downloadable HTML continue to work without cloud configuration.

Validation uses mocked Auth/REST calls and two isolated browser contexts for cross-device retrieval, owner filtering, deduplication, local font preservation, automatic upload and failure/retry. No live Supabase project was configured or provisioned during implementation; run the SQL and verify access with two actual users in your project before relying on its RLS configuration.

## Single-user cloud without email (0.15.1)

Use [cloud/font-code-library.sql](cloud/font-code-library.sql) instead of email signup. Run this SQL in your existing project's SQL Editor and copy the returned `private_library_code` (64 hex characters). Enter it under คลังฟอนต์คลาวด์ → ใช้คนเดียว — ไม่ต้องสมัครอีเมล after configuring the same project URL/public key. The browser remembers the code across restarts. Copy this code privately to each device; possessing it gives access to the vault. Keep a backup: there is no email recovery. Never publish it in source/config or send it in chat. Disconnect forgets the local code and leaves downloaded fonts intact.

Only admin SQL can create a vault. The server stores its SHA-256 hash; anonymous clients can only call fixed SECURITY DEFINER RPCs with a valid code. Direct table privileges are revoked and RLS is enabled with no public policies. Writes are bound to the matching existing vault, at most 25 entries per call and 1000 fonts per vault, retaining previous versions. Supabase's public key alone cannot read/write these fonts. Re-running the SQL creates a new independent vault and returns a NEW code; previous vaults remain. Email libraries remain separate; local presets sync into the new vault when connected. ROMs and translation data remain local.

`tests/font-code-cloud.cjs` covers no-email flow with mocked RPC, separate browser contexts, reload persistence, unknown code rejection, duplicate sync and disconnect. `tests/font-code-sql.cjs` executes the SQL in actual PostgreSQL via temporary PGlite and checks denied direct table access, RPC grants, wrong code rejection, vault isolation and safe repeat setup. To run the SQL test, install @electric-sql/pglite outside the repo and set PGLITE_MODULE to its module path. No live Supabase service was configured here.

## Quetzal Thai default font (0.16.0)

The default preset is now **Quetzal TH 1.0.3 — adapted 8×16**, extracted from the user-provided ROM (source SHA-256 and offsets in `fonts/quetzal-font-provenance.json`). 42 supported base consonants retain the original native ink shape exactly. 73 source shapes/mark regions are extracted; 12 additional/separated shapes are adapted to complete the 85-character editor font, including obsolete consonants, rare symbols, separated ื and normalized ำ. Tone marks are repositioned for stacking in this renderer and the original ROM's many precomposed syllables are not copied verbatim. No full ROM is included.

The default uses compact spacing and a 1px down-right shadow. Existing custom presets and unsaved drafts are retained. If an existing device still displays an older font, choose ค่าเริ่มต้น · Quetzal TH in Tools → Font; to design it, click เริ่มจากฟอนต์ที่ใช้อยู่ in the studio (download any existing draft JSON first). Existing ROMs must be rebuilt to install the new font. Source PNG/BIN remain monochrome; JSON carries shadow settings.

`python3 scripts/extract_quetzal_font.py /path/to/user-rom.gba` regenerates the extracted assets for the exact source SHA only; `python3 scripts/build_user_font.py` rebuilds the JS defaults from those assets. Runtime templates now match the current shadow-enabled runtime so regeneration retains shadow support. `tests/quetzal-font.cjs` verifies exact source base ink, palette bytes, 12/15px composition bounds and original Imperium patch/recovery. Character appearance and line wrapping must still be checked in each game screen; this extraction does not add translation support for Quetzal itself.

Version 0.16.1 adds a copy-AI-prompt button to Excel export, with a batch selector and collapsible preview. It uses the exact Instructions prompt for the chosen snapshot/category/range; invalid ranges disable copying. Every workbook also opens with a Prompt sheet containing the complete prompt in A3, named AI_PROMPT for easy selection and Ctrl/Cmd+C. Plain XLSX cannot provide a portable clipboard button without macros, so the actual one-click button is in the web export dialog.

## BPS translation patches (0.17.0)

Use **แพตช์ / ไฟล์พร้อมเล่น** to create a `.bps` from the currently loaded translation project, or **สร้าง ROM ทดสอบ → ดาวน์โหลดแพตช์ BPS** to export the already built ROM as a patch. Export runs the same format/font/size validation as ROM building. It captures original bytes, translations and font options before building; a reopened web-generated ROM uses its recovered original as the source. The patch includes font changes and translation/recovery data. It does not require every row to be translated or manually marked reviewed. Play-test relevant screens before sharing.

To apply, open the patch dialog, choose the exact original `.gba` and `.bps`, then click **ใช้แพตช์และดาวน์โหลด .gba พร้อมเล่น**. This works without loading a translation project, and in the standalone HTML. Files remain local. BPS supports 32 MB ROMs, unlike classic IPS's 24-bit offsets. The source length/CRC, patch CRC and final target CRC are checked. Web-created patches also embed and validate source/target SHA-256 metadata. The importer supports all four BPS action types; this release exports SourceRead/TargetRead to keep it straightforward and interoperable. Limit is 64 MB per source/target/patch. IPS/UPS are not accepted by this importer.

`tests/rom-patch.cjs` verifies small fixtures, 32 MB actual-ROM roundtrip, exact recovery, wrong ROM and damaged/truncated patch rejection. `tests/patch-browser.cjs` verifies both export buttons and applying in a fresh browser with no loaded project. `tests/bps-compatibility.cjs` checks interoperability in both directions with an independently cloned marcrobledo/RomPatcher.js, including SourceCopy/overlapping TargetCopy; set BPS_REFERENCE_ROOT to that temporary checkout. No external patcher library is bundled.

## Theme, import progress and unchanged text (0.18.0)

The sun/moon toggle is initialized independently in `theme.js`, before the translation application. It keeps working if app startup or a preview renderer fails; theme events redraw canvases with guarded preview calls. Preference persists and syncs across tabs. Bundling versions local JS/CSS URLs from package.json to prevent old browser assets being mixed with new HTML; standalone assets remain fully embedded.

Excel imports show a blocking progress dialog while reading the local file, checking duplicate IDs, validating rows and checking aggregate font capacity. FileReader reports actual bytes; validation reports actual visited rows in 200-row chunks that yield to the browser. XLSX decompression is indeterminate because ExcelJS provides no percentage API. Weighted stages advance from reading (0–20), duplicate scan (20–30), row validation (30–80), project font checks (80–100); only completed validation shows 100%. The normal summary/confirmation appears afterward, and malformed files close the progress dialog without altering existing translations. No ROM or worksheet is uploaded.

**คงต้นฉบับ / แปลแล้ว** copies the exact source into translation and explicitly sets `translationChoice: "keep-source"`. It counts as completed work, appears green, and disappears from untranslated filters. Copying English into translation alone still does not claim completion. Editing/clearing that text resets the choice atomically with undo/redo. JSON, autosave, checkpoints and ROM recovery preserve the choice; Excel uses the optional appended `translation_choice` column, and AI instructions preserve kept rows. Older Excel files remain readable. Kept entries retain native game text and pointers rather than being rewritten; their intent is stored only in recovery metadata. The removed human-review workflow remains absent.

Validation: `tests/theme-toggle.cjs`, `tests/sheet-import-progress.cjs` (500 actual rows), `tests/keep-source.cjs` (including unchanged game bytes and cross-browser JSON), plus history, progress, font studio and multi-batch Excel regressions.

## M365 Copilot Excel compatibility (0.18.1)

ExcelJS rejects some valid default-namespace `docProps/core.xml` nodes produced by M365 Copilot (observed: `lastModifiedBy`). `xlsx-loader.js` retries only recognized optional-property XML parse failures, omitting that optional file from the in-memory ZIP central directory. All other compressed payloads and worksheet cells remain unchanged; ROM hash/ID/offset/source/token checks are still mandatory. Normal workbooks use the original loader path. The source file on disk is never changed, and the import summary reports the metadata fallback.

The user's Imperium_Ability_001-100_TH.xlsx was verified: 100 populated work rows, 95 translated, 5 blank (Excel rows 97–101), 0 import-blocking errors, and a successful ROM build/recovery. The formatted worksheet extends to row 655 but empty formatted rows are ignored. Tests cover the actual user file without adding it or its translations to the repository, byte-for-byte preservation of every other ZIP entry, normal Excel imports, browser confirmation and progress cleanup.

## Permanent extracted font presets (0.19.0)

Sword & Shield TH v1.7 and Emerald Seaglass TH v1.1.3 are bundled in the site and standalone HTML. The existing Quetzal default remains available. The new fonts preserve source foreground, shadow and advance; mapped precomposed sprites retain their original pixels. Native rendering skips the old vertical-gap adjustment. The 12px bank is scaled and combinations without a verified original sprite are assembled from extracted components. Regional extraction and source hashes are recorded in `fonts/hack-font-provenance.json`; no ROM is distributed. Complete indexed source sheets are retained as `fonts/sword-shield-th-source.png` (512 sprites) and `fonts/seaglass-th-source.png` (1024 sprites), including sprites not yet mapped to Unicode; 16 sprites per row in ascending native glyph ID.

Unmapped characters are visibly listed and block rendering, rather than copying shapes from another font: Sword & Shield currently has 84/85 editor characters (฿ unmapped); Seaglass has 68/85. Drawing an unmapped character enables it. These presets do not promise identical layout for every possible Thai cluster. Rename from the font dialog; built-in names persist locally, imported fonts rename without creating a duplicate locally, and cloud copies retain older immutable versions. Built-ins survive browser storage deletion; custom names and imported fonts require backups/cloud.

Reproduce extraction from the matching locally owned ROMs: `python3 scripts/extract_hack_fonts.py /path/to/extracted-rom-directory`. Test against source files with `HACK_FONT_ROMS=/path/to/extracted-rom-directory IMPERIUM_ROM=/path/to/original-imperium.gba node tests/hack-fonts.cjs`. Without these environment variables, the test covers rendering, native overrides, presets and rename in Chromium.

## Work files, pending scopes and Gemini imports (0.20.0)

The uploaded 654-row ability workbook has 327 blank name translations and 327 translated descriptions. With the default Quetzal font, 34 descriptions wrap beyond the two-line screen limit. Import now accepts the 293 descriptions that pass and retains the other 34 as contextual AI drafts. Drafts do not count as final translations; identity/hash/source/token/formula/duplicate errors still block import, and building a ROM still validates final text.

“งานค้าง / เปิดต่อข้ามเครื่อง” captures canonical entry IDs, category/search, editing position and Excel range settings. Active export scopes use the frozen ID order, even if the untranslated filter changes. Work files include translations, drafts, font, history and progress categories; they contain no ROM bytes or API keys. Download JSON and use “เปิดโปรเจกต์” with the matching original ROM on another device. Pause/close/cancel leaves translation data intact; closed/cancelled task records can be removed. Choosing an unrelated category pauses the active work scope.

Optional cloud storage reuses the font library's private-code or account connection. Run `cloud/workspace-library.sql` once in the same Supabase project (copy from the shared library setup); it adds an owner-isolated table and RPCs without creating a new vault code or changing presets. The dialog lists cloud copies, restores them, saves updates and deletes a selected cloud copy. Since 0.22.0, connecting the shared library enables automatic saving. Revisions prevent stale devices overwriting newer work; a conflict stops autosync and retains local edits for JSON backup. Opening a cloud copy does not write another revision. Backend requests never contain ROM bytes; private connection codes stay outside the work payload.

Validation: `node tests/gemini-workspace.cjs ORIGINAL_ROM UPLOADED_XLSX`, `node tests/workspace-cloud.cjs ORIGINAL_ROM` (mocked private RPC transport), and `PGLITE_MODULE=/path/to/@electric-sql/pglite node tests/workspace-sql.cjs` (actual PostgreSQL permissions, isolation, CAS and migration repeatability). Live Supabase configuration and GitHub Pages deployment must be checked separately.


## Compact workspace (0.21.0)

The main bar keeps ROM open/build and undo/redo visible. File/work/cloud/patch operations live in **ไฟล์งาน**, import/export in **Excel**, and checks/history/preferences in **เครื่องมือ**. Font JSON/PNG/BIN tools remain in the font room's file menu. Technical IDs, ROM offsets, speaker and control-code details are available on demand.

**หมวดเกม** selects the game family; **ชนิดข้อความ** narrows it to names, descriptions or dialogue groups. Counts and export metadata still use the canonical categories. Normal all-category totals exclude unverified text; **ข้อความอื่น / ตรวจตำแหน่ง** exposes that read-only material. Progress targets remain independent of the current browsing filter.

ROM loading, builds and patch work display a foreground operation popup. Builds and quality audits can be cancelled before releasing controls. Audits yield between 25-entry chunks, report actual checked counts, and preserve missing/reordered command, layout, capacity and glossary checks. Both audit actions support cancellation/retry; reports display the first 300 issues and downloadable reports retain all issues. Emulator initialization has a 45-second timeout with retryable controls.

Validated with the supplied Imperium ROM: responsive Day/Dark layout, category/subcategory counts, ROM build cancellation/retry and error recovery, 1,500-entry quality audit cancellation/missing-command navigation, real mGBA pause/resume/Space speed, Gemini Excel draft import, portable work restoration, and mocked two-device cloud conflict protection. Live Supabase and GitHub Pages deployment require their respective external services.


### Interface polish (0.21.1)

Rooms are named งานแปลเกม, สตูดิโอฟอนต์ and ทดลองเล่นเกม. Contextual AI generation and automatic contextual requests are removed; imported/persisted contextual drafts remain editable under ร่างคำแปลที่รอแก้ไข. Direct literal translation and the Excel AI instructions still work. Built-in labels describe the font appearance: ไทยคลาสสิก · Quetzal 8×16, ไทยเส้นคม · Sword 14px and ไทยเงานุ่ม · Seaglass 15px. Stable preset IDs and glyph pixels are preserved; custom preset names remain user-controlled. Progress bars use green in Day/Dark.


### Font shadow discovery (0.21.2)

API settings and browser API requests are removed. Literal translation prepares a copyable prompt; Excel instructions remain available. Game genre metadata lives with Excel export and is saved with the work file. Font shadows now have their own visible control row in สตูดิโอฟอนต์; เลือกฟอนต์ไทย → ปรับเงาฟอนต์ opens it directly. Changing shadows updates previews; save as a preset to apply to game builds.


## Shared private library (0.22.0)

The title-bar **เชื่อมคลังส่วนตัว** button is the single connection entry. It reuses the existing vault code/account, Supabase URL/public key and tables, and displays both font presets and pending work files. Separate font/work login buttons and the per-file autosync opt-in are removed. Connecting verifies both services, imports cloud presets without changing the active font, lists cloud workspaces, and automatically uploads existing local workspaces and current edits (no ROM bytes). Saved presets upload automatically. Local work can be opened or deleted from the library; cloud copies can be opened or deleted independently. Opening a cloud work file still needs the matching original ROM for translation/building.

The neon indicator is red when disconnected, offline or a request fails, blinking yellow while checking/syncing, and green only after both services succeed. Saved credentials are revalidated on startup, focus/reconnection and a 60-second heartbeat. Network availability alone never turns it green. A missing workspace schema is reported as an incomplete connection; the existing one-time workspace SQL is available in the shared setup disclosure. No database migration was run against a live user service by this update.

Automatic writes retain optimistic revisions. A stale local copy pauses on conflict; sync does not silently re-enable it. Deleting a cloud copy pauses its matching local file, including after reload, to avoid recreating it. Files already linked to another vault do not move automatically. Local persistence updates cloud metadata without overwriting other active work. Cancelled/completed translation tasks remain in their file until the user removes them.

All dialogs include an X. Existing close/cleanup actions are reused; audit and Excel import support cancellation, while non-cancellable stages acknowledge that they must finish first. Every progress bar has a numeric 0–100% label. Excel decompression holds its last known milestone rather than inventing progress.

Validated with mocked private-code and email backends: shared login, archived/current autosave, two-device listing/open/edit, fonts, conflicts, deletion/reload, outage/retry, neon states and logout. Browser integration checks cover safe X cancellation and no partial Excel import. Live Supabase credentials are not available in this workspace.


### Multi-row keep-source (0.22.1)

English table cells support Ctrl/Cmd-click to toggle individual rows, Shift-click to select a contiguous range in the full filtered order (including across pages), and pointer drag to select a range. Ctrl/Cmd adds a dragged range to the existing selection. Plain clicks still copy the English source; modified clicks and drags do not copy. Switching filters drops hidden selections, and project changes clear them. Escape from an English cell clears selection. Thai editing selects its own row.

A compact **คงต้นฉบับ / แปลแล้ว** button sits at the right of the category translation count, with an explicit selected-row count. It applies original text and keep-source flags to eligible selected canonical entries only, as one undo/redo operation. Control tokens remain unchanged. Replacing an existing non-source translation requires confirmation; read-only/unverified rows cannot be marked. Progress, saved work and automatic cloud synchronization use the existing change path.

Browser validation: `node tests/row-selection.cjs ORIGINAL_ROM` (test server port 5176; optional `TEST_URL` exercises the standalone release). Checks normal clipboard behavior, Ctrl/Shift and cross-page ordering, real pointer dragging, filter pruning, batch status/progress, atomic undo/redo, overwrite cancellation, exact control-code preservation and responsive layout.


## Admin login and translation targets (0.23.0)

The tabs are งานแปล, ทดสอบระบบ and สตูดิโอฟอนต์. Shadows return to a normal toolbar selector. Direct AI translation helpers and API settings are removed; old literal/contextual drafts remain editable, and Excel AI instructions are preserved. Multi-row keep-source selection is described above.

The shared library now asks only for an admin password. The owner's supplied Supabase Project URL and publishable key are in `cloud-config.js`; these are public client settings. No admin password is embedded in browser code or saved in browser storage. `cloud/admin-setup.sql` installs both existing library backends and the admin login endpoint, retaining all existing vaults and workspaces. The chosen password is seeded as a bcrypt hash; rerunning setup does not reset it or relink a vault. The title-bar library dialog has ติดตั้งระบบครั้งแรก → คัดลอก SQL ติดตั้งระบบ and a SQL Editor link. Run it once with Supabase administrator access. A public/publishable key cannot install SQL.

After SQL installation, enter the admin password once on the original browser/device: its existing private code links the same library without deleting fonts/work. Subsequent devices need only the admin password. If there are no existing vaults, the first successful login creates one. Existing account sessions can migrate their own library using the verified JWT. Wrong passwords never disclose a vault code; private tables deny anonymous direct access, and failed attempts are rate-limited. A returned private code acts as the existing remembered session; sign-out removes it.

A category omitted from เลือกเป้าหมาย displays **ไม่แปลส่วนนี้** in its table rows and editor heading. Existing translations are preserved; reselecting the category restores its actual translated/untranslated status. The ยังไม่แปล filter and progress totals consider target categories only. This does not delete or rewrite translations outside the plan.

Tests: `tests/admin-sql.cjs` uses actual PostgreSQL/pgcrypto via PGlite for permissions, bcrypt, linking, rate limits, migration repeatability and extension-schema compatibility. `tests/admin-login-ui.cjs` tests the one-field login, error/install instructions and existing-code upgrade with mocked transport. `tests/unified-cloud.cjs` now uses admin login while retaining two-device cloud checks. `tests/translation-scope.cjs` tests excluded statuses and preserved text; `tests/row-selection.cjs` tests bulk actions. Both online and bundled HTML were exercised. Live Supabase API access from this worker is blocked by its outbound proxy; the owner must run the one-time SQL in the real project's SQL Editor.


### Simple autosave, reopening and remaining overview

Saving is always automatic. The toolbar shows whether a local write is pending or complete. **โปรเจกต์** separates local-save, cloud-backup and JSON-export timestamps; a successful local save never claims a cloud backup succeeded. Cloud timestamps advance after an acknowledged write, and pending/conflicted/disconnected states remain distinct. JSON exports are optional backups, with their initiation time recorded separately. They are not required to continue ordinary editing.

On the same browser/device the verified original ROM is cached in IndexedDB under a separate ROM key; closing/reopening resumes the latest work, selected category, search and editing position without choosing a ROM again. ROM cache bytes never enter portable JSON, cloud payloads or the shipped HTML. If browser storage is unavailable/full, translation saving still works when possible and the UI requests the original ROM on reopening. A new device uses the cloud work file plus its original ROM. Local project deletion removes its resume marker.

Advanced frozen work sets live under **แบ่งงานเป็นชุด (ไม่จำเป็น)**. **สำรอง / ย้ายเครื่องด้วยไฟล์** contains the optional JSON download. Existing task filters can be paused to return to the whole project, without deleting any translations.

**ภาพรวมที่ยังไม่แปล** shows category/family totals and per-category percentages exclusively from selected translation targets. It omits completed categories by default and can reveal them on request. Its detail buttons open target-only untranslated rows and pause any narrower frozen work-set filter so the counts match. Navigation labels are หน้าแรก (jumps to page 1) and หน้าถัดไป.

Browser tests in `tests/work-resume-overview.cjs` cover a real-ROM reload and a new tab, restored text/filter/position, backup timestamps and optional download, target-only overview and first/next behavior on both web and standalone.


### Excel remaining-only export and build help

Excel export defaults to **ข้ามข้อความที่แปลแล้ว** and omits both final translations and explicit keep-source entries. The dialog shows the remaining count and how many rows were skipped. Uncheck it to export the original filtered snapshot. With remaining-only export, ordinal 1 refers to the first remaining entry at dialog-open time; starting at 1 again after an import avoids skipped work. All ranges in a single export use one frozen snapshot, and import identities remain canonical.

สร้างไฟล์เกม is in **ไฟล์ → ไฟล์เกม**. Validation errors that identify a ROM offset include a short fix explanation and **ไปแก้ข้อความนี้**, which navigates to the exact canonical entry and pauses a narrower work-set filter when needed. A 4/3-line error means shortening the translation/removing empty lines until it fits three lines; adding line breaks alone does not fix it. Byte, width, control-token and font errors have their own guidance. ROM validation remains mandatory. `tests/export-build-help.cjs` verifies real XLSX exclusion and reproduces/fixes the user's item-description error at $6C4C90 before successfully building a ROM.


Canonical message IDs and ROM offsets are visible again before the category column by default, and prefix the editor heading. The advanced แสดง ID / ตำแหน่ง ROM toggle can still hide them. IDs/offsets were never removed from project or Excel data.

Excel export always intersects the current filter or saved work set with the selected translation target categories. Categories marked “ไม่แปลส่วนนี้” are excluded even when exporting a parent category or disabling the untranslated-only option. The export dialog shows the excluded count.

### Extract fonts from another GBA ROM

Open the font picker or studio and choose **ดึงฟอนต์จาก ROM**. The ROM is read locally and is never uploaded. Exact SHA-256 matches for Sword & Shield TH v1.7 and Seaglass TH v1.1.3 use the verified Unicode mappings in `fonts/hack-font-provenance.json`; pixels, shadows, widths, and mapped composite glyphs are decoded directly from the selected ROM. Missing characters remain explicitly unavailable. This does not claim universal automatic extraction or identical composition across different game engines.

For other ROMs, supply the graphics offset and encoding (Pokémon 2bpp or GBA 4bpp; linear or Pokémon JP block layout). Raw graphics and bounded GBA LZ77 type 0x10 are supported. The atlas lets you assign actual glyph images to Thai characters, choose a row region for separated marks, and specify advance widths. Without a width table, advance is an estimate from image bounds. Do not assign a precomposed syllable to a plain consonant. Unknown/compressed formats other than these require a dedicated decoder. There is no guessed Thai mapping or silent substitution with the default font.

Review the preview and confirm before saving a preset. Partial presets clearly identify missing characters. The mapping JSON download records the ROM hash and decoding settings and can only be loaded for the same ROM; it is distinct from a font preset JSON. Presets persist locally and use the existing cloud sync when connected. Font placement still needs in-game verification, especially 12px scaling and stacked marks.

### Compact private library sign-in

The status light opens a small password-only dialog. Submission immediately shows a pending state; wrong passwords, missing RPCs, network errors, and timeouts display an explicit error. Successful login closes the dialog and shows “เข้าสู่คลังสำเร็จ”. If password verification succeeds but font/work sync fails, the message distinguishes the two phases. An expired legacy email session no longer prevents trying the admin password. No SQL migration is required for these client changes.

Cloud and local work lists are in **ไฟล์ → โปรเจกต์**. Font cloud management, sign-out, and the optional SQL installer are under **เครื่องมือ → จัดการคลังส่วนตัว**. Plain close buttons are hidden across dialogs; the upper-right X invokes the original cleanup/save/cancel action. Save/confirmation and active-operation cancellation actions remain available. Menus size their common item width to the longest label.

### Admin adoption of an old vault (0.26)

If login reports “ยืนยันรหัสนี้ที่เครื่องเดิม…”, the password is valid but the old database function cannot link a vault without its browser token. Run `cloud/admin-link-upgrade.sql` once in the same Supabase project's SQL Editor (or rerun the full `cloud/admin-setup.sql`). This preserves the password, existing admin link, and all font/work data. With one old code vault, a correct admin password copies its fonts/work into a new shared vault once, retaining the original rows and old code. With several vaults, login returns counts after password verification and asks the admin to choose one; it never silently merges independent work. A valid original browser code still links directly. Later devices use only the password. Older devices still connected to the preserved source vault should sign in with the admin password and reopen the shared project to continue on that shared copy.

### Preserve all source font graphics (0.26)

The native Quetzal TH 1.0.3 profile preserves its source shapes, shadows and width table, unlike the adapted default preset. It currently maps 62 of the template's 74 Thai characters; 12 unverified characters stay unavailable. This is explicit coverage, not a claim to have decoded every Thai string. A complete archive exports **all** 512 Sword / 1024 Seaglass / 1280 Quetzal sprites in the verified bank, including unmapped/precomposed variants. ZIP contains a PNG atlas, raw palette-index JSON with source widths, and the mapped font preset. User-selected custom banks can also be archived. Source palette indices are preserved separately from rendered foreground/shadow indices. No ROM is included.

The UI reports Thai coverage, missing characters, composite count and out-of-frame glyphs. Users can browse original sprites without changing mappings, or explicitly enable extra mapping edits; edits invalidate affected precomposed glyphs. Font archives preserve source graphics but do not automatically identify unknown Unicode mappings or reproduce another game's text-layout engine.

### Remember sign-in and retry sync (0.26.2)

The sign-in checkbox stores the library credential (not the admin password) in localStorage when checked, or sessionStorage for that tab when unchecked. Existing remembered sessions remain compatible. Reloading a tab reconnects in either mode; a new unrelated tab/browser session requires sign-in when not remembered. Sign-out removes both local and tab credentials.

Network failures name the phase (font read/upload or project list/open/backup) instead of exposing only “Failed to fetch”. Read requests retry once after a short network failure; timeouts, login attempts, and revision-changing writes are not automatically retried. The retry button reuses an accepted library credential without entering the password again. Font upload batches are bounded by UTF-8 payload size (about 512 KB, with a single larger font sent alone), as well as the existing 25-font limit. These changes do not install SQL or resolve external network/CORS restrictions.

Login and retry now show a weighted **step completion percentage**, directly after “กำลังตรวจรหัสและเชื่อมคลัง…”. It advances after password verification, font batches/download validation, and project sync/check steps. It is not a transfer-byte or remaining-time estimate and does not advance on a timer. A failed operation keeps its last completed stage; 100% appears only after the connection/sync cycle finishes. Project conflicts or paused projects remain reported separately in the project backup status.

The sign-in layout now scopes full-width styling to text fields, keeps the remember checkbox at 16px, and aligns login/retry actions in one row without horizontal scrolling. On a font-upload network failure, immutable font batches split into smaller batches; a single font retries once. Existing font IDs use insert/ignore-duplicate semantics, so a lost response can be retried without duplicate fonts. Project revision-changing writes retain their existing no-automatic-retry behavior. Persistent network restrictions still produce a named-font error.

### Library access and pending backups (0.27)

Cloud fonts are read and validated first; local presets whose IDs already exist on the cloud are not uploaded again. A font upload failure is recorded under **จัดการคลังส่วนตัว → รายการรอซิงก์** and no longer prevents opening the verified library or listing/syncing projects. Font data stays in IndexedDB, and later sync tries missing presets again. A per-project backup failure similarly stays pending; successful backups alone advance their saved timestamps. Cloud-read failures still mark the service disconnected. Completion warnings explicitly distinguish 100% library entry from unsent fonts/projects, and never claim those pending entries were backed up.

The password field uses bundled Prompt Regular at 13px. The official Google Fonts TTF (SIL OFL, `fonts/Prompt-OFL.txt`) is checksum-verified during bundling and embedded into the standalone HTML, so it does not require Google Fonts access. These changes cannot prove or remove a real browser/network block affecting one specific preset; the failing preset JSON and browser network details are needed to diagnose that exact payload.

### Multiple translated Excel files (0.27)

Use **Excel → นำเข้า Excel (หลายไฟล์)** and Ctrl/Shift-select XLSX files. Up to 100 files / 128 MB total (32 MB each) are read sequentially with overall progress and cancellation. A single review precedes one apply/undo group; no translations change during review. Matching repeated translations are deduplicated by entry ID. Conflicting translations/speakers, mismatched ROM identities, or unreadable workbooks block applying the entire selection and identify the offending file; remove/correct that file and select again. Layout errors remain recoverable drafts, while font capacity is validated once against the combined imports plus existing project translations. Downloadable issue reports include a file column.

### Font upload failures (0.27.1)

A preset name identifies the failing request, not its root cause. Errors now distinguish an HTTP rejection from a missing HTTP response and show request KB and elapsed time under pending items. Font writes are idempotent; after a lost response, the client reads the library back and confirms both ID and normalized content before treating the write as successful. HTTP failures are isolated per preset as well as network failures. Failed presets remain local, with a **ดาวน์โหลด preset ส่งตรวจ** button that exports only font JSON (no library code/password). Actual payload-specific diagnosis still requires the affected user's preset; mocked rejection/lost-response tests do not prove that their browser can reach Supabase.

### Stable preset IDs and legacy cloud recovery (0.27.2)

The old font ID hash serialized `nativeComposites` in insertion order. PostgreSQL JSONB can reorder object keys without changing font content, so a saved native font could fail the client's “ข้อมูลฟอนต์คลาวด์ไม่ตรงกับรหัส” check. Validation now sorts composite keys before computing IDs; import, rename, startup, and cloud sync share `FontPresets.idFor`. Local old IDs migrate atomically with their active selection. Cloud legacy records remain untouched: schema-valid fonts receive a stable local ID and are backed up under that ID if absent, with duplicate display entries merged. Because old hashes were not order-independent and previous validators changed normalized metadata, they are treated as legacy identifiers rather than a cryptographic integrity guarantee. Full glyph/native/size schema validation still applies; malformed remote fonts are reported individually and excluded without blocking other fonts or workspaces. Tests simulate JSONB ordering across two devices, verify pixels and shadows remain unchanged, and verify subsequent syncs do not upload duplicates. No SQL migration is needed.

### Automatic project continuation and optional private ROM copies (0.28)

Connecting the library automatically opens the most recently updated cloud project when no other work is active. A clean local copy of that same workspace can receive a newer cloud revision; dirty, paused or different active projects are preserved. Startup local restoration completes before cloud restore/upload to prevent races. Periodic sync does not switch projects repeatedly. The latest work restores translations, font, progress targets, task and view; cached original ROM bytes are verified before reuse. If the original ROM is unavailable, a clear banner lets the user choose it or cancel opening the pending project.

Optional **โปรเจกต์ → ROM ชั่วคราวบนคลาวด์** stores a copy of the current project's original ROM. Run `cloud/rom-library.sql` once after the existing workspace setup (also included in the full admin setup SQL). Copy it through the web UI; no new account or credentials are required. This migration must actually run in the user's Supabase project before the feature works there. Existing translation/font storage works without this optional migration.

ROM storage uses private PostgreSQL bytea chunks behind a security-definer RPC, reusing the current vault/user owner. It does not expose public ROM URLs or require a storage bucket. Each project allows 32 MB; each library allows 128 MB of raw ROM data. The app saves the workspace first, uploads 256 KB chunks with resumable progress and cancellation, then verifies the original SHA-256 on the server. A fresh device can download the last project's complete ROM automatically and verifies its SHA-256 again before opening. Incomplete uploads are never playable; upload again to resume or delete the partial copy. Cloud ROM copies remain until the user deletes them; there is no automatic expiry. **ลบ ROM ของงานนี้จากคลาวด์** removes only ROM bytes; deleting the cloud workspace cascades to its ROM/chunks. Local ROMs and translation backups remain independent.

Validation: `tests/cloud-auto-resume.cjs` uses the original user ROM with mocked cloud metadata; `tests/rom-cloud-sql.cjs` exercises real PostgreSQL through PGlite (roles, owner isolation, RLS, chunk/hash limits, resume, finalization and deletion); `tests/rom-cloud-browser.cjs` combines Chromium, the same SQL RPCs and the full 32 MB ROM across two devices. Install `@electric-sql/pglite` outside the repo and point `PGLITE_MODULE` at it to run the PostgreSQL tests. No ROM bytes are checked into Git. These tests do not establish that the migration has run or that the user's live Supabase network is reachable.

### Project Cloud layout (0.28.1)

The file-menu entry and dialog are named **โปรเจกต์ Cloud**. Cloud project cards and local/cloud save status appear first; ROM storage is expanded with a directly visible **คัดลอก SQL เก็บ ROM** button and SQL Editor/source links. Delete actions sit under each card's “เพิ่มเติม”. Local work, task grouping, manual save and JSON export are collapsed under additional tools. Existing autosave, cloud restore, ROM upload/download and deletion behavior remains available. The SQL source link is absolute so the downloadable single HTML can open it too.

### Connection error classification (0.28.2)

The cloud runner no longer labels every JavaScript `TypeError` as an Internet failure. Fetch failures are classified at the request boundary; errors elsewhere show the operation stage and actual exception message. Incompatible app/manager modules and unavailable secure-context crypto receive explicit recovery messages. A failed automatic project fetch/open is reported as **งานรอเปิด**, without preventing access to the already verified font/project library or falsely claiming a project backup succeeded. The affected workspace is excluded from that sync's uploads to avoid overwriting a newer cloud copy. Local work remains intact. `tests/cloud-error-stages.cjs` checks genuine network failures, injected JavaScript errors, module incompatibility and project-read failures. The original generic error alone does not identify the user's exact exception; the new detailed message is needed if it persists.

### Null local workspace recovery (0.28.3)

The exact error `Cannot read properties of null (reading 'workspaceId')` could occur after reading the cloud list because sync mapped local IndexedDB records without checking their values. Local `work-*` rows are now validated, matched to their workspace ID, and excluded from opening/upload when empty or malformed. They are preserved in IndexedDB and reported separately as **ข้อมูลในเครื่องที่ข้าม**, not successful or pending cloud backups. Normal projects continue syncing and remain available in the local project list. WorkManager also guards null/missing IDs at its boundary. No SQL change or storage reset is needed. `tests/cloud-null-local-work.cjs` reproduces the original error with real IndexedDB null records, checks preservation/reporting, and verifies a valid project from the 32 MB user ROM still uploads its translations.

### Completion sounds, background sync and ROM setup (0.29)

A short local Web Audio cue plays after a verified connection/reconnection and after a completed ROM upload. Background sync does not replay the connection cue, and cancelled/failed uploads do not play success. Audio requires browser user activation; blocked cues wait for an interaction. **จัดการงานและสำรองเพิ่มเติม → เสียงแจ้งเตือน** mutes and remembers the preference. No sound assets or network requests are needed.

An already connected library keeps its green light while syncing; `aria-busy` indicates background work. Yellow blinking is reserved for initial connection/reconnection; verified read failures/offline still turn red. Background sync waits for an in-flight project save to avoid a false disconnect. Passive whole-library polling/focus refresh is reduced from every minute to every 15 minutes and interval polling skips hidden tabs. Local saving and cloud backups after edits are unchanged; manual sync remains available. Unchanged project content is skipped within the open session, while changed content updates the existing workspace row. This reduces idle requests/egress, but cannot guarantee zero Supabase charges: ROM downloads, font reads, project history/payload size, separate project copies and the account plan/quotas still matter. The app's 128 MB ROM limit is not a limit on total Supabase usage.

The ROM SQL setup panel is hidden by default. A successful ROM info RPC hides it, and a missing RPC exposes the copy/install controls again. Connecting the font/work library alone does not prove the optional ROM tables have been installed. Probing happens when opening project management with an available cloud workspace.

### Compact status bar (0.29.1)

The status bar defaults to 24px, is limited to 28px when expanded, and still collapses to 12px. Previously saved large heights are clamped automatically. Desktop layout stays inside the viewport so the translation editor receives the remaining space; mobile scrolling remains available. Browser checks covered source/standalone layouts, three desktop sizes, an old 220px preference, collapse/expand and mobile width.

### Restore normal page scrolling (0.29.2)

The viewport overflow lock introduced in 0.29.1 is removed so content can remain reachable through normal scrolling on constrained displays. The status bar stays compact at 24–28px. This change does not modify workspace/translation records. The sample ROM still renders its text list and editor; the exact user symptom (hidden UI versus missing saved translations) requires clarification rather than assuming data was deleted.

### Concise Excel prompt and explicit import outcomes (0.31)

The export prompt is about 1,800 characters before optional ROM/scope/batch context. It keeps original-file/row IDs, existing/keep-source values, glossary consistency, dialogue context/pronouns, exact control codes, screen limits, plain-text cells, and real XLSX delivery. Prompt sheet and the copy button share the same text; Instructions links to Prompt!A3.

Import recognizes explicitly named English/Thai column aliases, header rows within the first 30 rows, renamed or multiple data sheets, comma-grouped numeric entry IDs, numeric/hex ROM offsets, uppercase hashes, rich text and hyperlink display labels. An additional “คำแปลไทย” column is read if the original translation column is empty; differing nonempty translation columns are reported as ambiguous rather than guessed. Matching duplicate rows/sheets are consolidated, including an empty original table plus a translated copy. Missing row hash columns may use the explicit SHA-256 in Instructions; foreign hashes still block the selection. Entry ID + ROM offset + unchanged source must all match the loaded ROM. No fuzzy source/row-order matching is used.

Review can apply exact valid rows while explicitly excluding unmatched rows. A matched row with broken control codes is retained as a draft, never applied to ROM text. Wrong-ROM selections, unreadable workbooks and cross-file conflicting translations still block applying the batch. Formula cached results are never silently accepted. Issues include file, sheet and original row number; blank cells do not erase existing work. Real-ROM tests cover these cases plus the actual 654-row Gemini workbook and multiple-file preview/apply/undo. A particular user's failing workbook still needs inspection if these cases do not explain it.

### Remove dedicated translation recovery (0.31.1)

The recently added recovery button/dialog, workspace-recovery module and automatic recovery archive creation are removed. Existing local data and previously created recovery records are left untouched; they are not uploaded or enumerated as workspaces. Ordinary autosave, undo/history, Excel import and the protection against automatic blank cloud replacement remain available. Manual replacement confirmation no longer claims a recovery archive will be created.

### Streamlined Excel export (0.32.0)

The full AI prompt exists only at Prompt!A3 and the category counts are in Instructions; the redundant category worksheet is removed. Glossary is included only when supplied and splits real newlines. All 13 data columns, ROM hash metadata and batch ranges remain compatible. Translation cells for empty, non-keep-source rows are yellow and unlocked; identity/source fields and existing translations are locked with password-free sheet protection to reduce accidental edits. This is an editing aid, not a security boundary; import identity/control validation remains authoritative. The prompt requires unchanged row counts and exact control codes, preserves existing work, and distinguishes real newlines from literal backslash-n codes.

Validation: real-ROM export/import and tolerant import tests, compact workbook/protection/glossary roundtrip, and browser clipboard/download/batch selection checks.

### Open saved projects with their ROM (0.32.1)

Manual project opening now checks the local ROM cache and then the private cloud ROM copy before asking for an original ROM. ROM size and SHA-256 must match the workspace; cloud project responses must match the selected workspace ID. Current work is saved before switching. If no complete ROM exists, translations remain pending and the original-ROM banner explains what is required. The unused “จัดการงานและสำรองเพิ่มเติม” section and its controls are removed; automatic saving and backup status remain. Completion sounds retain their saved preference without requiring the removed checkbox.

The browser/PostgreSQL test covers the actual 32 MB sample ROM: interrupted upload/resume, SHA validation, automatic resume, manual cloud opening on a fresh device, manual reopening from local cache without another download, and deletion of the cloud ROM while retaining translations.

### Download a portable working set (0.32.2)

“ดาวน์โหลดชุดทำงานต่อ” creates one ZIP containing the verified original GBA ROM, a workspace JSON, and short Thai reopening instructions. For the active workspace the snapshot includes current unsynced translations, selected font and target categories; other cloud cards use their saved workspace. ROM bytes come from the active ROM, a matching local cache, or the complete private cloud copy, with SHA-256 verification before packaging. Downloading does not switch projects or overwrite saved work. Reopen by extracting the ZIP, opening its GBA, then File → Open backup and selecting its JSON. A playable translated ROM remains available through File → Build game. The current-work button also works without a cloud connection.

Browser tests check the actual ZIP, ROM hash, cloud workspace, unsynced local translation/font/targets, and restoring the downloaded pair in a fresh browser without login.

### Reconcile interrupted cloud deletion (0.32.3)

Deleting a cloud project now pauses that workspace’s automatic upload in memory and local storage before requesting deletion. If the HTTP response is lost, the client reads the scoped project list: absence confirms deletion; the same revision permits one retry with the original expected revision; a newer revision is never deleted automatically. Failed verification is shown as an unknown outcome with uploads paused. A failed list refresh after acknowledged deletion no longer claims that deletion failed. Local translations remain available. Business errors no longer mark the entire vault disconnected. No new SQL is required.

Checks cover acknowledged and lost-response deletion, failures before and after committing, fixed revision retries, newer-version protection, failed/malformed verification, and bounded retry counts. The browser/PostgreSQL test drops the real delete response after committing, verifies local translation preservation, and runs another sync to ensure the deleted cloud project is not recreated. This does not establish the cause of a user browser’s network/CORS failure or verify their live Supabase service.

### Keep imported translations that need shortening (0.32.4)

Excel rows that match ROM/hash/ID/offset/source can now enter the real translation field even when bytes, width or line count exceed the game layout. Review and completion messages show how many accepted rows need shortening before building a game; the existing ROM builder still rejects invalid layouts. Control-code and font errors remain drafts, identity mismatches remain excluded, and global errors still block the batch. Importing is undoable. Descriptions/Pokédex text without control codes are wrapped using the selected font and screen width. If manual single line breaks cause overflow, they are reflowed only when doing so reduces the line count; blank paragraphs remain. Names, dialogue, keep-source and control-coded rows are left unchanged. No automatic shortening changes the user's wording.

The supplied five-row workbook is tested through the standalone UI: all five translations apply, four are automatically formatted and one retains a visible layout warning, building the ROM still fails on overflow, and one undo restores the original state. Existing tolerant matching/control tests and the actual larger Gemini multi-file import are also checked.

### Stable vault reconnects (0.32.5)

A failed full sync keeps the saved library credentials and shows a retry button instead of showing the password form again. Automatic retries back off at 1, 2, 4, 8 and 15 minutes; focus/font events respect that cooldown, and a failed run discards its immediate queued rerun. Explicit retry bypasses the cooldown. A failed individual project operation displays a warning and schedules a health check; offline or a failed full health check still shows red. Repeated successful checks do not emit duplicate connection events, and background recovery does not replay the login sound. No database/schema change is required.

`tests/cloud-reconnect.cjs` exercises queued failures, focus/font event storms, cooldown, recovery, retained credentials, manual retry, task warnings and connection notifications with browser network mocks. `tests/cloud-remember-retry.cjs` and `tests/cloud-error-stages.cjs` also pass against the standalone HTML. These tests do not verify the owner's live Supabase availability.

### Compact upload progress (0.32.6)

Operation bars use a single 11px percentage at the trailing edge, reusing the Excel/ROM labels instead of generating a duplicate ROM percentage. ROM upload progress counts bytes in server-confirmed chunks, including previously stored chunks in any order and the actual size of the last chunk. Waiting requests do not advance the bar. The display caps at 99% until the server confirms the final SHA-256; the detail shows the exact acknowledged byte count while verification runs. `tests/upload-progress.cjs` checks delayed acknowledgments, resumed chunks, final verification and compact desktop/mobile/dark layouts with mocked server responses.
