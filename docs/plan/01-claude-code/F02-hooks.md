---
id: P1-F02
type: feature
title: Hooks
status: auto
parent: P1
depends_on: [P1-F01]
labels: [claude-code]
updated: 2026-10-29
---

Hooks are scripts Claude Code runs automatically on events. Unlike instructions, they
cannot be forgotten.

## Points
- [decided 2026-10-29] P1-F02-01: Validate on save — a PostToolUse hook runs `thinkmap validate` after any edit under docs/plan/
  > What: When Claude edits or writes a file inside `docs/plan/`, the hook runs the
  > validator. Errors are fed back to Claude so it fixes the file immediately.
  > Why: A broken header or unknown kind would otherwise sit there until someone opens the map.
  > Expected: Claude cannot leave `docs/plan/` in an invalid state at the end of a turn.
  > Built: Not yet — ticket P1-T02.

- [decided 2026-10-29] P1-F02-02: Session briefing — a SessionStart hook prints the plan status
  > What: At the start of every session in a project with `docs/plan/`, the hook injects
  > a short `thinkmap status` summary: current phase, tickets in progress and by whom,
  > blocked items, open questions, next free tickets.
  > Why: A new session knows where the project stands without reading anything.
  > Built: Not yet — ticket P1-T02.

- [caution 2026-10-29] P1-F02-03: Hooks must be fast and fail open
  > What: Validate and status must finish in well under a second; if the tool is missing
  > or crashes, the hook exits 0 with a one-line note instead of blocking the session.
  > Why: A slow or failing hook makes people disable all hooks.
  > Risk: Lost trust in the whole plugin.
