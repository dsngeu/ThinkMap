import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildGraph, aggregateStatus, commitIds } from '../src/graph.js';
import { formatStatus } from '../src/status.js';

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thinkmap-'));
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), body);
  }
  return dir;
}
const fm = (o, body = '') => `---\n${Object.entries(o).map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(', ')}]` : v}`).join('\n')}\n---\n${body}`;
const build = (files, commits = []) => buildGraph(fixture(files), { repoRoot: null, commits });

const valid = {
  'project.md': fm({ id: 'PROJECT', type: 'project', title: 'Demo', status: 'auto', updated: '2026-10-29' }),
  '01-basic/phase.md': fm({ id: 'P1', type: 'phase', title: 'Basic', status: 'auto', parent: 'PROJECT', updated: '2026-10-29' }),
  '01-basic/F01-signup.md': fm({ id: 'P1-F01', type: 'feature', title: 'Signup', status: 'auto', parent: 'P1', updated: '2026-10-29' },
    '## Points\n- [decided] P1-F01-01: link 24h\n- [open] P1-F01-02: phone?\n- [discussed 2026-10-28] P1-F01-03: walked through the flow\n- [suggestion claude] P1-F01-04: add captcha?\n- [caution] P1-F01-05: never leak emails\n'),
  '01-basic/tickets/P1-T01-api.md': fm({ id: 'P1-T01', type: 'ticket', title: 'API', status: 'done', parent: 'P1-F01', implements: ['P1-F01-01'], updated: '2026-10-29' }),
  '01-basic/tickets/P1-T02-ui.md': fm({ id: 'P1-T02', type: 'ticket', title: 'UI', status: 'planned', parent: 'P1-F01', depends_on: ['P1-T01'], updated: '2026-10-29' }),
  'FORMAT.md': '# format doc — ignored',
};

test('valid plan builds nodes, edges and no errors', () => {
  const g = build(valid);
  assert.equal(g.stats.errors, 0, JSON.stringify(g.issues));
  assert.equal(g.project.title, 'Demo');
  assert.deepEqual(g.nodes.map((n) => n.id).sort(), ['P1', 'P1-F01', 'P1-F01-01', 'P1-F01-02', 'P1-F01-03', 'P1-F01-04', 'P1-F01-05', 'P1-T01', 'P1-T02', 'PROJECT']);
  const sug = g.nodes.find((n) => n.id === 'P1-F01-04');
  assert.equal(sug.kind, 'suggestion');
  assert.equal(sug.from, 'claude');
  assert.equal(sug.date, '2026-10-29'); // falls back to the file's updated date
  assert.equal(g.nodes.find((n) => n.id === 'P1-F01-03').date, '2026-10-28');
  assert.deepEqual(g.stats.byKind, { discussed: 1, decided: 1, open: 1, suggestion: 1, caution: 1, dropped: 0 });
  const kinds = g.edges.map((e) => `${e.kind}:${e.source}>${e.target}`);
  assert.ok(kinds.includes('parent:P1-F01>P1-F01-01'));
  assert.ok(kinds.includes('depends:P1-T01>P1-T02'));
  assert.ok(kinds.includes('implements:P1-T01>P1-F01-01'));
});

test('auto status and progress roll up from children', () => {
  const g = build(valid);
  const f = g.nodes.find((n) => n.id === 'P1-F01');
  assert.equal(f.status, 'in-progress'); // one ticket done, others open
  // decided + caution settled; open + suggestion unsettled; 'discussed' not counted
  assert.deepEqual(f.progress, { points: { total: 4, settled: 2 }, tickets: { total: 2, done: 1 } });
  assert.equal(g.nodes.find((n) => n.id === 'P1').phase, 'P1');
  assert.equal(g.nodes.find((n) => n.id === 'P1-T02').phase, 'P1');
  assert.deepEqual(g.nodes.find((n) => n.id === 'P1-T01').blocks, ['P1-T02']);
});

test('aggregateStatus rules', () => {
  assert.equal(aggregateStatus([]), 'to-discuss');
  assert.equal(aggregateStatus(['done', 'done', 'dropped']), 'done');
  assert.equal(aggregateStatus(['done', 'planned']), 'in-progress');
  assert.equal(aggregateStatus(['planned', 'blocked']), 'blocked');
  assert.equal(aggregateStatus(['decided', 'to-discuss']), 'discussing');
  assert.equal(aggregateStatus(['to-discuss']), 'to-discuss');
  assert.equal(aggregateStatus(['decided', 'planned']), 'planned');
  assert.equal(aggregateStatus(['decided']), 'decided');
});

test('validation catches broken references, bad status, wrong ids, duplicates', () => {
  const g = build({
    ...valid,
    'bad1.md': fm({ id: 'P1-T09', type: 'ticket', title: 'x', status: 'wip', parent: 'P1-F99', updated: '2026-10-29' }),
    'bad2.md': fm({ id: 'P1-T10', type: 'ticket', title: 'x', status: 'planned', parent: 'P1-F01', depends_on: ['P9-T01'], updated: '2026-10-29' }),
    'bad3.md': fm({ id: 'WRONG', type: 'feature', title: 'x', status: 'auto', parent: 'P1', updated: '2026-10-29' }),
    '01-basic/F02-x.md': fm({ id: 'P1-F02', type: 'feature', title: 'x', status: 'auto', parent: 'P1', updated: '2026-10-29' }, '## Points\n- [maybe] P1-F02-01: bad kind\n'),
    'dup.md': fm({ id: 'P1-T01', type: 'ticket', title: 'dup', status: 'planned', parent: 'P1-F01', updated: '2026-10-29' }),
    'nofm.md': '# no front matter',
  });
  const msgs = g.issues.map((i) => i.message).join('\n');
  assert.match(msgs, /unknown status "wip"/);
  assert.match(msgs, /parent "P1-F99" not found/);
  assert.match(msgs, /depends_on "P9-T01" not found/);
  assert.match(msgs, /does not match the feature pattern/);
  assert.match(msgs, /unknown point kind "maybe"/);
  assert.match(msgs, /duplicate id "P1-T01"/);
  assert.match(msgs, /no front matter/);
});

test('decided point without a body gets a warning', () => {
  const g = build(valid);
  const w = g.issues.filter((i) => i.level === 'warning' && /no body/.test(i.message)).map((i) => i.id);
  assert.deepEqual(w, ['P1-F01-01', 'P1-F01-05']); // decided + caution without notes; open/suggestion/discussed are fine
});

test('dependency cycles are reported', () => {
  const g = build({
    ...valid,
    '01-basic/tickets/P1-T01-api.md': fm({ id: 'P1-T01', type: 'ticket', title: 'API', status: 'planned', parent: 'P1-F01', depends_on: ['P1-T02'], updated: '2026-10-29' }),
  });
  assert.match(g.issues.map((i) => i.message).join('\n'), /dependency cycle/);
});

test('commits are linked by [ID] in the subject', () => {
  assert.deepEqual(commitIds('feat(auth): signup [P1-T01]'), ['P1-T01']);
  assert.deepEqual(commitIds('fix: two [P1-T01, P1-T02]'), ['P1-T01', 'P1-T02']);
  assert.deepEqual(commitIds('docs: mention P1-T01 without brackets'), []);
  const g = build(valid, [{ hash: 'abc123', author: 'dev', date: '2026-10-29', subject: 'feat: api [P1-T01]' }]);
  assert.equal(g.nodes.find((n) => n.id === 'P1-T01').commits[0].hash, 'abc123');
});

test('status text lists open points and next free ticket', () => {
  const out = formatStatus(build(valid));
  assert.match(out, /STILL OPEN \/ TO DISCUSS \(2\)/);
  assert.match(out, /P1-F01-02/);
  assert.match(out, /suggested by claude/);
  assert.match(out, /TAKE CARE OF \(1\)/);
  assert.match(out, /NEXT FREE TICKETS \(1\)/);
  assert.match(out, /P1-T02/);
});
