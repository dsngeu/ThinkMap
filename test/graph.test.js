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

test('layout rules: every break in FORMAT.md §1 is an error that names the fix', () => {
  const errorsOf = (files) => build(files).issues.filter((i) => i.level === 'error').map((i) => `${i.file}: ${i.message}`).join('\n');
  assert.equal(build(valid).stats.errors, 0);

  // phase folder name, missing phase.md, missing tickets/
  let msgs = errorsOf({ ...valid, 'notes/README.md': 'x', 'Phase2/phase.md': fm({ id: 'P2', type: 'phase', title: 'x', status: 'auto', parent: 'PROJECT', updated: '2026-10-29' }) });
  assert.match(msgs, /notes: folder "notes" is not a phase folder/);
  assert.match(msgs, /Phase2: folder "Phase2" is not a phase folder/);
  msgs = errorsOf({ ...valid, '02-empty/.gitkeep': '' });
  assert.match(msgs, /02-empty: phase folder has no phase\.md \(create the phase with: .*phase P2 <slug>\)/);
  assert.match(msgs, /02-empty: phase folder has no tickets\/ folder — add 02-empty\/tickets\/\.gitkeep/);
  const { 'FORMAT.md': _f, ...noTicketsDir } = valid;
  delete noTicketsDir['01-basic/tickets/P1-T01-api.md'];
  delete noTicketsDir['01-basic/tickets/P1-T02-ui.md'];
  assert.match(errorsOf(noTicketsDir), /01-basic: phase folder has no tickets\/ folder/);

  // the folder number must be the phase number
  msgs = errorsOf({ ...valid, '03-two/phase.md': fm({ id: 'P2', type: 'phase', title: 'x', status: 'auto', parent: 'PROJECT', updated: '2026-10-29' }), '03-two/tickets/.gitkeep': '' });
  assert.match(msgs, /phase P2 belongs in folder 02-<slug>, not 03-two\//);

  // topics: directly in the phase folder, F<nn>-slug.md, prefix = id, right phase
  msgs = errorsOf({
    ...valid,
    '01-basic/tickets/F02-misplaced.md': fm({ id: 'P1-F02', type: 'feature', title: 'x', status: 'auto', parent: 'P1', updated: '2026-10-29' }),
    '01-basic/Signup Extras.md': fm({ id: 'P1-F03', type: 'feature', title: 'x', status: 'auto', parent: 'P1', updated: '2026-10-29' }),
    '01-basic/F05-wrong-prefix.md': fm({ id: 'P1-F04', type: 'feature', title: 'x', status: 'auto', parent: 'P1', updated: '2026-10-29' }),
    '02-next/phase.md': fm({ id: 'P2', type: 'phase', title: 'x', status: 'auto', parent: 'PROJECT', updated: '2026-10-29' }),
    '02-next/tickets/.gitkeep': '',
    '02-next/F05-other-phase.md': fm({ id: 'P1-F05', type: 'feature', title: 'x', status: 'auto', parent: 'P1', updated: '2026-10-29' }),
    'F06-root.md': fm({ id: 'P1-F06', type: 'feature', title: 'x', status: 'auto', parent: 'P1', updated: '2026-10-29' }),
  });
  assert.match(msgs, /F02-misplaced\.md: a topic file sits directly in its phase folder/);
  assert.match(msgs, /Signup Extras\.md: topic file name must be F<nn>-slug\.md .* e\.g\. F03-signup-extras\.md/);
  assert.match(msgs, /F05-wrong-prefix\.md: file name starts with "F05" but the id is P1-F04 — rename it F04-<slug>\.md/);
  assert.match(msgs, /F05-other-phase\.md: topic P1-F05 belongs in phase folder 01-<slug>, not 02-next\//);
  assert.match(msgs, /F06-root\.md: a topic file sits directly in its phase folder/);

  // tickets: only in tickets/, P<n>-T<nn>-slug.md, prefix = id, right phase
  msgs = errorsOf({
    ...valid,
    '01-basic/P1-T03-outside.md': fm({ id: 'P1-T03', type: 'ticket', title: 'x', status: 'planned', parent: 'P1-F01', updated: '2026-10-29' }),
    '01-basic/tickets/T04.md': fm({ id: 'P1-T04', type: 'ticket', title: 'x', status: 'planned', parent: 'P1-F01', updated: '2026-10-29' }),
    '01-basic/tickets/P1-T09-wrong.md': fm({ id: 'P1-T05', type: 'ticket', title: 'x', status: 'planned', parent: 'P1-F01', updated: '2026-10-29' }),
    '02-next/phase.md': fm({ id: 'P2', type: 'phase', title: 'x', status: 'auto', parent: 'PROJECT', updated: '2026-10-29' }),
    '02-next/tickets/P1-T06-elsewhere.md': fm({ id: 'P1-T06', type: 'ticket', title: 'x', status: 'planned', parent: 'P1-F01', updated: '2026-10-29' }),
  });
  assert.match(msgs, /P1-T03-outside\.md: a ticket file sits only in its phase's tickets\/ folder/);
  assert.match(msgs, /T04\.md: ticket file name must be P<n>-T<nn>-slug\.md .* e\.g\. P1-T04-t04\.md/);
  assert.match(msgs, /P1-T09-wrong\.md: file name starts with "P1-T09" but the id is P1-T05 — rename it P1-T05-<slug>\.md/);
  assert.match(msgs, /P1-T06-elsewhere\.md: ticket P1-T06 belongs in 01-<slug>\/tickets\/, not 02-next\/tickets\//);

  // nothing else at the top level: a second project node, a stray note
  msgs = errorsOf({ ...valid, 'overview.md': fm({ id: 'OTHER', type: 'project', title: 'x', status: 'auto', updated: '2026-10-29' }), 'scratch.md': '# just notes' });
  assert.match(msgs, /overview\.md: the project node is docs\/plan\/project\.md/);
  assert.match(msgs, /scratch\.md: no front matter — only plan files .* belong in the plan folder/);
  // FORMAT.md, README.md, dot files and non-.md files are not plan files and never errors
  assert.equal(build({ ...valid, 'README.md': 'about this folder', '01-basic/tickets/.gitkeep': '', '01-basic/diagram.png': 'binary', '.hidden/x.md': 'x' }).stats.errors, 0);
});

test('status suggests generating tickets when a phase is fully decided and has none', () => {
  const decided = {
    'project.md': valid['project.md'],
    '01-basic/phase.md': valid['01-basic/phase.md'],
    '01-basic/F01-signup.md': fm({ id: 'P1-F01', type: 'feature', title: 'Signup', status: 'auto', parent: 'P1', updated: '2026-10-29' },
      '## Points\n- [open] P1-F01-01: which provider?\n  > What: x\n'),
    '01-basic/tickets/.gitkeep': '',
    '02-flow/phase.md': fm({ id: 'P2', type: 'phase', title: 'Flow', status: 'auto', parent: 'PROJECT', updated: '2026-10-29' }),
    '02-flow/F01-steps.md': fm({ id: 'P2-F01', type: 'feature', title: 'Steps', status: 'auto', parent: 'P2', updated: '2026-10-29' },
      '## Points\n- [decided] P2-F01-01: three steps\n  > What: x\n  > Why: y\n- [caution] P2-F01-02: keep order\n  > What: x\n  > Why: y\n- [discussed] P2-F01-03: talked\n'),
    '02-flow/tickets/.gitkeep': '',
  };
  const g = build(decided);
  assert.equal(g.stats.errors, 0, JSON.stringify(g.issues));
  const out = formatStatus(g);
  // P1 still has an open question, but P2 is 100% decided with zero tickets — that is the next step
  assert.match(out, /P2 Flow .*all decided — no tickets yet/);
  assert.match(out, /👉 Suggested: generate tickets for P2 — every point is decided and it has no tickets yet \(\/thinkmap-tickets P2\)/);
  assert.match(formatStatus(g, { filter: 'P1' }), /👉 Suggested: discuss P1-F01-01/);
  // a phase with no points yet is not "decided"; a phase with a ticket is past this step
  assert.match(formatStatus(build({ ...decided, '02-flow/F01-steps.md': fm({ id: 'P2-F01', type: 'feature', title: 'Steps', status: 'auto', parent: 'P2', updated: '2026-10-29' }) })), /Suggested: discuss P1-F01-01/);
  assert.match(formatStatus(build({ ...decided, '02-flow/tickets/P2-T01-steps.md': fm({ id: 'P2-T01', type: 'ticket', title: 'Steps', status: 'planned', parent: 'P2-F01', implements: ['P2-F01-01'], updated: '2026-10-29' }) })), /Suggested: discuss P1-F01-01/);
});
