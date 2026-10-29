---
id: P1-T04
type: ticket
title: thinkmap update + update-available banner
status: done
parent: P1-F03
implements: [P1-F03-05]
owner: claude
labels: [claude-code, distribution]
code: [src/update.js, bin/thinkmap.js, src/server.js, web/index.html, test/update.test.js]
updated: 2026-10-29
---

## Goal
Installed copies find out that a new version exists and update with one command, whichever
of the three install methods was used.

## Acceptance criteria
- [x] `thinkmap version` prints version + install kind + path
- [x] `thinkmap update` handles npx cache (all entries), project dependency, clone; `--check` only compares; `--force` re-installs
- [x] `serve` runs one 3-second, fail-soft version check; viewer shows ⬆ Update available with the install-specific command; terminal prints the same
- [x] Opt-out via `--no-update-check` and `THINKMAP_NO_UPDATE_CHECK=1`; `status` makes no network call (hooks stay fast, P1-F02-03)
- [x] Version bumped to 0.2.0; README "Updating" section
- [x] Tests for version compare, install detection, update plan, check, npx cache scan

## Notes
The check fetches `https://raw.githubusercontent.com/dsngeu/ThinkMap/master/package.json`.
Publishing to npm (P1-F03-03) would let `npx thinkmap@latest` replace all of this for npx users.

## Handoff log
- 2026-10-29 · claude · built and checked the banner in Chrome with a simulated newer version
