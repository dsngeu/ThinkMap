---
name: thinkmap-create-tickets
description: Break the decided points of a whole phase (P1) or one topic (P1-F02) into tickets. Shows the proposed breakdown as one table first and writes the ticket files only after an explicit "go ahead". Use it when `thinkmap status` suggests generating tickets, or when the person asks to create tickets, plan the work, or break a phase down.
argument-hint: "<P1 | P1-F02> [owner]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js *), Read, Write, Edit, Glob, Grep
---

# /thinkmap-create-tickets — from "decided" to "tickets exist"

Arguments: `$ARGUMENTS` — a phase ID (`P<n>`: every topic of the phase in one go) or a topic
ID (`P<n>-F<nn>`: one topic, for additions to a phase that already has tickets), plus an
optional default owner (leave `owner:` empty when none is given).

Two gates. Nothing is written before the second one.

## 1. Load the scope

```
node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js" json
```

From the graph take the phase (or the topic's phase), its topics (`type: feature`), their
points, and the existing tickets of the phase (`type: ticket`, `id` starting with `P<n>-T`).
If the ID does not exist, say so and list the phases. Read the format rules first:
`${CLAUDE_PLUGIN_ROOT}/template/FORMAT.md` (§1 for where files go, §6 for the ticket body).

Points to cover: every `decided` point in scope that no existing ticket lists in
`implements` (the graph gives `implementedBy` per point). `caution` points are not covered by
a ticket; they go into the *Notes* of the tickets they concern. `open` and `suggestion` points
are not ticketed — list them at the top of the table as "still open, left out"; if the whole
scope is still open, stop and say the phase needs decisions first (`/thinkmap-status P<n>`).

## 2. Gate 1 — propose the breakdown, then wait

First a short **readiness check**: how many decided points are in scope, how many are already
covered by a ticket (they get no new one), and which `open` / `suggestion` points are left
out. If nothing is left to cover, say "nothing to split" and stop. Also read the project's
`CLAUDE.md` for its definition of done and the architecture docs the topics touch.

Then show **one table** for the whole scope (all topics of the phase together), in build
order, nothing written yet:

| ID | Title | Topic | Implements | Depends on | Size | Owner |
|---|---|---|---|---|---|---|

Under the table:

- **Cautions → tickets:** each caution in scope and the tickets whose *Notes* carry it — every
  caution lands in at least one ticket.
- **Decided points with no ticket:** ID and why (already built, docs only, covered by another ticket).
- **Left out (open / suggestion):** ID and text.

Rules for the proposal:
- IDs continue the phase's numbering: the next free `P<n>-T<nn>` after the highest existing
  ticket of the phase (`P1-T06` after `P1-T05`), counting `done` and `dropped` tickets and any
  number already named in a `Built: … ticket P<n>-T<nn>` line, never reusing an ID.
- One ticket = one unit of work one session can finish: usually 1–4 decided points of the
  same topic. Size it S / M / L and split anything larger than L.
- A point that is two deliverables becomes two tickets — typically backend and frontend,
  with the UI ticket depending on the API ticket.
- `depends_on` only for real build order (a ticket needs another's output), never "nice to
  do first". Keep chains short.
- Every uncovered decided point appears in exactly one ticket's *Implements*, or under
  "Decided points with no ticket" with a reason.

End with: "Say **go ahead** to write these N ticket files, or tell me what to change." Then
**stop and wait**. Adjust the table for as long as the person wants. If the person decides an
open point during this, record it in its topic as a decided point first, then include it.

## 3. Gate 2 — write the files (only after an explicit go)

For each row create `<NN-slug>/tickets/<ID>-<F<nn>>-<slug>.md` inside the phase folder, where
`F<nn>` is the short ID of the ticket's topic (`P2-T05-F04-sprint-model-api.md` for a ticket of
`P2-F04`) (the folder
already has `tickets/`; if it is missing, run `node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js"
phase P<n> <slug>` rather than making it by hand). Front matter: `id`, `type: ticket`,
`title`, `status: planned`, `parent: <topic id>`, `implements: [...]`, `depends_on: [...]`
when any, `owner` when given, `labels` copied from the topic, `updated: <today>`. Body as in
FORMAT.md §6: *Goal* from the points' `What:`/`Why:` lines, *Acceptance criteria* from their
`Expected:` lines (one checkbox each, plus "Tests pass" and any check the project's definition
of done requires, such as an isolation or permission test for a new endpoint), *Out of scope* for anything you
deliberately left out, *Notes* naming the cautions and the point IDs, an empty *Handoff log*.

Then, in each covered point, set its `Built:` line to `Built: Not yet — ticket <ID>` (add the
line if the point has none). Change nothing else in the topic files by hand; write each topic's
`## Tickets` list with the tool (it also renames older ticket files that lack the topic):

```
node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js" tickets --write
```

## 4. Check and report

```
node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js" validate
node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js" status P<n>          # or the topic: status P<n>-F<nn>
```

Fix anything the validator reports. Report: the files written, the status output's *NEXT
FREE TICKETS* list, and that each ticket is claimed with `/thinkmap-implement-ticket <ID>`. Do not
commit; humans commit.
