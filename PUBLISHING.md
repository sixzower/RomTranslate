# Open RomTranslate from a browser

The `/workspace/...` paths produced in this Codex cloud task are workspace files, not public download URLs. This session has no user-facing preview or attachment-publishing tool. Do not describe those paths as downloadable attachments in Codex Web.

The website is a dependency-free static application. The repository root contains index.html, style.css, rom-core.js, pixel-font.js and app.js. It is ready for a static host; no backend build is required.

## GitHub Pages

1. Push the reviewed source to `sixzower/RomTranslate` on `main`.
2. In that repository's Settings → Pages, select "Deploy from a branch", branch `main`, folder `/ (root)`, then Save.
3. Wait for the Pages deployment and use the URL GitHub reports. Verify it loads before calling it published.
4. Open the URL in a browser, choose your local GBA ROM, and test translation editing and project export/import. The ROM is read on your device; it is not included in the repository or uploaded by the app.

Publishing source and enabling Pages are separate actions. Source has been pushed to main; Pages activation and live-site validation remain pending. Do not claim a site URL is live until an HTTP check of the actual deployment passes.

## Local machine alternative

With the source checkout available on your own computer, run `python3 -m http.server 5173` from the repository root, then open the local address printed by the command in your browser. Cloud-environment localhost addresses are not reachable from your own computer.

`npm run bundle` produces a self-contained HTML file for offline transfer when a supported file-download channel is available.

## Single-file download on GitHub

`download/index.html` is the self-contained release (no ROM and no credentials). Open that file on GitHub and use its Download raw file button to save index.html. The build script refreshes it on every update.
