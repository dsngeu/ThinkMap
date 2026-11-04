---
id: P3-F01
type: feature
title: Ideas for the next phase
status: auto
parent: P3
labels: [roadmap]
updated: 2026-11-04
---

Suggestions raised on 2026-11-04 when Deepak asked what would make Thinkmap useful to every
developer. Each one becomes its own topic once it is picked.

## Points
- [suggestion 2026-11-04 claude] P3-F01-01: Cautions appear when you touch the code they protect
  > What: A PreToolUse hook on Edit/Write looks up which topics and tickets name the file in
  > `code:` (or a new `guards:` path list on a point) and tells Claude the relevant decisions
  > and cautions before it edits — "P2-F02-04: the server must stay read-only".
  > Why: Today a caution only helps if someone remembers to read it. Surfacing it at the
  > moment of the edit is what stops a decided thing from being quietly undone.
  > Options: (a) match `code:` paths only; (b) add a `guards:` field for cautions; (c) both.
  > Risk: Must stay fast and fail open (P1-F02-03), and say little — one line per point.
  > Next: Pick (a)/(b)/(c); this is the recommended first topic of P3.

- [suggestion 2026-11-04 claude] P3-F01-02: Start a plan from a project that already exists
  > What: `/thinkmap-import` reads README, CLAUDE.md, ADRs, TODO/FIXME comments, open GitHub
  > issues and recent commits, and drafts phases, topics and points (all as `suggestion` or
  > `open`) for a person to confirm.
  > Why: Most developers have an existing repo, not a blank one. An empty map is the biggest
  > reason to never start.
  > Options: (a) a skill only (Claude does the reading); (b) a CLI that gathers the inputs plus
  > the skill that writes the points.
  > Next: Try (a) on two real repos and see how much needs fixing by hand.

- [suggestion 2026-11-04 claude] P3-F01-03: `thinkmap drift` — the plan notices when it stops matching the code
  > What: Reports `code:` paths that no longer exist, tickets marked done with no commit that
  > names them, `in-progress` tickets untouched for N days, decided points with no ticket for
  > N days, and commits naming IDs that don't exist. Shown in the briefing and on Home.
  > Why: A plan that silently goes stale is worse than none; this keeps it honest for free.
  > Options: Warnings in `validate`, or a separate command so validate stays about format.
  > Next: Separate command; add the top 3 to the session briefing.

- [suggestion 2026-11-04 claude] P3-F01-04: "What changed" — a digest of the plan since a date
  > What: `thinkmap changes --since 7d` reads git history of `docs/plan/` and lists what was
  > decided, opened, dropped and finished. Also a "This week" card on Home.
  > Why: Standups, release notes, weekly updates to a manager — every developer writes these,
  > and the data is already in git.
  > Options: Terminal text, Markdown (paste into Slack/PR), or both.
  > Next: Markdown output first; it covers the other uses.

- [suggestion 2026-11-04 claude] P3-F01-05: Thinkmap in pull requests and CI
  > What: A ready-made GitHub Action: runs `thinkmap validate`, comments on the PR with the
  > tickets and points it implements and the cautions that cover its changed files, and
  > publishes the export to GitHub Pages on merge (answers P2-F01-04 option b).
  > Why: Reviewers see why the code is shaped this way without opening the plan.
  > Risk: Needs a token to comment; keep the comment optional and the validate step token-free.
  > Next: Validate + Pages first; PR comment after P3-F01-01 decides how paths map to points.

- [suggestion 2026-11-04 claude] P3-F01-06: Any AI assistant can read and write the plan, not only Claude Code
  > What: A small MCP server (stdio JSON-RPC, still zero dependencies) with tools like
  > `plan_status`, `find_decisions(path|text)`, `add_point`, `claim_ticket`; plus an
  > `AGENTS.md` section written by `init` for tools that read that file.
  > Why: Teams mix Cursor, Codex, Copilot and Claude Code. If only one of them keeps the plan,
  > the plan is wrong for everyone.
  > Risk: `add_point` must go through the same validator as file edits.
  > Next: Read-only tools first; writing after the format check is wired in.

- [suggestion 2026-11-04 claude] P3-F01-07: Safe parallel sessions — one ticket, one session
  > What: `/implement-ticket` writes a claim (session, branch, time) and refuses a ticket
  > someone else claimed in the last hour; optionally opens a git worktree per ticket. The
  > viewer shows the claim as the live dot from P2-F01-03 option (b).
  > Why: Running several Claude sessions at once is becoming normal, and two of them on the
  > same ticket waste work and collide.
  > Next: Decide together with P2-F01-03.
