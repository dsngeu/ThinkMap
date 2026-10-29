---
id: P1-T02
type: ticket
title: Hooks — validate on save, session briefing
status: planned
parent: P1-F02
depends_on: [P1-T01]
implements: [P1-F02-01, P1-F02-02]
labels: [claude-code, hooks]
updated: 2026-10-29
---

## Goal
Guardrails that always run: broken plan files are caught on save, and every new session
starts with a short plan briefing.

## Acceptance criteria
- [ ] `hooks/hooks.json` with a PostToolUse hook (Edit/Write under `docs/plan/`) running `thinkmap validate --quiet`; errors returned to Claude
- [ ] SessionStart hook printing `thinkmap status` when `docs/plan/` exists
- [ ] Both finish in < 1 s and fail open (exit 0 with a note) if the tool is missing (P1-F02-03)
- [ ] Tested in a fresh project

## Handoff log
