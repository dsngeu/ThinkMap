---
name: thinkmap
description: Open the Thinkmap viewer of this project's plan in the browser. Starts the local viewer, reuses one already showing this plan, or replaces it when it runs an older Thinkmap version.
argument-hint: "[plan-dir] [--port 4400]"
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js *)
---

# /thinkmap — open the map

Arguments: `$ARGUMENTS` (optional plan folder, default `docs/plan`; optional `--port N`, default 4400).

1. If there is no `project.md` in the plan folder, stop and say: run `/thinkmap-init` first.
2. Start the viewer **in the background** (it keeps running after this turn), with the
   browser opening automatically:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js" serve <plan-dir> --port <port> --open
   ```
   Do not check the port yourself first. `serve` looks at what is already running and
   decides, saying so on its first line:
   - `✓ … already serving` — the same version already shows this plan; it opened that one
     and exited. Nothing else to do.
   - `↻ stopped Thinkmap <old> …` — an older copy served this plan (typical right after a
     plugin update); it was replaced on the same port. Tell the person which version it
     was, and to reload an open tab to get the new viewer (its live data reconnects anyway).
   - `! … was not stopped` — say which process it named and that it can be stopped with the
     command shown.
   A server for a **different** project on that port is never touched; `serve` moves to
   the next free port.
3. Read the server's output and report the URL it printed (it may not be `<port>`), and that
   the map updates live as plan files change. If the person wants a fresh copy anyway, add
   `--restart`.

The server binds to 127.0.0.1 only and serves only `.md` files from the plan folder.
