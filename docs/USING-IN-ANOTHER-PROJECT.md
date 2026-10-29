# Using Thinkmap in a project

Thinkmap turns a folder of Markdown files into a live mind map of a project's planning:
what was discussed, decided, is still open, suggested, must be remembered, and built.
It has **no dependencies** — only Node 20+ and (optionally) Git.

Two ways to get it: the Claude Code plugin (recommended) or plain `npx`.

---

## Way 1 — the Claude Code plugin (recommended)

Inside a `claude` session:

```
/plugin marketplace add dsngeu/ThinkMap      # once per machine
/plugin install thinkmap@thinkmap            # once per machine
/thinkmap-init                               # once per project (skip if docs/plan/ exists)
/thinkmap                                    # every day: opens the live map
```

That is all. No `npx`, no copied folders, no CLAUDE.md editing: the plugin carries

- **`thinkmap-format`** — an automatic skill. Whenever a session discusses, decides, asks or
  warns about something in a project with `docs/plan/`, Claude writes it into the plan
  files in the right format. The rules come from one file, the plugin's `template/FORMAT.md`.
- **`/thinkmap`**, **`/thinkmap-status [P1|open]`**, **`/thinkmap-ticket <ID>`**,
  **`/thinkmap-init`** — the commands. Saying "work on ticket P1-T03" triggers the ticket
  one by itself.
- **Hooks** — after every edit under `docs/plan/` the validator runs and errors go back to
  Claude; every new session starts with a plan briefing (status, where the rules are, the commands).

`/thinkmap-init` also adds a short Planning section to `CLAUDE.md` (creating it if missing)
so the rule is visible to people and to sessions without the plugin. A project that already
has `docs/plan/` needs no init — install the plugin and it is picked up.

**Updating:** `claude plugin update thinkmap@thinkmap`, then `/reload-plugins` (or a new
session). **Trying it without installing:** `claude --plugin-dir path/to/ThinkMap`.

**Pre-enable for a whole team:** list the marketplace and plugin in the project's shared
`.claude/settings.json` (`extraKnownMarketplaces` / `enabledPlugins`), so whoever clones the
repo gets Thinkmap on their first `claude` start.

---

## Way 2 — `npx` (no Claude Code, or no plugin)

### 1. Create the plan folder
```bash
cd your-project
npx github:dsngeu/ThinkMap init --name "Your Project"
```
This creates `docs/plan/` with:
```
docs/plan/
├── FORMAT.md                         ← the rules (read by the assistant every session)
├── project.md                        ← the root card
└── 01-first-phase/
    ├── phase.md
    ├── F01-example-topic.md          ← one example of every note kind
    └── tickets/P1-T01-example-ticket.md
```
Rename the phase folder, replace the example topic with real ones.

Other ways to run it:
- **Project dependency:** `npm i -D github:dsngeu/ThinkMap`, then `npx thinkmap …` and
  scripts like `"plan": "thinkmap serve --open"` in `package.json`.
- **One clone for all projects:** `git clone https://github.com/dsngeu/ThinkMap.git ~/thinkmap`,
  then `node ~/thinkmap/bin/thinkmap.js serve` inside any project.

### 2. Tell your assistant about it
Paste the **Planning** section that `init` prints into the project's `CLAUDE.md`
(or the equivalent instructions file of your assistant). This is what makes every
session write decisions into the plan files while you talk.

### 3. Open the map
```bash
npx github:dsngeu/ThinkMap serve --open     # http://localhost:4400
```

### Daily use
| You want to… | Do |
|---|---|
| See the map | `thinkmap serve --open`, keep the tab open — it updates live |
| Plan with the assistant | Talk as usual; say "record that as decided" / "that's an open question" — it writes the files |
| Check nothing is broken | `thinkmap validate` (exit code 1 on errors — fine for CI) |
| Quick terminal summary | `thinkmap status`, `thinkmap status P1`, `thinkmap status open` |
| Share with someone who has no tooling | `thinkmap export --out plan.html` and send the file |
| Hand a ticket to another session | New session: "work on ticket P1-T03" — it sets `in-progress`, logs in the Handoff log, suggests a commit message with `[P1-T03]` |

### Working with several sessions at once
- Each session edits **only the ticket it owns** (plus its Handoff log).
- Decisions go into topic files, written immediately, never left in chat.
- Commit messages carry the ticket ID in brackets; the map links commits to tickets.
- Different machines sync through Git: pull before starting, push when done.

---

## Company-wide: an internal plugin marketplace (optional)

Today the marketplace file lives in the Thinkmap repo itself (`/plugin marketplace add
dsngeu/ThinkMap`). A company that wants one catalogue of approved plugins can instead keep
a repo like `yourcompany/claude-plugins` whose `.claude-plugin/marketplace.json` lists
Thinkmap with `"source": {"source": "github", "repo": "dsngeu/ThinkMap"}`; colleagues then
run `/plugin marketplace add yourcompany/claude-plugins` and `/plugin install thinkmap@yourcompany`.

For people without Claude Code (managers, CTO): a CI job can run `thinkmap export`
on every push and publish the HTML to GitHub Pages — an always-current URL.

---

## FAQ

**`validate` says "parent not found".** The `parent:` in a file points to an ID that
doesn't exist. IDs are `PROJECT`, `P1`, `P1-F01`, `P1-F01-01`, `P1-T01`.

**A decided point shows a warning "no body".** Add `> What:` and `> Why:` lines under it.
The map's panel renders them as sections; a bare one-liner tells a newcomer nothing.

**Can I change the folder?** Yes: every command takes a folder as the first argument
(`thinkmap serve planning/`). Default is `docs/plan`.

**Does it need Git?** No. With Git it also links commits to tickets (`[P1-T03]` in
the message) and shows them in the panel.

**Does it send anything anywhere?** No. The server binds to localhost only and serves
files from the plan folder only.
