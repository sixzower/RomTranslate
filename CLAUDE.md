# Release rule

Every change to the app (code, UI or behaviour) must increase the version:

1. Bump the patch number in `package.json` (e.g. 0.32.59 → 0.32.60).
2. Add a README section headed with that version describing the change.
3. Run `python3 scripts/bundle.py`. It writes `release.json`, `release-info.js`, the “เว็บ x.y.z” label, versioned asset URLs and `download/index.html`; commit those generated files too.

`update-notice.js` compares the deployed `release.json` with the running `AppRelease`, so users only see “มีเว็บรุ่นใหม่” when the number goes up.

Checks: `npm run check` (syntax) and `node tests/text-fitter.cjs` (no ROM needed). Tests that take a ROM path need the user's private ROM.
