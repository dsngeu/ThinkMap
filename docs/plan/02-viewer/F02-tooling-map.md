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
  > Discussed: 2026-11-03 — still true for reading; one write path now exists, limited to adding
  > and removing catalogue files in `.claude/` with the P2-F02-08 safeguards (P2-F02-09).

- [caution 2026-10-29 claude] P2-F02-05: Claude Code's agent, skill and hook formats are still changing — scan tolerantly
  > What: Read only name, description, path and trigger; anything unrecognised is shown as
  > "unrecognised" with its path. `thinkmap validate` never fails on tooling files.
  > Why: A strict parser would break on the next Claude Code release.
  > Risk: A red validator in every project after an upgrade.

- [caution 2026-10-29 claude] P2-F02-06: "Agent" here means a defined subagent, not a live session
  > What: Keep the wording distinct from P2-F01-03 (which session is active on a ticket).
  > Why: Two things called "agent" on one map would confuse people.

- [decided 2026-11-03] P2-F02-07: Thinkmap ships a catalogue of agents and skills that a project adds or removes one by one
  > What: The Tooling tab shows two parts: "This project's own" (today's read-only scan) and
  > "From Thinkmap" (the catalogue), each catalogue item marked installed / not installed.
  > Adding an item copies its file from the catalogue bundled with the local Thinkmap into the
  > project's `.claude/agents/` or `.claude/skills/`; removing it deletes only a file Thinkmap
  > installed. No download at install time; new items arrive with a Thinkmap update.
  > Why: A plugin is all-or-nothing; copying single files lets each project pick, and the
  > copies live in the repo, so teammates get them through git and review them in PRs.
  > Discussed: (a) status + `/plugin install` command, (b) buttons that write files, (c) put
  > everything in the plugin — Deepak chose per-item add/remove into the project's `.claude/`.
  > A catalogue fetched from a hosted server was rejected (network code, and a compromised
  > server could push instructions into every project).
  > Built: Content in `catalogue/` (P2-F02-10); Add / Remove in the dashboard and CLI (P2-F02-09).

- [decided 2026-11-03] P2-F02-09: Add / Remove from the dashboard and from a command — one shared piece of code
  > What: `src/catalogue.js` lists the catalogue with a state per item (not added, added, update
  > available, changed here, name taken) and adds or removes items. The Tooling tab shows
  > "From Thinkmap" cards with Add / Update / Remove, and "This project's own" without the
  > files Thinkmap added. `thinkmap catalogue`, `thinkmap add <name>` and `thinkmap remove
  > <name>` do the same from a terminal or for Claude. Adding brings what an item `requires`;
  > Thinkmap records what it added in `.claude/thinkmap-catalogue.json` and keeps the files
  > byte-for-byte as in the catalogue.
  > Why: Deepak expected to install them from the dashboard after updating the plugin. A
  > command is needed anyway (Claude, CI, read-only maps), and one code path keeps both honest.
  > Discussed: Marking added files with a front matter key was rejected — the files stay
  > identical to the catalogue, and the record file is what Remove trusts. A name already used
  > by the project's own file is never overwritten, even with `--force`. Remove refuses an item
  > another added item needs, or one changed in the project, unless `--force` (terminal only).
  > Expected: After a plugin update, `/thinkmap` → Tooling → Add puts the agent in `.claude/`;
  > the card turns "Added" without a reload.
  > Built: `src/catalogue.js`, `/api/catalogue` in `src/server.js`, Tooling tab in
  > `web/index.html`, `catalogue` / `add` / `remove` and `serve --read-only` in `bin/thinkmap.js`;
  > `test/catalogue.test.js`; README and REFERENCE.

- [decided 2026-11-03] P2-F02-10: First catalogue — five agents and one skill, rewritten to work in any project
  > What: Agents `backend-code-reviewer`, `frontend-code-reviewer`, `fullstack-code-reviewer`,
  > `data-isolation-reviewer`, `review-findings-fixer`; skill `/review-fix-loop`. Listed in
  > `catalogue/catalogue.json` with a summary and `requires` (fullstack-code-reviewer needs the
  > backend and frontend reviewers; review-fix-loop needs review-findings-fixer).
  > Why: They came from one product's repo, tied to its name, stack and paths. Each now starts
  > by reading the project's CLAUDE.md, docs and manifests to learn its stack, and treats the
  > project's own rules as stronger than its checklist. `data-isolation-reviewer` learns how
  > the project scopes data and checks user-vs-user access in every app, plus
  > customer-vs-customer access when the app is multi-tenant.
  > Discussed: Naming rule (Deepak, 2026-11-03): the name says what it works on and what it
  > does — reviewers end in `-reviewer` (read-only), the one agent that edits ends in
  > `-fixer`, the skill says `loop`. Job-title names (`tech-lead`, `fix-engineer`) were
  > rejected: you had to read the file to know the job. Renamed from the source repo:
  > backend/frontend/fullstack `-reviewer` → `-code-reviewer`, `tenant-isolation-reviewer` →
  > `data-isolation-reviewer`, `review-fixer` → `review-findings-fixer`, `/review-and-fix` →
  > `/review-fix-loop`.
  > `fullstack-diff-reviewer` merged into `fullstack-code-reviewer` (its uncommitted mode
  > now adds change hygiene and a ready-to-commit verdict). `generate-tickets` and `ticket`
  > merged into `/thinkmap-create-tickets` and `/thinkmap-implement-ticket` instead (P2-F02-12). Model is
  > `inherit` rather than a fixed model, so each user's choice applies.
  > Built: `catalogue/`, shipped in the npm package; `test/catalogue.test.js` checks manifest ↔
  > files ↔ names, no project names, and no clash with the plugin's own skills.

- [caution 2026-11-03 claude] P2-F02-11: The catalogue must never sit in the plugin's root `agents/` or `skills/`
  > What: Claude Code loads a plugin's root `agents/` and `skills/` for every user who installs
  > it. Catalogue items live under `catalogue/` so they load only when a project adds them.
  > Risk: Five review agents appearing in every Thinkmap user's session uninvited.
  > Built: `test/catalogue.test.js` fails if a root `agents/` folder appears or a name clashes.

- [decided 2026-11-03] P2-F02-12: The source repo's ticket skills are merged into the built-in ones, not shipped in the catalogue
  > What: `ticket` → `/thinkmap-implement-ticket` (P1-F01-09), `generate-tickets` → `/thinkmap-create-tickets`
  > (P1-F01-10), both fixed for the current plan format.
  > Why: They write plan files, so they must change whenever the format does: plugin skills
  > update with Thinkmap, catalogue copies are frozen in the project. One skill per job also
  > avoids two ticket commands side by side. Deepak's call.
  > Built: See P1-F01-09 and P1-F01-10.

- [decided 2026-11-03] P2-F02-13: The Tooling page shows three groups — built into Thinkmap, add-ons, this project's own — and has its own top-bar button
  > What: "Built into Thinkmap" lists the plugin's own skills (`/thinkmap`, `/thinkmap-create-tickets`,
  > `/thinkmap-implement-ticket`…) as "Always available" with a copy-command button. "Add-ons
  > from Thinkmap" is the catalogue with Add / Remove. A **Tooling** button sits in the top bar
  > next to Map, and the home card says e.g. "6 built in · 3 ready-made to add · 2 of this
  > project's own".
  > Why: Deepak looked for the ticket skills on the dashboard to install them; built-in skills
  > were shown nowhere, so they looked missing, and the only way into Tooling was a card at the
  > bottom of the home page.
  > Discussed: (a) show built-ins as always available vs (b) move the ticket skills into the
  > catalogue as add-ons — (a), Deepak's call: no Add step, no duplicate commands, and they
  > update with the plugin. This reads Thinkmap's own package, not the user's installed
  > plugins, so P2-F02-02 still holds.
  > Built: `scanBuiltin()` in `src/tooling.js` (`builtin` in the graph; empty when the project is
  > Thinkmap itself), `web/index.html` (section, top-bar button, home card); test in `test/catalogue.test.js`.

- [caution 2026-11-03 claude] P2-F02-08: A localhost server that writes files is reachable from any web page
  > What: Any site open in the browser can send requests
  > to 127.0.0.1. Write endpoints need a per-run secret token, an Origin check, writes limited
  > to the project's `.claude/`, and removal only of files Thinkmap itself installed.
  > Why: Skills and agents are instructions Claude follows; a planted one is a prompt injection
  > that persists in the repo.
  > Risk: The planning viewer becomes a way to change what Claude does in the project.
  > Built: `/api/catalogue` checks POST, the Origin is the dashboard itself, a per-run token
  > that only the served page carries (and a custom header, so other sites can't send it
  > without a CORS preflight the server never grants), a JSON body under 2 KB, and a name from
  > the catalogue. Paths come only from the catalogue, stay inside `.claude/`, and never pass
  > through a symbolic link. `serve --read-only` turns it off. Tests cover each refusal.

## Tickets

- P2-T01 · Tooling tab — scan and show agents, skills, hooks · done
