---
id: P2-F01
type: feature
title: Viewer open questions
status: auto
parent: P2
labels: [viewer]
updated: 2026-11-03
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

- [dropped 2026-11-03] P2-F01-06: The viewer opens on a sidebar + pages layout; the mind map is the second view
  > Why: Replaced a day later by P2-F01-07. On a real plan (7 phases, 17 topics) the sidebar
  > listed every topic and Home was one long wall of rows; it still felt overwhelming.
  > What: A left sidebar lists Home, Mind map, every phase with its topics, and Tooling. Home
  > shows what needs an answer, work in progress, cautions and recent activity. Topic and
  > ticket pages read like documents; a note expands in place. The mind map stays one click
  > away, without the bucket level, and clicking a note there opens its page.
  > Why: The map-first screen felt confusing and overwhelming: four clicks to reach a note,
  > five count chips and two bars on every card, three colour schemes needing a legend, an
  > always-on timeline and a half-screen panel. Replaces the layout in P0-F01-04.
  > Discussed: Board columns and one long scrolling page were the other options.
  > Built: `web/index.html` rewritten; URLs are `#/t/<topic>/<note>`, `#/k/<ticket>`, `#/map`.

- [decided 2026-11-03] P2-F01-07: The viewer is a drill-down: Project → Phase → Topic → Note, one level per screen
  > What: No sidebar. A slim top bar holds the breadcrumb, ⌘K search, a "Needs you" count and
  > the Map switch. Home: a hero with one progress ring, a "waiting for you" card (top three),
  > the phases as a roadmap (done, you are here, next, not planned). Phase: topic cards, each
  > with one ring and a plain status ("3 to decide", "Building · 2/4", "Done"). Topic: tabs,
  > one list at a time. Note and ticket: their own reading pages, with ← → between notes.
  > Why: "As humans we want a very clear design and to drill down to the deeper level." Every
  > screen now answers one question and shows only the next level; colour is used only where
  > it means something (amber = needs you, green = done/decided, red = take care, blue = building).
  > Discussed: Line icons replace emoji; the Legend is gone because the words say it.
  > Built: `web/index.html` rewritten, still one file with no libraries.
