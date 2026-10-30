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

/** @param filter null | "P1" (one phase) | "open" (open points only) */
export function formatStatus(graph, { filter = null, color = false } = {}) {
  const c = paint(color);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
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
    ? `generate tickets for ${needsTickets[0].id} — every point is decided and it has no tickets yet (/thinkmap-tickets ${needsTickets[0].id})`
    : open[0]
      ? `discuss ${open[0].id} (${open[0].title})`
      : ready[0] ? `start ${ready[0].id} with /thinkmap-ticket ${ready[0].id}` : null;
  if (next) lines.push(`👉 Suggested: ${next}`);

  return lines.join('\n');
}

export function formatIssues(graph, { color = false } = {}) {
  const c = paint(color);
  if (!graph.issues.length) return c.green(`✓ plan is valid — ${graph.nodes.length} nodes`);
  const lines = graph.issues.map((i) => `${i.level === 'error' ? c.red('✗ error  ') : c.yellow('! warning')} ${i.file}${i.id ? ` (${i.id})` : ''}: ${i.message}`);
  lines.push('', `${graph.stats.errors} error(s), ${graph.stats.warnings} warning(s)`);
  return lines.join('\n');
}
