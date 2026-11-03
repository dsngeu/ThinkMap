---
id: P1-T02
type: ticket
title: Hooks — validate on save, session briefing
status: done
owner: claude
parent: P1-F02
depends_on: [P1-T01]
implements: [P1-F02-01, P1-F02-02]
labels: [claude-code, hooks]
code: [hooks/hooks.json, hooks/validate.mjs, hooks/briefing.mjs, test/plugin.test.js]
updated: 2026-10-29
---

## Goal
Guardrails that always run: broken plan files are caught on save, and every new session
starts with a short plan briefing.

## Acceptance criteria
- [x] `hooks/hooks.json` with a PostToolUse hook (Edit/Write under `docs/plan/`) running `thinkmap validate --quiet`; errors returned to Claude
- [x] SessionStart hook printing `thinkmap status` when `docs/plan/` exists
- [x] Both finish in < 1 s and fail open (exit 0 with a note) if the tool is missing (P1-F02-03)
- [x] Tested in a fresh project — briefing injected at session start (quoted back by the session), validate hook exit 2 on a broken file

## Handoff log
- 2026-10-29 · claude · started; hooks as Node scripts importing the engine directly (no npx, no PATH assumptions beyond `node`)
- 2026-10-29 · claude · validate finds the plan folder of the edited file (custom folders work), skips git for speed; briefing uses additionalContext JSON; both fail open; done.
