---
id: P1-F01
type: feature
title: Skills
status: auto
parent: P1
labels: [claude-code]
updated: 2026-10-29
---

Claude Code skills: reusable instructions Claude follows either automatically (when the
task matches) or when a person types `/name`.

## Points
- [decided 2026-10-29] P1-F01-01: `thinkmap-format` — an automatic skill that teaches the file format while planning
  > What: A skill with no slash command. It triggers whenever a session is discussing,
  > planning or deciding something in a project that has `docs/plan/`. It tells Claude the
  > six kinds, the labelled body lines (`What:`, `Why:`…), the ID rules, and the habit:
  > write every decision, question, suggestion and caution into the files as the talk happens.
  > Why: Today the format only works if the project's CLAUDE.md imports FORMAT.md. A skill
  > carries that knowledge with the plugin, so a new project needs no CLAUDE.md editing.
  > Expected: In a fresh project with the plugin, saying "let's decide X" makes Claude add
  > a `[decided …]` point with a body, without being asked to.
  > Built: Not yet — ticket P1-T01.

- [decided 2026-10-29] P1-F01-02: `/thinkmap-init` — set up docs/plan in a project
  > What: Runs `thinkmap init`, then adds the Planning section to CLAUDE.md (creating the
  > file if missing) and asks for the project name and first phase.
  > Why: Replaces the manual "paste this snippet" step.
  > Built: Not yet — ticket P1-T01.

- [decided 2026-10-29] P1-F01-03: `/thinkmap` — open the map
  > What: Starts `thinkmap serve` in the background if it is not running and prints the URL.
  > Why: One word to get the map on screen.
  > Built: Not yet — ticket P1-T01.

- [decided 2026-10-29] P1-F01-04: `/thinkmap-status [P1 | open]` — terminal summary
  > What: Runs `thinkmap status` with the optional filter and shows the result.
  > Why: Quick check without the browser; also what the session-start hook shows.
  > Built: Not yet — ticket P1-T01.

- [decided 2026-10-29] P1-F01-05: `/thinkmap-ticket <ID>` — claim a ticket in a new session
  > What: Sets the ticket `in-progress` with the session as owner, appends a Handoff log
  > line, loads the ticket's goal, acceptance criteria and linked decisions into context,
  > and reminds the session to suggest a commit message with `[ID]` when done.
  > Why: This is how work is handed to parallel sessions safely: one ticket per session,
  > status visible on everyone's map.
  > Expected: Two sessions cannot both claim the same ticket without noticing (the second
  > sees `in-progress` + owner and asks).
  > Built: Not yet — ticket P1-T01.

- [caution 2026-10-29] P1-F01-06: The format has one source of truth — skills must not restate it
  > What: `template/FORMAT.md` is canonical. The `thinkmap-format` skill links to or
  > embeds that file at build time; it never carries a second, hand-edited copy.
  > Why: Two copies drift; a drifted skill would teach sessions a format the validator rejects.
  > Risk: Silent validation errors in every project using the plugin.

- [open 2026-10-29] P1-F01-07: Skill names — `thinkmap-*` prefix for all, or short `/map`, `/status`?
  > What: Naming of the slash commands.
  > Options: (a) `thinkmap`, `thinkmap-status`, `thinkmap-ticket`, `thinkmap-init` — clear,
  > no clashes with other plugins. (b) Short names — faster to type, risk clashing.
  > Next: Default to (a) unless users complain.
