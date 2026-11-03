---
id: P0-T02
type: ticket
title: Viewer — expandable mind map, details panel, live reload
status: done
parent: P0-F01
depends_on: [P0-T01]
implements: [P0-F01-03, P0-F01-04, P0-F01-05]
owner: claude
labels: [core, ui]
code: [web/index.html, src/server.js]
updated: 2026-10-29
---

## Goal
A local web page showing the plan as a click-to-expand mind map that updates live.

## Acceptance criteria
- [x] Project → phases → topics → six buckets → notes, animated, auto-scroll to new children
- [x] Cards: labelled counters, settled/open and built bars, "needs decision" chips, current phase
- [x] Half-screen details panel; map glides aside; What/Why/Expected/Discussed/Pending/Built sections
- [x] Related tickets and decisions with status, acceptance criteria, code, commits, handoff log
- [x] Preview file (rendered/raw, line highlighted), Open in editor, Copy ID, Show on map
- [x] Search auto-expands matches; legend; timeline strip; light + dark; phone width
- [x] Live reload (SSE) on file change or new commit; localhost only; static export

## Handoff log
- 2026-10-29 · claude · viewer built; localhost-only server
- 2026-10-29 · claude · switched graph to a left-to-right tree layout so labels stay readable
- 2026-10-29 · claude · redesigned after feedback "too complicated": Today dashboard (3 columns) + Phases page (features with Decisions/Work lists) are the main views; graph moved to a Map tab
- 2026-10-29 · claude · third design, "like a human mind": overview = project with topic bubbles around it; click a topic = six buckets (discussed / decided / still open / suggested / take care of / work); timeline strip; no graph library needed
- 2026-10-29 · claude · full details panel (reasoning, related tickets/decisions with status, acceptance criteria, code, commits, handoff log, "open in editor" at the exact line), search (/), ← → between topics
- 2026-10-29 · claude · fourth design: NotebookLM-style mind map — project card left-centre, click expands children with animation (project → phases → topics → six buckets → notes), animated connectors, auto-scroll to new children, "Show on map" from the panel
- 2026-10-29 · claude · details panel slides in to half the screen; the map glides left in step so the clicked card stays beside the panel
- 2026-10-29 · claude · labelled note bodies (What / Why / Expected / Discussed / Pending / Built / Options / Next / Risk) rendered as sections; validator warns on decided points without a body
- 2026-10-29 · claude · "Preview file" in the panel: shows the Markdown file in-page (rendered or raw with line numbers) with the note's line highlighted; server only serves files inside the plan folder
- 2026-10-29 · claude · enhanced cards: labelled count chips, settled/open and built progress bars, kind tags and 2-line summaries on notes, status/owner/checklist on tickets, "current" phase tag, "needs decision" chips, ? Legend popover
