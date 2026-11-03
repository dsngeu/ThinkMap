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
