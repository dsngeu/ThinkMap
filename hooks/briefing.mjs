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

const PLUGIN_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

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
    `Commands: /thinkmap (open the map) · /thinkmap-status [P1|open] · /thinkmap-tickets <P1|P1-F02> (break decided points into tickets) · /thinkmap-ticket <ID> (claim a ticket) · CLI: ${cli} validate|status|serve|phase`,
    '',
    status,
  ].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  try {
    const text = briefing({ projectDir: process.env.CLAUDE_PROJECT_DIR || process.cwd() });
    if (text) process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } })}\n`);
  } catch { /* fail open */ }
  process.exit(0);
}
