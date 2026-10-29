---
id: P1-F03
type: feature
title: Plugin & marketplace
status: auto
parent: P1
depends_on: [P1-F01, P1-F02]
labels: [claude-code, distribution]
updated: 2026-10-29
---

Package everything as one Claude Code plugin and distribute it through a plugin marketplace.

## Points
- [decided 2026-10-29] P1-F03-01: One plugin bundles engine + skills + hooks
  > What: `.claude-plugin/plugin.json` plus `skills/`, `hooks/`, and the engine (`bin/`,
  > `src/`, `web/`, `template/`). Installing the plugin gives a project the commands,
  > the automatic format skill and the hooks at once.
  > Why: One install, no copied folders, no CLAUDE.md editing.
  > Built: Not yet — ticket P1-T03.

- [decided 2026-10-29] P1-F03-02: Distribute through a plugin marketplace repo
  > What: A Git repo with `.claude-plugin/marketplace.json` listing Thinkmap (and later
  > other approved plugins). Users run `/plugin marketplace add <owner>/<repo>` once, then
  > `/plugin install thinkmap@<marketplace>`. A project's shared `.claude/settings.json`
  > can pre-enable it so clones get it automatically.
  > Why: This is how a company rolls out tooling to every team with governance.
  > Expected: A fresh project is planning-ready after two commands.
  > Built: Not yet — ticket P1-T03.

- [open 2026-10-29] P1-F03-03: Also publish to npm as `thinkmap`?
  > What: `npx thinkmap` instead of `npx github:dsngeu/ThinkMap`.
  > Options: (a) Yes, once the CLI is stable (nicer command, versioned releases).
  > (b) Stay GitHub-only for now.
  > Next: Decide after the plugin ships.

- [open 2026-10-29] P1-F03-04: Where does the marketplace repo live — this repo or a separate `claude-plugins` repo?
  > What: A marketplace can list several plugins; a company usually keeps one catalogue repo.
  > Options: (a) Separate catalogue repo (scales to more plugins). (b) Marketplace file inside
  > this repo (simplest for a single plugin).
  > Next: (b) first to test the flow, (a) when a second plugin exists.

- [open 2026-10-29] P1-F03-05: How do people who already installed Thinkmap get updates?
  > What: Today there is no update path or notice. `npx github:dsngeu/ThinkMap` caches the
  > first fetch and keeps using it; `npm i -D github:…` pins a commit in the lockfile; a clone
  > needs `git pull`.
  > Options: (a) Tag releases (`v0.2.0`) and document `npx github:dsngeu/ThinkMap#v0.2.0` —
  > a new spec forces a fresh fetch. (b) Publish to npm (P1-F03-03) so `npx thinkmap@latest`
  > just works. (c) Plugin marketplace `/plugin update` once P1-F03-02 ships.
  > Next: (a) now, it costs nothing; (b) and (c) follow the existing plan.
