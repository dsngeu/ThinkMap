---
id: P1-T03
type: ticket
title: Package as a Claude Code plugin + marketplace
status: done
owner: claude
parent: P1-F03
depends_on: [P1-T01, P1-T02]
implements: [P1-F03-01, P1-F03-02]
labels: [claude-code, plugins]
code: [.claude-plugin/plugin.json, .claude-plugin/marketplace.json, src/update.js, package.json, README.md, docs/USING-IN-ANOTHER-PROJECT.md, SPEC.md]
updated: 2026-10-29
---

## Goal
Any team installs Thinkmap with two commands and gets skills, hooks and the engine.

## Acceptance criteria
- [x] `.claude-plugin/plugin.json` (name, version, description) at the repo root
- [x] Plugin bundles `skills/`, `hooks/`, `bin/`, `src/`, `web/`, `template/`
- [x] A marketplace file lists the plugin (location per P1-F03-04: this repo, marketplace name `thinkmap`)
- [ ] Fresh-project test: `/plugin marketplace add …` → `/plugin install thinkmap@…` → `/thinkmap-init` → `/thinkmap` works with no copied folder and no manual CLAUDE.md edit — **pending the push**: tested so far via `claude --plugin-dir` (same loading path); the marketplace add/install needs the files on GitHub
- [x] `docs/USING-IN-ANOTHER-PROJECT.md` updated to make the plugin the main path

## Handoff log
- 2026-10-29 · claude · started; manifest + marketplace written, `claude plugin validate ./` passes (only an optional icon warning)
- 2026-10-29 · claude · `thinkmap update`/`version` recognise a plugin-cache install and print the `claude plugin update` command; version 0.3.0; docs make the plugin the main path. Remaining: the real marketplace install after the push (one checkbox).
