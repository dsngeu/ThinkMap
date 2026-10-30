import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initPlan, scaffoldPhase, findPhaseDir, formatCopyStatus, syncFormatCopy, TEMPLATE_FORMAT } from '../src/init.js';
import { buildGraph } from '../src/graph.js';

test('init creates a valid plan folder from the template', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'thinkmap-init-')), 'docs', 'plan');
  const r = initPlan(dir, { name: 'Demo Project', today: new Date('2026-10-29') });
  assert.ok(r.written.includes('project.md'));
  assert.ok(r.written.includes('FORMAT.md'));
  assert.ok(fs.existsSync(path.join(dir, '01-first-phase', 'tickets', '.gitkeep')), 'tickets/ survives in git before the first ticket');
  const project = fs.readFileSync(path.join(dir, 'project.md'), 'utf8');
  assert.match(project, /title: Demo Project/);
  assert.match(project, /updated: 2026-10-29/);
  assert.doesNotMatch(project, /\{\{/); // no placeholders left
  const g = buildGraph(dir, { repoRoot: null, commits: [] });
  assert.equal(g.stats.errors, 0, JSON.stringify(g.issues));
  assert.equal(g.stats.warnings, 0, JSON.stringify(g.issues));
  assert.equal(g.project.title, 'Demo Project');
  assert.deepEqual(g.stats.byKind, { discussed: 1, decided: 1, open: 1, suggestion: 1, caution: 1, dropped: 1 });
});

test('format copy: init leaves it current; a stale copy is a validate warning; format --write refreshes it', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'thinkmap-init-')), 'docs', 'plan');
  initPlan(dir, { name: 'Copy' });
  const graph = () => buildGraph(dir, { repoRoot: null, commits: [] });
  assert.equal(formatCopyStatus(dir).upToDate, true);
  assert.equal(graph().stats.warnings, 0);

  // an older template (or a hand edit) → one warning that names the fix, never an error
  fs.appendFileSync(path.join(dir, 'FORMAT.md'), '\n## 8. A rule from an older version\n');
  assert.equal(formatCopyStatus(dir).upToDate, false);
  const g = graph();
  assert.equal(g.stats.errors, 0);
  assert.equal(g.stats.warnings, 1, JSON.stringify(g.issues));
  assert.equal(g.issues[0].file, 'FORMAT.md');
  assert.match(g.issues[0].message, /format --write/);

  const r = syncFormatCopy(dir);
  assert.equal(r.changed, true);
  assert.equal(r.created, false);
  assert.equal(fs.readFileSync(path.join(dir, 'FORMAT.md'), 'utf8'), fs.readFileSync(TEMPLATE_FORMAT, 'utf8'));
  assert.equal(graph().stats.warnings, 0);
  assert.equal(syncFormatCopy(dir).changed, false);

  // line endings and a trailing newline are not drift
  fs.writeFileSync(path.join(dir, 'FORMAT.md'), `${fs.readFileSync(TEMPLATE_FORMAT, 'utf8').replace(/\n/g, '\r\n')}\r\n`);
  assert.equal(formatCopyStatus(dir).upToDate, true);

  // no copy at all (plugin-only project): nothing to compare, no warning; --write creates one
  fs.unlinkSync(path.join(dir, 'FORMAT.md'));
  assert.deepEqual(formatCopyStatus(dir).exists, false);
  assert.equal(graph().stats.warnings, 0);
  assert.equal(syncFormatCopy(dir).created, true);
  assert.equal(formatCopyStatus(dir).upToDate, true);
});

test('init refuses a non-empty folder unless forced, and never overwrites', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thinkmap-init-'));
  fs.writeFileSync(path.join(dir, 'project.md'), 'mine');
  assert.throws(() => initPlan(dir), /not empty/);
  const r = initPlan(dir, { force: true });
  assert.ok(r.skipped.includes('project.md'));
  assert.equal(fs.readFileSync(path.join(dir, 'project.md'), 'utf8'), 'mine');
});

test('thinkmap phase: scaffolds NN-slug/phase.md + tickets/.gitkeep, valid at once; re-run adds only what is missing; refuses a second folder for the same phase', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'thinkmap-phase-')), 'docs', 'plan');
  assert.throws(() => scaffoldPhase(dir, { id: 'P2', slug: 'workflow' }), /no project.md/);
  initPlan(dir, { name: 'Phased', today: new Date('2026-10-30') });
  const graph = () => buildGraph(dir, { repoRoot: null, commits: [] });

  const r = scaffoldPhase(dir, { id: 'P2', slug: 'Work Flow', today: new Date('2026-10-30') });
  assert.equal(r.folder, '02-work-flow');
  assert.equal(r.id, 'P2');
  assert.equal(r.title, 'Work flow');
  assert.deepEqual(r.written, [path.join('02-work-flow', 'phase.md'), path.join('02-work-flow', 'tickets', '.gitkeep')]);
  const phase = fs.readFileSync(path.join(dir, '02-work-flow', 'phase.md'), 'utf8');
  assert.match(phase, /^id: P2$/m);
  assert.match(phase, /^status: auto$/m);
  assert.match(phase, /^parent: PROJECT$/m);
  assert.match(phase, /^updated: 2026-10-30$/m);
  assert.equal(graph().stats.errors, 0, JSON.stringify(graph().issues));
  assert.equal(graph().nodes.find((n) => n.id === 'P2').title, 'Work flow');

  // the same phase again: nothing rewritten; a missing .gitkeep comes back
  fs.unlinkSync(path.join(dir, '02-work-flow', 'tickets', '.gitkeep'));
  const again = scaffoldPhase(dir, { id: '2', slug: 'work-flow', title: 'ignored, file exists' });
  assert.deepEqual(again.written, [path.join('02-work-flow', 'tickets', '.gitkeep')]);
  assert.deepEqual(again.skipped, [path.join('02-work-flow', 'phase.md')]);
  assert.match(fs.readFileSync(path.join(dir, '02-work-flow', 'phase.md'), 'utf8'), /^title: Work flow$/m);

  assert.throws(() => scaffoldPhase(dir, { id: 'P2', slug: 'other' }), /already lives in .*02-work-flow/);
  assert.throws(() => scaffoldPhase(dir, { id: 'two', slug: 'x' }), /phase id must look like P1/);
  assert.throws(() => scaffoldPhase(dir, { id: 'P3', slug: '!!!' }), /slug must be lowercase/);
  assert.equal(findPhaseDir(dir, 'P1'), '01-first-phase');
  assert.equal(findPhaseDir(dir, 'P9'), null);
  // P12 → 12-…; a custom title is kept as given
  const big = scaffoldPhase(dir, { id: 'P12', slug: 'reports', title: 'Reports & exports' });
  assert.equal(big.folder, '12-reports');
  assert.match(fs.readFileSync(path.join(dir, '12-reports', 'phase.md'), 'utf8'), /^title: Reports & exports$/m);
  assert.equal(graph().stats.errors, 0);
});
