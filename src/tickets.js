// Which tickets belong to which topic, visible without opening every ticket file
// (FORMAT.md §1 and §6): the topic's short id in each ticket file name, and a
// `## Tickets` list in each topic file. `thinkmap tickets [--write]` keeps both in step.
import fs from 'node:fs';
import path from 'node:path';
import { TICKET_FILE_RE } from './init.js';

// "P2-F04" → "F04"; null when the parent is not a topic (a ticket may hang off a phase).
export const topicShortId = (parentId) => /^P\d+-(F\d+)$/.exec(String(parentId ?? ''))?.[1] ?? null;

// The file name a ticket should have, keeping the slug it already has. Null when the current
// name is not readable as a ticket file name (the validator reports that on its own).
export function expectedTicketFileName(currentName, id, parentId) {
  const m = TICKET_FILE_RE.exec(currentName);
  if (!m || m[1] !== id) return null;
  const f = topicShortId(parentId);
  return f ? `${id}-${f}-${m[3]}.md` : `${id}-${m[3]}.md`;
}

// One line per ticket: "- P2-T05 · Sprint model and lifecycle API · done"
export const ticketLine = (t) => `- ${t.id} · ${t.title} · ${t.status}`;
const LINE_RE = /^\s*[-*]\s+(P\d+-T\d+)\b(?:\s*·\s*(.*?))?\s*$/;

// The tickets a topic file lists under "## Tickets": [{ id, status }] or null when there is no such section.
export function listedTickets(sections) {
  const s = (sections || []).find((x) => /^tickets$/i.test(x.heading ?? ''));
  if (!s) return null;
  const out = [];
  for (const line of s.text.split('\n')) {
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const parts = (m[2] ?? '').split('·').map((x) => x.trim()).filter(Boolean);
    out.push({ id: m[1], status: parts.length >= 2 ? parts[parts.length - 1] : null });
  }
  return out;
}

// What is wrong with a topic's list, as short phrases; empty when it matches the tickets.
export function ticketListProblems(listed, tickets, byId) {
  const problems = [];
  const have = new Set(tickets.map((t) => t.id));
  const named = new Set((listed || []).map((x) => x.id));
  const missing = tickets.filter((t) => !named.has(t.id)).map((t) => t.id);
  if (missing.length) problems.push(`missing ${missing.join(', ')}`);
  for (const x of listed || []) {
    if (have.has(x.id)) {
      const t = tickets.find((y) => y.id === x.id);
      if (x.status && x.status !== t.status) problems.push(`${x.id} says ${x.status}, the ticket is ${t.status}`);
      continue;
    }
    const other = byId.get(x.id);
    problems.push(other ? `${x.id} belongs to ${other.parent ?? 'no topic'}` : `${x.id} does not exist`);
  }
  return problems;
}

// Replace the "## Tickets" section of a topic file (or add one at the end) with `lines`.
export function writeTicketsSection(text, lines) {
  const block = `## Tickets\n\n${lines.join('\n')}\n`;
  const rows = text.split('\n');
  let fence = false;
  let start = -1;
  let end = rows.length;
  for (let i = 0; i < rows.length; i++) {
    if (/^\s*(```|~~~)/.test(rows[i])) fence = !fence;
    if (fence || !/^##\s+/.test(rows[i])) continue;
    if (start >= 0) { end = i; break; }
    if (/^##\s+tickets\s*$/i.test(rows[i])) start = i;
  }
  if (start < 0) return `${text.replace(/\s*$/, '')}\n\n${block}`;
  const before = rows.slice(0, start).join('\n');
  const after = rows.slice(end).join('\n');
  return `${before}${before ? '\n' : ''}${block}${after ? `\n${after}` : ''}`;
}

// Everything `thinkmap tickets --write` would change, from a built graph.
export function planTicketSync(graph) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const abs = (f) => path.resolve(graph.root, f);
  const renames = [];
  for (const t of graph.nodes.filter((n) => n.type === 'ticket')) {
    const name = path.basename(t.file);
    const want = expectedTicketFileName(name, t.id, t.parent);
    if (!want || want === name) continue;
    const to = path.join(path.dirname(abs(t.file)), want);
    renames.push({ id: t.id, from: abs(t.file), to, blocked: fs.existsSync(to) });
  }
  const lists = [];
  for (const f of graph.nodes.filter((n) => n.type === 'feature')) {
    const tickets = f.children.map((id) => byId.get(id)).filter((n) => n?.type === 'ticket');
    const listed = listedTickets(f.sections);
    if (!tickets.length && !listed) continue;
    const problems = listed ? ticketListProblems(listed, tickets, byId) : [`no list yet (${tickets.length} ticket${tickets.length === 1 ? '' : 's'})`];
    if (problems.length) lists.push({ id: f.id, file: abs(f.file), lines: tickets.map(ticketLine), problems });
  }
  return { renames, lists };
}

export function applyTicketSync(plan) {
  const done = { renamed: [], skipped: [], lists: [] };
  for (const r of plan.renames) {
    if (r.blocked) { done.skipped.push(r); continue; }
    fs.renameSync(r.from, r.to);
    done.renamed.push(r);
  }
  for (const l of plan.lists) {
    fs.writeFileSync(l.file, writeTicketsSection(fs.readFileSync(l.file, 'utf8'), l.lines));
    done.lists.push(l);
  }
  return done;
}
