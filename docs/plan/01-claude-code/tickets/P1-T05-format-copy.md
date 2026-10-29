---
id: P1-T05
type: ticket
title: thinkmap format — detect and refresh the project's FORMAT.md copy
status: done
parent: P1-F03
implements: [P1-F03-06]
owner: claude
labels: [claude-code, distribution]
code: [src/init.js, src/graph.js, bin/thinkmap.js, hooks/briefing.mjs, src/update.js, template/FORMAT.md, skills/thinkmap-format/SKILL.md, test/init.test.js, test/plugin.test.js]
updated: 2026-10-29
---

## Goal
A project's `docs/plan/FORMAT.md` never silently drifts from the rules the validator and the
plugin follow. Thinkmap notices the drift and one command fixes it.

## Acceptance criteria
- [x] `thinkmap format [dir]` prints whether the copy matches the bundled `template/FORMAT.md`; exit 1 when it differs; a missing copy is reported, not flagged
- [x] `thinkmap format --write [dir]` overwrites the copy with the bundled file (creates it when missing) and says so
- [x] `thinkmap validate` adds one warning (never an error) naming the refresh command when the copy is behind
- [x] The SessionStart briefing tells a plugin session the copy is older and gives the exact `node ".../bin/thinkmap.js" format --write` line
- [x] `thinkmap update` ends with the hint when the copy is behind; the plugin branch names the follow-up command
- [x] CRLF and trailing-newline differences do not count as drift
- [x] `template/FORMAT.md` says at the top that the project file is a copy and how to refresh it; the `thinkmap-format` skill says never to edit the copy by hand
- [x] Tests in `test/init.test.js` and `test/plugin.test.js`; README command table and "Updating" section; version 0.4.0

## Notes
Trigger: a project set up with `npx github:dsngeu/ThinkMap init` and later moved to the
plugin kept the npx-era copy and had to carry a caution to diff the two files after every
plugin update. The same drift hits every install path, which is why the check lives in the
tool rather than in each project's plan. The repo's own `docs/plan/FORMAT.md` was refreshed
with the new command as the first use.

## Handoff log
- 2026-10-29 · claude · built, 43 tests green, `thinkmap format` run on this repo (stale → refreshed → clean)
