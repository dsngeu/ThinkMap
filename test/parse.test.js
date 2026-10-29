import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYamlSubset, parseBody, parsePlanFile, splitFrontMatter, parseBracket } from '../src/parse.js';

test('front matter: scalars, inline lists, block lists, comments, quotes', () => {
  const { data, errors } = parseYamlSubset([
    'id: P1-T01   # the id',
    'title: "Signup # API"',
    'depends_on: [P1-T00, "P1-T02"]',
    'labels:',
    '  - auth',
    '  - backend',
    'owner:',
    'code: []',
  ].join('\n'));
  assert.deepEqual(errors, []);
  assert.equal(data.id, 'P1-T01');
  assert.equal(data.title, 'Signup # API');
  assert.deepEqual(data.depends_on, ['P1-T00', 'P1-T02']);
  assert.deepEqual(data.labels, ['auth', 'backend']);
  assert.equal(data.owner, null);
  assert.deepEqual(data.code, []);
});

test('front matter: unreadable line is reported', () => {
  const { errors } = parseYamlSubset('id: P1\nthis is not yaml');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /line 3/);
});

test('no front matter → null', () => {
  assert.equal(splitFrontMatter('# just a doc'), null);
  assert.equal(parsePlanFile('# just a doc'), null);
});

test('points: status, id, title and decision notes', () => {
  const { points } = parseBody([
    '## Points',
    '- [decided] P1-F01-01: Link valid 24h',
    '  > Decision: hashed token',
    '  > Resend after 60s',
    '- [to-discuss] P1-F01-02: Phone number?',
    '',
    '## Other',
    '- [decided] P1-F01-99: not a point (wrong section)',
  ].join('\n'));
  assert.equal(points.length, 2);
  assert.deepEqual(points[0], { kindRaw: 'decided', kind: 'decided', date: null, from: null, id: 'P1-F01-01', title: 'Link valid 24h', notes: ['Decision: hashed token', 'Resend after 60s'], line: 2 });
  assert.equal(points[1].kind, 'open'); // legacy "to-discuss" maps to open
});

test('points know their line number in the file', () => {
  const text = '---\nid: P1-F01\ntype: feature\n---\n\n## Points\n- [open] P1-F01-01: first\n  > note\n- [decided] P1-F01-02: second\n';
  const { points } = parsePlanFile(text);
  assert.equal(points[0].line, 7);
  assert.equal(points[1].line, 9);
});

test('bracket: kind + optional date + optional source', () => {
  assert.deepEqual(parseBracket('suggestion 2026-10-29 claude'), { kindRaw: 'suggestion', kind: 'suggestion', date: '2026-10-29', from: 'claude' });
  assert.deepEqual(parseBracket('caution'), { kindRaw: 'caution', kind: 'caution', date: null, from: null });
  assert.deepEqual(parseBracket('done 2026-10-01'), { kindRaw: 'done', kind: 'decided', date: '2026-10-01', from: null });
  const { points } = parseBody('## Points\n- [open 2026-10-29 deepak] P1-F02-09: Password rules?\n');
  assert.equal(points[0].kind, 'open');
  assert.equal(points[0].date, '2026-10-29');
  assert.equal(points[0].from, 'deepak');
});

test('points inside code fences are ignored', () => {
  const { points } = parseBody('## Points\n```\n- [decided] P1-F01-01: example\n```\n');
  assert.equal(points.length, 0);
});

test('acceptance criteria checklist and handoff log', () => {
  const b = parseBody([
    '## Acceptance criteria',
    '- [x] endpoint',
    '- [ ] email',
    '- [X] test',
    '## Handoff log',
    '- 2026-10-29 · backend-dev · started',
  ].join('\n'));
  assert.deepEqual(b.checklist, { done: 2, total: 3 });
  assert.deepEqual(b.handoff, ['2026-10-29 · backend-dev · started']);
});
