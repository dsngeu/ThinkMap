# Thinkmap

**Claude's planning memory for your project.**
What you decided, what's still open, what's being built — written down by Claude while you
talk, and shown as one clear dashboard.

[![Tests](https://github.com/dsngeu/ThinkMap/actions/workflows/test.yml/badge.svg)](https://github.com/dsngeu/ThinkMap/actions/workflows/test.yml)
[![Release](https://img.shields.io/github/v/release/dsngeu/ThinkMap?label=release)](https://github.com/dsngeu/ThinkMap/releases)
[![Live demo](https://img.shields.io/badge/live%20demo-dsngeu.github.io%2FThinkMap-8b5cf6)](https://dsngeu.github.io/ThinkMap/)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)](#install)
[![License: MIT](https://img.shields.io/github/license/dsngeu/ThinkMap)](LICENSE)

## Why

You plan a feature with Claude. Good decisions get made — and stay buried in the chat.
Next session, Claude doesn't know them. Neither does your teammate. A week later nobody
remembers *why* you picked Postgres, or which questions were never answered.

Thinkmap fixes that:

- **Claude writes the plan as you talk.** Say "let's go with Postgres" and it is saved in
  your repo as a decision, with the reason. Open questions, ideas and risks too.
- **Every new session starts informed.** Claude reads the plan first — no re-explaining.
- **You see where things stand at a glance.** A local dashboard shows what is decided, what
  is waiting for your answer, and what is being built, phase by phase.
- **From decisions to code.** Claude turns decisions into tickets; a session picks one up
  with its full context, and commits link back to it.

The plan is plain Markdown in `docs/plan/` — reviewed in pull requests like code. Nothing
leaves your machine.

## See it

**[Live demo →](https://dsngeu.github.io/ThinkMap/)** (this repo's own plan)

![Thinkmap home: overall progress, the decisions waiting for you, and the roadmap of phases](docs/screenshots/home.png)

Click a phase to see its topics, a topic to see its decisions, a decision to read why.
Prefer a tree? The **Map** button shows the same plan as a mind map:

![Thinkmap mind map: project, phases, topics and notes as an unfolding tree](docs/screenshots/mind-map.png)

## Install

Inside [Claude Code](https://claude.com/claude-code), once per machine:

```
/plugin marketplace add dsngeu/ThinkMap
/plugin install thinkmap@thinkmap
```

## Use

Inside Claude Code, in any project:

| You | What happens |
|---|---|
| `/thinkmap-init` | Once per project: creates `docs/plan/` |
| *Just talk* | Claude records decisions, open questions, ideas and risks as you discuss |
| `/thinkmap` | Opens the dashboard in your browser. It updates live as the plan changes |
| `/thinkmap-tickets P1` | Turns the decisions of phase 1 into tickets. You approve the list first |
| `/thinkmap-ticket P1-T03` | This session takes ticket P1-T03 and gets everything it needs to build it |
| `/thinkmap-status` | A quick summary in the terminal |

## Update

```
claude plugin update thinkmap@thinkmap
```

Then start a new Claude session and run `/thinkmap` — it replaces the old dashboard by itself.
If the update says there is nothing new, run `claude plugin marketplace update thinkmap` first.

## More

- **[Reference](docs/REFERENCE.md)** — every command, the plan file format, using Thinkmap
  without Claude Code (`npx`), and updating in detail
- **[Using it in another project](docs/USING-IN-ANOTHER-PROJECT.md)**
- Questions and ideas: [Discussions](https://github.com/dsngeu/ThinkMap/discussions) ·
  bugs: [Issues](https://github.com/dsngeu/ThinkMap/issues) · a ⭐ helps others find it

Zero dependencies · Node 20+ · MIT © Deepak Singh

## Contributing

```bash
npm test                              # no dependencies
node bin/thinkmap.js serve --open     # this repo plans itself in docs/plan/
```

Run `npm test` and `node bin/thinkmap.js validate docs/plan` before a pull request, and record
any decision you make in `docs/plan/`.
