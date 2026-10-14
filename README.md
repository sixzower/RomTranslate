# RomTranslate 0.21.0

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

Optional cloud storage reuses the font library's private-code or account connection. Run `cloud/workspace-library.sql` once in the same Supabase project (copy from the work dialog); it adds an owner-isolated table and RPCs without creating a new vault code or changing presets. The dialog lists cloud copies, restores them, saves updates and deletes a selected cloud copy. Autosync is opt-in. Revisions prevent stale devices overwriting newer work; a conflict stops autosync and retains local edits for JSON backup. Opening a cloud copy does not write another revision. Backend requests never contain ROM bytes; private connection codes stay outside the work payload.

Validation: `node tests/gemini-workspace.cjs ORIGINAL_ROM UPLOADED_XLSX`, `node tests/workspace-cloud.cjs ORIGINAL_ROM` (mocked private RPC transport), and `PGLITE_MODULE=/path/to/@electric-sql/pglite node tests/workspace-sql.cjs` (actual PostgreSQL permissions, isolation, CAS and migration repeatability). Live Supabase configuration and GitHub Pages deployment must be checked separately.


## Compact workspace (0.21.0)

The main bar keeps ROM open/build and undo/redo visible. File/work/cloud/patch operations live in **ไฟล์งาน**, import/export in **Excel**, and checks/history/preferences in **เครื่องมือ**. Font JSON/PNG/BIN tools remain in the font room's file menu. Technical IDs, ROM offsets, speaker and control-code details are available on demand.

**หมวดเกม** selects the game family; **ชนิดข้อความ** narrows it to names, descriptions or dialogue groups. Counts and export metadata still use the canonical categories. Normal all-category totals exclude unverified text; **ข้อความอื่น / ตรวจตำแหน่ง** exposes that read-only material. Progress targets remain independent of the current browsing filter.

ROM loading, builds and patch work display a foreground operation popup. Builds and quality audits can be cancelled before releasing controls. Audits yield between 25-entry chunks, report actual checked counts, and preserve missing/reordered command, layout, capacity and glossary checks. Both audit actions support cancellation/retry; reports display the first 300 issues and downloadable reports retain all issues. Emulator initialization has a 45-second timeout with retryable controls.

Validated with the supplied Imperium ROM: responsive Day/Dark layout, category/subcategory counts, ROM build cancellation/retry and error recovery, 1,500-entry quality audit cancellation/missing-command navigation, real mGBA pause/resume/Space speed, Gemini Excel draft import, portable work restoration, and mocked two-device cloud conflict protection. Live Supabase and GitHub Pages deployment require their respective external services.
