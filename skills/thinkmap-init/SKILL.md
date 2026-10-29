---
name: thinkmap-init
description: Set up Thinkmap planning in this project — creates docs/plan/ from the template and adds a short Planning section to CLAUDE.md. Run once per project.
argument-hint: "[--name \"Project name\"] [plan-dir]"
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js *), Read, Edit, Write, Glob
---

# /thinkmap-init — make this project planning-ready

Arguments given: `$ARGUMENTS` (optional `--name "…"` and an optional plan folder; default `docs/plan`).

Do these steps in order and report what you did at the end.

## 1. Find out what exists

- If a plan folder already exists and is not empty (`docs/plan/project.md` present), **do not
  run init**. Skip to step 3 — the project only needs the CLAUDE.md section.
- Otherwise, if no `--name` was given, use the project folder's name, but **ask** the person
  first: "What should the project be called on the map?" and "What is the first phase?"
  (one question, both parts). Use their answers below.

## 2. Create the plan folder

```
node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js" init [plan-dir] --name "<name>"
```

Then open the created `01-first-phase/phase.md` and rename the folder and title to the
first phase the person named (keep the ID `P1`). Leave the example topic and ticket in
place — they show every note kind — unless the person asks to remove them.

## 3. Add the Planning section to CLAUDE.md

The exact text is what `init` prints under "Next: 1." (it is also `CLAUDE_SNIPPET` in
`${CLAUDE_PLUGIN_ROOT}/src/init.js`). Rules:

- If `CLAUDE.md` does not exist at the project root, create it with that section only.
- If it exists and already contains a heading with "Thinkmap" or `@docs/plan/FORMAT.md`,
  leave it alone and say so.
- Otherwise append the section at the end, separated by a blank line. Change nothing else
  in the file.

With the plugin installed this section is optional (the `thinkmap-format` skill carries the
knowledge), but it makes the rule visible to people and to sessions without the plugin.

## 4. Check and show

```
node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js" validate <plan-dir>
```

Report: files created, whether CLAUDE.md was created/updated/left alone, and that
`/thinkmap` opens the map. Do not commit anything.
