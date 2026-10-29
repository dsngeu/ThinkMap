---
name: thinkmap
description: Open the Thinkmap mind map of this project's plan in the browser (starts the local viewer if it is not already running).
argument-hint: "[plan-dir] [--port 4400]"
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js *), Bash(curl *), Bash(lsof *)
---

# /thinkmap — open the map

Arguments: `$ARGUMENTS` (optional plan folder, default `docs/plan`; optional `--port N`, default 4400).

1. If there is no `project.md` in the plan folder, stop and say: run `/thinkmap-init` first.
2. Check whether a viewer is already listening on the port:
   `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:<port>/` — a `200` means it is
   running. Then just open `http://localhost:<port>` (say `open http://localhost:<port>` on
   macOS) and report the URL.
3. Otherwise start it **in the background** (it keeps running after this turn) with the
   browser opening automatically:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/bin/thinkmap.js" serve <plan-dir> --port <port> --open
   ```
4. Report the URL and that the map updates live as plan files change. If the port was busy
   with something else, retry once with the next port.

The server binds to 127.0.0.1 only and serves only `.md` files from the plan folder.
