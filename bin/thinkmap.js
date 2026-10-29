#!/usr/bin/env node
// Thinkmap CLI — see ../README.md
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { buildGraph } from '../src/graph.js';
import { formatStatus, formatIssues } from '../src/status.js';
import { startServer, exportHtml } from '../src/server.js';
import { initPlan, CLAUDE_SNIPPET } from '../src/init.js';
import { currentVersion, detectInstall, howToUpdate, checkLatest, runUpdate, cliCommand, staleCopies } from '../src/update.js';

const HELP = `Thinkmap — live planning map for docs/plan/*.md

Usage:
  thinkmap init     [dir] [--name "Project"] [--force]   set up docs/plan/ from the template
  thinkmap serve    [dir] [--port 4400] [--open]   web viewer with live reload
  thinkmap status   [dir] [P1 | open]              text summary
  thinkmap validate [dir] [--quiet]                check format (exit 1 on errors)
  thinkmap export   [dir] [--out thinkmap.html]    single static HTML file
  thinkmap json     [dir]                          graph as JSON
  thinkmap update   [--check]                      fetch the newest version (npx cache, node_modules or clone)
  thinkmap version                                 show version and where Thinkmap runs from

dir defaults to ./docs/plan
"serve" checks GitHub once for a newer version (set THINKMAP_NO_UPDATE_CHECK=1 or pass --no-update-check to skip).`;

const args = process.argv.slice(2);
const cmd = args.shift();
const flags = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    if (v !== undefined) flags[k] = v;
    else if (args[i + 1] && !args[i + 1].startsWith('--') && ['port', 'out', 'name'].includes(k)) flags[k] = args[++i];
    else flags[k] = true;
  } else positional.push(a);
}

// First positional is the dir only if it exists; otherwise it's a filter (e.g. "P1").
let dir = 'docs/plan';
if (positional[0] && fs.existsSync(positional[0])) dir = positional.shift();
const color = process.stdout.isTTY && !process.env.NO_COLOR;

switch (cmd) {
  case 'init': {
    const target = positional[0] || dir; // may not exist yet
    try {
      const r = initPlan(target, { name: flags.name || path.basename(process.cwd()), force: Boolean(flags.force) });
      console.log(`✓ Thinkmap set up in ${r.dir}`);
      for (const f of r.written) console.log(`  + ${f}`);
      for (const f of r.skipped) console.log(`  = ${f} (kept, already existed)`);
      console.log(`\nNext:\n  1. Add this to your CLAUDE.md so every Claude session follows the format:\n\n${CLAUDE_SNIPPET.replace(/^/gm, '     ')}\n  2. Replace the example topic with real ones (see ${path.join(r.dir, 'FORMAT.md')})\n  3. ${cliCommand()} serve --open`);
    } catch (e) {
      console.error(`✗ ${e.message}`);
      process.exit(1);
    }
    break;
  }
  case 'serve': {
    const version = currentVersion();
    const checkUpdate = flags['no-update-check'] ? null : () => checkLatest({ current: version });
    const updateHint = howToUpdate(detectInstall());
    const srv = await startServer({ planDir: dir, port: Number(flags.port ?? 4400), version, checkUpdate, updateHint, cli: cliCommand(), onUpdate: (u) => console.log(`⬆ Thinkmap ${u.latest} is available (you have ${u.current}). Update: ${updateHint}`) });
    console.log(`📍 Thinkmap ${version} serving ${path.resolve(dir)}\n   ${srv.url}   (Ctrl+C to stop)`);
    if (flags.open) execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [srv.url], () => {});
    const stop = () => { srv.close(); process.exit(0); };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    break;
  }
  case 'status':
    console.log(formatStatus(buildGraph(dir), { filter: positional[0] ?? null, color }));
    break;
  case 'validate': {
    const g = buildGraph(dir);
    if (!(flags.quiet && g.stats.errors === 0)) console.log(formatIssues(g, { color }));
    process.exit(g.stats.errors ? 1 : 0);
    break;
  }
  case 'export': {
    const out = flags.out ?? 'thinkmap.html';
    fs.writeFileSync(out, exportHtml(buildGraph(dir)));
    console.log(`✓ wrote ${out}`);
    break;
  }
  case 'json':
    console.log(JSON.stringify(buildGraph(dir), null, 2));
    break;
  case 'version': {
    const info = detectInstall();
    console.log(`thinkmap ${currentVersion()}  (${info.kind === 'npx' ? 'npx cache' : info.kind === 'dependency' ? 'project dependency' : info.kind === 'plugin' ? 'Claude Code plugin' : info.kind}: ${info.dir})`);
    break;
  }
  case 'update': {
    const info = detectInstall();
    const u = await checkLatest({ current: currentVersion() });
    if (!u) console.log('(could not reach GitHub to compare versions)');
    else {
      // In npx mode this copy may be fresh while the plain `npx github:dsngeu/ThinkMap` entry is stale — check them all.
      const stale = staleCopies(u.latest, info, u.current);
      if (info.kind === 'npx' && stale.length) console.log(`⬆ ${u.latest} is on GitHub; ${stale.length} cached cop${stale.length === 1 ? 'y is' : 'ies are'} older (${[...new Set(stale.map((s) => s.version ?? '?'))].join(', ')})`);
      else if (u.newer) console.log(`⬆ ${u.latest} is available (you have ${u.current})`);
      else console.log(`✓ ${u.current} is the newest version on GitHub${info.kind === 'npx' ? ' (all cached copies)' : ''}`);
      if (flags.check) break;
      if (!u.newer && !stale.length && !flags.force) { console.log('Nothing to do. Use --force to re-install anyway.'); break; }
    }
    if (flags.check) break;
    const r = runUpdate();
    process.exit(r.ok ? 0 : 1);
    break;
  }
  default:
    console.log(HELP);
    process.exit(cmd && cmd !== 'help' && cmd !== '--help' ? 1 : 0);
}
