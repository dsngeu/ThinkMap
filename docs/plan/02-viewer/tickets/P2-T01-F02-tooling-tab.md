---
id: P2-T01
type: ticket
title: Tooling tab — scan and show agents, skills, hooks
status: done
parent: P2-F02
implements: [P2-F02-01, P2-F02-02, P2-F02-03]
owner: claude
labels: [viewer, claude-code]
code: [src/tooling.js, src/graph.js, src/status.js, src/server.js, web/index.html, test/tooling.test.js]
updated: 2026-10-29
---

## Goal
Show the project's own Claude Code tooling in the viewer so anyone can see what runs
automatically in this repo and tap an item to read what it does.

## Acceptance criteria
- [x] `src/tooling.js` scans `<root>/.claude/` (agents, skills, commands, hooks in settings files) and the plugin layout when `.claude-plugin/plugin.json` exists — nothing user-level (P2-F02-02)
- [x] Tolerant parsing: block-scalar descriptions, missing front matter, invalid JSON → listed or noted, never a validator error (P2-F02-05)
- [x] Graph JSON carries `tooling` (+ `stats.tooling`); no new nodes, `validate` unaffected (P2-F02-04: files read server-side, `.claude/` never served, hooks never run)
- [x] Viewer: Map / Tooling tabs, grid per group, details panel (how it starts, tools, model, file, instructions or command), search, empty state, legend entry (P2-F02-03)
- [x] Works in light and dark mode and at phone width
- [x] `thinkmap status` prints a TOOLING line; `export` includes the tab
- [x] Server also watches `.claude/` (and plugin folders) for live reload
- [x] Tests in `test/tooling.test.js`

## Out of scope
- User-level `~/.claude` and installed plugins (decided against, P2-F02-02)
- MCP servers (`.mcp.json`) and `CLAUDE.md` — maybe a later "Instructions" group

## Handoff log
- 2026-10-29 · claude · built scanner, viewer tab, status line, tests; checked in Chrome (light, dark, 390px)
