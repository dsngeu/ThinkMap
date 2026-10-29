import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanTooling, parseToolFrontMatter } from '../src/tooling.js';
import { buildGraph } from '../src/graph.js';
import { formatStatus } from '../src/status.js';

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thinkmap-tool-'));
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), body);
  }
  return dir;
}

const project = {
  '.claude/agents/reviewer.md': '---\nname: reviewer\ndescription: |\n  Reviews a diff for bugs.\n  Never edits files.\ntools: Read, Grep\nmodel: sonnet\n---\n# Reviewer\n\nYou review code.\n',
  '.claude/skills/deploy/SKILL.md': '---\nname: deploy\ndescription: "Deploys the app. Use when the user says deploy."\nallowed-tools: [Bash, Read]\n---\n## Steps\n1. build\n',
  '.claude/skills/format/SKILL.md': '---\nname: format\ndescription: Formats plan files\nuser-invocable: false\n---\nbody\n',
  '.claude/skills/manual/SKILL.md': '---\nname: manual\ndescription: Only by hand\ndisable-model-invocation: true\n---\nbody\n',
  '.claude/commands/ops/restart.md': '---\ndescription: Restart the service\nargument-hint: "<service>"\n---\nRestart $ARGUMENTS\n',
  '.claude/commands/plain.md': 'Just a prompt with no front matter.\n\nSecond paragraph.\n',
  '.claude/settings.json': JSON.stringify({
    permissions: { allow: ['Bash(npm test)'] },
    hooks: {
      PostToolUse: [{ matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'node bin/thinkmap.js validate --quiet', timeout: 10 }] }],
      SessionStart: [{ hooks: [{ type: 'command', command: 'node bin/thinkmap.js status' }, { type: 'prompt', prompt: 'Summarise the plan' }] }],
    },
  }, null, 2),
  '.claude/settings.local.json': '{ not json',
  'docs/plan/project.md': '---\nid: PROJECT\ntype: project\ntitle: Demo\nstatus: auto\nupdated: 2026-10-29\n---\n',
};

test('front matter: block scalars, quoted strings, lists', () => {
  const r = parseToolFrontMatter('---\nname: x\ndescription: >\n  one\n  two\ntools: [A, B]\n---\nbody');
  assert.equal(r.data.description, 'one two');
  assert.deepEqual(r.data.tools, ['A', 'B']);
  assert.equal(r.body, 'body');
  assert.equal(parseToolFrontMatter('no front matter').hasFrontMatter, false);
});

test('scans project agents, skills, commands and hooks; never user-level', () => {
  const t = scanTooling(fixture(project));
  assert.deepEqual(t.counts, { agents: 1, skills: 5, hooks: 3 });
  assert.deepEqual(t.scanned, ['.claude']);
  assert.equal(t.isPlugin, false);

  const agent = t.items.find((i) => i.group === 'agent');
  assert.equal(agent.name, 'reviewer');
  assert.equal(agent.description, 'Reviews a diff for bugs.\nNever edits files.');
  assert.deepEqual(agent.tools, ['Read', 'Grep']);
  assert.equal(agent.model, 'sonnet');
  assert.equal(agent.file, '.claude/agents/reviewer.md');
  assert.match(agent.body, /You review code/);

  const byName = Object.fromEntries(t.items.filter((i) => i.group === 'skill').map((i) => [i.name, i]));
  assert.equal(byName.deploy.slash, '/deploy');
  assert.match(byName.deploy.trigger, /Type \/deploy, or Claude uses it on its own/);
  assert.deepEqual(byName.deploy.tools, ['Bash', 'Read']);
  assert.equal(byName.format.slash, null);
  assert.match(byName.format.trigger, /^Automatic/);
  assert.match(byName.manual.trigger, /never starts it on its own/);
  assert.equal(byName['ops:restart'].slash, '/ops:restart');
  assert.match(byName['ops:restart'].trigger, /<service>/);
  assert.equal(byName.plain.description, 'Just a prompt with no front matter.');

  const hooks = t.items.filter((i) => i.group === 'hook');
  assert.equal(hooks[0].name, 'PostToolUse · Edit|Write');
  assert.equal(hooks[0].command, 'node bin/thinkmap.js validate --quiet');
  assert.equal(hooks[0].timeout, 10);
  assert.match(hooks[0].trigger, /after a tool call for tools matching "Edit\|Write"/);
  assert.ok(hooks[0].line > 1, 'hook points at its line in settings.json');
  assert.equal(hooks[2].hookType, 'prompt');
  assert.equal(hooks[2].prompt, 'Summarise the plan');

  assert.equal(t.notes.length, 1);
  assert.match(t.notes[0], /settings\.local\.json is not valid JSON/);
});

test('plugin layout at the root is included when .claude-plugin/plugin.json exists', () => {
  const t = scanTooling(fixture({
    '.claude-plugin/plugin.json': '{"name":"thinkmap"}',
    'skills/thinkmap-status/SKILL.md': '---\nname: thinkmap-status\ndescription: Plan summary\n---\n',
    'agents/helper.md': '# Helper\n\nDoes things.\n',
    'hooks/hooks.json': '{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"echo hi"}]}]}}',
  }));
  assert.equal(t.isPlugin, true);
  assert.deepEqual(t.counts, { agents: 1, skills: 1, hooks: 1 });
  assert.equal(t.items.find((i) => i.group === 'agent').recognised, false); // no front matter → still listed
  assert.equal(t.items.find((i) => i.group === 'agent').description, 'Does things.');
  assert.ok(t.items.every((i) => i.source === 'plugin'));
});

test('empty project yields empty tooling without errors', () => {
  const t = scanTooling(fixture({ 'README.md': 'x' }));
  assert.deepEqual(t.counts, { agents: 0, skills: 0, hooks: 0 });
  assert.deepEqual(t.items, []);
});

test('buildGraph embeds tooling without adding nodes or issues; status mentions it', () => {
  const dir = fixture(project);
  const g = buildGraph(path.join(dir, 'docs/plan'), { repoRoot: dir, commits: [] });
  assert.equal(g.stats.errors, 0);
  assert.deepEqual(g.tooling.counts, { agents: 1, skills: 5, hooks: 3 });
  assert.deepEqual(g.stats.tooling, { agents: 1, skills: 5, hooks: 3 });
  assert.ok(g.nodes.every((n) => !n.id.startsWith('tool:')));
  assert.match(formatStatus(g), /TOOLING.*1 agent.*5 skills.*3 hooks/);
});
