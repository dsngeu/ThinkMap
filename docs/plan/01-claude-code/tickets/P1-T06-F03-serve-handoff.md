---
id: P1-T06
type: ticket
title: serve reuses or replaces a Thinkmap already serving the same plan
status: done
parent: P1-F03
implements: [P1-F03-09]
owner: claude
labels: [engine, claude-code]
code: [src/handoff.js, src/server.js, bin/thinkmap.js, skills/thinkmap/SKILL.md, test/handoff.test.js]
updated: 2026-11-03
---

## Goal
After a plugin update, `/thinkmap` shows the new version instead of the server that was
already running, without ever stopping another project's map.

## Acceptance criteria
- [x] Same plan, same version: no second copy; the running one is opened
- [x] Same plan, other version or `--restart`: the old process is stopped and its port reused
- [x] Another project's server, or a non-Thinkmap one, is never touched; next free port
- [x] Servers report their pid; older ones are found with lsof, and only stopped when their command line names Thinkmap
- [x] The printed URL is the port actually bound (it used to print the first port tried)
- [x] A running server rechecks for updates every 6 hours
- [x] Tests pass

## Out of scope
- A shutdown URL (any web page could call it).

## Notes
Respects P1-F03-10: on Windows an old server without a pid is left running and reported.

## Handoff log
- 2026-11-03 · claude · built and tested (test/handoff.test.js spawns real serve processes)
