# Planning Format (Thinkmap v1)

All planning lives in `docs/plan/` as Markdown files. The **Thinkmap** viewer reads
these files and draws them as a live graph of connected dots. Every Claude session
and every person follows this format, so plans stay in sync across sessions.

> This file is a **copy** of the rules bundled with Thinkmap (`template/FORMAT.md` in the
> tool), kept here for people and sessions without it. Don't edit it: `thinkmap format`
> says when it is behind the bundled version and `thinkmap format --write` refreshes it.

## 1. Folder structure

```
docs/plan/
├── FORMAT.md                       ← this file
├── project.md                      ← root node (type: project)
├── 01-basic/                       ← one folder per phase: NN-slug
│   ├── phase.md                    ← type: phase
│   ├── F01-signup.md               ← type: feature (discussion points inside)
│   ├── F02-employees.md
│   └── tickets/
│       ├── P1-T01-signup-api.md    ← type: ticket (one unit of work for one agent)
│       └── P1-T02-set-password-ui.md
└── 02-workflow/ ...
```

## 2. IDs

| Node | ID pattern | Example |
|---|---|---|
| Project | `PROJECT` | `PROJECT` |
| Phase | `P<n>` | `P1` |
| Feature | `P<n>-F<nn>` | `P1-F01` |
| Point (inside a feature) | `P<n>-F<nn>-<nn>` | `P1-F01-03` |
| Ticket | `P<n>-T<nn>` | `P1-T07` |

IDs never change and are never reused. File names start with the short ID.

## 3. Front matter (top of every file)

```yaml
---
id: P1-T01                    # required, unique
type: ticket                  # required: project | phase | feature | ticket
title: Signup API endpoint    # required
status: planned               # required, see §4
parent: P1-F01                # required except for project
depends_on: [P1-T00]          # optional: IDs that must be done first
implements: [P1-F01-01, P1-F01-02]   # tickets only: which points this delivers
owner: backend-dev            # optional: agent name or person
labels: [auth, backend]       # optional
code: [apps/api/src/auth/]    # optional: files/folders implementing it
updated: 2026-10-29           # required: date of last change
---
```

## 4. Statuses

| Status | Meaning | Color |
|---|---|---|
| `to-discuss` | Raised, not discussed yet | grey |
| `discussing` | Under discussion | purple |
| `decided` | Agreed, no ticket yet | blue |
| `planned` | Ticket exists, not started | cyan |
| `in-progress` | Being built | amber |
| `blocked` | Waiting on something (say what in the body) | red |
| `done` | Built, tests pass, merged | green |
| `dropped` | Decided not to do (keep the file, say why) | dark grey |

Phases and features may use `status: auto` — the viewer then computes the status
from their children.

## 5. Discussion points (inside feature files)

A feature is a **topic**. Everything we know about a topic goes into one of six
buckets — the same way a person keeps a subject in their head:

| Kind | Bucket on the map | Use it for |
|---|---|---|
| `discussed` | 💬 We discussed | A note that we talked about something (no decision needed) |
| `decided` | ✅ We decided | An agreement. Add the reasoning as a `>` line |
| `open` | ❓ Still open | A question nobody has answered yet |
| `suggestion` | 💡 Suggested | An idea proposed (usually by Claude) that the human hasn't accepted yet |
| `caution` | ⚠️ Take care of | A risk, rule or gotcha we must not forget while building |
| `dropped` | ✖ Dropped | Decided *not* to do; keep the line, say why |

One line per point, under a `## Points` heading:

```markdown
## Points
- [decided 2026-10-29] P1-F02-01: Confirmation link valid 24h, single use
  > Token stored as SHA-256 hash; resend allowed after 60s.
- [open 2026-10-29] P1-F02-09: Password rules beyond length?
- [suggestion 2026-10-29 claude] P1-F02-12: Check passwords against known-breached lists
- [caution 2026-10-29] P1-F02-05: Never reveal whether an email is registered
- [discussed 2026-10-29] P1-F02-13: Walked through the whole signup → confirm → login flow
- [dropped 2026-10-29] P1-F02-14: Captcha on signup
  > Rate limiting is enough for v1.
```

Format: `- [<kind> <date> <who>] <point-id>: <text>` — date and who are optional
(date defaults to the file's `updated`; who is `claude`, a person's name, etc.).

### The body of a point — write it so a newcomer understands it

The title is a headline. Under it, indented `>` lines tell the full story using
**labelled lines**. A reader should be able to answer: what is this, why, what do we
expect, what did we talk about, what is still pending, what has been built.

```markdown
- [decided 2026-10-29] P1-F01-01: Monorepo with npm workspaces
  > What: One Git repo holding `apps/api` (NestJS), `apps/web` (React) and
  > `packages/shared` (Zod schemas + types used by both).
  > Why: Backend and frontend share types and validation; one `npm install`,
  > one test command, one PR for a full-stack change.
  > Expected: `npm run dev` starts API and web together; a type change in
  > shared breaks the build of whichever side forgot to update.
  > Discussed: Separate repos were rejected — two PRs per feature and drifting types.
  > Pending: Lint/format tooling choice (see P1-F01-05).
  > Built: Not yet — ticket P1-T01.
```

| Label | Meaning | Use on |
|---|---|---|
| `What:` | Plain-language description | every point |
| `Why:` | The reasoning (or why *not*, for dropped) | decided, dropped, caution |
| `Expected:` | How it should behave when done; what success looks like | decided |
| `Discussed:` | What was talked through, options compared | any |
| `Options:` | Choices on the table (for open questions / suggestions) | open, suggestion |
| `Pending:` | What is still unresolved about this point | any |
| `Built:` | What exists in code so far (or "Not yet — ticket X") | decided, caution |
| `Risk:` | What goes wrong if we forget this | caution |
| `Next:` | The concrete next step | open, suggestion |

A label starts a line (`> Label: text`); following `>` lines without a label continue it.
Rules: every point has `What:`; decided/dropped/caution points have `Why:`;
open/suggestion points have `Options:` or `Next:`. The validator warns when
a decided point has no body.

**Moving between buckets:** when an open question gets answered, change `open` → `decided`
on the same line and add the `>` reasoning. When a suggestion is accepted, `suggestion` → `decided`;
if rejected, → `dropped` with why. Keep the ID.

Older files may still use `[to-discuss]`, `[discussing]`, `[done]`; they are read as
`open`, `open`, `decided`.

## 6. Ticket body template

```markdown
## Goal
One or two sentences: what and why.

## Acceptance criteria
- [ ] ...
- [ ] Tenant-isolation test added (for any new endpoint)

## Out of scope
- ...

## Notes
Technical hints, links to architecture sections.

## Handoff log
- 2026-10-29 · backend-dev · started; created auth module skeleton
```

## 7. Rules for every Claude session

1. **While discussing:** record every decision immediately as `[decided <date>]`, every
   new question as `[open <date>]`, every idea you (Claude) propose as
   `[suggestion <date> claude]`, and every risk or rule to remember as `[caution <date>]`.
   Don't keep decisions only in chat.
2. **Before working a ticket:** set `status: in-progress`, set `owner`, update `updated`.
3. **While working:** append to the ticket's *Handoff log* — never rewrite other entries.
4. **When finished:** tick acceptance criteria, fill `code:`, set `status: done`.
5. **Commits** that implement a ticket include its ID: `feat(auth): signup endpoint [P1-T01]`.
   The viewer links commits to tickets from this.
6. **Edit only what you own.** A session working on `P1-T03` edits only that ticket's
   file (plus its Handoff log). Changing a feature's decisions needs the discussion session.
7. **Never delete** a plan file or point — mark it `dropped` with a reason.
8. **Keep front matter valid** — a hook validates it on every save.
