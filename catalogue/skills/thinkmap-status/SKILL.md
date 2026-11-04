---
name: thinkmap-status
description: Print the plan status in the terminal — phases with progress, tickets in progress and blocked, open questions, next free tickets. Optional filter: a phase ID like P1, a topic ID like P1-F02 (its points by kind and its tickets with status and owner), or "open" for open questions only.
argument-hint: "[P1 | P1-F02 | open] [plan-dir]"
allowed-tools: Bash(node "$THINKMAP_CLI" *)
---

# /thinkmap-status — where does the project stand?

> Added to this project from the Thinkmap catalogue (dashboard → Tooling → Add). `$THINKMAP_CLI` is set by the
> Thinkmap plugin when a session starts. If `echo "$THINKMAP_CLI"` prints nothing, the plugin is not active in
> this session: run the same commands as `npx github:dsngeu/ThinkMap <command>` instead.

Arguments: `$ARGUMENTS` (optional filter `P<n>`, `P<n>-F<nn>` or `open`; optional plan folder, default `docs/plan`).

Run:

```
node "$THINKMAP_CLI" status [plan-dir] [filter]
```

Show the output as-is in a code block (it is already formatted), then add at most two
sentences: what the suggested next step is and whether the validator reports errors (if the
output ends with a format-error line, offer to run `validate` and fix the files).
