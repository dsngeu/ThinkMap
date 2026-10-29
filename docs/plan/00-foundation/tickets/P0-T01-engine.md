---
id: P0-T01
type: ticket
title: Engine — parser, validate, status, init CLI
status: done
parent: P0-F01
implements: [P0-F01-01, P0-F01-02, P0-F01-06]
owner: claude
labels: [core]
code: [src/parse.js, src/graph.js, src/status.js, src/init.js, bin/thinkmap.js, test/]
updated: 2026-10-29
---

## Goal
Read plan files into a graph (nodes, edges, issues) with validation, auto status,
progress roll-ups and git commit links. CLI: `init · serve · status · validate · export · json`.

## Acceptance criteria
- [x] Zero-dependency front matter + points parser (kinds, dates, who, labelled bodies, line numbers)
- [x] Validation: required fields, IDs, kinds, parents, dependencies, cycles, duplicates, bodies
- [x] `status: auto` from children; progress = settled points + done tickets
- [x] Commits linked by `[ID]` in the message
- [x] `init` from the bundled template
- [x] Unit tests (`node --test`)

## Handoff log
- 2026-10-29 · claude · engine built with 13 tests; grew to 18 with kinds, line numbers and init
