// The catalogue of agents and skills Thinkmap offers to copy into a project's .claude/.
// Keeps the manifest, the files and their front matter in step, and keeps them generic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFrontMatter, parseYamlSubset } from '../src/parse.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAT = path.join(ROOT, 'catalogue');
const manifest = JSON.parse(fs.readFileSync(path.join(CAT, 'catalogue.json'), 'utf8'));
const fileOf = (item) => path.join(CAT, item.path, item.kind === 'skill' ? 'SKILL.md' : '');
const frontMatter = (file) => parseYamlSubset(splitFrontMatter(fs.readFileSync(file, 'utf8')).yaml).data;

test('catalogue: every item has a file whose front matter name matches', () => {
  assert.equal(manifest.version, 1);
  for (const item of manifest.items) {
    assert.ok(['agent', 'skill'].includes(item.kind), `${item.name}: kind`);
    assert.ok(item.summary, `${item.name}: summary`);
    const fm = frontMatter(fileOf(item));
    assert.equal(fm.name, item.name, `${item.path}: front matter name`);
    assert.ok(fm.description, `${item.name}: description`);
  }
});

test('catalogue: every file on disk is listed, names are unique, requires point at listed items', () => {
  const names = manifest.items.map((i) => i.name);
  assert.equal(new Set(names).size, names.length, 'unique names');
  const agents = fs.readdirSync(path.join(CAT, 'agents')).map((f) => f.replace(/\.md$/, ''));
  const skills = fs.readdirSync(path.join(CAT, 'skills'));
  assert.deepEqual([...agents, ...skills].sort(), [...names].sort());
  for (const item of manifest.items) for (const r of item.requires) assert.ok(names.includes(r), `${item.name} requires ${r}`);
});

test('catalogue: no name collides with the plugin\'s own skills', () => {
  const own = fs.readdirSync(path.join(ROOT, 'skills'));
  for (const item of manifest.items) assert.ok(!own.includes(item.name), item.name);
});

test('catalogue: generic — no project names or project-only paths', () => {
  const banned = /tracklane|TenantPrismaService|apps\/api\/src\/prisma|@[a-z-]+\/shared\b|docs\/plan\/01-basic|P1-F03-02|P1-F03-14/i;
  for (const item of manifest.items) {
    const text = fs.readFileSync(fileOf(item), 'utf8');
    assert.ok(!banned.test(text), `${item.name}: ${text.match(banned)?.[0]}`);
  }
});

test('catalogue: not where Claude Code would load it automatically, and shipped in the npm package', () => {
  // Plugin agents/ and skills/ at the root load for every user; the catalogue must not.
  assert.ok(!fs.existsSync(path.join(ROOT, 'agents')), 'no root agents/ folder');
  const own = fs.readdirSync(path.join(ROOT, 'skills'));
  for (const item of manifest.items) assert.ok(!own.includes(item.name));
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.ok(pkg.files.includes('catalogue'));
});

// ---------- adding and removing (shared by the CLI and the dashboard) ----------
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { catalogueStatus, addItems, removeItems, readRecord, RECORD } from '../src/catalogue.js';
import { initPlan } from '../src/init.js';
import { startServer } from '../src/server.js';
import { buildGraph } from '../src/graph.js';

const project = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'thinkmap-cat-')));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  initPlan(path.join(dir, 'docs', 'plan'), { name: 'X' });
  return dir;
};
const stateOf = (root, name) => catalogueStatus(root).items.find((i) => i.name === name).state;

test('add: copies an item and what it requires, records it, and is idempotent', () => {
  const root = project();
  const r = addItems(root, ['fullstack-code-reviewer']);
  assert.deepEqual(r.added.sort(), ['backend-code-reviewer', 'frontend-code-reviewer', 'fullstack-code-reviewer']);
  for (const n of r.added) assert.ok(fs.existsSync(path.join(root, '.claude/agents', `${n}.md`)));
  assert.equal(fs.readFileSync(path.join(root, '.claude/agents/backend-code-reviewer.md'), 'utf8'), fs.readFileSync(path.join(CAT, 'agents/backend-code-reviewer.md'), 'utf8'), 'byte-for-byte copy');
  assert.deepEqual(Object.keys(readRecord(root).items).sort(), r.added.sort());
  assert.equal(stateOf(root, 'fullstack-code-reviewer'), 'installed');
  assert.deepEqual(addItems(root, ['fullstack-code-reviewer']).added, []);
  addItems(root, ['review-fix-loop']);
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/review-fix-loop/SKILL.md')));
  assert.equal(stateOf(root, 'review-findings-fixer'), 'installed', 'the skill brought its fixer');
});

test('add: never overwrites the project\'s own file; unknown names are rejected before anything is written', () => {
  const root = project();
  fs.mkdirSync(path.join(root, '.claude/agents'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude/agents/backend-code-reviewer.md'), 'mine');
  assert.equal(stateOf(root, 'backend-code-reviewer'), 'conflict');
  assert.throws(() => addItems(root, ['fullstack-code-reviewer']), /own agent "backend-code-reviewer"/);
  assert.equal(fs.readFileSync(path.join(root, '.claude/agents/backend-code-reviewer.md'), 'utf8'), 'mine');
  assert.ok(!fs.existsSync(path.join(root, '.claude/agents/frontend-code-reviewer.md')), 'nothing written when one item fails');
  assert.throws(() => addItems(root, ['../../etc/passwd']), /not in the Thinkmap catalogue/);
  assert.throws(() => removeItems(root, ['backend-code-reviewer']), /project's own file/);
});

test('add: refuses to write through a symbolic link', () => {
  const root = project();
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'thinkmap-elsewhere-'));
  fs.symlinkSync(elsewhere, path.join(root, '.claude'));
  assert.throws(() => addItems(root, ['backend-code-reviewer']), /symbolic link/);
  assert.deepEqual(fs.readdirSync(elsewhere), []);
});

test('remove: only what Thinkmap added; keeps local changes and needed items unless forced', () => {
  const root = project();
  addItems(root, ['fullstack-code-reviewer', 'review-fix-loop']);
  assert.throws(() => removeItems(root, ['backend-code-reviewer']), /needed by fullstack-code-reviewer/);
  fs.appendFileSync(path.join(root, '.claude/agents/frontend-code-reviewer.md'), '\nlocal rule\n');
  assert.equal(stateOf(root, 'frontend-code-reviewer'), 'modified');
  assert.equal(addItems(root, ['frontend-code-reviewer']).kept[0], 'frontend-code-reviewer', 'add keeps local changes');
  assert.throws(() => removeItems(root, ['fullstack-code-reviewer', 'frontend-code-reviewer']), /changed in this project/);
  removeItems(root, ['fullstack-code-reviewer', 'backend-code-reviewer']);
  removeItems(root, ['frontend-code-reviewer'], { force: true });
  removeItems(root, ['review-fix-loop', 'review-findings-fixer']);
  assert.ok(!fs.existsSync(path.join(root, '.claude/skills/review-fix-loop')), 'empty skill folder removed');
  assert.ok(!fs.existsSync(path.join(root, RECORD)), 'record removed when empty');
  assert.deepEqual(fs.readdirSync(path.join(root, '.claude/agents')), []);
});

test('status: a newer catalogue version shows as "update", and add updates it', () => {
  const root = project();
  addItems(root, ['backend-code-reviewer']);
  // Pretend an older catalogue version was added: an old file, recorded with its own hash.
  const file = '.claude/agents/backend-code-reviewer.md';
  fs.writeFileSync(path.join(root, file), 'old version');
  const rec = JSON.parse(fs.readFileSync(path.join(root, RECORD), 'utf8'));
  rec.items['backend-code-reviewer'].hash = crypto.createHash('sha256').update(file).update('\0').update('old version').update('\0').digest('hex').slice(0, 16);
  fs.writeFileSync(path.join(root, RECORD), JSON.stringify(rec));
  assert.equal(stateOf(root, 'backend-code-reviewer'), 'update');
  assert.deepEqual(addItems(root, ['backend-code-reviewer']).updated, ['backend-code-reviewer']);
  assert.equal(stateOf(root, 'backend-code-reviewer'), 'installed');
});

test('graph: catalogue states, and added files marked as Thinkmap\'s on the Tooling tab', () => {
  const root = project();
  addItems(root, ['backend-code-reviewer']);
  const g = buildGraph(path.join(root, 'docs', 'plan'));
  assert.equal(g.catalogue.installed, 1);
  const t = g.tooling.items.find((i) => i.name === 'backend-code-reviewer');
  assert.equal(t.source, 'thinkmap');
});

test('server: Add needs the page token and the dashboard origin; --read-only refuses', async () => {
  const root = project();
  const srv = await startServer({ planDir: path.join(root, 'docs', 'plan'), port: 0, log: () => {} });
  try {
    const page = await (await fetch(`${srv.url}/`)).text();
    const token = /name="thinkmap-token" content="([0-9a-f]+)"/.exec(page)?.[1];
    assert.ok(token, 'token in the served page');
    const post = (headers, body = { action: 'add', name: 'backend-code-reviewer' }) =>
      fetch(`${srv.url}/api/catalogue`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    assert.equal((await post({ Origin: srv.url })).status, 403, 'no token');
    assert.equal((await post({ Origin: 'https://evil.example', 'X-Thinkmap-Token': token })).status, 403, 'other origin');
    assert.equal((await post({ 'X-Thinkmap-Token': token })).status, 403, 'no origin');
    assert.equal((await post({ Origin: srv.url, 'X-Thinkmap-Token': token }, { action: 'add', name: '../x' })).status, 400);
    assert.equal((await fetch(`${srv.url}/api/catalogue`)).status, 405);
    assert.ok(!fs.existsSync(path.join(root, '.claude')), 'nothing written so far');
    const ok = await post({ Origin: srv.url, 'X-Thinkmap-Token': token });
    assert.equal(ok.status, 200);
    assert.deepEqual((await ok.json()).added, ['backend-code-reviewer']);
    assert.ok(fs.existsSync(path.join(root, '.claude/agents/backend-code-reviewer.md')));
    const g = await (await fetch(`${srv.url}/api/graph`)).json();
    assert.equal(g.catalogue.items.find((i) => i.name === 'backend-code-reviewer').state, 'installed', 'graph refreshed');
    const rm = await post({ Origin: srv.url, 'X-Thinkmap-Token': token }, { action: 'remove', name: 'backend-code-reviewer' });
    assert.equal(rm.status, 200);
  } finally { srv.close(); }
  const ro = await startServer({ planDir: path.join(root, 'docs', 'plan'), port: 0, log: () => {}, readOnly: true });
  try {
    assert.ok(!/name="thinkmap-token" content=/.test(await (await fetch(`${ro.url}/`)).text()), "no token when read-only");
    const r = await fetch(`${ro.url}/api/catalogue`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ro.url }, body: '{"action":"add","name":"backend-code-reviewer"}' });
    assert.equal(r.status, 403);
  } finally { ro.close(); }
});

test('graph: lists the skills built into Thinkmap for other projects, not for Thinkmap itself', () => {
  const g = buildGraph(path.join(project(), 'docs', 'plan'));
  const names = g.builtin.map((b) => b.name);
  for (const n of ['thinkmap', 'thinkmap-create-tickets', 'thinkmap-implement-ticket', 'thinkmap-status']) assert.ok(names.includes(n), n);
  assert.equal(g.builtin.find((b) => b.name === 'thinkmap-create-tickets').slash, '/thinkmap-create-tickets');
  assert.deepEqual(buildGraph(path.join(ROOT, 'docs', 'plan')).builtin, [], 'Thinkmap lists its own skills as plugin tooling already');
});
