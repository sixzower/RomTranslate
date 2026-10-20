# QA Studio release workflow

This repository now builds a ROM quality inspection tool, not a ROM translator.
Keep private ROMs, translated strings/sidecars, saves and user reports outside the public checkout. Do not contact or clear the retired Supabase backend.

For app changes, update package.json, release.json and index.html asset version queries together and describe the change in README.md. There is no generated translator bundle; npm run bundle now verifies static assets only.

Required checks: npm run check, npm test, and npm run test:browser with npm run dev running. Real-ROM integration is optional and requires explicit private input paths. Do not claim native rendering or whole-game completeness from static validation. Use the existing checkout without creating another worktree unless the user requests one.
