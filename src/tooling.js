// Scans the project's own Claude Code tooling — agents, skills (and legacy commands) and
// hooks — so the viewer can show what runs automatically in this repo.
//
// Project-only on purpose: `<root>/.claude/` plus, when the project is itself a Claude Code
// plugin (`.claude-plugin/plugin.json`), the plugin layout at the root. User-level
// `~/.claude` and installed plugins are never read — they differ per person.
//
// Read-only and tolerant: name, description, trigger, path. Anything unrecognised is
// still listed with its file. Hook commands are displayed, never run.
import fs from 'node:fs';
import path from 'node:path';
import { splitFrontMatter, parseYamlSubset } from './parse.js';

const BODY_LIMIT = 30_000; // characters of Markdown body kept per item
const HOOK_FILES = ['.claude/settings.json', '.claude/settings.local.json'];
const PLUGIN_MANIFEST = '.claude-plugin/plugin.json';

const toList = (v) => (v == null ? [] : (Array.isArray(v) ? v : String(v).split(',')).map((s) => String(s).trim()).filter(Boolean));
const truthy = (v) => v === true || /^(true|yes)$/i.test(String(v ?? ''));
const falsy = (v) => v === false || /^(false|no)$/i.test(String(v ?? ''));

// Front matter with `key: |` / `key: >` block scalars folded in, then the simple subset parser.
export function parseToolFrontMatter(text) {
  const fm = splitFrontMatter(text);
  if (!fm) return { data: {}, body: text.trim(), hasFrontMatter: false };
  const lines = fm.yaml.split(/\r?\n/);
  const simple = [];
  const blocks = {};
  for (let i = 0; i < lines.length; i++) {
    const m = /^([A-Za-z_][\w-]*)\s*:\s*([|>])[-+]?\s*$/.exec(lines[i]);
    if (!m) { simple.push(lines[i]); continue; }
    const buf = [];
    while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || !lines[i + 1].trim())) buf.push(lines[++i]);
    const indent = Math.min(...buf.filter((l) => l.trim()).map((l) => /^\s*/.exec(l)[0].length), Infinity);
    const body = buf.map((l) => l.slice(Math.min(indent, l.length))).join('\n').trim();
    blocks[m[1]] = m[2] === '>' ? body.replace(/\n(?!\n)/g, ' ') : body;
  }
  const { data } = parseYamlSubset(simple.join('\n'));
  return { data: { ...data, ...blocks }, body: fm.body.trim(), hasFrontMatter: true };
}

const firstParagraph = (body) => {
  const para = body.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !p.startsWith('#'));
  return para ? para.replace(/\s+/g, ' ').slice(0, 300) : '';
};
const meta = (data, skip) => Object.fromEntries(Object.entries(data).filter(([k, v]) => !skip.has(k) && v != null && v !== '').map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)]));

function listFiles(dir, pred, depth = 3) {
  const out = [];
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return out;
  const walk = (d, lvl) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (lvl < depth && !e.name.startsWith('.') && e.name !== 'node_modules') walk(p, lvl + 1); }
      else if (e.isFile() && pred(p)) out.push(p);
    }
  };
  walk(dir, 0);
  return out.sort();
}

export function scanTooling(root) {
  const abs = path.resolve(root);
  const rel = (f) => path.relative(abs, f).split(path.sep).join('/');
  const items = [];
  const notes = [];
  const seen = new Set();
  const add = (item) => {
    if (seen.has(item.id)) item.id += `~${rel(item.file)}`;
    seen.add(item.id);
    items.push(item);
  };
  const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { notes.push(`cannot read ${rel(f)}: ${e.message}`); return null; } };
  const isPlugin = fs.existsSync(path.join(abs, PLUGIN_MANIFEST));
  const bases = [{ dir: path.join(abs, '.claude'), source: 'project' }];
  if (isPlugin) bases.push({ dir: abs, source: 'plugin' });

  for (const { dir, source } of bases) {
    // Agents: <base>/agents/**/*.md
    for (const f of listFiles(path.join(dir, 'agents'), (p) => p.endsWith('.md'))) {
      const text = read(f); if (text === null) continue;
      const { data, body, hasFrontMatter } = parseToolFrontMatter(text);
      const name = String(data.name || path.basename(f, '.md'));
      add({
        id: `tool:agent:${name}`, group: 'agent', name, source,
        description: String(data.description || firstParagraph(body) || ''),
        trigger: 'Subagent — Claude delegates to it when a task matches its description',
        file: rel(f), line: 1, body: body.slice(0, BODY_LIMIT), recognised: hasFrontMatter && Boolean(data.description),
        tools: toList(data.tools), model: data.model ? String(data.model) : null,
        meta: meta(data, new Set(['name', 'description', 'tools', 'model'])),
      });
    }
    // Skills: <base>/skills/<name>/SKILL.md
    for (const f of listFiles(path.join(dir, 'skills'), (p) => path.basename(p) === 'SKILL.md')) {
      const text = read(f); if (text === null) continue;
      const { data, body, hasFrontMatter } = parseToolFrontMatter(text);
      const name = String(data.name || path.basename(path.dirname(f)));
      const slash = !falsy(data['user-invocable']);
      const auto = !truthy(data['disable-model-invocation']);
      add({
        id: `tool:skill:${name}`, group: 'skill', name, source, slash: slash ? `/${name}` : null,
        description: String(data.description || firstParagraph(body) || ''),
        trigger: slash && auto ? `Type /${name}, or Claude uses it on its own when the task matches` : slash ? `Type /${name} (Claude never starts it on its own)` : 'Automatic — Claude uses it when the task matches its description',
        file: rel(f), line: 1, body: body.slice(0, BODY_LIMIT), recognised: hasFrontMatter && Boolean(data.description),
        tools: toList(data['allowed-tools']), model: data.model ? String(data.model) : null,
        meta: meta(data, new Set(['name', 'description', 'allowed-tools', 'model', 'user-invocable', 'disable-model-invocation'])),
      });
    }
    // Legacy slash commands: <base>/commands/**/*.md  (sub-folder = namespace: /dir:name)
    const cmdDir = path.join(dir, 'commands');
    for (const f of listFiles(cmdDir, (p) => p.endsWith('.md'))) {
      const text = read(f); if (text === null) continue;
      const { data, body } = parseToolFrontMatter(text);
      const parts = path.relative(cmdDir, f).split(path.sep);
      const name = [...parts.slice(0, -1), path.basename(f, '.md')].join(':');
      add({
        id: `tool:skill:${name}`, group: 'skill', name, source, slash: `/${name}`,
        description: String(data.description || firstParagraph(body) || ''),
        trigger: `Type /${name}${data['argument-hint'] ? ` ${data['argument-hint']}` : ''} (command file)`,
        file: rel(f), line: 1, body: body.slice(0, BODY_LIMIT), recognised: true,
        tools: toList(data['allowed-tools']), model: data.model ? String(data.model) : null,
        meta: meta(data, new Set(['name', 'description', 'allowed-tools', 'model', 'argument-hint'])),
      });
    }
  }

  // Hooks: settings files (project) and hooks/hooks.json (plugin). Displayed, never executed.
  const hookFiles = HOOK_FILES.map((f) => ({ f: path.join(abs, f), source: 'project' }));
  if (isPlugin) hookFiles.push({ f: path.join(abs, 'hooks', 'hooks.json'), source: 'plugin' });
  for (const { f, source } of hookFiles) {
    if (!fs.existsSync(f)) continue;
    const text = read(f); if (text === null) continue;
    let json;
    try { json = JSON.parse(text); } catch (e) { notes.push(`${rel(f)} is not valid JSON (${e.message}) — hooks in it are not shown`); continue; }
    const hooks = json && typeof json === 'object' && json.hooks && typeof json.hooks === 'object' ? json.hooks : null;
    if (!hooks) continue;
    for (const [event, groups] of Object.entries(hooks)) {
      if (!Array.isArray(groups)) continue;
      groups.forEach((g, gi) => {
        const matcher = g && g.matcher ? String(g.matcher) : '';
        const list = g && Array.isArray(g.hooks) ? g.hooks : [];
        list.forEach((h, hi) => {
          const type = String(h?.type || 'command');
          const text = String(h?.command ?? h?.prompt ?? '');
          const short = text.replace(/\s+/g, ' ').trim();
          const line = lineOf(text && h?.command ? h.command : null, textLines(f));
          add({
            id: `tool:hook:${event}:${gi}.${hi}:${rel(f)}`, group: 'hook', source,
            name: `${event}${matcher ? ` · ${matcher}` : ''}`,
            description: short.length > 160 ? `${short.slice(0, 157)}…` : short,
            trigger: `Runs ${describeEvent(event)}${matcher ? ` for tools matching "${matcher}"` : ''}`,
            file: rel(f), line, body: '', recognised: Boolean(text),
            event, matcher: matcher || null, hookType: type, command: h?.command ? String(h.command) : null, prompt: h?.prompt ? String(h.prompt) : null,
            timeout: h?.timeout != null ? Number(h.timeout) : null, tools: [], model: null,
            meta: meta(h ?? {}, new Set(['type', 'command', 'prompt', 'timeout'])),
          });
        });
      });
    }
  }

  const count = (g) => items.filter((i) => i.group === g).length;
  return {
    root: isPlugin ? '.claude/ + plugin layout' : '.claude/',
    scanned: bases.map((b) => rel(b.dir) || '.'),
    isPlugin,
    counts: { agents: count('agent'), skills: count('skill'), hooks: count('hook') },
    items,
    notes,
  };
}

const EVENTS = {
  PreToolUse: 'before a tool call', PostToolUse: 'after a tool call', UserPromptSubmit: 'when you send a prompt', Notification: 'when Claude sends a notification',
  Stop: 'when Claude finishes a turn', SubagentStop: 'when a subagent finishes', PreCompact: 'before context is compacted', SessionStart: 'at the start of a session', SessionEnd: 'at the end of a session',
};
const describeEvent = (e) => EVENTS[e] || `on ${e}`;
const textLines = (f) => { try { return fs.readFileSync(f, 'utf8').split(/\r?\n/); } catch { return []; } };
const lineOf = (needle, lines) => {
  if (!needle) return 1;
  const probe = JSON.stringify(needle).slice(1, 40);
  const i = lines.findIndex((l) => l.includes(probe));
  return i >= 0 ? i + 1 : 1;
};
