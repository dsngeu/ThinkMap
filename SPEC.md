# Thinkmap — Live Planning Map

Status: **viewer and engine built (v4 mind map); skills, hooks and plugin pending** ·
Owner: Deepak · Last updated: 2026-10-29

## 1. Problem

Planning happens in chat sessions and gets lost. With many sessions and agents working
in parallel, nobody can see at a glance what was discussed, what was decided and why,
what is still waiting for an answer, what must not be forgotten, and what is built.

## 2. Solution

Planning is written as Markdown files in a fixed format (`docs/plan/FORMAT.md`).
**Thinkmap** reads them and shows a live mind map, organised the way a person keeps a
project in their head — per topic, in six buckets:

| Bucket | Holds |
|---|---|
| 💬 We discussed | things we talked through |
| ✅ We decided | agreements, each with the reason |
| ❓ Still open | questions nobody answered |
| 💡 Suggested | ideas (usually from Claude) waiting for a yes/no |
| ⚠️ Take care of | rules and risks to remember while building |
| 🔨 Work | tickets: what is being built, by whom, how far |

```
[Project] ─► [Phase 1] ─► [Topic: Signup] ─► [✅ We decided (7)] ─► [note] ─► details panel
```
The files are the single source of truth. Any session or person edits them → the map
updates live. Works for **any** project that follows the format (`thinkmap init`).

## 3. Users

| Who | Uses it to |
|---|---|
| Developer + Claude in a discussion session | Capture decisions, open points, suggestions and cautions as they talk |
| Agent sessions working on tickets | Pick a ticket, update status, log handoff |
| Tech lead / CTO | See progress, open questions, what needs a decision |
| Any company team | Same tool on their own project |

## 4. Features

### Viewer (built)
- NotebookLM-style expandable mind map: project → phases → topics → buckets → notes/tickets, animated.
- Cards: labelled counters, settled/open and built progress bars, "needs decision" chips, current phase.
- Half-screen details panel; map glides left to keep the clicked card visible.
- Panel content: What / Why / Expected / Discussed / Pending / Built sections, related
  tickets and decisions with status, acceptance criteria, code, commits, handoff log.
- Preview file (rendered / raw, line highlighted), Open in editor, Copy ID, Show on map.
- Search (auto-expands matches), legend, timeline strip, light/dark, static export.
- Live reload (Server-Sent Events) on file change or new commit. Localhost only.

### Engine (built)
- `init` · `serve` · `status` · `validate` · `export` · `json`
- Zero-dependency parser: front matter, labelled point bodies, acceptance checklists, handoff logs.
- Validation: required fields, ID patterns, parents, dependencies, cycles, duplicates,
  unknown kinds, decided points without a body (warning).
- `status: auto` roll-ups; progress = settled points + done tickets; git commit links.

### Claude Code integration (pending)
| Piece | Type | When |
|---|---|---|
| `thinkmap-format` — teaches the format; triggers when planning/discussing | Skill (auto) | next |
| `/thinkmap-init`, `/thinkmap`, `/thinkmap-status`, `/thinkmap-ticket <ID>` | Skills (commands) | next |
| Validate on save (PostToolUse) · session briefing (SessionStart) | Hooks | after skills |
| Plugin + company marketplace | Plugin | after hooks |

## 5. How the company gets it (distribution)

1. **Now — copy the folder**: `thinkmap ` + `thinkmap init` + a CLAUDE.md snippet.
   Guide: `docs/USING-IN-ANOTHER-PROJECT.md`.
2. **Next — plugin**: engine + skills + hooks in one package; the format lives in the skill.
3. **Company-wide — internal marketplace**: `/plugin marketplace add company/claude-plugins`,
   `/plugin install thinkmap@company`; pre-enabled via a project's shared settings.
4. **No Claude Code?** `thinkmap export`, or CI publishing the export to GitHub Pages.

## 6. Tech

- Node 20+, no dependencies, ES modules. Single-file viewer (`web/index.html`), no graph library.
- Server: Node `http` + `fs.watch` + Server-Sent Events; polls git HEAD every 3 s.
- Security: binds 127.0.0.1; rejects non-localhost Host headers; `/api/file` serves only `.md` inside the plan folder.

## 7. Open questions

- Q1 Kanban column view for tickets — later, once a project has 20+ tickets.
- Q2 Read-only viewer — chosen for v1; "Open in editor" and "Preview file" are the middle ground.
- Q3 Live "who is on this ticket" indicator — owner + status first; a session heartbeat if needed.
- Q4 Hosted URL for people without the tool — `export` now; a CI job publishing to GitHub Pages later.
- Q5 Multiple plan folders in one map (monorepos) — not yet asked for.

## 8. Build order

1. Format spec ✅  2. Engine ✅  3. Viewer ✅ (four iterations)  4. `init` + adoption guide ✅
5. Own public repo ✅  6. Skills  7. Hooks  8. Plugin + company marketplace
