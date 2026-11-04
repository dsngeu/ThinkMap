# Thinkmap reference

Everything the [README](../README.md) leaves out: every way to install, the commands, the
plan file format and the details of updating. New here? Start with the README.

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
What the plugin gives every session in that project, without any CLAUDE.md editing. Rows marked
*add-on* are copied into the project's `.claude/skills/` only when you tap **Add** on the map's
Tooling page (or run `thinkmap add <name>`), and removed again with **Remove**:

| Piece | What it does |
|---|---|
| `thinkmap-format` (automatic) | While you discuss or decide, Claude writes decisions, open questions, ideas and cautions into the plan files. The rules come from one file, `template/FORMAT.md`. |
| `/thinkmap` | Opens the map: starts the viewer, reuses one already showing this plan, or replaces it when it runs an older version (after a plugin update) |
| `/plan-status [P1 \| P1-F02 \| open]` (add-on) | Terminal summary — Claude may also run it on its own |
| `/create-tickets <P1 \| P1-F02>` (add-on) | Breaks the decided points of a phase (or one topic) into tickets: one table to approve first, files written only after "go ahead". `thinkmap status` suggests it when a phase is fully decided and has no tickets |
| `/implement-ticket <ID>` (add-on) | Two gates: first a read-only brief (decisions, cautions, criteria, dependencies, approach, open questions); after "go ahead" it claims the ticket (in-progress, owner, Handoff log), builds it and closes it (criteria ticked, `code:` filled, `done`). Refuses to double-claim. "Work on P1-T03" triggers it too |
| `/thinkmap-init` | Sets up `docs/plan/` in a new project |
| Hook: validate on save | After any edit under `docs/plan/`, format errors go straight back to Claude |
| Hook: session briefing | Every new session starts with the plan status and where the rules are |

**Updating the plugin** (it does not update itself). In a Claude session or a terminal:
```
claude plugin marketplace update thinkmap     # refresh the listing from GitHub
claude plugin update thinkmap@thinkmap        # fetch the new version
```
Then `/reload-plugins` or start a new session; `claude plugin list` shows the version. The
first new session in each project tells you if its `docs/plan/FORMAT.md` copy needs
`format --write`. Details and the npx/clone paths: [Updating](#updating).

Try it without installing: `claude --plugin-dir path/to/ThinkMap`.

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

You drill down one level at a time: **Project → Phase → Topic → Note**. Each screen shows only
the next level; the breadcrumb at the top takes you back up.

- **Home**: the project with one overall progress ring, a *waiting for you* card (the decisions
  that need an answer, top three shown), and the phases as a **roadmap**: done ✓, *you are here*,
  next, not planned.
- **Phase**: its topics as cards, each with one progress ring and a plain status:
  *3 to decide*, *Building · 2/4*, *Ready for tickets*, *Done*.
- **Topic**: tabs — *To decide · Decided · Take care · Tickets · Discussed · Dropped* — so you
  read one list at a time.
- **Note**: a clean reading page — *What this is · Why · What we expect · Options · Next step…* —
  the tickets that build it, and ← → to step through the list.
- **Ticket**: a Ready → In progress → Done stepper, owner, acceptance criteria as a checklist,
  the decisions it delivers, code, commits and the handoff log.
- **Needs you** (top bar): every open question and suggestion, grouped by topic.
- **Search** (`⌘K` or `/`) across phases, topics, notes, tickets and tooling.
- **Map** (top bar): the mind map as a second view; click a note to open its page.
- **Open in editor** (VS Code, exact line) · **View the file** (rendered or raw, line highlighted) ·
  every page has its own link · light & dark themes · works on a phone · static export.
- **Tooling** (from Home): the project's own Claude Code **agents, skills and hooks**, read from `.claude/`
  (`agents/`, `skills/`, `commands/`, the `hooks` block of `settings.json`, plus a plugin's own folders
  when `.claude-plugin/plugin.json` exists). Tap one to see what it does, how it starts, which tools it
  may use, and the file. Project files only — never your personal `~/.claude`. Hooks are shown, never run.

## The files

```
docs/plan/
├── FORMAT.md                      a copy of the rules for people and sessions without Thinkmap
├── project.md                     type: project
└── 01-basic/                      one folder per phase: NN-slug
    ├── phase.md                   type: phase     id P1
    ├── F02-signup.md              type: feature   id P1-F02   ← a "topic"; ## Points are the notes, ## Tickets its tickets
    └── tickets/                   always there (a .gitkeep holds it until the first ticket)
        └── P1-T03-F02-api.md      type: ticket    id P1-T03   ← F02 = the topic it builds
```

The layout is enforced, not suggested: `thinkmap validate` reports a misnamed folder, a topic in
`tickets/`, a ticket outside it, a phase without `tickets/`, or any stray `.md` as an error.
`thinkmap init` creates the first phase and `thinkmap phase P2 <slug>` each further one, so
nobody builds the tree by hand.

A note is one line plus a labelled body:

```markdown
- [decided 2026-10-29 claude] P1-F02-02: Confirmation link valid 24h, single use
  > What: The email link carries a random token; only its hash is stored, with expiry and used-at.
  > Why: A database leak must not yield working links; single use stops forwarded links.
  > Expected: Using a link twice, or after 24h, shows "link expired — request a new one".
  > Built: Not yet — ticket P1-T03.
```

Kinds: `discussed · decided · open · suggestion · caution · dropped`. Labels: `What · Why ·
Expected · Discussed · Options · Pending · Built · Risk · Next`. Full spec: [template/FORMAT.md](../template/FORMAT.md).

## Commands

| Command | What it does |
|---|---|
| `thinkmap init [dir] --name "X" [--force]` | Set up `docs/plan/` from the template |
| `thinkmap phase <P2> <slug> [dir] [--title "X"]` | Scaffold one phase: `02-slug/phase.md` with valid front matter and `tickets/.gitkeep`. Re-running adds only what is missing |
| `thinkmap serve [dir] [--port 4400] [--open] [--restart] [--read-only]` | Web viewer with live reload. If a Thinkmap already serves this plan it is reused (same version) or stopped and replaced (other version, or `--restart`). Servers of other projects are never touched; the next free port is used. `--read-only` hides the Add / Remove buttons on the Tooling tab |
| `thinkmap status [dir] [P1 \| P1-F02 \| open]` | Terminal summary: phases, in progress, blocked, open questions, next free tickets, and the suggested next step (including "generate tickets" once a phase is fully decided). With a topic ID: that topic's points by kind and its tickets with status and owner |
| `thinkmap tickets [dir] [--write]` | Checks that every ticket file names its topic (`P2-T05-F04-slug.md`) and every topic lists its tickets under `## Tickets`; `--write` renames the files and rewrites the lists. Ticket IDs never change |
| `thinkmap validate [dir] [--quiet]` | Check the format and the folder layout; exit 1 on errors (use in hooks and CI) |
| `thinkmap export [dir] [--out plan.html]` | One static HTML file to share |
| `thinkmap json [dir]` | The graph as JSON |
| `thinkmap format [dir] [--write]` | Is `docs/plan/FORMAT.md` the version bundled with this Thinkmap? Exit 1 if not; `--write` refreshes the copy |
| `thinkmap catalogue [dir]` | The ready-made agents and skills Thinkmap offers, and which this project has added (also on the Tooling tab) |
| `thinkmap add <name…> [dir] [--force]` | Copy catalogue items, plus what they need, into the project's `.claude/` and record them in `.claude/thinkmap-catalogue.json`. Updates an added item when a newer version came with Thinkmap. Never overwrites the project's own file; `--force` replaces an added item you changed |
| `thinkmap remove <name…> [dir] [--force]` | Delete catalogue items Thinkmap added — never the project's own files. Refuses an item another added item needs, or one you changed, unless `--force` |
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

`thinkmap serve` checks GitHub at start and every 6 hours, and shows **⬆ Update available** in the header
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
3. Hand tickets to separate sessions: `/implement-ticket P1-T03` or just "work on ticket
   P1-T03". Each session edits only its own ticket, logs in the *Handoff log*, and marks
   it `done`. The map turns green.
4. The plugin's hooks validate every save and brief every new session; without the plugin,
   `thinkmap validate` in your own hook or CI does the first part.

Plugin layout: `.claude-plugin/` (manifest + marketplace), `skills/`, `hooks/`, and the
engine (`bin/ src/ web/ template/`). See [SPEC.md](../SPEC.md).

More: [docs/USING-IN-ANOTHER-PROJECT.md](USING-IN-ANOTHER-PROJECT.md).
