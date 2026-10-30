---
id: P1-F03
type: feature
title: Plugin & marketplace
status: auto
parent: P1
depends_on: [P1-F01, P1-F02]
labels: [claude-code, distribution]
updated: 2026-10-30
---

Package everything as one Claude Code plugin and distribute it through a plugin marketplace.

## Points
- [decided 2026-10-29] P1-F03-01: One plugin bundles engine + skills + hooks
  > What: `.claude-plugin/plugin.json` plus `skills/`, `hooks/`, and the engine (`bin/`,
  > `src/`, `web/`, `template/`). Installing the plugin gives a project the commands,
  > the automatic format skill and the hooks at once.
  > Why: One install, no copied folders, no CLAUDE.md editing.
  > Built: `.claude-plugin/plugin.json` (0.3.0, version kept equal to package.json by a test);
  > `skills/`, `hooks/` at the repo root; `claude plugin validate ./` passes. Ticket P1-T03.

- [decided 2026-10-29] P1-F03-02: Distribute through a plugin marketplace repo
  > What: A Git repo with `.claude-plugin/marketplace.json` listing Thinkmap (and later
  > other approved plugins). Users run `/plugin marketplace add <owner>/<repo>` once, then
  > `/plugin install thinkmap@<marketplace>`. A project's shared `.claude/settings.json`
  > can pre-enable it so clones get it automatically.
  > Why: This is how a company rolls out tooling to every team with governance.
  > Expected: A fresh project is planning-ready after two commands.
  > Built: `.claude-plugin/marketplace.json` in this repo (marketplace name `thinkmap`):
  > `/plugin marketplace add dsngeu/ThinkMap` → `/plugin install thinkmap@thinkmap`. Ticket P1-T03.

- [open 2026-10-29] P1-F03-03: Also publish to npm as `thinkmap`?
  > What: `npx thinkmap` instead of `npx github:dsngeu/ThinkMap`.
  > Options: (a) Yes, once the CLI is stable (nicer command, versioned releases).
  > (b) Stay GitHub-only for now.
  > Discussed: 2026-10-30 — the npm name `thinkmap` is free (registry returns 404). Publishing
  > is the single biggest reach step: `npx thinkmap serve` is discoverable, `npx github:…` is not.
  > Needs `npm login` by Deepak; `update.js` would then prefer the registry over GitHub.
  > Next: Deepak decides; if yes, `npm publish` from a clean 0.5.0 checkout and a P1 ticket for the update path.

- [decided 2026-10-29] P1-F03-04: The marketplace file lives in this repo for now
  > What: `.claude-plugin/marketplace.json` next to `plugin.json`, listing the repo root (`"./"`)
  > as the `thinkmap` plugin. A company catalogue repo can list it later by GitHub source.
  > Why: One plugin, one repo, nothing extra to maintain; a separate catalogue earns its keep
  > only when a second plugin exists.
  > Discussed: (a) separate catalogue repo vs (b) in this repo — (b) chosen first.
  > Built: `.claude-plugin/marketplace.json`.

- [decided 2026-10-29] P1-F03-05: `thinkmap update` + an "update available" banner — Thinkmap tells you and updates itself
  > What: `thinkmap update` detects how it was installed (npx cache `~/.npm/_npx/<hash>`,
  > `node_modules/thinkmap`, or a clone) and runs the matching update; in npx mode it refreshes
  > every cached copy so the plain `npx github:dsngeu/ThinkMap` entry is fixed too. `serve`
  > does one GET of `package.json` on GitHub at start and shows **⬆ Update available** with
  > the exact command; `THINKMAP_NO_UPDATE_CHECK=1` / `--no-update-check` disables it.
  > Why: Nobody re-runs an install they think is fine; without a notice the team stays on
  > 0.1.0 forever. Tags alone would not help the npx cache.
  > Expected: A teammate opens the map, sees the banner, runs one command, restarts, sees
  > the Tooling tab. Copies installed as 0.1.0 (no `update` yet) run
  > `npx github:dsngeu/ThinkMap#master update` once.
  > Built: Ticket P1-T04 — `src/update.js`, `update` / `version` commands, banner in the viewer.

- [decided 2026-10-29] P1-F03-06: `thinkmap format` — the project's FORMAT.md copy is checked and refreshed by the tool, not by hand
  > What: `init` leaves `docs/plan/FORMAT.md` in a project for people and sessions without
  > Thinkmap. It is a copy; the validator and the `thinkmap-format` skill follow the bundled
  > `template/FORMAT.md`. The tool now compares the two (line endings ignored): `thinkmap
  > validate` warns, the session-briefing hook tells the new session, `thinkmap format` reports
  > (exit 1 when behind), `thinkmap format --write` overwrites the copy with the bundled file,
  > and `thinkmap update` ends with the hint when the copy is behind. No copy → nothing to say.
  > Why: Field report from a project that was set up with npx and later switched to the
  > plugin: the npx-era copy stayed, every plugin update widened the gap, and the project had
  > to carry a caution ("diff the two files after each update") by hand. Every install path
  > has the same problem — the copy never follows an update — so Thinkmap must own it.
  > Discussed: (a) stop copying FORMAT.md and point everyone at the tool's file — rejected,
  > people and sessions without the plugin need a readable copy and CLAUDE.md snippets link to
  > it; (b) a version stamp inside the file — rejected, a byte compare is simpler and also
  > catches hand edits; (c) refresh silently on every run — rejected, overwriting a tracked
  > file must be an explicit command. Chosen: warn everywhere, fix with one command.
  > Expected: After `claude plugin update thinkmap@thinkmap` the next session's briefing says
  > the copy is older and names the command; after `format --write` the warning is gone.
  > Built: `src/init.js` (`formatCopyStatus`, `syncFormatCopy`), warning in `src/graph.js`,
  > `format` command in `bin/thinkmap.js`, briefing line in `hooks/briefing.mjs`, note at the
  > top of `template/FORMAT.md`, skill and README text; version 0.4.0. Ticket P1-T05.

- [decided 2026-10-30] P1-F03-07: A live demo of this repo's own plan on GitHub Pages
  > What: `.github/workflows/pages.yml` runs `thinkmap export docs/plan` on every push to
  > master and publishes the single HTML file at https://dsngeu.github.io/ThinkMap/. The
  > README and the repo's homepage link to it.
  > Why: Reach. A visitor sees the map in ten seconds without installing anything, and the
  > page doubles as proof that `export` works for sharing a plan with people who lack the tool.
  > Expected: Every merged change to `docs/plan/` shows up on the demo page within minutes;
  > a broken export fails the workflow visibly.
  > Built: workflow + Pages enabled in "workflow" mode; `test.yml` runs `npm test` and `validate` on Node 20 and 22 for the badge.

- [decided 2026-10-30] P1-F03-08: Discoverability basics on the GitHub repo
  > What: Topics (claude-code, claude-code-plugin, mind-map, planning, decision-log, …),
  > homepage = the live demo, Discussions on, README badges (tests, release, demo, plugin,
  > Node, zero dependencies, MIT), a "Spread the word" section, and a GitHub Release per version
  > starting with v0.5.0 (release notes = what changed for users).
  > Why: Topics are how GitHub search and the topic pages surface a repo; releases show in
  > followers' feeds and in the sidebar; badges answer "is this alive and tested?" at a glance.
  > Discussed: Still to do by hand — a social preview image (Settings → Social preview, 1280×640;
  > a screenshot of the map), a short post with the demo link (Claude Code community, Show HN,
  > LinkedIn/X), and a PR to an awesome-claude-code list. None of these can be done from the CLI.
