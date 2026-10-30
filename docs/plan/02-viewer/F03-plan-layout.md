---
id: P2-F03
type: feature
title: Plan folder layout
status: auto
parent: P2
labels: [engine, format]
updated: 2026-10-30
---

The shape of `docs/plan/` on disk: who creates the folders, what the validator enforces, and
how a session moves from "everything decided" to "tickets exist". Raised as GitHub issue #1
after the Tracklane project (2026-10-30) ended up with two phases that followed the rules but
looked different on disk, and a fully decided phase that nothing pushed towards tickets.

## Points
- [decided 2026-10-30] P2-F03-01: `thinkmap phase <ID> <slug>` scaffolds the whole phase folder; `init` does it for the first phase
  > What: `thinkmap phase P2 workflow` creates `02-workflow/phase.md` (valid front matter,
  > `status: auto`, parent read from `project.md`) and `02-workflow/tickets/.gitkeep` in one
  > go. The folder number comes from the ID (`P12` → `12-…`); the title comes from the slug
  > or `--title`. Re-running adds only what is missing; a second folder for the same phase
  > number is refused. `thinkmap init` leaves `tickets/.gitkeep` in the template phase too.
  > Why: Git cannot store an empty folder, so a phase without tickets lost its `tickets/`
  > and looked structurally different from one with tickets. Creating the skeleton up front
  > makes every phase look the same from day one, whether or not tickets exist yet.
  > Expected: Two phases of one project — one with tickets, one still being discussed — have
  > the same folders on disk and in git.
  > Discussed: Listing phases in `project.md` so `init` creates them all was left out — the
  > format has no such list and `thinkmap phase` is one command per phase.
  > Built: `scaffoldPhase` in `src/init.js`, `phase` in `bin/thinkmap.js`, `template/01-first-phase/tickets/.gitkeep`. Ticket P2-T02.

- [decided 2026-10-30] P2-F03-02: The validator enforces the layout as errors, not warnings
  > What: Every top-level folder is a phase folder `NN-slug` with `phase.md` and `tickets/`;
  > `NN` is the phase number. Topic files sit directly in the phase folder as `F<nn>-slug.md`;
  > ticket files only in `tickets/` as `P<n>-T<nn>-slug.md`; the file prefix equals the ID and
  > the folder is the phase in the ID. Anything else — a second project node, a `.md` with no
  > front matter, a folder that is not a phase — is an error. Every message names the fix.
  > Why: Until now the layout existed only as an example tree, so it held by convention and
  > each session had to remember it. The save hook already runs the validator, so a session
  > that puts a file in the wrong place now hears about it immediately.
  > Expected: `thinkmap validate` is clean on every project created with the tool and fails
  > on a misplaced or misnamed file with a message that says where it belongs.
  > Built: layout checks in `src/graph.js` (shared name patterns in `src/init.js`); `test/graph.test.js`. Ticket P2-T02.

- [decided 2026-10-30] P2-F03-03: FORMAT.md §1 is a set of rules, not an example tree
  > What: §1 keeps the tree but adds the five rules the validator checks, documents the
  > `.gitkeep` convention, and says the tree is created by `thinkmap init` / `thinkmap phase`
  > and never by hand.
  > Why: The spec is what people and sessions without the plugin read; it must say what the
  > validator does.
  > Built: `template/FORMAT.md` §1; the repo's own copy refreshed with `thinkmap format --write`. Ticket P2-T02.

- [decided 2026-10-30] P2-F03-04: `thinkmap status` suggests generating tickets for a fully decided phase without tickets
  > What: When a phase has points, every counted point is settled and it has zero tickets, the
  > suggested next step is `generate tickets for P1 … (/thinkmap-tickets P1)` and the phase
  > row says "all decided — no tickets yet". This outranks an open question in another phase.
  > Why: The "all decided, zero tickets" state had no guidance — status kept pointing at an
  > unrelated open question and the session had to know on its own what came next.
  > Expected: After the last question of a phase is decided, the next `status` names the
  > ticket command for that phase.
  > Built: `src/status.js`; `test/graph.test.js`. Ticket P2-T02.

- [caution 2026-10-30] P2-F03-05: Stricter layout rules turn existing warnings into errors
  > What: A `.md` without front matter in the plan folder, a top-level folder that is not a
  > phase, or a phase without `tickets/` fail `validate` from 0.5.0 on; before, the first was a
  > warning and the others were not checked.
  > Why: The issue asked for errors so the save hook stops a drifting session at once.
  > Risk: A project that kept notes in `docs/plan/` or has a phase without `tickets/` sees
  > `validate` go red after updating. Each message says the fix; `thinkmap phase P<n> <slug>`
  > repairs a phase folder in place.
