---
id: P2-T02
type: ticket
title: Enforce the plan folder layout and guide the decided-to-tickets step
status: done
parent: P2-F03
implements: [P2-F03-01, P2-F03-02, P2-F03-03, P2-F03-04, P1-F01-08]
owner: claude
labels: [engine, format, claude-code]
code: [src/init.js, src/graph.js, src/status.js, bin/thinkmap.js, template/FORMAT.md, template/01-first-phase/tickets/.gitkeep, skills/thinkmap-tickets/SKILL.md, hooks/briefing.mjs, test/graph.test.js, test/init.test.js, test/plugin.test.js]
updated: 2026-10-30
---

## Goal
Every project's plan folder has the same shape, created and checked by the tool rather than
remembered by each session, and a fully decided phase is steered towards tickets.
GitHub issue #1.

## Acceptance criteria
- [x] `thinkmap phase P2 <slug> [dir] [--title]` creates `02-slug/phase.md` + `tickets/.gitkeep`; valid at once; re-run adds only what is missing; refuses a second folder for the same phase number
- [x] `thinkmap init` leaves `tickets/.gitkeep` in the template phase
- [x] `thinkmap validate` reports as errors: non-phase top-level folders, phase folders without `phase.md` or `tickets/`, folder number ≠ phase number, topics outside their phase folder or misnamed, tickets outside `tickets/` or misnamed, file prefix ≠ id, a second project node, a `.md` without front matter
- [x] FORMAT.md §1 states the rules, the `.gitkeep` convention and "never by hand"; the repo's own copy refreshed
- [x] `thinkmap status` suggests `/thinkmap-tickets P<n>` for a fully decided phase with no tickets, ahead of open questions elsewhere
- [x] `/thinkmap-tickets <P1 | P1-F02>` skill with Gate 1 (one table, wait) and Gate 2 (write on "go ahead"); briefing lists it
- [x] Tests for all of the above; README and SPEC updated; version 0.5.0

## Out of scope
- Phases listed in `project.md` for `init` to create in bulk (no such list in the format)
- A kanban or any viewer change

## Notes
Skill name keeps the `thinkmap-` prefix (P1-F01-07): the issue called it `/generate-tickets`.
Existing user projects may see new errors after updating — see caution P2-F03-05.

## Handoff log
- 2026-10-30 · claude · built from GitHub issue #1; tests green; `validate` clean on this repo
