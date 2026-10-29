---
id: P1-T03
type: ticket
title: Package as a Claude Code plugin + marketplace
status: planned
parent: P1-F03
depends_on: [P1-T01, P1-T02]
implements: [P1-F03-01, P1-F03-02]
labels: [claude-code, plugins]
updated: 2026-10-29
---

## Goal
Any team installs Thinkmap with two commands and gets skills, hooks and the engine.

## Acceptance criteria
- [ ] `.claude-plugin/plugin.json` (name, version, description) at the repo root
- [ ] Plugin bundles `skills/`, `hooks/`, `bin/`, `src/`, `web/`, `template/`
- [ ] A marketplace file lists the plugin (location per P1-F03-04)
- [ ] Fresh-project test: `/plugin marketplace add …` → `/plugin install thinkmap@…` → `/thinkmap-init` → `/thinkmap` works with no copied folder and no manual CLAUDE.md edit
- [ ] `docs/USING-IN-ANOTHER-PROJECT.md` updated to make the plugin the main path

## Handoff log
