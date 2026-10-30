// The Claude Code plugin layout: manifest, marketplace, skills and hooks stay consistent
// with the engine, and the two hook scripts behave (fast, fail open, errors reach Claude).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initPlan } from '../src/init.js';
import { scanTooling } from '../src/tooling.js';
import { detectInstall, cliCommand, howToUpdate } from '../src/update.js';
import { planDirOf, main as validateHook } from '../hooks/validate.mjs';
import { briefing } from '../hooks/briefing.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const json = (f) => JSON.parse(read(f));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'thinkmap-plugin-'));

test('plugin manifest: name, version in step with package.json', () => {
  const m = json('.claude-plugin/plugin.json');
  assert.equal(m.name, 'thinkmap');
  assert.equal(m.version, json('package.json').version);
  assert.ok(m.description && m.author?.name);
});

test('marketplace lists this repo root as the thinkmap plugin', () => {
  const m = json('.claude-plugin/marketplace.json');
  assert.equal(m.name, 'thinkmap'); // → /plugin install thinkmap@thinkmap
  assert.ok(m.owner?.name);
  const p = m.plugins.find((x) => x.name === 'thinkmap');
  assert.ok(p, 'plugin entry');
  assert.equal(p.source, './');
});

test('skills: the six decided ones, each with name + description; format skill points at FORMAT.md and copies nothing', () => {
  const names = fs.readdirSync(path.join(ROOT, 'skills')).sort();
  assert.deepEqual(names, ['thinkmap', 'thinkmap-format', 'thinkmap-init', 'thinkmap-status', 'thinkmap-ticket', 'thinkmap-tickets']);
  for (const n of names) {
    const text = read(`skills/${n}/SKILL.md`);
    const fm = /^---\n([\s\S]*?)\n---/.exec(text);
    assert.ok(fm, `${n}: front matter`);
    assert.match(fm[1], new RegExp(`^name: ${n}$`, 'm'));
    assert.match(fm[1], /^description: .{20,}/m);
    // Opening a browser or creating files is for people to trigger; status and ticket may be used by Claude on its own.
    if (n === 'thinkmap' || n === 'thinkmap-init') assert.match(fm[1], /^disable-model-invocation: true$/m, `${n} is user-only`);
    else assert.doesNotMatch(fm[1], /^disable-model-invocation: true$/m, `${n} may be used by Claude`);
  }
  const format = read('skills/thinkmap-format/SKILL.md');
  assert.match(format, /^user-invocable: false$/m);
  assert.ok(format.includes('${CLAUDE_PLUGIN_ROOT}/template/FORMAT.md'), 'links to the single source of truth');
  // P1-F01-06: no second copy of the format — the point syntax and ID table must not be restated.
  assert.ok(!/\[decided \d{4}/.test(format) && !/P<n>-F<nn>/.test(format), 'format skill must not restate FORMAT.md');
  // P1-F01-08: ticket generation has two gates and takes a phase or a topic.
  const tickets = read('skills/thinkmap-tickets/SKILL.md');
  assert.match(tickets, /^argument-hint: "<P1 \| P1-F02>/m);
  assert.match(tickets, /Gate 1/);
  assert.match(tickets, /Gate 2/);
  assert.match(tickets, /go ahead/);
  assert.ok(tickets.includes('${CLAUDE_PLUGIN_ROOT}/template/FORMAT.md'));
});

test('hooks.json: PostToolUse validate + SessionStart briefing, both via CLAUDE_PLUGIN_ROOT and existing scripts', () => {
  const h = json('hooks/hooks.json').hooks;
  const post = h.PostToolUse[0];
  assert.match(post.matcher, /Edit/);
  assert.match(post.matcher, /Write/);
  const cmds = [...h.PostToolUse, ...h.SessionStart].flatMap((g) => g.hooks.map((x) => x.command));
  assert.equal(cmds.length, 2);
  for (const c of cmds) {
    assert.ok(c.includes('${CLAUDE_PLUGIN_ROOT}/hooks/'), c);
    const script = /hooks\/([\w.-]+)"/.exec(c)[1];
    assert.ok(fs.existsSync(path.join(ROOT, 'hooks', script)), `${script} exists`);
  }
  for (const x of [...h.PostToolUse, ...h.SessionStart].flatMap((g) => g.hooks)) assert.ok(x.timeout <= 10, 'short timeout (P1-F02-03)');
});

test('the repo itself shows its plugin skills and hooks on the Tooling tab', () => {
  const t = scanTooling(ROOT);
  assert.equal(t.isPlugin, true);
  assert.ok(t.counts.skills >= 5 && t.counts.hooks >= 2);
  assert.ok(t.items.some((i) => i.group === 'skill' && i.name === 'thinkmap-format' && i.slash === null));
});

test('validate hook: finds the plan folder of an edited file, default and custom', () => {
  const dir = tmp();
  initPlan(path.join(dir, 'docs', 'plan'), { name: 'X' });
  initPlan(path.join(dir, 'planning'), { name: 'Y' });
  assert.equal(planDirOf('docs/plan/01-first-phase/phase.md', dir), path.join(dir, 'docs', 'plan'));
  assert.equal(planDirOf(path.join(dir, 'planning', '01-first-phase', 'tickets', 'P1-T01-example-ticket.md'), dir), path.join(dir, 'planning'));
  assert.equal(planDirOf('README.md', dir), null);
  assert.equal(planDirOf('docs/plan/notes.txt', dir), null);
  assert.equal(planDirOf(undefined, dir), null);
});

test('validate hook: exit 0 when valid, 2 with the errors on stderr when broken, 0 on junk input', async () => {
  const dir = tmp();
  initPlan(path.join(dir, 'docs', 'plan'), { name: 'X' });
  const err = { out: '', write(s) { this.out += s; } };
  const call = (file) => validateHook({ input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: file } }), env: { CLAUDE_PROJECT_DIR: dir }, stderr: err });
  assert.equal(await call('docs/plan/project.md'), 0);
  fs.writeFileSync(path.join(dir, 'docs/plan/01-first-phase/F02-bad.md'), '---\nid: P1-F02\ntype: feature\ntitle: Bad\nstatus: auto\nparent: P9\nupdated: 2026-10-29\n---\n## Points\n- [maybe] P1-F02-01: x\n');
  assert.equal(await call('docs/plan/01-first-phase/F02-bad.md'), 2);
  assert.match(err.out, /unknown point kind "maybe"/);
  assert.match(err.out, /parent "P9" not found/);
  assert.equal(await validateHook({ input: 'not json', env: {}, stderr: err }), 0);
  assert.equal(await call('src/app.js'), 0);
});

test('briefing: status + where the rules are when a plan exists; nothing otherwise', () => {
  const dir = tmp();
  assert.equal(briefing({ projectDir: dir }), null);
  initPlan(path.join(dir, 'docs', 'plan'), { name: 'Briefed' });
  const text = briefing({ projectDir: dir, pluginRoot: '/plug' });
  assert.match(text, /Briefed — plan status/);
  assert.ok(text.includes('/plug/template/FORMAT.md'));
  assert.match(text, /\/thinkmap-ticket <ID>/);
  assert.match(text, /\/thinkmap-tickets <P1\|P1-F02>/);
  assert.doesNotMatch(text, /format --write/, 'a fresh init needs no refresh');
  // the copy left by an older install (e.g. npx before the plugin) → the session is told to refresh it
  fs.appendFileSync(path.join(dir, 'docs/plan/FORMAT.md'), '\nold rule\n');
  const stale = briefing({ projectDir: dir, pluginRoot: '/plug' });
  assert.match(stale, /docs\/plan\/FORMAT.md is an older copy/);
  assert.ok(stale.includes('node "/plug/bin/thinkmap.js" format --write'));
});

test('hook scripts run as processes: fail open, fast, JSON on stdout for SessionStart', () => {
  const dir = tmp();
  initPlan(path.join(dir, 'docs', 'plan'), { name: 'Proc' });
  const t0 = Date.now();
  const b = spawnSync(process.execPath, [path.join(ROOT, 'hooks/briefing.mjs')], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
  assert.equal(b.status, 0);
  const out = JSON.parse(b.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(out.hookSpecificOutput.additionalContext, /Proc — plan status/);
  const v = spawnSync(process.execPath, [path.join(ROOT, 'hooks/validate.mjs')], { input: '{"tool_input":{"file_path":"docs/plan/project.md"}}', env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
  assert.equal(v.status, 0);
  assert.equal(v.stderr, '');
  const none = spawnSync(process.execPath, [path.join(ROOT, 'hooks/briefing.mjs')], { env: { ...process.env, CLAUDE_PROJECT_DIR: tmp() }, encoding: 'utf8' });
  assert.equal(none.status, 0);
  assert.equal(none.stdout, '');
  assert.ok(Date.now() - t0 < 3000, 'three hook runs well under a second each');
});

test('update: a plugin-cache install is recognised and told to use claude plugin update', () => {
  const info = detectInstall('/Users/x/.claude/plugins/cache/thinkmap/thinkmap/0.3.0', () => false);
  assert.equal(info.kind, 'plugin');
  assert.equal(info.marketplace, 'thinkmap');
  assert.match(howToUpdate(info), /^claude plugin update thinkmap@thinkmap/);
  assert.match(cliCommand(info), /^node ".*bin\/thinkmap\.js"$/);
});
