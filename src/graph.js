// Turns a plan folder into { nodes, edges, issues }: validation, auto statuses,
// progress roll-ups and links to git commits that mention node IDs.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { listMarkdownFiles, parsePlanFile, STATUSES, TYPES, KINDS, KIND_STATUS } from './parse.js';
import { scanTooling } from './tooling.js';
import { formatCopyStatus, TEMPLATE_VERSION, PHASE_DIR_RE, FEATURE_FILE_RE, TICKET_FILE_RE, phaseFolderNumber } from './init.js';
import { cliCommand } from './update.js';

const ID_RULES = {
  project: /^[A-Z][A-Z0-9_-]*$/,
  phase: /^P\d+$/,
  feature: /^P\d+-F\d+$/,
  ticket: /^P\d+-T\d+$/,
};
const PARENT_TYPES = { phase: ['project'], feature: ['phase'], ticket: ['feature', 'phase'] };
const AUTO_TYPES = new Set(['project', 'phase', 'feature']);
// Point kinds that count towards "decided" progress; 'discussed' notes don't count either way.
const SETTLED_KINDS = new Set(['decided', 'caution']);
const COUNTED_KINDS = new Set(['decided', 'caution', 'open', 'suggestion']);

export const naturalCompare = (a, b) => a.localeCompare(b, 'en', { numeric: true });
const toList = (v) => (v == null ? [] : (Array.isArray(v) ? v : [v]).map(String).filter(Boolean));

// Status of a parent computed from its children (used for `status: auto`).
export function aggregateStatus(statuses) {
  const s = statuses.filter((x) => x !== 'dropped');
  const any = (x) => s.includes(x);
  if (!s.length) return 'to-discuss';
  if (s.every((x) => x === 'done')) return 'done';
  if (any('in-progress') || any('done')) return 'in-progress';
  if (any('blocked')) return 'blocked';
  if (any('discussing')) return 'discussing';
  if (any('to-discuss')) return any('decided') || any('planned') ? 'discussing' : 'to-discuss';
  if (any('planned')) return 'planned';
  return 'decided';
}

export function findRepoRoot(dir) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export function readCommits(repoRoot, limit = 2000) {
  if (!repoRoot) return [];
  try {
    const out = execFileSync('git', ['log', `-n${limit}`, '--date=short', '--pretty=format:%h%x1f%an%x1f%ad%x1f%s'], {
      cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024,
    });
    return out.split('\n').filter(Boolean).map((l) => {
      const [hash, author, date, subject] = l.split('\x1f');
      return { hash, author, date, subject };
    });
  } catch {
    return []; // not a repo, or no commits yet
  }
}

// IDs inside square brackets: "feat: x [P1-T01]" or "[P1-T01, P1-T02]".
export function commitIds(subject) {
  const ids = new Set();
  for (const m of subject.matchAll(/\[([^\]]+)\]/g)) {
    for (const id of m[1].matchAll(/P\d+-(?:T\d+|F\d+(?:-\d+)?)/g)) ids.add(id[0]);
  }
  return [...ids];
}

export function buildGraph(planDir, opts = {}) {
  const absDir = path.resolve(planDir);
  const issues = [];
  const repoRoot = opts.repoRoot !== undefined ? opts.repoRoot : findRepoRoot(absDir);
  const base = repoRoot || absDir;
  const rel = (f) => path.relative(base, f).split(path.sep).join('/') || '.';
  const issue = (level, file, id, message) => issues.push({ level, file, id: id ?? null, message });
  const result = { version: 1, generatedAt: new Date().toISOString(), root: base, planDir: rel(absDir), project: null, nodes: [], edges: [], issues, stats: {}, tooling: null };

  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    issue('error', rel(absDir), null, 'plan folder not found');
    return result;
  }

  // 1. Read files → nodes
  const nodes = new Map();
  const add = (node) => {
    if (nodes.has(node.id)) {
      issue('error', node.file, node.id, `duplicate id "${node.id}" (first defined in ${nodes.get(node.id).file})`);
      return false;
    }
    nodes.set(node.id, node);
    return true;
  };

  const files = listMarkdownFiles(absDir);
  if (!files.length) issue('warning', rel(absDir), null, 'no plan files yet — see FORMAT.md');

  // The copy of FORMAT.md left by `init` must match the bundled rules, or people and sessions
  // without Thinkmap follow a format the validator no longer accepts.
  const fc = formatCopyStatus(absDir);
  if (fc.exists && !fc.upToDate) {
    const where = rel(absDir) === 'docs/plan' ? '' : ` ${rel(absDir)}`;
    issue('warning', rel(fc.file), null, `this copy of the format rules differs from the ones bundled with Thinkmap ${TEMPLATE_VERSION} (the validator and the plugin follow the bundled rules) — refresh it: ${cliCommand()} format --write${where}`);
  }

  // Layout rules (FORMAT.md §1): one folder per phase, named NN-slug, each holding phase.md
  // and a tickets/ folder. The tree is created by `thinkmap phase` / `init`; this only checks it.
  const phaseDirs = new Map(); // folder name → { nn }
  for (const e of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('.') || e.name === 'node_modules') continue;
    const m = PHASE_DIR_RE.exec(e.name);
    const r = rel(path.join(absDir, e.name));
    if (!m) {
      issue('error', r, null, `folder "${e.name}" is not a phase folder — phases are named NN-slug (e.g. 01-basic); nothing else lives at the top of the plan folder`);
      continue;
    }
    phaseDirs.set(e.name, { nn: String(parseInt(m[1], 10)).padStart(2, '0') });
    if (!fs.existsSync(path.join(absDir, e.name, 'phase.md'))) issue('error', r, null, `phase folder has no phase.md (create the phase with: ${cliCommand()} phase P${parseInt(m[1], 10)} <slug>)`);
    const tk = path.join(absDir, e.name, 'tickets');
    if (!fs.existsSync(tk) || !fs.statSync(tk).isDirectory()) issue('error', r, null, `phase folder has no tickets/ folder — add ${e.name}/tickets/.gitkeep so git keeps it before the first ticket (${cliCommand()} phase P${parseInt(m[1], 10)} <slug> does this)`);
  }
  // Where a file of a given type may sit and what it must be called. Returns an error message or null.
  const placement = (file, type, id) => {
    const parts = path.relative(absDir, file).split(path.sep);
    const name = parts[parts.length - 1];
    const folder = parts[0];
    const inPhase = parts.length >= 2 && phaseDirs.has(folder);
    const nn = inPhase ? phaseDirs.get(folder).nn : null;
    const own = (pid) => phaseFolderNumber(pid);
    switch (type) {
      case 'project':
        return parts.length === 1 && name === 'project.md' ? null : 'the project node is docs/plan/project.md — nothing else may be type: project';
      case 'phase':
        if (!(inPhase && parts.length === 2 && name === 'phase.md')) return `a phase file is <NN-slug>/phase.md, not ${parts.join('/')}`;
        return nn === own(id) ? null : `phase ${id} belongs in folder ${own(id)}-<slug>, not ${folder}/`;
      case 'feature': {
        if (!(inPhase && parts.length === 2)) return `a topic file sits directly in its phase folder (<NN-slug>/F<nn>-slug.md), not ${parts.join('/')}`;
        const m = FEATURE_FILE_RE.exec(name);
        if (!m) return `topic file name must be F<nn>-slug.md (lowercase words joined by "-"), e.g. ${id.split('-')[1]}-${name.replace(/\.md$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'topic'}.md`;
        if (m[1] !== id.split('-')[1]) return `file name starts with "${m[1]}" but the id is ${id} — rename it ${id.split('-')[1]}-<slug>.md`;
        return nn === own(id.split('-')[0]) ? null : `topic ${id} belongs in phase folder ${own(id.split('-')[0])}-<slug>, not ${folder}/`;
      }
      case 'ticket': {
        if (!(inPhase && parts.length === 3 && parts[1] === 'tickets')) return `a ticket file sits only in its phase's tickets/ folder (<NN-slug>/tickets/P<n>-T<nn>-slug.md), not ${parts.join('/')}`;
        const m = TICKET_FILE_RE.exec(name);
        if (!m) return `ticket file name must be P<n>-T<nn>-slug.md (lowercase words joined by "-"), e.g. ${id}-${name.replace(/\.md$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'work'}.md`;
        if (m[1] !== id) return `file name starts with "${m[1]}" but the id is ${id} — rename it ${id}-<slug>.md`;
        return nn === own(id.split('-')[0]) ? null : `ticket ${id} belongs in ${own(id.split('-')[0])}-<slug>/tickets/, not ${folder}/tickets/`;
      }
      default:
        return null;
    }
  };

  for (const file of files) {
    const r = rel(file);
    let parsed;
    try {
      parsed = parsePlanFile(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      issue('error', r, null, `cannot read file: ${e.message}`);
      continue;
    }
    if (!parsed) {
      issue('error', r, null, 'no front matter — only plan files (project.md, phase.md, F<nn>-*.md, tickets/P<n>-T<nn>-*.md) and FORMAT.md belong in the plan folder; move notes elsewhere');
      continue;
    }
    const d = parsed.data;
    const id = d.id != null ? String(d.id) : null;
    for (const m of parsed.errors) issue('error', r, id, m);
    for (const k of ['id', 'type', 'title', 'status', 'updated']) {
      if (d[k] == null || d[k] === '') issue('error', r, id, `missing required field "${k}"`);
    }
    if (!id) continue;

    let type = d.type ?? null;
    if (type && !TYPES.includes(type)) {
      issue('error', r, id, `unknown type "${type}" — use ${TYPES.join(' | ')}`);
      type = null;
    }
    if (type && !ID_RULES[type].test(id)) issue('error', r, id, `id "${id}" does not match the ${type} pattern`);
    else if (type) {
      const where = placement(file, type, id);
      if (where) issue('error', r, id, where);
    }

    let status = d.status ?? null;
    if (status && !(STATUSES.includes(status) || (status === 'auto' && AUTO_TYPES.has(type)))) {
      issue('error', r, id, `unknown status "${status}"${status === 'auto' ? ' (auto is only for project, phase, feature)' : ''}`);
      status = null;
    }
    if (type && type !== 'project' && !d.parent) issue('error', r, id, 'missing required field "parent"');

    const node = {
      id,
      type: type || 'ticket',
      title: String(d.title ?? id),
      declaredStatus: status || 'to-discuss',
      status: status && status !== 'auto' ? status : 'to-discuss',
      parent: d.parent ? String(d.parent) : null,
      phase: null,
      dependsOn: toList(d.depends_on),
      implements: toList(d.implements),
      owner: d.owner ? String(d.owner) : null,
      labels: toList(d.labels),
      code: toList(d.code),
      updated: d.updated ? String(d.updated) : null,
      file: r,
      line: 1,
      notes: [],
      sections: parsed.sections,
      checklist: parsed.checklist,
      handoff: parsed.handoff,
    };
    if (!add(node)) continue;

    for (const p of parsed.points) {
      if (node.type !== 'feature') issue('warning', r, p.id, 'discussion points belong in feature files');
      if (!p.id.startsWith(`${id}-`)) issue('error', r, p.id, `point "${p.id}" must start with "${id}-"`);
      const ok = KINDS.includes(p.kind);
      if (!ok) issue('error', r, p.id, `unknown point kind "${p.kindRaw}" — use ${KINDS.join(' | ')}`);
      const kind = ok ? p.kind : 'open';
      if (['decided', 'dropped', 'caution'].includes(kind) && !p.notes.length) {
        issue('warning', r, p.id, `${kind} point has no body — add "> What:" and "> Why:" lines so a newcomer understands it`);
      }
      add({
        id: p.id, type: 'point', title: p.title, kind, date: p.date ?? node.updated ?? null, from: p.from,
        declaredStatus: KIND_STATUS[kind], status: KIND_STATUS[kind],
        parent: id, phase: null, dependsOn: [], implements: [], owner: null, labels: [], code: [],
        updated: p.date ?? node.updated, file: r, line: p.line, notes: p.notes, sections: [], checklist: null, handoff: [],
      });
    }
  }

  // 2. Parent links
  const children = new Map([...nodes.keys()].map((k) => [k, []]));
  for (const n of nodes.values()) {
    if (!n.parent) continue;
    const p = nodes.get(n.parent);
    if (!p) {
      issue('error', n.file, n.id, `parent "${n.parent}" not found`);
      n.parent = null;
      continue;
    }
    children.get(p.id).push(n.id);
    const allowed = PARENT_TYPES[n.type];
    if (allowed && !allowed.includes(p.type)) issue('error', n.file, n.id, `a ${n.type} cannot have a ${p.type} ("${p.id}") as parent`);
  }
  for (const list of children.values()) list.sort(naturalCompare);

  // 3. Phase of each node (+ parent cycle check)
  for (const n of nodes.values()) {
    const seen = new Set();
    let cur = n;
    while (cur && cur.type !== 'phase' && cur.parent) {
      if (seen.has(cur.id)) {
        issue('error', n.file, n.id, 'parent chain loops back on itself');
        cur = null;
        break;
      }
      seen.add(cur.id);
      cur = nodes.get(cur.parent);
    }
    n.phase = cur && cur.type === 'phase' ? cur.id : null;
    if ((n.type === 'feature' || n.type === 'ticket') && n.phase && !n.id.startsWith(`${n.phase}-`)) {
      issue('warning', n.file, n.id, `id should start with its phase "${n.phase}-"`);
    }
  }

  // 4. depends_on / implements references + dependency cycles
  for (const n of nodes.values()) {
    for (const dep of n.dependsOn) if (!nodes.has(dep)) issue('error', n.file, n.id, `depends_on "${dep}" not found`);
    for (const pt of n.implements) {
      const t = nodes.get(pt);
      if (!t) issue('error', n.file, n.id, `implements "${pt}" not found`);
      else if (t.type !== 'point') issue('warning', n.file, n.id, `implements should list point IDs ("${pt}" is a ${t.type})`);
    }
  }
  const mark = new Map(); // 1 = visiting, 2 = done
  const visit = (id, stack) => {
    mark.set(id, 1);
    const pathIds = [...stack, id];
    for (const dep of nodes.get(id).dependsOn) {
      if (!nodes.has(dep)) continue;
      if (mark.get(dep) === 1) {
        const cycle = pathIds.slice(pathIds.indexOf(dep)).concat(dep);
        issue('error', nodes.get(id).file, id, `dependency cycle: ${cycle.join(' → ')}`);
      } else if (!mark.get(dep)) {
        visit(dep, pathIds);
      }
    }
    mark.set(id, 2);
  };
  for (const id of nodes.keys()) if (!mark.get(id)) visit(id, []);

  // 5. Auto statuses (bottom-up)
  const resolving = new Set();
  const resolved = new Set();
  const resolve = (id) => {
    const n = nodes.get(id);
    if (n.declaredStatus !== 'auto' || resolved.has(id) || resolving.has(id)) return n.status;
    resolving.add(id);
    n.status = aggregateStatus(children.get(id).map(resolve));
    resolving.delete(id);
    resolved.add(id);
    return n.status;
  };
  for (const id of nodes.keys()) resolve(id);

  // 6. Progress roll-ups: points decided, tickets done
  const prog = new Map();
  const progress = (id) => {
    if (prog.has(id)) return prog.get(id);
    const n = nodes.get(id);
    const p = { points: { total: 0, settled: 0 }, tickets: { total: 0, done: 0 } };
    prog.set(id, p);
    if (n.status === 'dropped') return p;
    if (n.type === 'point' && COUNTED_KINDS.has(n.kind)) {
      p.points.total++;
      if (SETTLED_KINDS.has(n.kind)) p.points.settled++;
    }
    if (n.type === 'ticket') {
      p.tickets.total++;
      if (n.status === 'done') p.tickets.done++;
    }
    for (const c of children.get(id)) {
      const cp = progress(c);
      p.points.total += cp.points.total;
      p.points.settled += cp.points.settled;
      p.tickets.total += cp.tickets.total;
      p.tickets.done += cp.tickets.done;
    }
    return p;
  };

  // 7. Git commits + reverse links
  const commits = opts.commits ?? readCommits(repoRoot);
  const commitsById = new Map();
  for (const c of commits) {
    for (const cid of commitIds(c.subject)) {
      if (!commitsById.has(cid)) commitsById.set(cid, []);
      commitsById.get(cid).push(c);
    }
  }
  const blocks = new Map();
  const implementedBy = new Map();
  const push = (m, k, v) => (m.get(k) ?? m.set(k, []).get(k)).push(v);
  for (const n of nodes.values()) {
    for (const dep of n.dependsOn) if (nodes.has(dep)) push(blocks, dep, n.id);
    for (const pt of n.implements) if (nodes.has(pt)) push(implementedBy, pt, n.id);
  }

  result.nodes = [...nodes.values()]
    .sort((a, b) => naturalCompare(a.id, b.id))
    .map((n) => ({
      ...n,
      children: children.get(n.id),
      blocks: blocks.get(n.id) ?? [],
      implementedBy: implementedBy.get(n.id) ?? [],
      progress: progress(n.id),
      commits: (commitsById.get(n.id) ?? []).slice(0, 20),
      code: n.code.map((p) => ({ path: p, exists: fs.existsSync(path.resolve(base, p)) })),
    }));

  const seenEdges = new Set();
  const edge = (source, target, kind) => {
    const key = `${kind}:${source}>${target}`;
    if (!seenEdges.has(key) && nodes.has(source) && nodes.has(target)) {
      seenEdges.add(key);
      result.edges.push({ source, target, kind });
    }
  };
  for (const n of result.nodes) {
    if (n.parent) edge(n.parent, n.id, 'parent');
    for (const dep of n.dependsOn) edge(dep, n.id, 'depends');
    for (const pt of n.implements) edge(n.id, pt, 'implements');
  }

  const projects = result.nodes.filter((n) => n.type === 'project');
  if (files.length && !projects.length) issue('warning', rel(absDir), null, 'no project node — add project.md with type: project');
  if (projects.length > 1) issue('warning', rel(absDir), null, `more than one project node (${projects.map((p) => p.id).join(', ')})`);
  result.project = projects[0] ? { id: projects[0].id, title: projects[0].title } : null;

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  const byKind = Object.fromEntries(KINDS.map((k) => [k, 0]));
  const byType = {};
  for (const n of result.nodes) {
    if (n.type !== 'project') byStatus[n.status]++;
    if (n.type === 'point') byKind[n.kind]++;
    byType[n.type] = (byType[n.type] ?? 0) + 1;
  }
  // 8. The project's own Claude Code tooling (agents, skills, hooks) — shown on its own tab, not plan nodes.
  try {
    result.tooling = scanTooling(base);
  } catch (e) {
    result.tooling = { root: '.claude/', scanned: [], isPlugin: false, counts: { agents: 0, skills: 0, hooks: 0 }, items: [], notes: [`tooling scan failed: ${e.message}`] };
  }

  result.stats = { byStatus, byKind, byType, errors: issues.filter((i) => i.level === 'error').length, warnings: issues.filter((i) => i.level === 'warning').length };
  result.stats.tooling = result.tooling.counts;
  return result;
}
