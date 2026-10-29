---
id: P2-F01
type: feature
title: Viewer open questions
status: auto
parent: P2
labels: [viewer]
updated: 2026-10-29
---

## Points
- [decided 2026-10-29] P2-F01-01: The viewer is read-only; files stay the source of truth
  > What: The page never writes to the plan files. "Open in editor" (VS Code, exact line)
  > and "Preview file" (rendered/raw in the panel) are the middle ground.
  > Why: One writer (people and assistants editing files) means no conflicts and no
  > surprises; the map is a view.
  > Pending: Revisit if users keep asking for click-to-change-status.

- [open 2026-10-29] P2-F01-02: Kanban-style column view for tickets?
  > What: Columns per ticket status (ready / in progress / blocked / done).
  > Options: (a) Later, once a project has 20+ tickets. (b) Now, as a toggle next to the map.
  > Next: Wait for a project with enough tickets to need it.

- [open 2026-10-29] P2-F01-03: Show which session or agent is active on a ticket right now?
  > What: A live "someone is working on this" indicator.
  > Options: (a) Use the ticket's `owner` + `in-progress` status (already visible).
  > (b) A heartbeat file written by the session-start hook, shown as a pulsing dot.
  > Next: (a) first; (b) if parallel sessions step on each other.

- [open 2026-10-29] P2-F01-04: Hosted shared URL, or is the static export enough?
  > What: How people without the tool see the map.
  > Options: (a) `thinkmap export` → one HTML file. (b) A CI job publishes the export to
  > GitHub Pages on every push (always current).
  > Next: (a) works today; (b) is a small follow-up.

- [open 2026-10-29] P2-F01-05: Several plan folders in one map (monorepos)?
  > What: A monorepo may want `apps/api/docs/plan` and `apps/web/docs/plan` on one page.
  > Options: (a) Not supported; one map per folder. (b) `thinkmap serve a/ b/` merges them.
  > Next: Nobody has asked yet.
