#!/usr/bin/env node
// PostToolUse hook: after Claude edits or writes a file inside a plan folder, run the
// validator and hand any format errors straight back to Claude (exit 2 + stderr).
//
// Fails open on purpose (P1-F02-03): anything unexpected → exit 0, silent. The edit has
// already happened; this hook only decides whether Claude hears about a broken file.
import fs from 'node:fs';
import path from 'node:path';
import { buildGraph } from '../src/graph.js';
import { formatIssues } from '../src/status.js';

const readStdin = () => new Promise((resolve) => {
  let s = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => { s += d; });
  process.stdin.on('end', () => resolve(s));
  process.stdin.on('error', () => resolve(''));
  setTimeout(() => resolve(s), 1500).unref();
});

// The plan folder an edited file belongs to: the nearest ancestor holding project.md or
// FORMAT.md (so custom folders work), stopping at the project root. docs/plan is the default.
export function planDirOf(filePath, projectDir) {
  if (!filePath || !/\.md$/i.test(filePath)) return null;
  const abs = path.resolve(projectDir || process.cwd(), filePath);
  const stop = path.resolve(projectDir || process.cwd());
  let dir = path.dirname(abs);
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'project.md')) || fs.existsSync(path.join(dir, 'FORMAT.md'))) return dir;
    if (dir === stop || path.dirname(dir) === dir) break;
    dir = path.dirname(dir);
  }
  const m = /^(.*[\\/]docs[\\/]plan)[\\/]/.exec(abs);
  return m ? m[1] : null;
}

export async function main({ input, env = process.env, stderr = process.stderr } = {}) {
  let data;
  try { data = JSON.parse(input ?? (await readStdin())); } catch { return 0; }
  const file = data?.tool_input?.file_path || data?.tool_input?.notebook_path;
  const planDir = planDirOf(file, env.CLAUDE_PROJECT_DIR || data?.cwd);
  if (!planDir) return 0;
  const g = buildGraph(planDir, { commits: [] }); // no git log: keep it well under a second
  if (!g.stats.errors) return 0;
  const errors = { ...g, issues: g.issues.filter((i) => i.level === 'error') };
  stderr.write(`Thinkmap: the plan file you just edited has format errors — fix them now (rules: FORMAT.md in the plan folder).\n${formatIssues(errors)}\n`);
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().then((code) => process.exit(code)).catch(() => process.exit(0));
}
