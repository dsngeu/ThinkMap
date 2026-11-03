---
id: P2-T03
type: ticket
title: Tickets show which topic they belong to — file names, topic lists, status per topic
status: done
parent: P2-F03
implements: [P2-F03-06, P2-F03-07, P2-F03-08]
owner: claude
labels: [engine, format, claude-code]
code: [src/tickets.js, src/init.js, src/graph.js, src/status.js, bin/thinkmap.js, template/FORMAT.md, template/01-first-phase/F01-example-topic.md, template/01-first-phase/tickets/P1-T01-F01-example-ticket.md, skills/thinkmap-tickets/SKILL.md, skills/thinkmap-ticket/SKILL.md, skills/thinkmap-status/SKILL.md, hooks/briefing.mjs, web/index.html, test/graph.test.js]
updated: 2026-11-03
---

## Goal
Going from a topic's decisions to "what is being built for it, and how far along" takes one
look, not a search across every ticket file. GitHub issue #2.

## Acceptance criteria
- [x] Ticket files are named `P<n>-T<nn>-F<nn>-slug.md`; a wrong `F<nn>` is an error, a missing one a warning
- [x] Topic files list their tickets under `## Tickets`; the validator warns on missing, foreign or stale lines
- [x] `thinkmap tickets [--write]` reports and fixes both; ticket IDs never change
- [x] `thinkmap status P2-F04` prints one topic; unknown filters say so instead of being ignored
- [x] FORMAT.md, template, skills, README updated; this repo's own plan migrated
- [x] Tests pass

## Out of scope
- Renumbering tickets per topic: IDs stay per phase so commits and trackers keep pointing at them.

## Notes
Respects P2-F03-05: the new checks are warnings, so existing plans keep validating.
The viewer hides the generated list from a topic's intro (it shows tickets under Work).

## Handoff log
- 2026-11-03 · claude · built and tested; migrated docs/plan with `thinkmap tickets --write`
