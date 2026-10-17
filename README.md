# RomTranslate 0.23.0

Static Thai ROM translation workspace. The game stays on the user's device. Live site: https://sixzower.github.io/RomTranslate/ . The downloadable `download/index.html` supports local editing and Excel; threaded mGBA testing uses the live site.

## Compact Save Cloud action (0.32.52)

The font-library master-catalog button is now **Save Cloud**, with a 16px outline cloud icon and a tooltip explaining that it publishes this device's current library as the cloud master. The library note explains that, while connected, every explicit **บันทึกการแก้ไข** already triggers automatic cloud sync; Save Cloud is not required after each edit. The existing pending/retry behavior remains in place when disconnected or an upload fails. Drawing strokes remain a local draft until explicitly saved.

## Choose this device's master font catalog (0.32.51)

**ฟอนต์ → ใช้คลังเครื่องนี้เป็นหลักบนคลาวด์** explicitly publishes the entire current catalog (including names, primary, order, groups and locks), even if the vault already contains a different catalog. The selection is captured before sign-in, so signing in cannot replace it before publication. It persists until a successful acknowledged sync, and failed uploads retain it for retry. This works independently of having a ROM open. Font files cannot be recovered from a screenshot; the button must be pressed on the browser that has the desired font data.

Saving an editor draft now replaces its source's visible library slot with the new immutable content version, retaining its order, group and primary role. Old data stays available to an already-open project and historical backups, but is excluded from the current catalog on every synced device. Locks still require unlocking before editing; a saved edit remains unlocked until explicitly locked again. Editing another preset or explicitly cloning/importing a font is still separate. Saving does not apply the new font, and reload preserves the last active project font even when its library slot has a newer version. Other devices receive the latest catalog on sync/focus/reconnect; this does not introduce a continuous realtime connection or silently change their active project font.

Validation: `tests/font-master.cjs` starts with a different cloud catalog, publishes five curated locked fonts across sign-in, replaces one font in place, checks order/primary/locks and cross-browser updates without a sixth card, and verifies the active renderer survives save/reload unchanged. Existing editor/ROM and library migration checks cover the surrounding flows.

## Save font edits without applying (0.32.50)

The pixel editor button is now **บันทึกการแก้ไข**. It durably saves the edited preset/version and draft without changing the active project font, GameFont renderer or PixelFont preview. Saved fonts remain available in the library and cloud; applying is an explicit **ใช้กับงานนี้** action. Help and margin/positioning guidance use the new wording. The editor regression verifies active renderers remain unchanged immediately after saving and after reload, that the preset survives reload, and that explicit application still reaches actual ROM output.

## One whole-system cloud save (0.32.49)

The **โปรเจกต์ Cloud** dialog now presents **บันทึกทั้งระบบลงคลาวด์** and **เปิดงานต่อ**, with deletion under the management disclosure. Redundant refresh, ZIP download, separate retry and verification buttons were removed from this dialog. Opening it still reads current server status; verification runs as part of the unified save.

The button syncs the curated saved font library, embeds its complete validated manifest and font payloads into the workspace, uploads the current translations/tasks/targets/view and original ROM, and confirms the saved workspace digest, exact embedded library and ready ROM before showing green completion. A new browser can recover missing separate font-vault rows from that project snapshot and open the backed-up ROM automatically. Unsaved font drafts require saving first; a changed project or failed font/ROM verification cannot claim completion. Existing autosave remains active. This is a coherent project snapshot with confirmed components, not a single SQL transaction spanning ROM chunks and workspace rows.

A small caption beside the autosave badge identifies the current game file and, after a successful cloud restore, the exact project name, server revision and server backup time used. Requested/failed restores do not change the caption. Successful restore origin is retained in local recovery records, without uploading another browser's origin label as project content.

Validation: `tests/system-cloud-save.cjs <private-original.gba>` exercises the actual 32MB supported ROM with the existing PostgreSQL functions through local PGlite and mocked HTTP routing. It checks unified save/readback, complete font bundle, fresh mobile continuation without a file chooser, missing font-vault recovery, project controls and failed ROM confirmation. No production SQL change is needed.

## Curated font library across browsers (0.32.49)

Private-vault sync now includes the visible font list, deletion exclusions, padlocks, ordering, groups and primary preset. Previously only custom font content was uploaded: browser-local library preferences did not follow the user, so another browser displayed bundled presets plus historical cloud versions. The first updated connection from a device with the curated library publishes that list; fresh devices never publish their default inventory merely by connecting. **For existing users, open the browser that still shows the desired four fonts once and connect it, then reconnect the other browsers.** The previous four-font selection cannot be inferred from the historical font content on its own.

Small content-addressed library manifests use the existing authenticated/code-vault font endpoints, without SQL changes, credentials in code or extra polling. Font records remain immutable and historical data is not physically deleted. Only explicit library edits publish a new manifest; unchanged syncs do not write another copy. Missing referenced fonts stop application of the manifest, preserving the local catalog. UI imports/saves and library operations mark local edits; opening a project does not redefine its library. Project-only fonts remain usable without reappearing as extra library cards. The migration captures the pre-resume catalog before loading cloud work. A preset embedded in an open project continues to render even if excluded from the visible library. Edits against a previously observed manifest merge changed fields and additions/deletions with the latest fetched manifest, preventing a stale browser's unrelated lock/group edit from resurrecting a removed preset. Simultaneous writes still use immutable snapshots and deterministic revision ordering, not a server-side transactional settings API. Manifests count toward the existing vault's 1,000-record limit; this does not reset or enlarge that quota.

Validation: `tests/font-library-sync.cjs` simulates the old four-locked-font browser and six historical cloud fonts, fresh/previously polluted browsers, refresh, curated locks/order/group/primary, repeated no-write syncs, stale edits after deletion and an intentional new preset. Source and standalone HTML are tested with private endpoints mocked; production private-vault contents cannot be inspected from this environment. Existing font identity/migration and lock/edit/delete behavior remain covered.

## Whole-font game margins and positioning (0.32.48)

In **ฟอนต์ → ออกแบบ**, expand **ระยะขอบและจัดตำแหน่งทั้งชุด**. Choose a 4–16px-wide frame, a 7–15px target height, individual margins, proportional fit or original size, and horizontal/vertical alignment. Before/after examples include the real 15px and 12px game renderers plus a selected-glyph frame view. Apply stages the placement for the whole draft; one-pixel arrow buttons move the entire set, with atomic undo/redo and reset. Saving uses the existing explicit preset/project apply flow and locked fonts remain protected.

Placement metadata transforms composed Thai clusters using a common origin and scale at each bank height, preserving relative vowel/tone positions and original raw matrices/native composites. It is stored in preset JSON, project/cloud font data and translated-ROM recovery metadata. Actual ROM glyph tiles, advances and width checks use the same placement. Out-of-frame moves are rejected rather than cropped; edited glyphs that no longer fit produce a repair action leading back to these controls. Missing source glyphs remain reported; fitting does not invent them. Bitmap resizing can merge fine details, so review the examples before saving.

The verified game uses 12/14/15px banks; a 16px-high game frame is disabled. Small-bank vertical margins scale proportionally, and game line spacing is unchanged. This is sizing within the supported game's font system, not automatic support for arbitrary GBA engines or a conversion to independently drawn 7–16px typefaces. Fonts without placement metadata retain byte-identical rendering.

Validation: `node tests/font-layout.cjs` checks a fixed legacy-renderer golden digest, common transforms, source isolation, cancellation and rejection of unsafe bounds. `tests/font-positioning.cjs <private-original.gba>` checks staging, apply/undo/reset/arrows, locks, reload, source and standalone layouts, and compares actual patched ROM glyph bytes/advances and recovered metadata. Existing pixel-editor/export/ROM and repair-navigation regressions also pass. No SQL or new cloud polling is required.

## Jump from failed font checks to the offending glyph (0.32.47)

Failed checks on font cards and the selected-font inspector are now small red **กดแก้ไข** actions. Structured diagnostic targets identify the actual glyph and, for native frame overflow, the first offending source pixel; composed vowel/tone failures resolve to the mark rather than assuming the base consonant. Clicking opens the pixel editor on that glyph, clears filters that would hide it, and focuses the identified grid cell. Missing glyphs open at the start of their own grid. Font metadata validation failures focus the name field.

The repair panel groups failures by glyph and offers a selector plus previous/next navigation. Draft edits trigger a debounced check; repairing a glyph marks it resolved without moving away while drawing. Remaining glyphs can be chosen explicitly, and a fully valid draft shows green with a reminder to save. Returning to the same source retains its current draft; switching sources uses the existing dirty-draft confirmation. Locked sources require explicit unlock confirmation, and declining either confirmation leaves the lock/draft intact. Merely opening a failure never applies the font to the project; saving retains the existing new-version behavior.

Validation: `tests/font-issue-jump.cjs` covers card/inspector entry, missing upper/lower marks, filter clearing, draft reuse and cancellation, lock confirmation, exact native composed-mark overflow at column 12/row 16, repair to green, unchanged active font before saving, source preservation, and mobile/light/dark operation. Tested source and standalone HTML together with the card, gallery and editor regression checks.

## Full alphabet popup (0.32.46)

Click a font sample on its card or in the inspector to open its complete glyph inventory. The popup works for locked and unlocked presets, showing every stored glyph exactly once, with consonants, leading/upper/lower vowels and marks, other vowel symbols, digits and spaces grouped by actual character. This also handles bundled/native presets whose category metadata differs. Raw previews preserve full 8×16 or 16×16 pixels and source shadows; missing shapes are labelled. The optional 15px Thai composition mode supplies ก as a base for marks/vowels, and the 2×/3×/4× zoom changes the gallery size. The UI explains that game digits/English still use the original ROM font.

A simple click/tap opens the popup; moving from the same canvas still drags/swaps, and mobile swiping still scrolls. Canvas previews are keyboard-accessible with Enter/Space. The shared pinned × and Escape close the modal; each opening starts at the top. Viewing, changing modes/zoom and theme redraws preserve the active project font and pixel-editor draft.

Validation: `tests/font-glyph-preview.cjs` covers the complete 85-glyph inventory, exact raw alpha pixels including native matrices, vowel/mark/digit groups, mode/zoom, locked/unlocked and inspector entry, keyboard/touch, drag/swipe exclusion, pinned × after scrolling, unchanged active fonts/draft and mobile/theme overflow. Tests run against source and downloadable standalone HTML; font card/lock/workspace regression checks also pass.

## Minimal font cards and renderer compatibility checks (0.32.45)

Padlocks use small stroke SVGs with transparent backgrounds and no border, including disabled states. The three main tabs include matching minimal translation, controller and typography icons while preserving their labels. Font previews now use three shared lines, larger cards and full-width mobile cards for clearer shape comparison; the inspector also uses a larger sample. Unrenderable sample clusters show a labelled □ placeholder while retaining the rest of the example, rather than blanking the whole canvas.

Every unlocked card is a drag surface, including its title, preview and empty space; the lock button is excluded. Mouse dragging swaps after a movement threshold; mobile swiping scrolls and holding for 200ms before dragging swaps. Both document scrolling and an internally scrolling font workspace are supported. Locked sources/targets remain protected. Ordinary clicks only select a card, dragging never applies a font, and the up/down alternative remains available.

Small green/red labels report **ผ่านการตรวจฟอนต์เกม** / **ไม่ผ่านการตรวจฟอนต์เกม** using actual JSON validation and the same `GameFont` rasterizer used for ROM font allocation at 15px and 12px. Checks cover Thai glyph inventory, missing/blank shapes and representative stacked vowel/tone clusters; malformed output and overflow fail. Selected-font details explain failures and explicitly distinguish renderer checks from playing a completed ROM. They do not certify every game, every possible character combination or ROM font-bank capacity. Results are cached by font contents and checks/previews restore the active project font. No server traffic is added.

Validation: `tests/font-card-ui.cjs` checks SVG styling/tab labels, dragging from title/canvas/padding, lock protection, swipe versus touch hold/drag, larger examples, green/red states from missing/native-overflow glyphs, repair to green, active-font isolation and desktop/mobile layouts in both themes. Existing font lock and workspace regression tests continue to cover persistence, native editing/exports, deletion and project font behavior. Tested source and downloadable standalone HTML.

## Visible deletion for bundled fonts (0.32.44)

The selected font's **ลบฟอนต์** action is now visible next to Use/Edit/Primary, outside collapsed management controls. Built-in sources follow the same unlock-and-confirm flow as imported presets. The hint explains unlocking, local removal scope and the last-font safeguard; the last remaining font's delete action is disabled. Removal records both preset ID and content fingerprint, so subsequent cloud font downloads cannot recreate a removed bundled font under its hash ID. Hidden bundled source matching also covers removals made before this update. Explicit imports and project-embedded fonts retain their existing restoration behaviour.

Extended `tests/font-locks.cjs` verifies the initially visible button, lock and cancel protection, renamed/original bundled sources staying removed through reload and cloud import, removal of every bundled preset, usable custom fallback, and the last-font guard. These checks pass for source and standalone HTML.

## Editable presets, locks and drag ordering (0.32.43)

Every preset, including bundled sources, can be opened for pixel editing, renamed, grouped or locally removed after unlocking its top-right padlock. Bundled fonts start locked; imported/custom fonts start unlocked. Locks persist locally and block rename, removal, group changes, swaps and edits to an already-open draft (including keyboard, undo and saving). Use, copy and export remain available. Saving a pixel draft creates/applies an edited version; its source stays available. At least one font must remain. Removing a bundled source hides it persistently on this device; removing an active font applies an available fallback, including after reload.

Card sizes come from actual glyph matrices (8×16 and/or 16×16), with native game height shown separately. The pixel grid, copy/paste, transforms and raw preview support the complete 16-column native image, preserving colour indices and synchronizing its 8-column compatibility rows. JSON retains native data; native PNG and 4bpp export use full 16×16 cells (tiles in top-left, top-right, bottom-left, bottom-right order), including source shadows. Standard 8×16 export remains byte-compatible. Game font height limits still apply; the preview reports out-of-bounds designs.

Drag the ⠿ handle onto another unlocked card to swap positions using mouse or touch; locked cards cannot be moved or used as swap targets. Up/down buttons provide a keyboard alternative, respecting the current filter. Locks, ordering and removal preferences are local device settings, as stated in the library. No SQL or additional cloud traffic is added.

Validation: `tests/font-locks.cjs` exercises every bundled preset, API/UI/draft lock enforcement, native pixels beyond column 8 through saving and game rasterization, exact native PNG/4bpp bytes, desktop and real touch pointer swaps, locked targets, persisted locks/order, bundled rename/delete, reload fallback and both themes on mobile. Existing font workspace and editor tests also cover standard exports and an actual built/recovered ROM. These checks run against source and standalone HTML.

## Unified font workspace (0.32.42)

**ฟอนต์** is now the single entry for the library and pixel editor. The former font-menu command opens the same workspace. Its header separates the font actually applied to the current project from the primary font used for new projects on this device. Library cards show previews, groups and active/default badges. Selecting or importing a JSON font previews it without applying it; **ใช้กับงานนี้** explicitly changes the project. **เปิดแก้ไข** opens a separate draft, preserving the original preset; saving creates/applies the edited content version. Existing pixel tools, shadows, spacing, undo/redo and JSON/PNG/BIN export remain available. Additional source/export information is collapsed.

Library management supports copies, custom-font renaming, named groups, ordering within the filtered list, selected-font JSON export, a persistent primary choice and confirmed local removal. Built-in sources remain available; copy them before renaming/deleting a derivative. Removing the active custom font switches the current project to the primary (or bundled default). Locally removed IDs are skipped by subsequent font-library downloads on this device. Explicitly reopening a project that embeds that font can restore it because the project must retain its font.

Grouping/order/primary/removal preferences live on this device, not in a new cloud table; the UI states this scope. Local removal does not delete server font records or fonts embedded in older projects, and does not free cloud storage. Font content and the active project font continue using the existing cloud synchronization. No new SQL or cloud polling is introduced. This distinction also means another device can display a different library ordering/default while restoring the same active project font.

Validation: `tests/font-workspace.cjs` passes for source and standalone HTML, exercising preview isolation, copies, nonactive rename, grouping/order, primary persistence, dirty-draft switch cancellation, save-as-new, primary use for a fresh ROM, project font changes, active deletion fallback, ignored local tombstones during cloud import, inactive JSON upload and reopen at desktop/mobile sizes in both themes. The updated `tests/font-editor.cjs` also passes with the original ROM, covering real drawing/undo, exact PNG/BIN/JSON output and inclusion of the edited font in the built/recovered ROM. Local rename persists metadata before replacing the stored font, with rollback on database failure; library imports require successful preset storage before reporting success.

## Status colours, backup payloads and target presets (0.32.41)

Working/confirmed system status messages use the theme's green success colour; errors and partial failures use red, while idle instructions remain neutral. Cloud connection text, both cloud settings views, local/cloud backup receipts, save indicators, Excel repair, font operations and patch operations expose explicit states. Failed automatic workspace backups remain visible in red without repeatedly opening an error modal. Explicit foreground failures retain their popup. Failed writes never advance the confirmed save marker, and the next sync can retry through the existing CAS/readback safeguards.

Cloud workspace uploads omit undo/checkpoint history, retaining current translations, original identity checks, fonts, targets, work scopes and the current view. Undo history remains in local storage and local project exports, and same-device reconciliation preserves the local history. This avoids resending potentially large checkpoints on every save. Fresh devices receive the current working state without the previous device's undo stack. The write RPC budget is now 60 seconds and the browser allows 75 seconds; existing installations should run [workspace-save-fix.sql](cloud/workspace-save-fix.sql) once. That script only changes per-function timeout settings, without replacing save logic or touching data. It cannot fix an unavailable network or service.

**จัดกลุ่มงานแปล → ชุดเป้าหมายสำเร็จรูป** offers **แปลไทยแนว Sword & Shield** and **เฉพาะเนื้อเรื่องและเมนู**. These select canonical categories, preserve existing words, honour Excel exclusions and sync through the existing project. The first translates dialogue, menus, descriptions and descriptive information while retaining proper names in English. It is an editable starting policy, not a claim that every category in another ROM was automatically identified. The supplied Sword & Shield TH v1.7 ROM was checked for English Pokémon, item, move and ability names: examples include Bulbasaur/Ivysaur in adjacent 11-byte slots, Master Ball/Potion 12 slots apart at stride 44, and Pound/Tackle 32 slots apart at stride 13. No game binary or full text dump is published.

Validation extends `tests/progress-cloud.cjs`: real PostgreSQL with isolated desktop/mobile browser contexts verifies presets, cloud payload omission with local history retained, green success in both themes, red backup errors, no background failure popup, unconfirmed state after failed writes and successful retry. Passed for source and standalone HTML. Timeout migration, login/retry and existing merge/CAS checks pass; real production latency and lock contention are not reproduced by the local backend.

## Pinned popup close buttons (0.32.40)

The shared × button stays at the dialog's upper-right edge when its content scrolls. Its position follows dialog size changes and viewport resizing, including mobile visual-viewport changes, while preserving existing close/cancel actions. Checked all 24 shared dialogs with long content at 1280px and 390px in light/dark themes, on both source and standalone HTML: the close button stays visible, aligned and clickable after scrolling to the bottom; clicking it closes the notice dialog.

## Shared translation targets and progress (0.32.39)

Target groups and subcategories are explicit fields of the existing cloud workspace, together with active/paused work scopes and their canonical entry IDs. Snapshots materialize the actual target selection, and workspace hydration restores it centrally. An explicit empty selection remains empty. Percentages are derived from the current canonical ROM entries, actual translations and keep-source choices; drafts and excluded categories do not count. No separate saved percentage can drift from the project data.

Changing target checkboxes saves locally immediately and requests cloud backup after a 1.5-second pause when connected. The normal translation autosave timing remains unchanged. The group dialog shows pending versus confirmed cloud save; switch devices after confirmation. A database/network failure still leaves the local changes pending. No additional tables, ROM copies or SQL upgrade are needed for this feature. Existing installation/read migrations remain necessary if not already applied.

When both devices edit different category checkboxes against a common confirmed snapshot, their per-category changes merge independently instead of conflicting over the entire target array. Ambiguous divergent selections without a common snapshot still use the existing explicit conflict flow. Translation conflicts keep their existing protection.

Validation: `tests/progress-plan.cjs` covers explicit target snapshots/hydration, empty goals, exact derived progress and 512 three-way category combinations. `tests/progress-cloud.cjs` uses real PostgreSQL workspace RPCs with two isolated browser contexts and a pre-backed-up ROM fixture served through the normal chunked ROM transport. Desktop checkbox changes auto-save; fresh mobile Chromium login restores the ROM, scopes, goals and matching progress without a file chooser; reverse sync and empty-target reopen preserve the same single project. Passed on source and standalone HTML. This validates the application flow with a local test backend, not the user's live private Supabase connection or physical iOS Safari.

## Inline Excel import editing (0.32.38)

The import preview now exposes editable rows even when they pass validation. Open a row to compare its source, edit Thai, and choose **ตรวจและใช้คำแก้**. The staged result displays actual bytes from the shared font allocator, the canonical ROM limit, pixel width and line count; scrolling text is labelled as total lines with scrolling. Editing clears the displayed result until explicitly rechecked. The project changes only on confirmed import. Rows are revealed in groups of 30 to keep large workbooks manageable; existing error editors remain available.

Verified capacities from the current ROM apply during import, including the four 256-byte link messages and expanded move descriptions. An old workbook's `max_bytes=71` cannot reduce the verified link-message bound or grant extra space to unverified entries. `tests/link-message-import.cjs` imports the screenshot's exact 96-byte Thai text from a real old-budget workbook, checks 96/256 and scrolling, tests inline overflow/fix and cancel isolation, then builds/reopens the ROM with exact words and original SHA. Passed for the source app and downloadable HTML. The existing 68-entry move-description import/build regression also passes.

## Project download timeouts (0.32.37)

For `เปิดโปรเจกต์ ... [57014]`, run [workspace-read-fix.sql](cloud/workspace-read-fix.sql) once in the existing Supabase SQL Editor, then open the latest website and retry the project. Existing workspace timeout SQL configures writes only; it does not fix the default read RPC budget. This upgrade preserves project IDs, revisions, translations, ROM chunks, fonts and passwords. It creates no stored copies and changes no global role timeouts. The combined installation SQL and copyable workspace setup include it.

Project reads now use a private, read-only RPC with responses bounded to 262,144 Unicode characters. Owner authentication is evaluated once per request and the existing primary key selects the workspace. Every part is checked against the initial revision, and the browser verifies SHA-256 over the reassembled UTF-8 JSON before handing any payload to the workspace loader. A save or delete during download fails safely instead of opening mixed revisions. The new RPC and existing get/list RPCs have a per-function 60-second statement budget; the browser permits 75 seconds per request. No write response is retried by this change. Installations missing the new RPC retain the old reader until the SQL upgrade; a database timeout identifies the exact migration rather than repeatedly downloading the full payload.

Validation: `tests/workspace-read.cjs` exercises repeatable migration and real PostgreSQL reads with 27,166 Thai/emoji entries, exact payload/checksum, revision-change rejection, damaged-response rejection, read-only execution, code/user isolation and direct-table denial. `tests/workspace-read-browser.cjs` exercises the actual source and standalone browser transport, bounded downloads, network retry, old-installation fallback and timeout/conflict messages without mutations. PGlite and routed browser responses cannot establish performance or timeout settings in the user's live Supabase project; the migration must be run there by its owner.

## Link message-box text bounds (0.32.36)

The screenshot entry `$309F4A` uses the link-message wrapper at `0x138D8C`: `StringExpandPlaceholders` (`0x2162DC`) writes into `gStringVar4` (`0x0203EBDC`), then the native message-box printer (`0x175004`) displays it. Its 71-byte source length is not the buffer capacity. Four exclusively verified wrapper-owned strings now allow 256 encoded bytes and use scrolling 208 px message-box layout, including the original SCROLL/PARA/VAR tokens. Call targets, scratch-buffer literal, pointer ownership and the pinned ROM hash are checked; shared/unproven strings retain their existing limits. No new machine-code patch is required for these messages.

The editor now labels scrolling text as a total line count and “เลื่อนข้อความได้”, rather than a confusing line-limit ratio. Reloading restores existing words onto the corrected canonical metadata. Tests use the exact screenshot text (96 encoded bytes), build/reopen a ROM, exercise the actual native wrapper and placeholder copier in Unicorn with graphics endpoints mocked, and verify a guarded full 256-byte font-0 payload, busy-state behavior, saved registers/stack, browser status and translation persistence. This does not claim a physical multiplayer session was played through.

## Duplicate Excel import notices (0.32.35)

Confirmed imports record up to 500 recent project-scoped file receipts: SHA-256 of the original workbook bytes, filename, time, accepted/draft counts and partial status. The import popup detects identical bytes even after renaming, shows the previous confirmation time and distinguishes partial imports. A changed workbook with the same filename is identified as a new version. Receipts warn without blocking deliberate reimport after undo or edits; previews, cancellation and rejected files do not create receipts.

Receipts travel with local/project backups and the existing cloud workspace. Concurrent clients merge receipts by fingerprint/latest timestamp without creating translation conflicts. No additional cloud table or SQL is required. Historical fingerprints/times cannot be reconstructed for pre-upgrade imports; current matching words still produce an already-present notice. Final post-layout comparisons also recognize previously normalized Thai clusters and wrapping as unchanged, preventing those rows from appearing as new translations on every import. No Excel bytes are added to the workspace payload.

## Relocatable move descriptions (0.32.34)

The screenshot entry `$326790` was incorrectly limited to its original 54 encoded bytes despite using a relocatable pointer. On the pinned Imperium ROM, 48 contest descriptions and 20 distinct advisory descriptions now allow 256 encoded bytes, including EOS. Advisory text passes directly to the native printer; contest descriptions also require real runtime changes. Both contest stack frames expand from 80 to 280 bytes, preserving stack alignment and reserving 256 text bytes after their 20-byte outgoing-argument area. Two absolute Thumb jumps dispatch to pool-resident wrappers: newly relocated contest strings copy already-laid-out bytes, while original strings retain the existing formatter and its fifth argument. This also prevents the old byte-splitting formatter from interpreting a font-0 control argument as a word boundary. Text checks use the verified 119 px contest and 96 px advisory areas, with three lines.

The change is restricted to table-owned pointers at `0x52F3F8` (48 entries) and `0x6315EC` (20 distinct non-shared entries), compiled consumers at `0x0DFA4C`, `0x0DFAF0` and `0x14390C`, and the exact original ROM SHA-256. Shared strings, inline names and unknown consumers retain their old limits. Runtime instruction/BL-target signatures, free-pool bounds, font allocation, tokens and screen checks remain enforced. Runtime patches are installed only when an edited contest string requires them and are included in the existing reversible ROM manifest. Old Excel budgets are informational; current canonical ROM metadata determines validation. Reloading restores words onto freshly scanned metadata, so existing work need not be discarded.

Tests build/reopen a real ROM, preserve original source bytes, recover the exact original hash, import a 68-row old-budget workbook, and execute the actual ARM consumer functions in Unicorn with graphics endpoints mocked. They verify exact copied bytes, a full 256-byte payload including font-0 codes, stack/register preservation, original-text fallback and advisory pointer use. This is not a claim that every screen was manually played through or that arbitrary GBA ROMs have expandable buffers.

## Repair imported translations before applying (0.32.33)

The import dialog offers **ลองแก้อัตโนมัติ** and inline **ตรวจและใช้คำแก้** fields for matched rows with errors or glossary warnings. Automatic candidates normalize whitespace/reflow, compact two known menu phrases and use only user-defined English-to-Thai glossary terms outside control blocks. Candidates must retain control-code order and improve validation; there is no arbitrary truncation, generated translation, invented code placement, identity repair or font substitution. The complete candidate set is then checked again with a shared font allocator including existing project translations. Remaining failures stay visible and can be edited in the popup; missing codes remain drafts until a valid correction is supplied.

Repairs stage changes only. Project/history/cloud state changes at the existing import confirmation and can be undone as one import. After applying, an issue links directly to its entry in the editor. The drop overlay, import dialog and editing controls use the bundled Prompt font. Regression tests cover safe formatting, menu compaction, glossary replacement, preserved long text, inline edits, invalid/valid tokens, apply/undo and font selection.

## Distinct Excel filenames (0.32.32)

Export filenames begin with `[ส่งให้AI]`, then category, batch index/total, row range, a bounded game label and an export timestamp. The matching returned filename begins with `[แปลแล้ว]`; it is shown beside the source name in the export preview, written in Instructions and requested verbatim in the copied/embedded prompt. ZIP names and their manifest use the same convention and record the suggested returned name. Names are sanitized and byte-limited; redundant filter counts/labels are omitted from filenames. Import still validates ROM/entry/offset/source data and accepts arbitrary filenames, so an AI ignoring the naming instruction does not prevent import or establish translation completeness.

## Whole-page Excel drops (0.32.31)

Drag one or more `.xlsx` files onto the page to open the same reviewed import as the file picker. A full-page hint appears during file drags; text selection/dragging retains its native behavior. The drop handler prevents file navigation, rejects mixed file types, requires an open project and refuses concurrent operations or open dialogs. It passes File objects directly to the shared importer without assigning an input's files or requiring DataTransfer for internal restores. No translations change until the existing apply step.

## Excel import audio (0.32.30)

After applying a clean import, a short ascending tone confirms completion. A distinct descending tone signals unreadable files, blocked rows, missing/untranslated rows, drafts or layout failures. Partial imports retain the warning tone rather than implying everything passed. Cancellation is silent; audio uses the existing local Web Audio preference and browser gesture unlock, with no audio downloads.

## Excel import receipts (0.32.29)

The review dialog and retained post-import receipt distinguish applied translations, layout failures, retained drafts, blank cells, unchanged rows and rejected identities. Success counts use accepted unique entries, never warning counts. Errors show file/sheet/original row/entry ID, source and a suggested fix; the downloadable report includes fixes and missing/blank rows. Green/red text adapts to both themes and the dialog fits mobile widths. Applying still uses the existing identity checks, one history checkpoint and blank-preservation behavior.

New exports keep a hidden, chunked entry-ID manifest in the existing Instructions sheet. Imports can identify missing IDs when that manifest and ROM hash remain intact; older files only offer the declared row-count comparison. No importer can prove completeness if both the rows and their reference metadata have been removed or altered. Missing rows are reported without deleting existing translations or blocking intentional partial imports.

## Resilient shared workspace workflow (0.32.28)

- Before sending, persist a per-tab pending snapshot in IndexedDB. Reload restores that tab's pending draft, even if another tab saved to the shared local cache. Connectivity/visibility return resumes cloud synchronization; the UI distinguishes local persistence from cloud confirmation. Closing a browser or killing a mobile app during an unfinished storage operation cannot be guaranteed to flush data; mobile OS behavior still needs physical-device testing.
- Confirm an ambiguous workspace write by reading back its payload and revision. Retry only once after confirming that the expected version is unchanged. Never mark an unknown result saved or overwrite a newer revision. A known identical cloud payload avoids another write after reload.
- Coordinate uploads per library with Web Locks, falling back to a renewable IndexedDB lease. Recheck lease ownership before workspace writes; server CAS remains the cross-device safeguard. Automatic saves stay in the background, coalesce for 12 seconds (up to 30 seconds while typing), and keep the initial ROM backup prompt. Different devices can still edit concurrently; actual same-field conflicts require a choice.
- **เลือกคำแปลที่ขัดกัน** appears only when a real conflict exists. Choose local/cloud values per field or for all conflicting fields. Only 50 conflicts render per page. The server revision, account scope and local edit timestamp are rechecked before applying; canceling preserves both versions. Task cursor differences retain the earlier automatic merge behavior.
- **โปรเจกต์ Cloud → จัดการโปรเจกต์ → ตรวจความพร้อมข้ามเครื่อง** reads the actual server payload and verified ROM metadata, compares a deterministic checksum of translations/font/target categories, and records the verified revision and time. Subsequent edits invalidate the displayed receipt. This does not establish that the production account has a complete ROM until the user runs the check successfully.
- `release.json` and `release-info.js` are generated by `npm run bundle`. An update banner checks on startup/focus and periodically. The update button first persists local work, sends authenticated pending work, verifies a restorable source, then reloads with the new version. It refuses to reload while authenticated cloud changes are still pending/offline. Downloaded `file:` copies do not poll for updates.

No new SQL, bucket, login method or cloud service is required. Existing ROM/workspace migrations still need to be installed. Tests exercise lost acknowledgments, CAS conflicts, two tabs with both lock backends, expired leases, per-tab draft recovery, conflict UI and actual PostgreSQL-backed 32 MB ROM round trips. Browser mobile emulation is not a physical Safari/iPhone test.

## Stable Cloud project dialog (0.32.27)

The page and menu are named **โปรเจกต์ Cloud**. Repeated cloud checks reuse the same project card and action buttons, updating only changed text. Confirmed ROM availability remains visible until a new result arrives; background checks no longer dim the controls or briefly clear the backed-up flag. Foreground actions still show their busy state and operations remain serialized. Delete/download handlers read the current project revision rather than the revision at card creation. Status space is reserved to reduce layout jumps. No SQL update is needed.

A mobile browser regression observes the DOM through background synchronization and verifies stable node identities, readiness text, backup-button visibility and primary-button state.

## One ROM restore progress window (0.32.26)

Automatic restore uses one foreground progress dialog for metadata lookup, download and ROM scanning. The login window closes when restore starts, and the scanner updates the same dialog instead of opening a second operation window. Cached startup restore also avoids starting an overlapping loader. The shared dialog closes when scanning finishes, before subsequent background sync. Preparation/download can be canceled; scanning retains its existing non-cancellable behavior. No SQL change is required.

## ROM backup timeout (0.32.25)

For `57014` while backing up ROM (after translations have saved), run [rom-timeout-fix.sql](cloud/rom-timeout-fix.sql) once in the existing Supabase SQL Editor. This updates only the ROM RPC and keeps all uploaded chunks, translations, fonts and project IDs. The previous workspace-timeout SQL does not configure this separate RPC.

ROM info/download reads no longer acquire a write lock on the file. Writes retain their file lock, advisory-lock contention returns promptly, and the RPC has a 60-second statement / 2-second row-lock limit with a 75-second client allowance. Finalization checks chunk counts and sizes first and computes SHA-256 inside the SQL query, returning only the digest rather than another whole-file buffer to PL/pgSQL. Full-file hash verification remains required. Remembered sign-in also waits for page initialization so it cannot run before the workspace module loads. The UI identifies begin/put/finish/read stages and shows the verification phase before declaring completion. Retrying resumes confirmed chunks.

Tests verify repeatable migration with a partially uploaded file, read-only info/download transactions, configured timeout limits, corrupt/incomplete rejection and real 32 MB end-to-end restore. These local checks do not prove the cause or resolution of a timeout on the user's production database.

## Merge work-task state across devices (0.32.24)

Work-task arrays are merged by task ID rather than treated as a conflicting translation field. Independent tasks are retained, cursor differences do not stop backup, scope settings stay together, and only one task remains active. Completed/canceled tasks are not reactivated by another device's stale active state. Three-way deletions of unchanged tasks are honored. Simultaneous scope-setting changes use the confirmed cloud settings; unsent changes to actual translation text still use the existing conflict protection. No SQL update is required.

Tests cover task cursors, active/completed/deleted states, valid scopes, unchanged inputs, preserved 7,035 translated rows and real-ROM cloud backup/resume with differing task positions.

## Visible automatic ROM restore (0.32.23)

Password sign-in and the explicit retry button now retry latest-workspace restoration even if an earlier attempt was canceled or found an empty library. Ordinary background synchronization still respects cancellation. The ROM progress dialog opens before cloud workspace lookup, shows metadata preparation separately from confirmed download progress, then hands off to the ROM scanner. Missing or incomplete ROMs keep their pending translations and display an immediate reason after login instead of only a generic connection-success message. Waiting devices continue checking for a completed backup.

Local regression tests cover the initial mobile loader, partial/missing-ROM feedback, explicit retry after cancellation, and actual 32 MB ROM restore with PostgreSQL. The user's production library is not directly accessible here; a production ROM backup must still complete on the source device.

## Pokémon translation prompt (0.32.22)

The eight-rule Excel prompt adapts language QA guidance from [game-localization-qa](https://github.com/memolyviza2012-max/game-localization-qa), revision `1b35f87`, by Danaiwit (memolyviza2012-max), under [MIT](vendor/GAME-LOCALIZATION-QA-LICENSE.txt). Attribution and the full license are also embedded in the downloadable HTML's script.

The prompt adds natural idiom translation, neutral pronouns when identity is unknown, category-specific style, preservation of mechanical facts, and consistent terminology within the same context. Kept English names are exempt from “untranslated” checks. It preserves the existing workbook identities, code order, selected scope, batch boundaries and real ROM layout checks. No AI service, new review workflow, external skill installation or automatic rewriting of existing translations is added. AI compliance and language accuracy still require validation in the actual game.

## Open latest work before font sync (0.32.21)

After password validation (or explicitly remembered sign-in), restore the latest shared ROM/workspace before reading or uploading the font library. A slow or failed font request no longer prevents the ROM restore step from running. No extra SQL is needed for this ordering change. Existing missing-ROM, unsent-edit and conflict guards still apply.

## One shared project (0.32.20)

Every connected device follows the primary cloud workspace for the same ROM. Old device-specific IDs adopt the primary ID before saving. A persisted local snapshot enables three-way merging of edits to different fields; existing nonblank translations are preserved when an old cloud copy has blank/missing rows. Concurrent changes to the same field stop with a conflict message; neither version is silently overwritten. Source text and ROM hashes must match. Cloud updates are checked on focus, before saving and once per minute while visible and connected. Sign-in still requires a password unless remember is explicitly selected.

Run [workspace-single-project.sql](cloud/workspace-single-project.sql) once in the existing Supabase SQL Editor. It includes the backup timeout fix and prevents old browsers from writing a different workspace over the primary one. Existing data are preserved; older cloud copies are removed only after the primary ROM backup completes. Opening a different ROM requires finishing/removing the current cloud project first. A missing/incomplete ROM still needs the original device to complete its backup once; translation JSON cannot reconstruct the ROM.

Local tests cover 7,035 preserved translations, disjoint edits and conflict rejection, original ROM recovery on touch/mobile Chromium, and real PostgreSQL RPCs. The private production library and physical iOS Safari have not been accessed from this environment.

## Workspace backup timeout (0.32.19)

For `57014` during project backup, run [workspace-save-fix.sql](cloud/workspace-save-fix.sql) once in the existing Supabase project's SQL Editor, then retry **สำรองตอนนี้** from the device holding the ROM. This preserves all data and revisions. The migration preserves the installed write functions and sets only the two backup RPCs to a 60-second statement limit / 2-second row-lock limit; PostgREST reloads its schema configuration. The browser allows 75 seconds for these writes and never automatically retries an ambiguous write response. A project write must finish before ROM backup starts.

Tests verify large Thai payload preservation, permissions, revision conflicts and timeout feedback locally. They do not establish the cause of a production timeout or verify the user's live backup; persistent timeouts require Supabase database logs (query duration / lock waits / resource load).

## Cloud sign-in (0.32.18)

Remembering sign-in is now off by default. Without explicit opt-in, credentials stay in memory only and reload/new tabs require the admin password. Legacy default-on remembered sessions are cleared once; font and workspace data are preserved. Selecting remember explicitly enables future automatic connection.

## Cloud continuation (0.32.17)

Cloud and cached-ROM restores now call the ROM loader directly with in-memory bytes. They never create `File`/`DataTransfer` objects, assign `input.files`, invoke a file-input change handler, or open a device file picker. Only **เปิด ROM ใหม่** explicitly chooses a new local game. Unsupported/unrecoverable cloud ROM bytes fail with an explicit error and preserve the active workspace instead of entering the legacy original-ROM file chooser. This avoids reliance on file-input APIs that vary across mobile browsers; remembered login, latest translation payload, font, target categories and task/view restoration use the same guarded workspace path.

The project dialog shows one latest workspace, its server-verified ROM availability, and one resume action. Refresh, ZIP backup, a retry for an unsaved local workspace, deletion, and backup timestamps share one collapsed **จัดการโปรเจกต์** menu. Duplicate standalone ROM download/upload/check/delete controls are removed. SQL setup lives in library administration. Removing a cloud project still deletes its ROM chunks through the existing cascade and pauses its local autosave.

If the server has only translations, the mobile page states **พบคำแปล · ยังไม่มีไฟล์เกมบนคลาวด์**; partial backups show actual stored chunks and percentage. The cloud flow no longer presents a local-ROM attachment dialog. A device holding the original bytes must finish its automatic backup once; another device cannot reconstruct missing ROM bytes from translations. When ready, waiting tabs resume automatically; cancelling a staged/downloaded automatic resume still prevents reopening in that tab. Network/setup errors stay distinct from a missing ROM.

The source ROM is uploaded as resumable 256 KiB chunks and verified with SHA-256 on the server and client. Editing translations does not re-upload a ready ROM. Exact same-hash ROMs from older workspace IDs can supply the source bytes for the latest translation payload. Older workspaces and cascading ROM chunks are removed only after the latest workspace and ROM are confirmed. Local data and fonts remain; revision conflicts protect edits made on another device. No SQL migration is needed for this client release.

Browser validation uses a touch/mobile Chromium context with `DataTransfer`, `File` construction, and `input.files` assignment deliberately blocked; WebKit/Safari is not installed in the development environment. These tests do not establish whether a particular production account has uploaded its ROM successfully.

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

### ROM font file diagnostics (0.32.7)

The font reader now distinguishes unsupported extension/archive, empty/truncated files, oversized files and disk read errors. Rejections include the actual filename and byte count instead of the same generic size message. The existing 192-byte–32 MiB input bound is unchanged. FileReader events report actual local read progress, followed by SHA/profile detection; this feature does not upload the ROM. Selecting the same file again retries the read. Closing/reopening invalidates a previous read so stale errors cannot replace the current result. The original 16 MiB Seaglass TH source was verified to extract and save unchanged glyph pixels, advance and composites; the user's screenshot alone does not establish the rejected file's size or identity.

`tests/rom-font-file-input.cjs` covers the actual Seaglass source, preset pixel fidelity, retry, zero-byte/wrong-type/oversize diagnostics and read errors. `tests/rom-font-ui.cjs` covers known/manual extraction, persistence and mapping controls.

### English coverage, full intro and Seaglass supplement (0.32.8)

The pinned Imperium source now returns 27,123 detected entries, including 18,393 eligible translation entries and 8,730 read-only/no-text entries. Dialogue increases from 4,425 to 7,096. All seven opening sequences are under `บทสนทนา / บทนำ`, including the previously hidden `$388E8F` world-of-Pokémon speech. The intro uses Thumb literal references through `StringExpandPlaceholders`, `gStringVar4` and the message-box printer, rather than NPC script commands. Forty-nine decoded C message-box sources, direct `message` + `waitmessage` scripts, short messages and previously suppressed referenced sub-strings are now handled. All 25,719 previous row IDs and source strings remain available for existing workspace merges.

The profile records 294 inspected text-reference spans with 4,488 English references. These include the battle-message table, Battle Frontier/apprentice dialogue, TV, contests, trainer profiles, ribbon text and UI messages. Shared offsets retain one canonical entry and collect the supported reference sites. Previously unverified pointer-table entries use the original encoded byte length as a conservative limit where the destination buffer size has not been independently established; table references alone do not prove a larger buffer is safe. These records require the exact original ROM SHA. This does not claim every possible runtime-generated string, image text or unreferenced byte sequence is a translatable string.

“All” now includes read-only candidates instead of silently hiding them. Their editors are disabled and the status explains that they are excluded from translation progress and Excel. Selecting a whole category pauses an older, narrower work scope without deleting it, so new entries are not hidden by a saved batch. Existing target selections remain intact; select the newly added categories under translation targets before exporting them. The default Excel export still skips translated rows; to export all seven intro records, disable the untranslated-only option and select all rows.

`ไทยเงานุ่ม · Seaglass ครบชุด` is a permanent additional preset covering the 74 Thai characters and 10 Arabic digits in the editor's supported character set. The original source preset and 1,024-sprite atlas remain available; original-only mode confirms 56/74 Thai characters, and does not incorrectly label the sara aa sprite as sara am. Seventeen previously unverified characters are explicitly **drawn supplements**, not claimed original ROM pixels; sara am is assembled from the original nikhahit and sara aa components. The original `ร` extraction now crops the lower vowel out of the `รุ` source sprite. Supplement provenance survives validation, save/reload, JSON export and workspace fonts. ROM extraction offers an explicit original/complete switch. Existing custom fonts are not replaced automatically, and built-ins do not consume private-vault storage.

Validation includes real-source glyph/advance/composite checks, complete 12px/15px rendering, original/complete UI selection and persistence, all old workspace identities, seven-row intro Excel export/import, Thai intro relocation without overwriting code, recovery metadata, unknown-ROM guards and existing full-ROM patch tests. `scripts/audit_imperium_text.cjs` produces a read-only report for the privately supplied source; `scripts/audit_imperium_c_dialogue.py` optionally reproduces Thumb candidate discovery using Capstone, which is not a website dependency. No ROM or generated game-text workbook is published in the repository.


### 0.32.9 — text coverage and translation targets

- Rechecked the pinned Imperium source ROM independently of the previous scanner. Added trainerbattle types 0–13 (including the expansion two-trainer layout), Pokenav calls, message variants, dynamic-menu operands, nature tables, Easy Chat words and trainer phone-call tables. The intro now includes all **8 identified strings**, including the name-confirmation question. Old row IDs, source text, editable categories, translations and saved targets remain compatible.
- The original ROM now yields **27,163 rows**, **20,222 eligible translation entries** and **8,591 dialogue entries**. Read-only candidates are separated into resource/internal names, duplicate fragments, text awaiting a verified use, and possibly non-text data. A read-only candidate is not automatically declared unused.
- “เลือกเป้าหมาย” separates content, names recommended to retain in English, and optional stylistic categories. **แปลเนื้อหา · เว้นชื่อเฉพาะ** selects content/optional categories and excludes **4,699 name/nature entries** from progress and Excel. It preserves existing translations. Name categories can still be selected manually; descriptions remain separate. The main category selector also has an aggregate proper-name view. Existing selections are not silently changed.
- Excel prompts retain English proper names mentioned inside prose unless the glossary specifies otherwise. Explicitly exported name rows can still be translated.
- Coverage checks: `node scripts/audit_imperium_text.cjs ORIGINAL.gba /tmp/coverage.json` independently inventories whole-looking, EOS-delimited English strings with ROM references, verifies declared pointer tables/C references, and reports missing entries. `node scripts/audit_imperium_scripts.cjs ORIGINAL.gba` independently discovers the inspected script operands and verifies their editable data/relocation references. On the pinned fixture: **1,460 commands / 1,827 distinct targets**, **4,489 English contiguous-table references**, and **zero missing audit entries**. The whole-looking-string inventory contains 8,811 editable and 1,103 read-only candidates, with none absent from the data; this inventory deliberately excludes short/single-word and non-EOS-aligned strings, which the command/table checks cover separately. This does **not** prove every runtime-generated, compressed, unused, or unsupported string in the ROM has been identified.
- Validation with the real source ROM: all 27,163 source strings round-trip through the encoder; previous IDs/source/editable categories are preserved; new trainer and intro translations patch/reopen correctly; grouped target selection persists after reopening; real item-description XLSX export contains 817 descriptions and excludes name categories; full 8-row intro XLSX roundtrip passes. Tests: `tests/translation-policy.cjs`, `tests/translation-policy-ui.cjs`, `tests/intro-dialogue.cjs`, `tests/text-coverage-ui.cjs`, `tests/imperium.test.cjs`, `tests/sheet-export-compact.cjs`.


### 0.32.10 — additional menus and faster processing

- Added verified native C menu-printer arguments (147 decoded source strings), the 218-record region-map name table (empty records skipped), and PokéNav counter labels. Existing editable IDs/categories and saved targets remain compatible. The pinned source now yields **27,166 rows**, **20,535 eligible entries**, **2,137 menu entries** (313 newly supported), and **8,591 dialogue entries**. Map/place names are a separate category recommended to retain in English; selecting the content recommendation leaves **15,635 entries**, with **4,900 names/nature/place entries** excluded. New menu categories must be selected in an existing project's targets before export.
- `scripts/audit_imperium_menu_calls.py` independently inspects the verified native printer ABIs with the optional Capstone research tool. Only decodable text arguments are included; a palette/non-text argument is excluded. New menus retain conservative original byte/line bounds. `scripts/audit_imperium_text.cjs` also verifies these C references and all declared strided tables. Coverage remains limited to inspected references; it is not a guarantee about every runtime-generated or unsupported string.
- Rasterization is cached per font/height/cluster, with defensive glyph copies and cache invalidation on preset/spacing/shadow changes. Width checks reuse cached advances. A private canonical scan snapshot is reusable only after verifying the exact source SHA-256; callers receive deep copies. Tampered ROMs/sources cannot reuse trusted metadata. Build validation reuses its already encoded bytes.
- Multi-file Excel imports validate identities/control codes per file, then perform layout checks and shared font allocation once over changed/existing translated entries. Empty project rows no longer add artificial waits to the final validation stage. Cancellation, partial layout warnings, wrong-ROM rejection, duplicate/conflicting-file checks and undo remain enabled.
- Local processing benchmark: a 654-row returned ability workbook (327 changed translations), with 1,500 existing NPC translations and the complete Seaglass preset, took **4.56 s → 0.23 s** for import review and **4.10 s → 0.46 s** for ROM creation on this worker. Counts and the workbook's one existing layout error were unchanged. These timings exclude UI/network transfer and depend on machine/data size; the first full ROM scan still occurs.
- Validated: `tests/menu-printers.cjs`, `tests/processing-cache.cjs`, `tests/menu-coverage.cjs`, `tests/translation-policy.cjs`, `tests/translation-policy-ui.cjs`, `tests/imperium.test.cjs`, `tests/sheet-tolerant.cjs`, `tests/sheet-multi-import.cjs`, `tests/sheet-layout-import.cjs`, and `tests/seaglass-complete.cjs`. Checks cover printer call targets/operands, real Thai patch/reopen, byte-identical repeated builds, cache isolation/invalidation, exact-source tamper rejection, real Gemini multi-file imports, wrong/corrupt/conflicting files, cancellation, wrap preservation and build rejection of remaining overflow.


### 0.32.11 — grouped translation workspace

- Navigation, target selection and the remaining-work overview now use **24 work groups**. Related canonical categories can be selected together (trainer dialogue, item descriptions, move descriptions, telephone calls, system menus), while expandable child checkboxes and the detailed-category toggle retain precise control. Canonical row IDs, categories, Excel metadata and existing project targets are unchanged.
- The target dialog separates **14,081 recommended-content**, **1,554 optional-style**, and **4,900 recommended-English-name** entries. Counts distinguish all rows, selected rows, translated selected rows and remaining selected rows. Remaining-work cards and their Excel export include selected categories only, even when a work group contains excluded categories. Fresh projects default to content/optional categories (15,635 entries); existing workspaces/recovered ROM targets retain their previous selections, including legacy undefined/all selections.
- Added category guidance, a searchable target grid (Thai tone marks do not prevent a match), compact work-group navigation, independent child choices and clearer trainer/Pokédex family names. Both themes and 390 px layouts are verified. Navigation selects a matching entry when the previously edited row is outside the new category.
- Local saves are serialized so an earlier delayed IndexedDB write cannot replace a later saved view. Write failures do not block subsequent saves. Completion still means the save has finished; the pending-save indicator remains visible while work is queued.
- Validation: `tests/work-groups.cjs` checks complete/disjoint grouping and selected-only sums; `tests/work-groups-ui.cjs` exercises tri-state selection, exact child control, group filtering, a real 542-row XLSX export, search, both themes, mobile bounds and reopen after persistence. `tests/local-save-order.cjs` deliberately delays the first database opening and injects a write failure. Existing translation-policy and coverage UI tests verify old targets/source IDs still restore.
- Cross-ROM translation memory was discussed as a future feature, not installed in this update. The existing glossary is per project. A shared memory should index source text, category/context and control tokens (not ROM offsets), preserve game provenance, and suggest approved translations without overwriting existing work. It can use the existing private-cloud connection with an additional storage schema.
