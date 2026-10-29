# Thinkmap

Know your project: what's decided, what's open, what's built.
A zero-dependency Node tool that turns `docs/plan/*.md` into a live mind map.

## Layout
- `bin/thinkmap.js` — CLI (`init · serve · status · validate · export · json`)
- `src/parse.js` — front matter + point parser · `src/graph.js` — validation, roll-ups, git links
- `src/server.js` — localhost server, live reload (SSE) · `src/status.js` — terminal summary
- `src/init.js` + `template/` — what `thinkmap init` copies into a project
- `web/index.html` — the whole viewer, one file, no build step, no libraries
- `test/` — `node --test`; run with `npm test`

## Rules
- **Zero dependencies.** No npm packages, no build step, no CDN scripts. Node 20+ only.
- `template/FORMAT.md` is the canonical format spec. Changing the format = change the
  parser, the spec, the template example topic, and a test, together.
- Server binds 127.0.0.1 only and serves only `.md` files inside the plan folder.
- Keep `web/index.html` working in light and dark mode and at phone width.
- Every change: `npm test` passes and `node bin/thinkmap.js validate docs/plan` is clean.

## Git rule — humans commit, Claude never does
Never run `git commit`, `git push`, `git tag`, `git rebase` or `git reset`. Leave changes
in the working tree and end with the list of changed files and a suggested commit message.

## Planning
This repo plans itself with Thinkmap: `docs/plan/` follows @template/FORMAT.md.
Record decisions, open questions, suggestions and cautions there while discussing.
`node bin/thinkmap.js serve --open` shows the map.
