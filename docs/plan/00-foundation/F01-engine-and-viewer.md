---
id: P0-F01
type: feature
title: Format, engine & viewer
status: auto
parent: P0
labels: [core]
updated: 2026-10-29
---

## Points
- [decided 2026-10-29] P0-F01-01: Planning lives in docs/plan/ as Markdown in a fixed format
  > What: Project, phases, topics (features), discussion points and tickets are Markdown
  > files with a small header (`id`, `type`, `status`, `parent`…). `template/FORMAT.md` is the rulebook.
  > Why: Files are the single source of truth. Any session, agent or person edits the same
  > files; Git syncs them; the map only reads.
  > Expected: A decision made in one chat session is visible to every other session.
  > Built: Parser, validator, template.

- [decided 2026-10-29] P0-F01-02: Six kinds of note per topic, each with a labelled body
  > What: `discussed · decided · open · suggestion · caution · dropped`, written as
  > `- [decided 2026-10-29 claude] P1-F02-01: title` plus `> What:` `> Why:` `> Expected:`
  > `> Discussed:` `> Pending:` `> Built:` lines. Tickets fill the sixth bucket, Work.
  > Why: These are the questions a person asks about any topic. A bare one-line decision
  > tells a newcomer nothing; the body is the story.
  > Expected: Reading one note explains the decision fully; the validator warns when a
  > decided point has no body.
  > Built: Parser, validator warning, panel sections.

- [decided 2026-10-29] P0-F01-03: The web page is the main view; the terminal summary is secondary
  > What: `thinkmap serve` opens a live page; `thinkmap status` prints a short summary.
  > Why: People want to *see* the plan; text is for quick checks and hooks.
  > Built: Both.

- [decided 2026-10-29] P0-F01-04: The map is a NotebookLM-style expandable tree
  > What: Project card left-centre; click opens phases → topics → six buckets → notes, with
  > animation. Clicking a note opens a half-screen panel with the full story; the map
  > glides aside to keep the card visible.
  > Why: Four designs were tried on a real plan. A dots-and-lines graph and a dashboard
  > were both "too complicated"; a radial six-bucket map was close; the expandable tree
  > won because it shows one level at a time, the way a person explores.
  > Discussed: See the viewer ticket's handoff log for the iterations.
  > Built: `web/index.html`, no libraries.

- [decided 2026-10-29] P0-F01-05: Zero dependencies, one HTML file, localhost only
  > What: Node 20+ built-ins only; the viewer is a single file with no build step and no
  > CDN scripts; the server binds 127.0.0.1 and serves only `.md` files inside the plan folder.
  > Why: Drops into any repo, works offline, nothing leaves the machine, nothing to audit.
  > Risk: Adding a dependency "just for X" breaks all three promises.

- [decided 2026-10-29] P0-F01-06: `thinkmap init` sets up any project from a bundled template
  > What: Creates `docs/plan/` with FORMAT.md, a project card, a first phase, an example
  > topic showing every note kind, and an example ticket; prints the CLAUDE.md snippet.
  > Why: Adoption must take under five minutes with no manual copying.
  > Built: `src/init.js`, `template/`.

- [decided 2026-10-29] P0-F01-07: Distribution in three stages — npx now, plugin next, marketplace last
  > What: Stage 1: `npx github:dsngeu/ThinkMap init`. Stage 2: a Claude Code plugin that
  > bundles engine + skills + hooks (the format moves into a skill). Stage 3: an internal
  > plugin marketplace so any team installs it with two commands.
  > Why: Stage 1 works today with zero extra work; stages 2–3 remove the manual steps and
  > give companies one governed way to roll it out.
  > Built: Stage 1. Stages 2–3: phase P1.

- [decided 2026-10-29] P0-F01-08: Thinkmap is its own public repo
  > What: Moved out of the project it was first built in, into github.com/dsngeu/ThinkMap
  > with `package.json` at the root.
  > Why: It is project-agnostic; the plugin and marketplace need independent versioning;
  > public so any team can use it.
  > Built: Repo, MIT license, README, this plan.
