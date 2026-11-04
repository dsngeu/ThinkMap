#!/usr/bin/env node
// Thinkmap CLI — see ../README.md
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { buildGraph } from '../src/graph.js';
import { formatStatus, formatIssues } from '../src/status.js';
import { startServer, exportHtml } from '../src/server.js';
import { initPlan, scaffoldPhase, CLAUDE_SNIPPET, addClaudeSection, formatCopyStatus, syncFormatCopy, TEMPLATE_FORMAT, TEMPLATE_VERSION } from '../src/init.js';
import { findServers, decide, stopServer } from '../src/handoff.js';
import { planTicketSync, applyTicketSync } from '../src/tickets.js';
import { currentVersion, detectInstall, howToUpdate, checkLatest, runUpdate, cliCommand, staleCopies } from '../src/update.js';
import { catalogueStatus, addItems, removeItems } from '../src/catalogue.js';
import { findRepoRoot } from '../src/graph.js';

// The project's root — where .claude/ lives. The same root the Tooling tab scans.
const projectRoot = (planDir) => findRepoRoot(path.resolve(planDir)) || path.resolve(planDir);

const HELP = `Thinkmap — live planning map for docs/plan/*.md

Usage:
  thinkmap init     [dir] [--name "Project"] [--force] [--no-claude-md]   set up docs/plan/ and add a Planning section to CLAUDE.md
  thinkmap phase    <P2> <slug> [dir] [--title "Name"]   scaffold a phase: 02-slug/phase.md + tickets/.gitkeep
  thinkmap serve    [dir] [--port 4400] [--open] [--restart] [--read-only]   web viewer with live reload; reuses or
                                                   replaces a Thinkmap already serving this plan (--restart always replaces);
                                                   --read-only hides the Add / Remove buttons
  thinkmap status   [dir] [P1 | P1-F02 | open]     text summary: whole plan, one phase, one topic, or open questions
  thinkmap tickets  [dir] [--write]                do ticket file names and topics' "## Tickets" lists match? --write fixes them
  thinkmap validate [dir] [--quiet]                check format (exit 1 on errors)
  thinkmap export   [dir] [--out thinkmap.html]    single static HTML file
  thinkmap json     [dir]                          graph as JSON
  thinkmap format   [dir] [--write]                is docs/plan/FORMAT.md the bundled version? --write refreshes it
  thinkmap catalogue [dir]                         ready-made agents and skills, and which this project has added
  thinkmap add      <name…> [dir] [--force]        copy catalogue items (and what they need) into .claude/
  thinkmap remove   <name…> [dir] [--force]        delete catalogue items Thinkmap added (never your own files)
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
    else if (args[i + 1] && !args[i + 1].startsWith('--') && ['port', 'out', 'name', 'title'].includes(k)) flags[k] = args[++i];
    else flags[k] = true;
  } else positional.push(a);
}

// First positional is the dir only if it exists; otherwise it's a filter (e.g. "P1").
// `phase P2 slug [dir]` takes the dir after its two arguments.
let dir = 'docs/plan';
const dirAt = cmd === 'phase' ? 2 : 0;
if (positional[dirAt] && fs.existsSync(positional[dirAt]) && fs.statSync(positional[dirAt]).isDirectory()) dir = positional.splice(dirAt, 1)[0];
const color = process.stdout.isTTY && !process.env.NO_COLOR;

switch (cmd) {
  case 'init': {
    const target = positional[0] || dir; // may not exist yet
    try {
      const r = initPlan(target, { name: flags.name || path.basename(process.cwd()), force: Boolean(flags.force) });
      console.log(`✓ Thinkmap set up in ${r.dir}`);
      for (const f of r.written) console.log(`  + ${f}`);
      for (const f of r.skipped) console.log(`  = ${f} (kept, already existed)`);
      const steps = [];
      if (flags['no-claude-md']) {
        steps.push(`Add this to your CLAUDE.md so every Claude session follows the format:\n\n${CLAUDE_SNIPPET.replace(/^/gm, '     ')}`);
      } else {
        const c = addClaudeSection(process.cwd(), r.dir);
        if (c.action === 'created') console.log(`  + CLAUDE.md (Planning section — every Claude session now knows the format)`);
        else if (c.action === 'appended') console.log(`  ~ CLAUDE.md (Planning section added at the end; nothing else changed)`);
        else if (c.action === 'kept') console.log(`  = CLAUDE.md (already has a Thinkmap section, left alone)`);
        else steps.push(`The plan folder is outside this directory, so CLAUDE.md was not touched. Add this to your project's CLAUDE.md:\n\n${c.text.replace(/^/gm, '     ')}`);
      }
      steps.push(`Replace the example topic with real ones (see ${path.join(r.dir, 'FORMAT.md')}); more phases: ${cliCommand()} phase P2 <slug>`);
      steps.push(`${cliCommand()} serve --open`);
      console.log(`\nNext:\n${steps.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`);
    } catch (e) {
      console.error(`✗ ${e.message}`);
      process.exit(1);
    }
    break;
  }
  case 'phase': {
    const [id, slug] = positional;
    if (!id || !slug) {
      console.error(`✗ usage: ${cliCommand()} phase <P2> <slug> [dir] [--title "Name"]   e.g. phase P2 workflow`);
      process.exit(1);
    }
    try {
      const r = scaffoldPhase(dir, { id, slug, title: typeof flags.title === 'string' ? flags.title : null });
      console.log(`✓ phase ${r.id} "${r.title}" in ${path.join(r.dir, r.folder)}`);
      for (const f of r.written) console.log(`  + ${f}`);
      for (const f of r.skipped) console.log(`  = ${f} (kept, already existed)`);
      if (!r.written.length) console.log('  nothing to add — the phase already had its skeleton');
      else console.log(`\nNext: describe the phase in ${path.join(r.folder, 'phase.md')}, add topics as ${r.folder}/F01-<slug>.md, and run ${cliCommand()} validate`);
    } catch (e) {
      console.error(`✗ ${e.message}`);
      process.exit(1);
    }
    break;
  }
  case 'serve': {
    const version = currentVersion();
    const port = Number(flags.port ?? 4400);
    const open = (url, done = () => {}) => (flags.open ? execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], () => done()) : done());
    // Another Thinkmap may already serve this plan (an older version, after an update). Other
    // projects' servers on the same port are never touched.
    const found = await findServers(port);
    const plan = decide(found, { planDir: dir, version, restart: Boolean(flags.restart) });
    let startPort = port;
    if (plan.action === 'reuse') {
      const url = `http://localhost:${plan.server.port}`;
      console.log(`✓ Thinkmap ${version} is already serving ${path.resolve(dir)}\n   ${url}   (not starting a second copy; --restart replaces it)`);
      open(url, () => process.exit(0));
      break;
    }
    if (plan.action === 'replace') {
      const old = plan.server;
      const r = await stopServer(old);
      if (r.ok) {
        console.log(`↻ stopped Thinkmap ${old.version ?? '(unknown version)'} on port ${old.port} (process ${r.pid}) — it served this plan; starting ${version} in its place`);
        startPort = old.port;
      } else {
        console.log(`! Thinkmap ${old.version ?? '(unknown version)'} serves this plan on port ${old.port} but was not stopped: ${r.reason}.\n  Starting ${version} on another port. Stop the old one yourself${r.pid ? `: kill ${r.pid}` : ' (Ctrl+C in its terminal)'}`);
      }
    }
    const checkUpdate = flags['no-update-check'] ? null : () => checkLatest({ current: version });
    const updateHint = howToUpdate(detectInstall());
    const srv = await startServer({ planDir: dir, port: startPort, version, checkUpdate, updateHint, cli: cliCommand(), readOnly: Boolean(flags['read-only']), onUpdate: (u) => console.log(`⬆ Thinkmap ${u.latest} is available (you have ${u.current}). Update: ${updateHint}`) });
    console.log(`📍 Thinkmap ${version} serving ${path.resolve(dir)}\n   ${srv.url}   (Ctrl+C to stop)`);
    open(srv.url);
    const stop = () => { srv.close(); process.exit(0); };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    break;
  }
  case 'status':
    console.log(formatStatus(buildGraph(dir), { filter: positional[0] ?? null, color }));
    break;
  case 'catalogue': {
    // Ready-made agents and skills a project can add to its .claude/ (catalogue/ in this package).
    const root = projectRoot(dir);
    const c = catalogueStatus(root);
    const STATE = { available: '○ not added', installed: '● added', update: '↑ update available', modified: '✎ added, changed here', conflict: '✗ name taken by your own file' };
    const w = Math.max(...c.items.map((i) => i.name.length + (i.kind === 'skill' ? 1 : 0)));
    console.log(`Thinkmap catalogue — ${c.installed} of ${c.items.length} added to ${path.relative(process.cwd(), path.join(root, '.claude')) || '.claude'}/\n`);
    for (const i of c.items) {
      const n = i.kind === 'skill' ? `/${i.name}` : i.name;
      console.log(`  ${n.padEnd(w)}  ${i.kind.padEnd(5)}  ${STATE[i.state]}\n  ${' '.repeat(w)}  ${i.summary}${i.requires.length ? `\n  ${' '.repeat(w)}  needs: ${i.requires.join(', ')}` : ''}`);
    }
    console.log(`\nAdd: ${cliCommand()} add <name> · Remove: ${cliCommand()} remove <name> · or the Tooling tab of ${cliCommand()} serve`);
    break;
  }
  case 'add':
  case 'remove': {
    const names = positional;
    if (!names.length) { console.error(`✗ usage: ${cliCommand()} ${cmd} <name> [<name>…] [dir] [--force]   — see ${cliCommand()} catalogue`); process.exit(1); }
    try {
      const root = projectRoot(dir);
      if (cmd === 'add') {
        const r = addItems(root, names, { force: Boolean(flags.force) });
        for (const n of r.added) console.log(`  + ${n}`);
        for (const n of r.updated) console.log(`  ↑ ${n} (updated)`);
        for (const n of r.unchanged) console.log(`  = ${n} (already added)`);
        for (const n of r.kept) console.log(`  ! ${n} kept: changed in this project since it was added (--force replaces it)`);
        if (r.added.length || r.updated.length) console.log(`\n✓ Copied into .claude/ — commit it to share with your team. Start a new Claude session to use it.`);
      } else {
        const r = removeItems(root, names, { force: Boolean(flags.force) });
        for (const n of r.removed) console.log(`  − ${n}`);
        console.log('\n✓ Removed from .claude/. Start a new Claude session for it to disappear there too.');
      }
    } catch (e) {
      console.error(`✗ ${e.message}`);
      process.exit(1);
    }
    break;
  }
  case 'tickets': {
    // Ticket file names carry their topic (P2-T05-F04-slug.md) and each topic lists its tickets.
    // Report what is out of step (exit 1) or, with --write, rename the files and rewrite the lists.
    const plan = planTicketSync(buildGraph(dir));
    const show = (f) => path.relative(process.cwd(), f) || f;
    if (!plan.renames.length && !plan.lists.length) { console.log('✓ every ticket file names its topic and every topic lists its tickets'); break; }
    if (!flags.write) {
      for (const r of plan.renames) console.log(`  rename ${show(r.from)} → ${path.basename(r.to)}${r.blocked ? '   (skipped: that name is taken)' : ''}`);
      for (const l of plan.lists) console.log(`  update "## Tickets" in ${show(l.file)}: ${l.problems.join('; ')}`);
      console.log(`\n${plan.renames.length} file(s) to rename, ${plan.lists.length} topic list(s) to update. Ticket IDs do not change.\nApply: ${cliCommand()} tickets --write${dir === 'docs/plan' ? '' : ` ${dir}`}`);
      process.exit(1);
    }
    const done = applyTicketSync(plan);
    for (const r of done.renamed) console.log(`  ✓ ${show(r.from)} → ${path.basename(r.to)}`);
    for (const r of done.skipped) console.log(`  ! kept ${show(r.from)}: ${path.basename(r.to)} already exists`);
    for (const l of done.lists) console.log(`  ✓ "## Tickets" in ${show(l.file)}`);
    console.log(`\n✓ ${done.renamed.length} file(s) renamed, ${done.lists.length} list(s) written. Ticket IDs are unchanged, so commits and links still work.`);
    break;
  }
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
  case 'format': {
    // docs/plan/FORMAT.md is a copy for people and sessions without Thinkmap; the validator
    // follows the bundled template. Report drift (exit 1) or, with --write, refresh the copy.
    const s = formatCopyStatus(dir);
    const shown = path.relative(process.cwd(), s.file) || s.file;
    const where = dir === 'docs/plan' ? '' : ` ${dir}`;
    if (flags.write) {
      const r = syncFormatCopy(dir);
      if (!r.changed) console.log(`✓ ${shown} already matches the rules bundled with Thinkmap ${TEMPLATE_VERSION}`);
      else if (r.created) console.log(`✓ ${shown} created from the rules bundled with Thinkmap ${TEMPLATE_VERSION}`);
      else console.log(`✓ ${shown} refreshed to the rules bundled with Thinkmap ${TEMPLATE_VERSION}\n  If the file had local edits, \`git diff ${shown}\` shows what changed.`);
      break;
    }
    if (!s.exists) {
      console.log(`ℹ ${shown} does not exist. The rules live in ${TEMPLATE_FORMAT}\n  Create a copy for people and sessions without Thinkmap: ${cliCommand()} format --write${where}`);
      break;
    }
    if (s.upToDate) { console.log(`✓ ${shown} matches the rules bundled with Thinkmap ${TEMPLATE_VERSION}`); break; }
    console.log(`! ${shown} differs from the rules bundled with Thinkmap ${TEMPLATE_VERSION}.\n  The validator and the plugin follow the bundled rules; this copy is what people and\n  sessions without Thinkmap read, so it should say the same.\n  Refresh it:     ${cliCommand()} format --write${where}\n  Compare first:  diff "${TEMPLATE_FORMAT}" "${shown}"`);
    process.exit(1);
    break;
  }
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
    // The updated copy may carry new format rules; the project's FORMAT.md copy does not follow by itself.
    const fc = r.ok ? formatCopyStatus(dir) : null;
    if (fc?.exists && !fc.upToDate) console.log(`ℹ ${path.join(dir, 'FORMAT.md')} is an older copy of the format rules — refresh it: ${cliCommand()} format --write`);
    process.exit(r.ok ? 0 : 1);
    break;
  }
  default:
    console.log(HELP);
    process.exit(cmd && cmd !== 'help' && cmd !== '--help' ? 1 : 0);
}
