# Delivery and GitHub Pages

Source updates go to sixzower/RomTranslate main. The user has enabled Pages with Deploy from a branch → main → / (root).

Site: https://sixzower.github.io/RomTranslate/

After pushing, let the Pages build finish. The footer should show version 0.32.9. Refresh without cache if old assets are visible. The browser game tester's first visit can reload once to enable its worker runtime.

`download/index.html` is the self-contained editing/Excel release, containing no ROM and no API credentials. On GitHub, open it and use Download raw file to save index.html. Its game-test tab opens the live site because the threaded emulator requires browser headers/service workers unavailable on file URLs.

The `/workspace/...` paths in a Codex task are local workspace paths, not public download URLs. Do not present them as downloadable attachments in Codex Web.

For local development, serve the repository over localhost using npm run dev. Localhost from the cloud machine is not reachable from the user's computer. Browser tests use an internal server; do not manufacture a public preview link from that address.

Vendored emulator/library assets and coi-serviceworker.js must be deployed with the source index.html. Public hosting does not include the user's ROM or translated ROM binaries.

## Stuck deployment repair

`.github/workflows/repair-pages.yml` runs a targeted repair when its files change on main, and can also be started manually in Actions. It uses the runner's scoped GITHUB_TOKEN (contents:read, pages:write, actions:write); no PAT or new secret is required. The supplied SHA must be the full build SHA named in the deployment conflict.

The script queries Pages and the identified deployment, cancels only a pending deployment through the same POST Pages cancellation endpoint used by actions/deploy-pages, waits for cancellation to complete, then inspects the latest managed Pages workflow. It retries failed jobs only if that latest run is completed/failed; queued/running or successful jobs are left alone. Unrelated workflows and Pages settings are not changed, and the site is never unpublished. The Actions summary records the actual result. A successful repair run alone does not prove the later Pages publish completed.

Direct GitHub API/Pages requests from the Codex environment returned HTTP 403 during this investigation, so live status must be checked on the GitHub runner. Local tests use mocked API states.


Admin-only library login uses the public client configuration in cloud-config.js. Before the first real admin login, run cloud/admin-setup.sql once in the supplied Supabase project. Enter the password on the original browser to retain its existing vault. Public API keys cannot perform this SQL installation; no live database migration was executed by the worker.

## Release 0.32.6 deploy timeout

GitHub Pages run #60 (`38769156460`, build `bbfb4fb4fa35143529f3d78eb8d4ed6953d1307e`) completed with deploy annotations `Timeout reached, aborting!`. The code was already present on main. The repair workflow default now targets this exact build, rather than the older conflict SHA. Its push trigger checks/cancels only a nonterminal deployment for this build before letting the latest Pages run continue or retrying the latest failed run. Application version stays 0.32.6. Confirm the repair and subsequent Pages run separately; neither a push nor a successful repair proves the site has published.
