#!/usr/bin/env node
// SessionStart hook: when the project has a plan folder, give the new session a short
// status briefing (current phase, tickets in progress, open questions, next free tickets)
// plus the two things it must know: where the format rules are and which commands exist.
//
// Prints nothing when there is no plan. Fails open (P1-F02-03): any error → exit 0, silent.
import fs from 'node:fs';
import path from 'node:path';
import { buildGraph } from '../src/graph.js';
import { formatStatus } from '../src/status.js';
import { formatCopyStatus, TEMPLATE_VERSION } from '../src/init.js';
import { catalogueStatus } from '../src/catalogue.js';

const PLUGIN_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// The ticket and status skills are catalogue add-ons (P2-F02-14): list the ones this project
// added, and say where to add the rest.
const ADDON_COMMANDS = {
  'thinkmap-status': '/thinkmap-status [P1|P1-F02|open]',
  'thinkmap-create-tickets': '/thinkmap-create-tickets <P1|P1-F02> (break decided points into tickets)',
  'thinkmap-implement-ticket': '/thinkmap-implement-ticket <ID> (brief, then build a ticket)',
};
function commandsOf(projectDir) {
  const has = Object.keys(ADDON_COMMANDS).filter((n) => fs.existsSync(path.join(projectDir, '.claude', 'skills', n, 'SKILL.md')));
  const missing = Object.keys(ADDON_COMMANDS).length - has.length;
  return [...has.map((n) => ` · ${ADDON_COMMANDS[n]}`), missing ? ` · more (ticket and status skills) can be added from the map's Tooling page` : ''].join('');
}
// Copies don't change when the plugin updates: say when an added Thinkmap skill is behind.
function staleAddons(projectDir) {
  try {
    return catalogueStatus(projectDir).items.filter((i) => ADDON_COMMANDS[i.name] && i.updateAvailable).map((i) => `/${i.name}`);
  } catch { return []; }
}

// Add-on skills run Thinkmap's CLI as `node "$THINKMAP_CLI"`; Claude Code keeps variables
// written to CLAUDE_ENV_FILE for every Bash command of the session.
export function exportCli(envFile, pluginRoot = PLUGIN_ROOT) {
  if (!envFile) return false;
  const q = (s) => `'${s.replace(/'/g, `'\\''`)}'`;
  fs.appendFileSync(envFile, `export THINKMAP_CLI=${q(path.join(pluginRoot, 'bin', 'thinkmap.js'))}\n`);
  return true;
}

export function briefing({ projectDir = process.cwd(), planDir = 'docs/plan', pluginRoot = PLUGIN_ROOT } = {}) {
  const abs = path.resolve(projectDir, planDir);
  if (!fs.existsSync(path.join(abs, 'project.md'))) return null;
  const g = buildGraph(abs);
  const status = formatStatus(g, { color: false });
  const cli = `node "${pluginRoot}/bin/thinkmap.js"`;
  const relPlan = path.relative(projectDir, abs) || '.';
  const fc = formatCopyStatus(abs);
  return [
    `[Thinkmap] This project plans itself in ${relPlan}/ — every decision, open question, suggestion and caution goes into those files while you talk, never only in chat.`,
    `Format rules (read before writing a plan file): ${path.join(pluginRoot, 'template', 'FORMAT.md')}`,
    ...(fc.exists && !fc.upToDate ? [`⚠ ${relPlan}/FORMAT.md is an older copy of those rules (it is kept for people and sessions without the plugin). Refresh it now, do not edit it by hand: ${cli} format --write${relPlan === 'docs/plan' ? '' : ` ${relPlan}`}   (Thinkmap ${TEMPLATE_VERSION})`] : []),
    `Commands: /thinkmap (open the map)${commandsOf(projectDir)} · CLI: ${cli} validate|status|serve|phase|tickets`,
    ...((s) => (s.length ? [`⚠ ${s.join(', ')} in this project ${s.length > 1 ? 'are' : 'is'} older than this Thinkmap — tell the person to tap Update on the map's Tooling page (/thinkmap).`] : []))(staleAddons(projectDir)),
    '',
    status,
  ].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  try { exportCli(process.env.CLAUDE_ENV_FILE); } catch { /* fail open */ }
  try {
    const text = briefing({ projectDir: process.env.CLAUDE_PROJECT_DIR || process.cwd() });
    if (text) process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } })}\n`);
  } catch { /* fail open */ }
  process.exit(0);
}
