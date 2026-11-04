// Text summary for the terminal (`thinkmap status`).

const paint = (on) => {
  const w = (code) => (s) => (on ? `\x1b[${code}m${s}\x1b[0m` : String(s));
  return { bold: w('1'), grey: w('90'), red: w('31'), green: w('32'), yellow: w('33'), magenta: w('35'), cyan: w('36') };
};

const fit = (s, n) => {
  const str = String(s ?? '');
  return str.length > n ? `${str.slice(0, n - 1)}…` : str.padEnd(n);
};
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%`.padStart(4) : '  — ');

/** @param filter null | "P1" (one phase) | "P1-F02" (one topic) | "open" (open points only) */
export function formatStatus(graph, { filter = null, color = false } = {}) {
  const c = paint(color);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  if (filter && /^P\d+-F\d+$/.test(filter)) return formatTopic(graph, filter, c, byId);
  const unknown = filter && !/^P\d+$/.test(filter) && filter !== 'open'
    ? `${filter} is not a filter — use a phase (P1), a topic (P1-F02) or "open". Showing the whole plan.`
    : filter && /^P\d+$/.test(filter) && !byId.has(filter) ? `there is no phase ${filter}. Showing the whole plan.` : null;
  if (unknown) filter = null;
  const phaseFilter = filter && /^P\d+$/.test(filter) ? filter : null;
  const openOnly = filter === 'open';
  const scope = phaseFilter ? graph.nodes.filter((n) => n.phase === phaseFilter) : graph.nodes;
  const bar = (a, b, w = 8) => {
    if (!b) return c.grey('░'.repeat(w));
    const f = Math.round((a / b) * w);
    return c.green('█'.repeat(f)) + c.grey('░'.repeat(w - f));
  };

  // A phase whose points are all settled but that has no ticket yet: the next step is to
  // break it into tickets, and nothing else in the plan says so.
  const fullyDecided = (p) => p.status !== 'dropped' && p.progress.points.total > 0 && p.progress.points.settled === p.progress.points.total && p.progress.tickets.total === 0;
  const needsTickets = graph.nodes.filter((n) => n.type === 'phase' && (!phaseFilter || n.id === phaseFilter) && fullyDecided(n));

  const lines = [];
  const title = graph.project?.title ?? 'Plan';
  lines.push(`${c.bold(`📍 ${title} — plan status${phaseFilter ? ` (${phaseFilter})` : ''}`)}   ${c.grey(new Date(graph.generatedAt).toLocaleString())}`);
  if (unknown) lines.push(c.yellow(`! ${unknown}`));
  lines.push('');

  if (!openOnly) {
    const phases = scope.filter((n) => n.type === 'phase');
    if (phases.length) {
      lines.push(`${c.bold('PHASES'.padEnd(30))}${c.grey('decided          built')}`);
      for (const p of phases) {
        const { points, tickets } = p.progress;
        const note = tickets.total ? `${tickets.done}/${tickets.total} tickets` : fullyDecided(p) ? 'all decided — no tickets yet' : 'no tickets yet';
        lines.push(`  ${fit(`${p.id} ${p.title}`, 28)}${bar(points.settled, points.total)} ${pct(points.settled, points.total)}   ${bar(tickets.done, tickets.total)} ${pct(tickets.done, tickets.total)}  ${c.grey(note)}`);
      }
      lines.push('');
    }
  }

  const section = (icon, label, list, fmt, max = 12) => {
    if (!list.length) return;
    lines.push(c.bold(`${icon} ${label} (${list.length})`));
    for (const n of list.slice(0, max)) lines.push(`  ${fmt(n)}`);
    if (list.length > max) lines.push(c.grey(`  … ${list.length - max} more`));
    lines.push('');
  };

  const tickets = scope.filter((n) => n.type === 'ticket');
  const open = scope.filter((n) => n.type === 'point' && (n.kind === 'open' || n.kind === 'suggestion'));
  const cautions = scope.filter((n) => n.type === 'point' && n.kind === 'caution');
  const ready = tickets.filter((t) => t.status === 'planned' && t.dependsOn.every((d) => byId.get(d)?.status === 'done'));

  if (!openOnly) {
    section('🟡', 'IN PROGRESS', tickets.filter((t) => t.status === 'in-progress'),
      (t) => `${fit(t.id, 9)}${fit(t.title, 40)} ${c.grey(t.owner ?? 'no owner')}`);
    section('🔴', 'BLOCKED', tickets.filter((t) => t.status === 'blocked'), (t) => {
      const waiting = t.dependsOn.filter((d) => byId.get(d)?.status !== 'done');
      return `${fit(t.id, 9)}${fit(t.title, 40)} ${c.grey(waiting.length ? `waiting on ${waiting.join(', ')}` : 'see ticket')}`;
    });
  }

  section('❓', 'STILL OPEN / TO DISCUSS', open,
    (p) => `${fit(p.id, 12)}${p.title}${p.kind === 'suggestion' ? c.magenta(`  (suggested by ${p.from ?? 'claude'})`) : ''}`, openOnly ? 100 : 12);
  if (!openOnly) section('⚠️ ', 'TAKE CARE OF', cautions, (p) => `${fit(p.id, 12)}${p.title}`, 6);

  if (!openOnly) {
    section('🟢', 'NEXT FREE TICKETS', ready,
      (t) => `${fit(t.id, 9)}${fit(t.title, 40)} ${c.grey(t.dependsOn.length ? 'deps done ✓' : 'no deps')}`);
    const done = tickets.filter((t) => t.status === 'done').sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
    section('✅', 'RECENTLY DONE', done, (t) => {
      const cm = t.commits[0];
      return `${fit(t.id, 9)}${fit(t.title, 40)} ${c.grey(cm ? `[${cm.hash}] ${cm.date}` : t.updated ?? '')}`;
    }, 5);
  }

  const tc = graph.tooling?.counts;
  if (!openOnly && tc && (tc.agents || tc.skills || tc.hooks)) {
    const n = (k, w) => `${tc[k]} ${w}${tc[k] === 1 ? '' : 's'}`;
    lines.push(`${c.bold('🧩 TOOLING')}  ${n('agents', 'agent')} · ${n('skills', 'skill')} · ${n('hooks', 'hook')} ${c.grey(`in ${graph.tooling.root} — open the Tooling tab in the viewer`)}`, '');
  }

  const { errors, warnings } = graph.stats;
  if (errors || warnings) lines.push(c.red(`⚠  ${errors} format error(s), ${warnings} warning(s) — run: thinkmap validate`), '');

  const next = needsTickets[0]
    ? `generate tickets for ${needsTickets[0].id} — every point is decided and it has no tickets yet (/create-tickets ${needsTickets[0].id})`
    : open[0]
      ? `discuss ${open[0].id} (${open[0].title})`
      : ready[0] ? `start ${ready[0].id} with /implement-ticket ${ready[0].id}` : null;
  if (next) lines.push(`👉 Suggested: ${next}`);

  return lines.join('\n');
}

// One topic: its points by kind and its tickets with status and owner (`thinkmap status P2-F04`).
const KIND_ROWS = [
  ['open', '❓', 'STILL OPEN'], ['suggestion', '💡', 'SUGGESTED'], ['caution', '⚠️ ', 'TAKE CARE OF'],
  ['decided', '✅', 'DECIDED'], ['discussed', '💬', 'DISCUSSED'], ['dropped', '✖ ', 'DROPPED'],
];
const TICKET_MARK = { done: '✅', 'in-progress': '🟡', blocked: '🔴', planned: '⬜', dropped: '✖ ' };
function formatTopic(graph, id, c, byId) {
  const f = byId.get(id);
  if (!f || f.type !== 'feature') {
    const topics = graph.nodes.filter((n) => n.type === 'feature').map((n) => `  ${fit(n.id, 10)}${n.title}`);
    return [c.red(`✗ there is no topic ${id}.`), ...(topics.length ? ['', c.bold('Topics:'), ...topics] : [])].join('\n');
  }
  const kids = f.children.map((k) => byId.get(k)).filter(Boolean);
  const points = kids.filter((n) => n.type === 'point');
  const tickets = kids.filter((n) => n.type === 'ticket');
  const phase = byId.get(f.phase);
  const { points: pp, tickets: tp } = f.progress;
  const bar = (a, b, w = 8) => (b ? c.green('█'.repeat(Math.round((a / b) * w))) + c.grey('░'.repeat(w - Math.round((a / b) * w))) : c.grey('░'.repeat(w)));
  const lines = [
    `${c.bold(`📍 ${f.id} ${f.title}`)}   ${c.grey(`${phase ? `${phase.id} ${phase.title} · ` : ''}${f.file}`)}`,
    '',
    `  decided ${bar(pp.settled, pp.total)} ${pct(pp.settled, pp.total)}   built ${bar(tp.done, tp.total)} ${pct(tp.done, tp.total)}  ${c.grey(tp.total ? `${tp.done}/${tp.total} tickets` : 'no tickets yet')}`,
    '',
  ];
  if (tickets.length) {
    lines.push(c.bold(`🔨 TICKETS (${tickets.length})`));
    for (const t of tickets) lines.push(`  ${TICKET_MARK[t.status] ?? '⬜'} ${fit(t.id, 9)}${fit(t.title, 40)} ${fit(t.status, 12)}${c.grey(t.owner ?? 'no owner')}`);
    lines.push('');
  }
  for (const [kind, icon, label] of KIND_ROWS) {
    const list = points.filter((p) => p.kind === kind);
    if (!list.length) continue;
    lines.push(c.bold(`${icon} ${label} (${list.length})`));
    for (const p of list) {
      const by = p.implementedBy?.length ? c.grey(`  → ${p.implementedBy.join(', ')}`) : kind === 'decided' ? c.grey('  → no ticket yet') : '';
      lines.push(`  ${fit(p.id, 12)}${p.title}${by}`);
    }
    lines.push('');
  }
  if (!points.length && !tickets.length) lines.push(c.grey('  Nothing recorded in this topic yet.'), '');
  const own = graph.issues.filter((i) => i.file === f.file || tickets.some((t) => t.file === i.file));
  if (own.length) lines.push(c.red(`⚠  ${own.length} format issue(s) in this topic's files — run: thinkmap validate`), '');
  const open = points.find((p) => p.kind === 'open' || p.kind === 'suggestion');
  const uncovered = points.find((p) => p.kind === 'decided' && !p.implementedBy?.length);
  const ready = tickets.find((t) => t.status === 'planned' && t.dependsOn.every((d) => byId.get(d)?.status === 'done'));
  const next = open ? `discuss ${open.id} (${open.title})` : uncovered ? `ticket the decided points (/create-tickets ${f.id})` : ready ? `start ${ready.id} with /implement-ticket ${ready.id}` : null;
  if (next) lines.push(`👉 Suggested: ${next}`);
  return lines.join('\n').replace(/\n+$/, '');
}

export function formatIssues(graph, { color = false } = {}) {
  const c = paint(color);
  if (!graph.issues.length) return c.green(`✓ plan is valid — ${graph.nodes.length} nodes`);
  const lines = graph.issues.map((i) => `${i.level === 'error' ? c.red('✗ error  ') : c.yellow('! warning')} ${i.file}${i.id ? ` (${i.id})` : ''}: ${i.message}`);
  lines.push('', `${graph.stats.errors} error(s), ${graph.stats.warnings} warning(s)`);
  return lines.join('\n');
}
