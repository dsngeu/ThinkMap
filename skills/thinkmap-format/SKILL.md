---
name: thinkmap-format
description: Use whenever you are planning, discussing, deciding, questioning, suggesting or warning about anything in a project that has a docs/plan/ folder (a Thinkmap plan), and whenever you create or edit a file under docs/plan/. Teaches where the format rules are and the habit of writing decisions into the plan files as the conversation happens.
user-invocable: false
---

# Thinkmap — write the plan while you talk

This project keeps its planning in `docs/plan/` as Markdown files. A viewer draws them as a
mind map, so every Claude session and every person sees what is decided, open and built.

## The one rule about the format

**The format has exactly one source of truth: `${CLAUDE_PLUGIN_ROOT}/template/FORMAT.md`.**
Read that file before you write or change a plan file. Do not work from memory and do not
look for a copy here — this skill deliberately carries none, so it can never drift from
the validator.

The project may also have its own `docs/plan/FORMAT.md`. That is a **copy** kept for
people and sessions without the plugin, not a second source: never edit it by hand. When
the validator or the session briefing says it is behind the bundled rules, refresh it with

```
node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js" format --write
```

## The habit

While discussing, record things in the plan files **as they happen**, not at the end:

- an agreement → a `decided` point with `What:` and `Why:` lines
- a question nobody answered → an `open` point with `Options:` or `Next:`
- an idea you (Claude) propose → a `suggestion` point tagged with `claude`
- a risk, rule or gotcha to remember → a `caution` point with `Risk:`
- something talked through with no decision → a `discussed` point
- something rejected → a `dropped` point with `Why:` (never delete the line)

Decisions that live only in chat are lost. If the person says "let's decide X", "that is an
open question", "note that we must …", that is your cue to edit the topic file right away.

## Where things go

- A **topic** (`type: feature`) file holds the points under `## Points`. One file per topic.
- A **ticket** (`type: ticket`) is one unit of work; it lives in the phase's `tickets/` folder,
  lists the point IDs it delivers in `implements:`, and has a Handoff log.
- New phase, topic or ticket: copy the shape of an existing file, keep the ID patterns from
  FORMAT.md, and never reuse an ID.

## After every edit

Run the validator and fix anything it reports before you move on:

```
node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js" validate
```

(A hook also runs it automatically after each edit under `docs/plan/`.)

## Working a ticket

Claim it with `/thinkmap-ticket <ID>`: status `in-progress`, your name as owner, a Handoff
log line. Edit only the ticket you own. When finished: tick the acceptance criteria, fill
`code:`, set `done`, and suggest a commit message that ends with `[<ID>]`.
