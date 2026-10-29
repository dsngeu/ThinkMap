---
id: P2-F02
type: feature
title: Tooling on the map — agents, skills, hooks
status: auto
parent: P2
labels: [viewer, claude-code]
updated: 2026-10-29
---

Show the project's AI tooling (Claude Code agents, skills and hooks) on the map, so anyone
can see what runs automatically in this repo and tap an item to read what it does.

## Points
- [decided 2026-10-29] P2-F02-01: A read-only "Tooling" branch off the project card with Agents · Skills · Hooks buckets
  > What: `thinkmap` scans the project's `.claude/` folder: `agents/*.md`, `skills/*/SKILL.md`
  > and the `hooks` block of `settings.json` / `settings.local.json`. The root card gets a
  > sibling branch "Tooling" with counters (`3 agents · 5 skills · 2 hooks`). Tapping an item
  > opens the details panel: name, what it does, how it triggers (slash command, automatic,
  > hook event), tool/model limits, file path, "Open in editor". Included in `status` and `export`.
  > Why: These files act on the user's behalf and are the hardest part of a project to know;
  > their data is already Markdown with front matter, so the parser, cards and panel are reused.
  > The Thinkmap plugin (P1) will ship its own skills and hooks — the map shows them on install.
  > Expected: A new teammate opens the map and sees, without reading `.claude/`, what Claude
  > will do automatically in this repo and what each slash command does.
  > Built: Ticket P2-T01 — `src/tooling.js`, Tooling tab in `web/index.html`, line in `thinkmap status`.

- [decided 2026-10-29] P2-F02-02: Scan the project's `.claude/` only — never user-level `~/.claude` or installed plugins
  > What: `<root>/.claude/` (agents, skills, commands, hooks in settings.json / settings.local.json)
  > plus the plugin layout at the root when `.claude-plugin/plugin.json` exists.
  > Why: Project-level files are shared truth and belong on everyone's map; user-level skills
  > and plugins differ per person and would make the map lie for teammates.
  > Built: `scanTooling()` in `src/tooling.js`; the empty state says exactly what is scanned.

- [decided 2026-10-29] P2-F02-03: A separate Tooling tab next to the map, not a branch on it
  > What: A Map / Tooling switch in the header. The Tooling tab lists Agents · Skills · Hooks
  > as a grid; tapping an item opens the same details panel the map uses.
  > Why: Tooling items are not plan items (no IDs, kinds or roll-ups); keeping them off the
  > tree keeps the map about decisions and work. Deepak's call.
  > Built: `renderTooling()` / `toolPanel()` in `web/index.html`; search filters the tab too.

- [caution 2026-10-29 claude] P2-F02-04: Widening the server's file access must stay read-only and server-side
  > What: Today the server serves only `.md` inside the plan folder. Tooling files are read
  > by the scanner into the graph JSON; the `.claude/` folder is never served, and hook
  > commands are displayed, never executed.
  > Why: Hooks are shell commands and `settings.json` may hold permissions; the viewer must
  > not become a way to read or run arbitrary files.
  > Risk: Turning a planning viewer into an attack surface.

- [caution 2026-10-29 claude] P2-F02-05: Claude Code's agent, skill and hook formats are still changing — scan tolerantly
  > What: Read only name, description, path and trigger; anything unrecognised is shown as
  > "unrecognised" with its path. `thinkmap validate` never fails on tooling files.
  > Why: A strict parser would break on the next Claude Code release.
  > Risk: A red validator in every project after an upgrade.

- [caution 2026-10-29 claude] P2-F02-06: "Agent" here means a defined subagent, not a live session
  > What: Keep the wording distinct from P2-F01-03 (which session is active on a ticket).
  > Why: Two things called "agent" on one map would confuse people.
