---
name: thinkmap-ticket
description: Claim a Thinkmap ticket in this session — marks it in-progress with you as owner, adds a Handoff log line, and loads its goal, acceptance criteria and linked decisions into context so work can start.
argument-hint: "<ticket-id, e.g. P1-T03> [owner]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js *), Read, Edit, Grep, Glob
---

# /thinkmap-ticket — claim a ticket and load its context

Also use this on your own when the person says "work on ticket P1-T03", "take P1-T03" or
similar — it is the safe way to start work in a session.

Arguments: `$ARGUMENTS` — the ticket ID (required, pattern `P<n>-T<nn>`) and an optional
owner name (default `claude`).

## 1. Find the ticket

Get the graph once and read the ticket from it:

```
node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js" json
```

(Nodes have `id`, `type`, `status`, `owner`, `file`, `implements`, `dependsOn`, `sections`.)
If the ID does not exist, say so and list the tickets whose status is `planned`.

## 2. Refuse to double-claim

If the ticket is already `in-progress` with an owner other than the one given, **do not
change it**. Tell the person who owns it and when it was last updated, and ask whether to
take it over. Only continue if they say yes.
If it is `done` or `dropped`, say so and stop.

## 3. Claim it (edit only this ticket's file)

In the ticket file's front matter: set `status: in-progress`, set `owner: <owner>`, set
`updated:` to today (`YYYY-MM-DD`). Append one line to its `## Handoff log`:

```
- <today> · <owner> · started
```

Never rewrite earlier Handoff log lines. Edit nothing outside this file.

## 4. Load the context

Read and summarise for yourself, from the ticket and the graph:
- Goal, acceptance criteria, out of scope, notes
- The points it `implements` (title + `What:`/`Why:` lines) and the topic they belong to
- Cautions in the same topic — rules you must respect while building
- Tickets it depends on and their status (warn if any is not `done`)

Then run `node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js" validate` to confirm the file is still valid.

## 5. Say what happens next

One short message: ticket claimed (ID, title, owner), the acceptance criteria as a
checklist, any dependency or caution to watch, and that the finished work should end with
ticked criteria, `code:` filled, `status: done`, a new Handoff log line, and a suggested commit
message ending with `[<ID>]`. Do not commit; humans commit.
