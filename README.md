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

## See it in action

One minute: open the map, expand a phase, click a decision, read its story.

<!-- GitHub-hosted video. To replace: edit this file on github.com, drag ThinkMap-demo.mp4
     into the editor, and paste the https://github.com/user-attachments/assets/... URL it
     produces on the line below (on its own line, no Markdown around it). -->
https://github.com/user-attachments/assets/584a6e7b-6f27-4f0b-b423-9c2df8c4b036

## Install and open

Nothing to install: `npx` fetches Thinkmap from GitHub the first time (say **y** when
npm asks "Ok to proceed?"). Requires Node 20+ and Git.

**New project (no `docs/plan/` yet):**
```bash
cd your-project
npx github:dsngeu/ThinkMap init --name "Your Project"   # creates docs/plan/ with an example topic
npx github:dsngeu/ThinkMap serve --open                 # opens http://localhost:4400
```
`--name` is the title shown on the map's root card (defaults to the folder name).
`init` also prints a short **Planning** section — paste it into the project's `CLAUDE.md`
(or your assistant's instructions file) so every session writes decisions into the plan
files instead of leaving them in chat.

**Project that already has `docs/plan/`:** skip `init` (it refuses to touch a non-empty
folder) and just open the map:
```bash
npx github:dsngeu/ThinkMap serve --open
```

**Other ways to run it**
- Project dependency: `npm i -D github:dsngeu/ThinkMap`, then `npx thinkmap serve --open`.
- One clone for all projects: `git clone https://github.com/dsngeu/ThinkMap.git ~/thinkmap`,
  then `node ~/thinkmap/bin/thinkmap.js serve --open` inside any project.

**Claude Code plugin — not yet.** `/plugin install thinkmap@…` and `/thinkmap` are
Claude Code commands (typed inside a `claude` session, not in the terminal) and will
exist once the plugin ships. Until then, the `npx` commands above are the way in.

## What you see

- **Mind map**: the project card on the left; click to open phases → topics → buckets → notes, with animation. Click again to fold.
- **Cards** carry labelled counters (`7 decided · 3 open · 1 idea · 2 cautions · 2/6 built`), progress bars, a "needs decision" chip, and the current phase.
- **Details panel** (half the screen; the map glides aside): the full story of a note — *What this is · Why · What we expect · What we discussed · Still pending · What's built* — plus related tickets and decisions with status, acceptance criteria, code files, commits and the handoff log.
- **Preview file** (rendered or raw, line highlighted) · **Open in editor** (VS Code, exact line) · **Show on map**.
- **Search** (`/`) auto-expands matching branches · **? Legend** · **timeline** strip · light & dark themes · static export for people without the tool.
- **Tooling tab**: the project's own Claude Code **agents, skills and hooks**, read from `.claude/`
  (`agents/`, `skills/`, `commands/`, the `hooks` block of `settings.json`, plus a plugin's own folders
  when `.claude-plugin/plugin.json` exists). Tap one to see what it does, how it starts, which tools it
  may use, and the file. Project files only — never your personal `~/.claude`. Hooks are shown, never run.

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

MIT © Deepak Singh
