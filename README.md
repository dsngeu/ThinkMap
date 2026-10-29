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

Zero dependencies. Node 20+. One HTML file. Nothing about your project leaves your machine
(the only network call is an optional version check against GitHub).

## See it in action

One minute: open the map, expand a phase, click a decision, read its story.

<!-- GitHub-hosted video. To replace: edit this file on github.com, drag ThinkMap-demo.mp4
     into the editor, and paste the https://github.com/user-attachments/assets/... URL it
     produces on the line below (on its own line, no Markdown around it). -->
https://github.com/user-attachments/assets/584a6e7b-6f27-4f0b-b423-9c2df8c4b036

## Install and open

Two ways in. Both need Node 20+ and Git.

### As a Claude Code plugin (recommended)

Inside a `claude` session, once per machine:
```
/plugin marketplace add dsngeu/ThinkMap
/plugin install thinkmap@thinkmap
```
Then, in any project:
```
/thinkmap-init        # once: creates docs/plan/ (and a Planning section in CLAUDE.md)
/thinkmap             # opens the live map
```
What the plugin gives every session in that project, without any CLAUDE.md editing:

| Piece | What it does |
|---|---|
| `thinkmap-format` (automatic) | While you discuss or decide, Claude writes decisions, open questions, ideas and cautions into the plan files. The rules come from one file, `template/FORMAT.md`. |
| `/thinkmap` | Opens the map (starts the viewer if needed) |
| `/thinkmap-status [P1 \| open]` | Terminal summary — Claude may also run it on its own |
| `/thinkmap-ticket <ID>` | Claims a ticket for this session (in-progress, owner, Handoff log) and loads its context; refuses to double-claim. "Work on P1-T03" triggers it too |
| `/thinkmap-init` | Sets up `docs/plan/` in a new project |
| Hook: validate on save | After any edit under `docs/plan/`, format errors go straight back to Claude |
| Hook: session briefing | Every new session starts with the plan status and where the rules are |

Updating the plugin: see [Updating](#updating). Try it without installing:
`claude --plugin-dir path/to/ThinkMap`.

### With npx (no Claude Code needed)

Nothing to install: `npx` fetches Thinkmap from GitHub the first time (say **y** when
npm asks "Ok to proceed?").

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

The `/plugin …` and `/thinkmap…` commands are typed inside a `claude` session, not in the
terminal; the `npx` commands are for the terminal.

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
├── FORMAT.md                      a copy of the rules for people and sessions without Thinkmap
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
| `thinkmap format [dir] [--write]` | Is `docs/plan/FORMAT.md` the version bundled with this Thinkmap? Exit 1 if not; `--write` refreshes the copy |
| `thinkmap update [--check] [--force]` | Fetch the newest version — works for the npx cache, a project dependency and a clone (as a plugin it tells you the `claude plugin update` command) |
| `thinkmap version` | Version and where Thinkmap runs from |

`dir` defaults to `./docs/plan`. Commits are linked to tickets when the message contains
the ID in brackets: `feat: signup endpoint [P1-T03]`.

## Updating

Thinkmap does not update itself, whichever way it was installed. Two steps every time:
update the tool, then refresh the format copy in each project (explained below).

### The plugin (inside a Claude session)

1. **Update the plugin** — type this in any Claude Code session:
   ```
   claude plugin update thinkmap@thinkmap
   ```
   (`thinkmap@thinkmap` is *plugin name* @ *marketplace name*.) The same command works in a
   normal terminal, or use the menu: `/plugin` → **Manage** → thinkmap → **Update**.
2. **Load the new version:** `/reload-plugins`, or just start a new session.
3. **Check:** `claude plugin list` shows the new version number.
4. **In each project**, the first new session says when `docs/plan/FORMAT.md` is an older
   copy and prints the `format --write` command. Run it, or let Claude run it.

If step 1 says there is nothing new although GitHub has a newer version, refresh the
marketplace listing first, then update again:

```
claude plugin marketplace update thinkmap
claude plugin update thinkmap@thinkmap
```

Telling the team: one message with the two commands from steps 1–2 is enough; step 4
happens on its own in every project they open.

### npx, project dependency or clone

`npx` keeps the first copy it fetched, `npm i -D github:…` pins a commit, a clone waits for
`git pull`. One command handles all three:

```bash
thinkmap update            # or: npx github:dsngeu/ThinkMap update
thinkmap update --check    # just compare with GitHub
```

`thinkmap serve` checks GitHub once at start and shows **⬆ Update available** in the header
when a newer version exists (one GET of `package.json`; nothing about your project is sent).
Skip it with `--no-update-check` or `THINKMAP_NO_UPDATE_CHECK=1`.

### After any update: refresh the format copy

`init` leaves `docs/plan/FORMAT.md` in your project for people and sessions without
Thinkmap, but the validator and the plugin follow the rules bundled with the tool, so the
copy falls behind with every update (and when you move from npx to the plugin — the copy
npx created stays at that version). `thinkmap validate`, the session briefing and
`thinkmap format` all say when that happens; one command fixes it:

```bash
thinkmap format --write    # plugin: node "~/.claude/plugins/cache/thinkmap/thinkmap/<version>/bin/thinkmap.js" format --write
```

**First npx update from 0.1.0** (which had no `update` command): run it from a fresh fetch once;
it refreshes every cached copy, including the plain `npx github:dsngeu/ThinkMap` one:

```bash
npx github:dsngeu/ThinkMap#master update
```

## Working with an AI assistant

1. Keep the map open on a second screen.
2. Discuss as usual. Say "record that as decided" or "that's still open" — the assistant
   writes the files (the plugin's `thinkmap-format` skill tells it how; without the plugin,
   the `CLAUDE.md` snippet from `init` does).
3. Hand tickets to separate sessions: `/thinkmap-ticket P1-T03` or just "work on ticket
   P1-T03". Each session edits only its own ticket, logs in the *Handoff log*, and marks
   it `done`. The map turns green.
4. The plugin's hooks validate every save and brief every new session; without the plugin,
   `thinkmap validate` in your own hook or CI does the first part.

Plugin layout: `.claude-plugin/` (manifest + marketplace), `skills/`, `hooks/`, and the
engine (`bin/ src/ web/ template/`). See [SPEC.md](SPEC.md).

More: [docs/USING-IN-ANOTHER-PROJECT.md](docs/USING-IN-ANOTHER-PROJECT.md).

## Develop

```bash
npm test                              # node --test, no dependencies
node bin/thinkmap.js serve --open     # this repo plans itself in docs/plan/
```

## License

MIT © Deepak Singh
