---
id: P1-F01
type: feature
title: Skills
status: auto
parent: P1
labels: [claude-code]
updated: 2026-10-30
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
  > Built: `skills/thinkmap-format/SKILL.md` — automatic (`user-invocable: false`), points at
  > `${CLAUDE_PLUGIN_ROOT}/template/FORMAT.md`, carries no copy of the format. Ticket P1-T01.

- [decided 2026-10-29] P1-F01-02: `/thinkmap-init` — set up docs/plan in a project
  > What: Runs `thinkmap init`, then adds the Planning section to CLAUDE.md (creating the
  > file if missing) and asks for the project name and first phase.
  > Why: Replaces the manual "paste this snippet" step.
  > Built: `skills/thinkmap-init/SKILL.md` (user-only). Ticket P1-T01.

- [decided 2026-10-29] P1-F01-03: `/thinkmap` — open the map
  > What: Starts `thinkmap serve` in the background if it is not running and prints the URL.
  > Why: One word to get the map on screen.
  > Built: `skills/thinkmap/SKILL.md` (user-only: opening a browser is for people to trigger). Ticket P1-T01.

- [decided 2026-10-29] P1-F01-04: `/thinkmap-status [P1 | open]` — terminal summary
  > What: Runs `thinkmap status` with the optional filter and shows the result.
  > Why: Quick check without the browser; also what the session-start hook shows.
  > Built: `skills/thinkmap-status/SKILL.md`; Claude may also run it on its own. Ticket P1-T01.

- [decided 2026-10-29] P1-F01-05: `/thinkmap-implement-ticket <ID>` — claim a ticket in a new session
  > What: Sets the ticket `in-progress` with the session as owner, appends a Handoff log
  > line, loads the ticket's goal, acceptance criteria and linked decisions into context,
  > and reminds the session to suggest a commit message with `[ID]` when done.
  > Why: This is how work is handed to parallel sessions safely: one ticket per session,
  > status visible on everyone's map.
  > Expected: Two sessions cannot both claim the same ticket without noticing (the second
  > sees `in-progress` + owner and asks).
  > Built: `skills/thinkmap-implement-ticket/SKILL.md`; also triggers on "work on ticket P1-T03". Ticket P1-T01.

- [caution 2026-10-29] P1-F01-06: The format has one source of truth — skills must not restate it
  > What: `template/FORMAT.md` is canonical. The `thinkmap-format` skill links to or
  > embeds that file at build time; it never carries a second, hand-edited copy.
  > Why: Two copies drift; a drifted skill would teach sessions a format the validator rejects.
  > Risk: Silent validation errors in every project using the plugin.
  > Built: The skill links to the file; `test/plugin.test.js` fails if it ever restates the point syntax or ID table.
  > Discussed: The project's own `docs/plan/FORMAT.md` is the third copy; since P1-F03-06 the
  > tool checks it against the bundled file and `thinkmap format --write` refreshes it.

- [decided 2026-10-29] P1-F01-07: Skill names keep the `thinkmap-*` prefix
  > What: `thinkmap`, `thinkmap-status`, `thinkmap-implement-ticket`, `thinkmap-init`, `thinkmap-format`.
  > Why: A plugin skill is reachable as `/<plugin>:<skill>` and, when nothing else uses the
  > name, as the bare `/<skill>`. Short names like `/init` and `/status` collide with Claude
  > Code's built-in commands, so the bare form would never work; the prefix guarantees it does.
  > Discussed: (a) prefixed vs (b) short — (b) rejected for the collision.
  > Built: `skills/` folders named accordingly; `/thinkmap:thinkmap-status` also works.

- [decided 2026-10-30] P1-F01-08: `/thinkmap-create-tickets <P1 | P1-F02>` — break decided points into tickets, whole phase at once
  > What: Takes a phase ID (every topic of the phase in one table) or a topic ID (additions to
  > a phase that already has tickets). Gate 1 shows the proposed tickets — IDs continuing the
  > phase numbering, title, topic, `implements`, `depends_on` — and waits. Gate 2 writes the
  > files into `<NN-slug>/tickets/` on an explicit "go ahead", sets each covered point's
  > `Built:` line to the ticket, and runs the validator.
  > Why: GitHub issue #1 — a fresh phase with seven decided topics meant seven one-topic
  > runs, so the breakdown was done by hand and the folder layout drifted. One run per phase
  > removes the reason to skip the tool. `thinkmap status` names this command when a phase is
  > fully decided and has no tickets (P2-F03-04).
  > Expected: "all decided, zero tickets" is followed by `/thinkmap-create-tickets P1`, one table,
  > one yes, and a valid `tickets/` folder.
  > Built: `skills/thinkmap-create-tickets/SKILL.md` (Claude may invoke it; the gates keep the human in charge). Ticket P2-T02.

- [decided 2026-11-03] P1-F01-09: `/thinkmap-implement-ticket` works in two gates — brief first, then claim, build and close
  > What: Gate 1 is read-only: the ticket, its implemented points, the topic's cautions, the
  > dependencies and the project's CLAUDE.md, written up as a brief (objective, decisions,
  > cautions, criteria, dependencies, proposed approach, open questions), then stop. After
  > "go ahead", Gate 2 claims the ticket (as before), builds it — recording anything undecided
  > as an open point and waiting instead of guessing — runs the project's checks, and closes
  > it: verified criteria ticked, `code:` filled, `done`, `Built:` lines updated.
  > Why: Merged from a `/ticket` skill Deepak used in another project. The person approves the
  > approach before any file changes, and a ticket ends closed instead of left in-progress.
  > Claiming moves to Gate 2 so a brief nobody approves doesn't leave the ticket locked; the
  > owner is checked in both gates, so the double-claim guard of P1-F01-05 still holds.
  > Expected: "work on P1-T03" shows a brief and waits; "go ahead" ends with a done ticket,
  > a valid plan and a suggested commit message.
  > Built: `skills/thinkmap-implement-ticket/SKILL.md`; README, REFERENCE and the session briefing describe it.

- [decided 2026-11-03] P1-F01-10: `/thinkmap-create-tickets` adds a readiness check, sizes and a cautions-to-tickets list
  > What: Before the table: decided points in scope, already covered, left out (stop if nothing
  > to split). The table gains a Size column (S/M/L, split above L) and is in build order;
  > under it, which tickets carry each caution and why any decided point has no ticket. IDs
  > also skip numbers already named in `Built:` lines. Acceptance criteria include what the
  > project's definition of done requires (e.g. an isolation test for a new endpoint).
  > Why: Merged from a `generate-tickets` skill Deepak used in another project; one skill per
  > job instead of shipping a second ticket skill.
  > Built: `skills/thinkmap-create-tickets/SKILL.md`.

- [decided 2026-11-03] P1-F01-11: The two ticket skills are named for what they do — `/thinkmap-create-tickets` and `/thinkmap-implement-ticket`
  > What: `/thinkmap-tickets` → `/thinkmap-create-tickets` (makes ticket files from decisions);
  > `/thinkmap-ticket` → `/thinkmap-implement-ticket` (briefs, builds and closes one ticket).
  > Why: The old names differed by one "s", and you had to read the skill to know which
  > does what. Same rule as the catalogue (P2-F02-10): the name says what it does. The
  > `thinkmap-` prefix stays (P1-F01-07). Deepak's names.
  > Discussed: No aliases for the old names — four ticket commands in the list would be worse.
  > Existing users must be told in the release notes: the old commands stop working after updating.
  > Built: Skill folders, `thinkmap status` suggestions, session briefing, tests, README,
  > REFERENCE, SPEC and plan updated.

## Tickets

- P1-T01 · Skills — thinkmap-format, /thinkmap-init, /thinkmap, /thinkmap-status, /thinkmap-implement-ticket · done
