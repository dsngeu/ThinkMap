// Reads one plan Markdown file: front matter (small YAML subset) + body sections + discussion points.
// Zero dependencies on purpose, so the tool drops into any project.
import fs from 'node:fs';
import path from 'node:path';

export const STATUSES = ['to-discuss', 'discussing', 'decided', 'planned', 'in-progress', 'blocked', 'done', 'dropped'];
export const TYPES = ['project', 'phase', 'feature', 'ticket'];

// Kinds of discussion point — the six "mental buckets" of a topic.
export const KINDS = ['discussed', 'decided', 'open', 'suggestion', 'caution', 'dropped'];
// Older plan files used statuses in the brackets; map them so they keep working.
export const LEGACY_KIND = { 'to-discuss': 'open', discussing: 'open', planned: 'decided', 'in-progress': 'decided', done: 'decided', blocked: 'caution' };
// How each kind counts in status roll-ups.
export const KIND_STATUS = { discussed: 'decided', decided: 'decided', open: 'to-discuss', suggestion: 'to-discuss', caution: 'decided', dropped: 'dropped' };

// Docs about the format itself, not plan nodes.
const IGNORED_FILES = new Set(['FORMAT.md', 'README.md']);

export function listMarkdownFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.endsWith('.md') && !IGNORED_FILES.has(e.name)) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

export function splitFrontMatter(text) {
  const m = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return null;
  return { yaml: m[1], body: text.slice(m[0].length) };
}

function parseValue(raw) {
  let v = raw.trim();
  if (v.startsWith('"') || v.startsWith("'")) {
    const end = v.indexOf(v[0], 1);
    if (end > 0) return v.slice(1, end);
  }
  v = v.startsWith('#') ? '' : v.replace(/\s+#.*$/, '').trim(); // strip "  # comment"
  if (v === '' || v === '~' || v === 'null') return null;
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    return inner ? inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];
  }
  return v;
}

// Supports: `key: value`, `key: [a, b]`, `key:` followed by `  - item` lines, `# comments`.
export function parseYamlSubset(yaml) {
  const data = {};
  const errors = [];
  const emptyKeys = new Set();
  let listKey = null;
  yaml.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || /^\s*#/.test(line)) return;
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && listKey) {
      const v = parseValue(item[1]);
      if (v !== null) data[listKey].push(v);
      return;
    }
    const kv = /^([A-Za-z_][\w-]*)\s*:(.*)$/.exec(line);
    if (!kv) {
      errors.push(`front matter line ${i + 2}: cannot read "${line.trim()}"`);
      listKey = null;
      return;
    }
    const v = parseValue(kv[2]);
    if (v === null) {
      data[kv[1]] = [];
      emptyKeys.add(kv[1]);
      listKey = kv[1];
    } else {
      data[kv[1]] = v;
      listKey = null;
    }
  });
  for (const k of emptyKeys) if (data[k].length === 0) data[k] = null;
  return { data, errors };
}

// "- [kind 2026-10-29 claude] P1-F02-01: text" — date and source inside the brackets are optional.
const POINT_RE = /^[-*]\s+\[([^\]]+)\]\s+(P\d+-F\d+-\d+)\s*:\s*(.+?)\s*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseBracket(raw) {
  const tokens = raw.trim().split(/\s+/);
  const kindRaw = tokens.shift() ?? '';
  let date = null;
  let from = null;
  for (const t of tokens) {
    if (DATE_RE.test(t)) date = t;
    else from = t;
  }
  return { kindRaw, kind: LEGACY_KIND[kindRaw] ?? kindRaw, date, from };
}
const CHECK_RE = /^\s*[-*]\s+\[([ xX])\]\s+/;

export function parseBody(body, firstLine = 1) {
  const sections = [];
  const points = [];
  let cur = { heading: null, lines: [] };
  let fence = false;
  let lastPoint = null;
  let lineNo = firstLine - 1;

  for (const line of body.split(/\r?\n/)) {
    lineNo++;
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const h = !fence && /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      sections.push(cur);
      cur = { heading: h[1], lines: [] };
      lastPoint = null;
      continue;
    }
    if (!fence && cur.heading && /^points$/i.test(cur.heading)) {
      const pm = POINT_RE.exec(line);
      if (pm) {
        lastPoint = { ...parseBracket(pm[1]), id: pm[2], title: pm[3], notes: [], line: lineNo };
        points.push(lastPoint);
      } else if (lastPoint && /^\s+>/.test(line)) {
        lastPoint.notes.push(line.replace(/^\s+>\s?/, ''));
      } else if (line.trim()) {
        lastPoint = null;
      }
    }
    cur.lines.push(line);
  }
  sections.push(cur);

  const out = sections
    .map((s) => ({ heading: s.heading, text: s.lines.join('\n').trim() }))
    .filter((s) => s.heading || s.text);

  const ac = out.find((s) => /^acceptance criteria$/i.test(s.heading ?? ''));
  let checklist = null;
  if (ac) {
    checklist = { done: 0, total: 0 };
    for (const l of ac.text.split('\n')) {
      const m = CHECK_RE.exec(l);
      if (m) {
        checklist.total++;
        if (m[1] !== ' ') checklist.done++;
      }
    }
  }

  const log = out.find((s) => /^handoff log$/i.test(s.heading ?? ''));
  const handoff = log
    ? log.text.split('\n').filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, ''))
    : [];

  return { sections: out, points, checklist, handoff };
}

export function parsePlanFile(text) {
  const fm = splitFrontMatter(text);
  if (!fm) return null;
  const { data, errors } = parseYamlSubset(fm.yaml);
  const bodyStart = (text.slice(0, text.length - fm.body.length).match(/\n/g) || []).length + 1;
  return { data, errors, ...parseBody(fm.body, bodyStart) };
}
