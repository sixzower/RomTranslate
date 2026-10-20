# Sixz ROM QA Studio 1.0.0

RomTranslate is now a local-first ROM inspection and playtest workspace. The old Excel translation pipeline, AI settings, font editor, patch builder, cloud login and Supabase client have been removed from the application. Existing remote database contents and older browser databases are not modified or deleted.

## What works

- Open a GBA ROM up to 32 MiB, inspect its header/checksum and compute its SHA-256. FireRed/Odyssey is no longer rejected by an Emerald-only loader.
- Import a matching `sixz-translation-manifest/v1` sidecar. Inspect the original text, translation, actual encoded byte length, pointers and supplied per-window constraints. Search/filter/paginate without rendering the entire project.
- Audit actual ROM text slices and font regions against supplied hashes, verify recorded pointers, text terminators, byte limits and required source commands. A different ROM hash stops mapped checks rather than guessing offsets.
- Run the vendored mGBA WASM emulator, keyboard/touch controls, speed controls, separate test saves, import/export `.sav`, screenshots and named checkpoints (maximum 10, tied to exact ROM SHA).
- Record manual per-text review and illustrated issues; export/import reports. File checks and manual gameplay coverage are explicitly separate.
- Keep a workspace per ROM hash and save changed project metadata in IndexedDB. Reopen the last workspace without reuploading. Portable `.sixz-qa.json` backups optionally include the ROM, manifest, notes, reviews and checkpoints. Nothing is sent to Supabase.
- Dark/light themes, mobile layout, full-page drag/drop and close buttons in sticky dialog headers.

## Honest limits

A valid header or matching sidecar does not prove a ROM has no bugs. Hashes prove agreement with the supplied build metadata, not translator correctness or metadata authenticity. The inspector is a manually selected text, not a live emulator trace. Pixel previews use supplied glyph pixels and approximate Latin metrics, not the native text printer. Runtime variable expansion, clipping and story context still require playtesting. No whole-game extraction/translation percentage is inferred from mapped rows.

This release has no arbitrary map warp, story-flag editor, universal script runner, automatic semantic repair, automatic text tracing or preinstalled story checkpoints. Checkpoints are captured from a running game, or resumed from a portable QA backup made with the same ROM. Raw `.sav` files have no reliable game identity; confirm compatibility before import. Checkpoint compatibility across future emulator versions is not guaranteed.

## Develop and validate

No application dependency installation or bundling is needed. Use Node.js 22+ and Python 3. The existing cloud environment also provides Playwright and Chromium for browser tests.

```sh
npm run dev
npm run check
npm test
npm run test:browser
```

Browser tests use `http://127.0.0.1:5173` internally. An optional real-ROM integration run is:

```sh
node tests/qa-browser.cjs /path/to/translated.gba /path/to/build.qa-manifest.json
```

The emulator requires a secure context, SharedArrayBuffer and cross-origin isolation. The existing `coi-serviceworker.js` enables headers on GitHub Pages; the first visit may reload once. The app can inspect files even on a browser that cannot run the threaded emulator.

## Generate a private build sidecar

```sh
python3 scripts/qa-manifest.py /private/translation-build /private/Odyssey.qa-manifest.json
```

The generator verifies the output ROM against `project.json`, checks each reference, and derives text/font hashes from actual ROM bytes. It accepts the private Sixz Odyssey build directory (`translations.json`, `font-slots.json`, `rendered-glyphs.json`, one matching `.gba`). Keep generated sidecars, ROMs, backups, saves, screenshots and translation data outside this public repository. A sidecar can contain the project's full translated text.

## Storage

The new IndexedDB database is `sixz-rom-qa-v1`. It does not read, migrate or clear old translation/cloud credentials or project databases. ROMs are stored per SHA (the emulator also keeps a local runtime/save filesystem); reopening a previously seen ROM restores that workspace. Metadata saves happen after changes, not on a one-minute upload timer. To remove a workspace use **เพิ่มเติม → ลบงานนี้จากเครื่อง**; this removes its ROM and QA metadata only. Browser site-data eviction can erase local work, so export a backup before changing machines or clearing browser data.

`download/index.html` now leads to the online QA tool instead of serving an obsolete translator. Vendored mGBA (MPL-2.0), COI worker (MIT) and Prompt (OFL) licenses remain in the repository.
