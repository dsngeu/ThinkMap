---
name: thinkmap-status
description: Print the plan status in the terminal — phases with progress, tickets in progress and blocked, open questions, next free tickets. Optional filter: a phase ID like P1, or "open" for open questions only.
argument-hint: "[P1 | open] [plan-dir]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js *)
---

# /thinkmap-status — where does the project stand?

Arguments: `$ARGUMENTS` (optional filter `P<n>` or `open`; optional plan folder, default `docs/plan`).

Run:

```
node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js" status [plan-dir] [filter]
```

Show the output as-is in a code block (it is already formatted), then add at most two
sentences: what the suggested next step is and whether the validator reports errors (if the
output ends with a format-error line, offer to run `validate` and fix the files).
