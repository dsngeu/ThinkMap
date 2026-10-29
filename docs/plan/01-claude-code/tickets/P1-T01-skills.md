---
id: P1-T01
type: ticket
title: Skills — thinkmap-format, /thinkmap-init, /thinkmap, /thinkmap-status, /thinkmap-ticket
status: planned
parent: P1-F01
implements: [P1-F01-01, P1-F01-02, P1-F01-03, P1-F01-04, P1-F01-05]
labels: [claude-code, skills]
updated: 2026-10-29
---

## Goal
Claude Code skills so anyone can use Thinkmap by typing a command, and Claude writes
decisions into the plan files automatically while discussing.

## Acceptance criteria
- [ ] `skills/thinkmap-format/SKILL.md` auto-triggers when planning/discussing in a project with `docs/plan/`; it references `template/FORMAT.md` (one source of truth, P1-F01-06)
- [ ] `/thinkmap-init` runs `thinkmap init`, adds the Planning section to CLAUDE.md, asks for project name and first phase
- [ ] `/thinkmap` starts the server if needed and prints the URL
- [ ] `/thinkmap-status [P1|open]` prints the summary
- [ ] `/thinkmap-ticket <ID>` claims a ticket: in-progress + owner + handoff line, loads context, warns if already claimed
- [ ] Tested in a fresh project (not this repo)

## Notes
Skills live in `skills/<name>/SKILL.md` with front matter (`name`, `description`); the
description decides when the auto skill triggers. Keep each SKILL.md short; point to
`template/FORMAT.md` for the rules rather than copying them.

## Handoff log
