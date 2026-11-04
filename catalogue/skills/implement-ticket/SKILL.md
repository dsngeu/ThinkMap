---
name: implement-ticket
description: Work on one Thinkmap ticket in two gates — first a read-only brief (objective, decisions, cautions, acceptance criteria, dependencies, proposed approach, open questions), then, after an explicit "go ahead", claim it (in-progress, owner, Handoff log), build it, and close it (criteria ticked, code filled, done). Use when the person says "work on / take / start / pick up ticket P1-T03".
argument-hint: "<ticket-id, e.g. P1-T03> [owner]"
allowed-tools: Bash(node "$THINKMAP_CLI" *), Read, Edit, Grep, Glob
---

# /implement-ticket — brief first, then claim, build and close one ticket

> Added to this project from the Thinkmap catalogue (dashboard → Tooling → Add). `$THINKMAP_CLI` is set by the
> Thinkmap plugin when a session starts. If `echo "$THINKMAP_CLI"` prints nothing, the plugin is not active in
> this session: run the same commands as `npx github:dsngeu/ThinkMap <command>` instead.

Also use this on your own when the person says "work on ticket P1-T03", "take P1-T03" or
similar — it is the safe way to start work in a session.

Arguments: `$ARGUMENTS` — the ticket ID (required, pattern `P<n>-T<nn>`) and an optional
owner name (default `claude`).

Two gates. Gate 1 only reads. Gate 2 starts **only** after the person replies "go ahead" (or
an equally clear yes). Never merge them.

## Gate 1 — the brief (read-only, then stop)

### 1. Find the ticket

Get the graph once and read the ticket from it:

```
node "$THINKMAP_CLI" json
```

(Nodes have `id`, `type`, `status`, `owner`, `file`, `implements`, `dependsOn`, `sections`.)
If the ID does not exist, say so and list the tickets whose status is `planned`. Do not
create one.

If it is `done` or `dropped`, say so and stop. If it is already `in-progress` with an owner
other than the one given, say who owns it and when it was last updated, and ask whether to
take it over — continue only on a yes.

### 2. Read the context

- the ticket file: goal, acceptance criteria, out of scope, notes, Handoff log;
- the points it `implements` (title + `What:` / `Why:` / `Expected:` lines) and their topic;
- every caution point in that topic, whether or not the ticket implements it;
- every ticket in `depends_on`, with its status;
- the rules for a session: `docs/plan/FORMAT.md` §6–7;
- the project's `CLAUDE.md` and the docs the ticket touches (architecture, conventions,
  definition of done);
- the code of related `done` tickets (their `code:` field), if any.

### 3. Write the brief, in this shape and nothing more

```
## Brief: <ID> — <title>
**Objective** — one or two sentences: what and why.
**Decisions that apply** — one bullet per implemented point: ID, What and Why in one line each.
**Cautions** — one bullet per caution in the topic: the rule and its Risk.
**Acceptance criteria** — copied from the ticket, unchanged.
**Dependencies** — one bullet per depends_on ticket: ID, title, status.
**Proposed approach** — ordered list of files to create or change, one line each on what goes there.
**Open questions** — anything still open in the topic that touches this ticket, plus anything
  ambiguous in the ticket. If none: "None."
```

If any dependency is not `done`, put `⚠ <ID> is not done — recommend not starting` at the top.

End with: *"Reply **go ahead** to claim and build, or ask / change the plan first."* Then
**stop**. Create, edit or run nothing except reads.

If the person answers a question or changes a decision, record it in the topic file as a
decided point (FORMAT.md §5 and §7), then re-issue only the changed parts of the brief and
wait again.

## Gate 2 — claim, build, close (only after "go ahead")

### 4. Claim it (edit only this ticket's file)

Re-read the ticket's front matter: if someone else claimed it since the brief, stop and say so.
Otherwise set `status: in-progress`, `owner: <owner>`, `updated:` today (`YYYY-MM-DD`), and
append one line to its `## Handoff log`:

```
- <today> · <owner> · started; <one line of intent>
```

Never rewrite earlier Handoff log lines. Then refresh the topic's generated `## Tickets` list:

```
node "$THINKMAP_CLI" tickets --write
```

### 5. Build

- Follow the approach from the brief. Respect every caution and the project's `CLAUDE.md`.
- Edit no other ticket's file. In `docs/plan/`, edit only this ticket and points you record
  while discussing.
- **If something the plan didn't decide comes up, don't guess.** Record it in the topic as an
  open point with `What:` and `Options:`, tell the person, and wait for their answer.
- Write tests for the change — whatever the project's definition of done asks for.
- Run the project's lint, typecheck and test commands. Report the real output; a failing step
  is reported as failing, not skipped.

### 6. Close it

- Tick only the acceptance criteria that were verified.
- Fill `code:` with the files or folders implemented, set `status: done`, `updated:` today,
  and append a final Handoff log line.
- In each implemented point, update its `Built:` line to say what was built and where.
- Update the project's docs if behaviour changed.
- Run, and fix anything they report:

```
node "$THINKMAP_CLI" tickets --write
node "$THINKMAP_CLI" validate
```

### 7. Hand back

The list of changed files and a suggested commit message `type(scope): summary [<ID>]`.
Do not commit; humans commit.

## Things this skill never does

- Start Gate 2 without an explicit "go ahead".
- Create a ticket, phase or topic file (that is `/create-tickets`).
- Edit another ticket's file or rewrite someone else's Handoff log line.
- Tick an acceptance criterion that was not verified.
- `git commit`, `push`, `tag`, `rebase` or `reset`.
