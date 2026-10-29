# Thinkmap

**Know your project: what's decided, what's open, what's built.**

Thinkmap turns a folder of Markdown planning files into a live, click-to-expand mind map.
Every topic has six buckets, the way a person keeps a project in their head:

| | Bucket | Holds |
|---|---|---|
| 💬 | **We discussed** | things we talked through |
| ✅ | **We decided** | agreements, each with the reason |
| ❓ | **Still open** | questions nobody has answered yet |
| 💡 | **Suggested** | ideas (often from an AI assistant) waiting for a yes/no |
| ⚠️ | **Take care of** | rules and risks to remember while building |
| 🔨 | **Work** | tickets: what is being built, by whom, how far |

The files are the source of truth. People and AI coding assistants (it was built for
[Claude Code](https://claude.com/claude-code)) write them while planning; the map updates live.

```
[Project] ─► [Phase 1] ─► [Topic: Signup] ─► [✅ We decided (7)] ─► [note] ─► full story panel
```

Zero dependencies. Node 20+. One HTML file. Nothing leaves your machine.

## 60-second start

```bash
cd your-project
npx github:dsngeu/ThinkMap init --name "Your Project"   # creates docs/plan/ with an example topic
npx github:dsngeu/ThinkMap serve --open                 # http://localhost:4400
```

Prefer a local install? `npm i -D github:dsngeu/ThinkMap` then `npx thinkmap serve --open`.
Or clone this repo and run `node bin/thinkmap.js serve --open` inside any project.

`init` also prints a short **Planning** section to paste into your `CLAUDE.md` (or any
assistant's instructions file), so every session writes decisions into the plan files
instead of leaving them in chat.

## What you see

- **Mind map**: the project card on the left; click to open phases → topics → buckets → notes, with animation. Click again to fold.
- **Cards** carry labelled counters (`7 decided · 3 open · 1 idea · 2 cautions · 2/6 built`), progress bars, a "needs decision" chip, and the current phase.
- **Details panel** (half the screen; the map glides aside): the full story of a note — *What this is · Why · What we expect · What we discussed · Still pending · What's built* — plus related tickets and decisions with status, acceptance criteria, code files, commits and the handoff log.
- **Preview file** (rendered or raw, line highlighted) · **Open in editor** (VS Code, exact line) · **Show on map**.
- **Search** (`/`) auto-expands matching branches · **? Legend** · **timeline** strip · light & dark themes · static export for people without the tool.

## The files

```
docs/plan/
├── FORMAT.md                      the rules (read by your assistant every session)
├── project.md                     type: project
└── 01-basic/
    ├── phase.md                   type: phase     id P1
    ├── F02-signup.md              type: feature   id P1-F02   ← a "topic"; its ## Points are the notes
    └── tickets/P1-T03-api.md      type: ticket    id P1-T03
```

A note is one line plus a labelled body:

```markdown
- [decided 2026-10-29 claude] P1-F02-02: Confirmation link valid 24h, single use
  > What: The email link carries a random token; only its hash is stored, with expiry and used-at.
  > Why: A database leak must not yield working links; single use stops forwarded links.
  > Expected: Using a link twice, or after 24h, shows "link expired — request a new one".
  > Built: Not yet — ticket P1-T03.
```

Kinds: `discussed · decided · open · suggestion · caution · dropped`. Labels: `What · Why ·
Expected · Discussed · Options · Pending · Built · Risk · Next`. Full spec: [template/FORMAT.md](template/FORMAT.md).

## Commands

| Command | What it does |
|---|---|
| `thinkmap init [dir] --name "X" [--force]` | Set up `docs/plan/` from the template |
| `thinkmap serve [dir] [--port 4400] [--open]` | Web viewer with live reload |
| `thinkmap status [dir] [P1 \| open]` | Terminal summary: phases, in progress, blocked, open questions, next free tickets |
| `thinkmap validate [dir] [--quiet]` | Check the format; exit 1 on errors (use in hooks and CI) |
| `thinkmap export [dir] [--out plan.html]` | One static HTML file to share |
| `thinkmap json [dir]` | The graph as JSON |

`dir` defaults to `./docs/plan`. Commits are linked to tickets when the message contains
the ID in brackets: `feat: signup endpoint [P1-T03]`.

## Working with an AI assistant

1. Keep the map open on a second screen.
2. Discuss as usual. Say "record that as decided" or "that's still open" — the assistant
   writes the files (the `CLAUDE.md` snippet from `init` tells it how).
3. Hand tickets to separate sessions: "work on ticket P1-T03". Each session edits only its
   own ticket, logs in the *Handoff log*, and marks it `done`. The map turns green.
4. `thinkmap validate` in a hook or CI keeps the files well-formed.

Planned: a Claude Code plugin bundling skills (`/thinkmap`, `/thinkmap-status`,
`/thinkmap-ticket`, an auto `thinkmap-format` skill) and hooks (validate on save, session
briefing), installable from a company plugin marketplace. See [SPEC.md](SPEC.md).

More: [docs/USING-IN-ANOTHER-PROJECT.md](docs/USING-IN-ANOTHER-PROJECT.md).

## Develop

```bash
npm test                              # node --test, no dependencies
node bin/thinkmap.js serve --open     # this repo plans itself in docs/plan/
```

## License

MIT © Deepak Singh. Born inside [Tracklane](https://github.com/dsngeu/Tracklane), a
multi-tenant ticket system built with Claude Code.
