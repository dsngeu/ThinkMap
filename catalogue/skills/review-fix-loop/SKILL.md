---
name: review-fix-loop
description: Review → fix → re-review loop. Asks which code-review agents to run (of those installed in .claude/agents/) and what to review (uncommitted changes or a module), runs them, hands every finding to the review-findings-fixer agent, re-runs the same reviewers to confirm, and repeats up to 3 fix rounds. Ends with a per-round report (what was reported, what was fixed) and a final status, also saved to docs/reviews/. Never commits.
argument-hint: '[uncommitted | module <name>] [ticket <ID>] [include nits]   — optional; it asks for anything missing'
disable-model-invocation: true
---

# /review-fix-loop — review, fix, re-review (max 3 rounds)

Arguments: `$ARGUMENTS`

You are the **coordinator**. You run in the main conversation, because only the main
conversation can start agents — a subagent cannot start other subagents. You never review or
fix code yourself: reviewers find, `review-findings-fixer` fixes, you keep the ledger and report.

## Step 1 — Check what's installed

List `.claude/agents/`. You need `review-findings-fixer.md` and at least one reviewer among
`fullstack-code-reviewer.md`, `backend-code-reviewer.md`, `frontend-code-reviewer.md`,
`data-isolation-reviewer.md`. If `review-findings-fixer` or every reviewer is missing, say which
files are missing, that they come from the Thinkmap catalogue, and stop.

## Step 2 — Ask what to run (always)

Read `$ARGUMENTS` first. It may already name the scope (`uncommitted`, `diff`,
`module orders`, or just a module name) and/or a ticket ID (`P1-T15`). Ask only for what is
missing, but **always ask which reviewers** — in one `AskUserQuestion` call. Offer only the
reviewers that are installed:

1. **Reviewers** (`multiSelect: true`, header "Reviewers"):
   - `Full-stack` — `fullstack-code-reviewer`: backend + frontend + the contract between them.
   - `Backend` — `backend-code-reviewer`.
   - `Frontend` — `frontend-code-reviewer`.
   - `Data isolation` — `data-isolation-reviewer`: one user or customer reaching another's data.
2. **Scope** (only if `$ARGUMENTS` didn't give it; header "Scope"):
   - `Uncommitted changes (Recommended)` — everything in `git diff HEAD` plus new files.
   - `A module` — a full module end to end.

If the answer is "A module" (or "Other" with a name), resolve the name from the module or
feature folders of the project; if it isn't obvious, ask once more with up to four names as
options. If the scope is uncommitted and `git status --porcelain` shows no code changes, say
so and stop.

Then sanity-check the pick, without asking again:

- `Full-stack` together with `Backend` or `Frontend` overlaps (the full-stack reviewer
  already applies both checklists). Run what was picked, but say in one line that findings may
  repeat — you will merge duplicates.
- If the project's `CLAUDE.md` or definition of done requires a reviewer that wasn't picked,
  remind in one line. Don't add it yourself.

Print the run plan in two lines (reviewers · scope · max 3 fix rounds) and start. No
"go ahead" gate — choosing the reviewers is the go-ahead.

## Step 3 — The loop

```
round 1: review → fix
round 2: re-review → fix what's new or still open
round 3: re-review → fix what's new or still open
final:   re-review only (confirms round 3's fixes — no fixing)
```

Stop early as soon as any of these is true:

- a review finds nothing to fix (no BLOCKER/HIGH/MEDIUM/LOW outside the parked set) → **CLEAN**;
- every remaining finding is parked → **NEEDS YOU**;
- `review-findings-fixer` changed no files in a round (nothing more it can do) → go straight to the final status.

### 3a. Review

Start every selected reviewer **in parallel** (one message, several Agent calls). Each prompt
must state the scope explicitly, or the reviewer stops to ask:

| Reviewer | Uncommitted prompt | Module `<m>` prompt |
|---|---|---|
| `fullstack-code-reviewer` | "Review the uncommitted changes." | "Review module <m> (full module mode)." |
| `backend-code-reviewer` / `frontend-code-reviewer` | "Review uncommitted changes only." | "Review module <m> (full module mode)." |
| `data-isolation-reviewer` | "Review the uncommitted changes to the server code." | "Review the server code of module <m> and its tests." |

Add "Ticket <ID>." to every prompt when one was given. From round 2 on, add: *"This is
re-review round N after automated fixes. Report the current state of the code only."* Do
**not** tell reviewers which findings were disputed — an independent second look is the point.

### 3b. Ledger (you keep it, in your own context)

Turn every report into ledger rows. One row per distinct problem:

`ID · severity · reviewer(s) · file:line · one-line claim · round first seen · status`

- IDs are `F1, F2, …`, given once and **kept across rounds**. A finding in a later round that
  is the same problem (same file and same defect, even if the line moved or the wording
  differs) gets the existing ID, not a new one.
- Duplicates from two reviewers in the same round → one row, both reviewers listed, highest severity.
- NIT findings are recorded as `nit — not sent` and never fixed (unless `$ARGUMENTS` says "include nits").
- A reviewer's own errors ("couldn't run tests: database down") go in the round notes, not the ledger.

Statuses:

| Status | Meaning |
|---|---|
| `open` | reported, not yet sent to the fixer |
| `fixed?` | fixer says Fixed — waiting for the next review to confirm |
| `fixed ✅` | fixer fixed it **and** the next review no longer reports it |
| `reopened` | was `fixed?`, but the next review reports it again → sent to the fixer again |
| `not a bug` | fixer pushed back with evidence (NOT A BUG / ALREADY FIXED) — **parked** |
| `needs decision` | fixer says NEEDS DECISION — **parked** |
| `not fixed` | fixer tried and reverted (checks failed) — sent again next round, once |

**Parked** findings are never sent to the fixer again in this run. If a reviewer raises a
parked finding again, note "re-raised in round N" on the row — that disagreement is something
the human must see — but keep it parked. A `not fixed` finding that fails a second time also
becomes parked as `needs decision`.

### 3c. Fix

If the ledger has rows with status `open`, `reopened` or `not fixed` (first retry), start
**one** `review-findings-fixer` agent with a prompt that contains, in this order:

1. "Review report from <reviewer names>, round N of /review-fix-loop, scope <scope>." plus
   "Ticket <ID>." if one was given.
2. The findings to fix, **pasted in full** from the reviewers' reports (severity, file:line,
   what's wrong, why it matters, suggested fix), each labelled with its ledger ID (`#F3`), so
   the fixer's verdict table uses the same IDs.
3. "Do not touch these — already decided in earlier rounds: <ID + one line each>" when parked rows exist.
4. "Default scope applies (BLOCKER–LOW, no nits)." unless the user asked for nits.

Then read its report and update the ledger from its verdict table: Fixed → `fixed?` ·
NOT A BUG / ALREADY FIXED → `not a bug` · NEEDS DECISION → `needs decision` · not fixed →
`not fixed`. Keep its "Checks:" line, "Pushed back" reasons, "Needs decision" options and
"Files changed" list for the report.

At the next review, every `fixed?` row the reviewers no longer report becomes `fixed ✅`; one
they report again becomes `reopened`.

Between rounds, print one short progress line, e.g.
`Round 1: 7 reported · 5 fixed · 1 not a bug · 1 needs decision → re-reviewing`.

## Step 4 — The report

Write the report to `docs/reviews/<YYYY-MM-DD>-<scope-slug>.md` (scope slug: `uncommitted` or
the module name; add `-2`, `-3` if the file exists). Show the same content in the chat. Format:

```markdown
# Review-fix loop — <scope> · <date>

Reviewers: <names> · Fix rounds: <n> of 3 · Result: **CLEAN** | **NEEDS YOU** | **OPEN AFTER 3 ROUNDS**
Ticket: <ID or —>

## Final status

| Reported | Fixed ✅ | Not a bug | Needs decision | Still open | Nits (not sent) |
|---|---|---|---|---|---|
| 9 | 6 | 1 | 1 | 1 | 2 |

## Round 1

### Reported
| ID | Sev | Reviewer | Where | Finding |
|---|---|---|---|---|

### Fixed in this round
| ID | Verdict | Result | Change |
|---|---|---|---|
Checks after fixing: <copied from review-findings-fixer>

## Round 2

### Re-review
- Confirmed fixed: F1, F2, F4
- Reopened: F3 — <why the reviewer still sees it>
- New: F8, F9
- Re-raised (parked): F5

### Reported
…

### Fixed in this round
…

## Final review (no fixing)

<what the last review confirmed; anything new it found stays open>

## Still needs you

- F5 [HIGH] — needs decision: <problem>. Options: A) … B) … Recommendation: …
- F7 [MEDIUM] — fixer says not a bug, reviewer re-raised it in round 2: <both sides in one line each>
- F9 [LOW] — still open after 3 rounds: <why>

## Changed files

<from `git status --porcelain`, only files changed during this run>

## Suggested commit message

fix(<scope>): <summary> [<ticket-id>]
```

Counting rules: each ledger ID counts once, in its **final** status. "Still open" = `open`,
`reopened`, `fixed?` that the final review contradicted, and `not fixed`. A `fixed?` row is
only counted as `Fixed ✅` after a later review confirmed it — never on the fixer's word alone.

End the chat message with the Result line, the counts table, the "Still needs you" list and
the report path.

## Things this skill never does

- Review or fix code itself — every finding comes from a reviewer, every fix from `review-findings-fixer`.
- Run more than 3 fix rounds, or run the fixer on the final review.
- Send a parked finding to the fixer again, or quietly drop a finding from the report.
- Count a fix as done before a re-review confirmed it.
- `git commit`, `push`, `tag`, `rebase`, `reset`, `stash`, `checkout -- <file>` or `git add` —
  the human reviews and commits.
- Edit `docs/plan/` (only `review-findings-fixer` appends a Handoff log line when a ticket is given).
