# Publishing Sixz ROM QA Studio

The existing site uses GitHub Pages, Deploy from a branch → main → / (root).
Public URL: https://sixzower.github.io/RomTranslate/

The application is static: deploy `index.html`, `qa/`, the Prompt font/license, `vendor/mgba.js`, `vendor/mgba.wasm`, and `coi-serviceworker.js` with its license. No backend or Supabase setup is required. The first emulator visit can reload once to enable isolation. Never publish private ROMs, translation sidecars or QA backups; keep them outside the repository.

Before publishing run `npm run check`, `npm test`, and the browser tests with the local development server running. Update package/release versions and the versioned CSS/module URLs together. Push the reviewed source to the existing main branch; a successful push alone does not prove Pages finished deploying. Verify the deployed title is **Sixz · ROM QA Studio** and `release.json` reports `1.0.0`.

`download/` redirects to the current tool. There is no standalone Excel editor. Previous code is recoverable in Git history. Removing the cloud client does not remove users' Supabase records or browser backups.

The retained Pages repair workflow can cancel only the specific stuck deployment SHA supplied to it. Do not run it for an unrelated deployment or change site settings as part of routine release work.

Local `/workspace` artifact paths are not public URLs. Export reports and portable backups in the application for private sharing. Localhost links from the cloud machine are only for internal validation.
