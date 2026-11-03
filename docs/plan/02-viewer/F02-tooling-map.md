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
  > Built: Content in `catalogue/` (see P2-F02-10); the add/remove mechanism is P2-F02-09.

- [open 2026-11-03] P2-F02-09: Who performs add / remove — dashboard buttons or a command?
  > Options: (a) Buttons: the server writes into `.claude/` (needs the P2-F02-08 safeguards).
  > (b) A command, `thinkmap add <name>` / `thinkmap remove <name>` (and a `/thinkmap-add`
  > skill); the dashboard shows status and a copy-the-command button; the server stays read-only.
  > (c) Both: build (b) first, then buttons that call the same code.
  > Discussed: 2026-11-03 — Claude leans (c). Also to settle: how an installed file is marked
  > as Thinkmap's (front matter key vs a manifest in `.claude/`), refusing to overwrite a
  > project's own file with the same name, installing `requires` together, and "update
  > available" when the catalogue copy is newer.
  > Next: Deepak picks; then a ticket for the installer.

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
  > left out — `/thinkmap-tickets` and `/thinkmap-ticket` already do that job. Model is
  > `inherit` rather than a fixed model, so each user's choice applies.
  > Built: `catalogue/`, shipped in the npm package; `test/catalogue.test.js` checks manifest ↔
  > files ↔ names, no project names, and no clash with the plugin's own skills.

- [caution 2026-11-03 claude] P2-F02-11: The catalogue must never sit in the plugin's root `agents/` or `skills/`
  > What: Claude Code loads a plugin's root `agents/` and `skills/` for every user who installs
  > it. Catalogue items live under `catalogue/` so they load only when a project adds them.
  > Risk: Five review agents appearing in every Thinkmap user's session uninvited.
  > Built: `test/catalogue.test.js` fails if a root `agents/` folder appears or a name clashes.

- [suggestion 2026-11-03 claude] P2-F02-12: Bring the "brief first, build after go ahead" gate into `/thinkmap-ticket`
  > What: The source repo's `/ticket` skill wrote a read-only brief (decisions, cautions,
  > criteria, dependencies, approach, open questions) and built only after "go ahead", then
  > closed the ticket. `/thinkmap-ticket` only claims and loads context.
  > Options: (a) Add the brief gate to `/thinkmap-ticket`. (b) Leave it as is.
  > Next: Deepak decides; a change to a plugin skill, so it goes through a P1 ticket.

- [caution 2026-11-03 claude] P2-F02-08: A localhost server that writes files is reachable from any web page
  > What: If option (b) of P2-F02-07 is chosen, any site open in the browser can send requests
  > to 127.0.0.1. Write endpoints need a per-run secret token, an Origin check, writes limited
  > to the project's `.claude/`, and removal only of files Thinkmap itself installed.
  > Why: Skills and agents are instructions Claude follows; a planted one is a prompt injection
  > that persists in the repo.
  > Risk: The planning viewer becomes a way to change what Claude does in the project.

## Tickets

- P2-T01 · Tooling tab — scan and show agents, skills, hooks · done
