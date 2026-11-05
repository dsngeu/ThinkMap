---
id: P1-T07
type: ticket
title: Publish to npm as thinkmap; update check prefers the registry
status: planned
parent: P1-F03
implements: [P1-F03-03]
labels: [distribution, engine]
updated: 2026-11-05
---

## Goal
`npx thinkmap init` works for anyone, and Thinkmap's own update check and `thinkmap update`
use the npm release instead of the GitHub repo.

## Acceptance criteria
- [ ] Deepak has an npm account and has run `npm login` (only he can do this)
- [ ] `src/update.js`: the latest version comes from `https://registry.npmjs.org/thinkmap/latest`,
      falling back to GitHub's `package.json` when the registry can't be reached
- [ ] `thinkmap update` installs `thinkmap` from npm; copies installed from GitHub still update
- [ ] Printed commands and docs say `npx thinkmap …` (README, docs/REFERENCE.md,
      docs/USING-IN-ANOTHER-PROJECT.md, `init` and `serve` output)
- [ ] `npm pack --dry-run` lists only the shipped folders, README and LICENSE
- [ ] `npm publish` from a clean checkout of the release commit; `npx thinkmap@latest --version` prints it
- [ ] Tests pass

## Out of scope
- Removing the GitHub install path — it keeps working.
- Publishing the plugin anywhere else; the marketplace stays on GitHub.

## Notes
Decision and reasons: P1-F03-03. Name `thinkmap` was free on 2026-11-05.
Publish each release after its commit is pushed, so npm and GitHub show the same version.

## Handoff log
- 2026-11-05 · claude · created from decision P1-F03-03
