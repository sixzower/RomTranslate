# Delivery and GitHub Pages

Source updates go to sixzower/RomTranslate main. The user has enabled Pages with Deploy from a branch → main → / (root).

Site: https://sixzower.github.io/RomTranslate/

After pushing, let the Pages build finish. The footer should show version 0.12.1. Refresh without cache if old assets are visible. The browser game tester's first visit can reload once to enable its worker runtime.

`download/index.html` is the self-contained editing/Excel release, containing no ROM and no API credentials. On GitHub, open it and use Download raw file to save index.html. Its game-test tab opens the live site because the threaded emulator requires browser headers/service workers unavailable on file URLs.

The `/workspace/...` paths in a Codex task are local workspace paths, not public download URLs. Do not present them as downloadable attachments in Codex Web.

For local development, serve the repository over localhost using npm run dev. Localhost from the cloud machine is not reachable from the user's computer. Browser tests use an internal server; do not manufacture a public preview link from that address.

Vendored emulator/library assets and coi-serviceworker.js must be deployed with the source index.html. Public hosting does not include the user's ROM or translated ROM binaries.
