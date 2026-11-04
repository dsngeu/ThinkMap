// `thinkmap init` — set up docs/plan/ in any project from the bundled template.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlanFile } from './parse.js';

export const TEMPLATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'template');
export const TEMPLATE_FORMAT = path.join(TEMPLATE_DIR, 'FORMAT.md');
export const TEMPLATE_VERSION = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, '..', 'package.json'), 'utf8')).version ?? '?'; } catch { return '?'; }
})();

// The Planning section `init` adds to the project's CLAUDE.md, so every session knows the
// format and where each file goes. `planRel` is the plan folder relative to the project root.
export function claudeSection(planRel = 'docs/plan') {
  const p = planRel.split(path.sep).join('/').replace(/\/+$/, '');
  return `## Planning (Thinkmap)

All plans, discussion points and tickets live in \`${p}/\` and **must** follow
@${p}/FORMAT.md. The Thinkmap viewer draws them as a live mind map.

Where each file goes (the validator reports anything else as an error):
- \`${p}/project.md\` — the project. Nothing else at the top level except \`FORMAT.md\`.
- \`${p}/NN-slug/phase.md\` — one folder per phase (\`P1\` → \`01-…\`); add one with \`thinkmap phase P2 <slug>\`.
- \`${p}/NN-slug/F<nn>-slug.md\` — a topic, directly in its phase folder; its notes go in \`## Points\`.
- \`${p}/NN-slug/tickets/P<n>-T<nn>-F<nn>-slug.md\` — a ticket, only in its phase's \`tickets/\`.

- Discussing? Write each decision / open question / suggestion / caution into the plan
  files as you go, with \`What:\` and \`Why:\` lines. Don't keep decisions only in chat.
- Working a ticket? Set it \`in-progress\`, log in its *Handoff log*, set \`done\` when finished.
- Put the ticket ID in commit messages: \`feat(auth): signup endpoint [P1-T01]\`.
- Edit only the ticket you own; never delete plan files — mark them \`dropped\`.
- After editing plan files, run \`thinkmap validate ${p}\` and fix what it reports.
`;
}
export const CLAUDE_SNIPPET = claudeSection();

// Add the Planning section to <root>/CLAUDE.md: create the file if missing, append if the
// file has no Thinkmap section yet, otherwise leave it alone. Never changes existing text.
// Returns { action: 'created' | 'appended' | 'kept' | 'outside', file, text }.
export function addClaudeSection(root, planDir) {
  const absRoot = path.resolve(root);
  const rel = path.relative(absRoot, path.resolve(planDir));
  const text = claudeSection(rel || '.');
  const file = path.join(absRoot, 'CLAUDE.md');
  // A plan folder outside the project can't be referenced from its CLAUDE.md.
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return { action: 'outside', file, text };
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, text);
    return { action: 'created', file, text };
  }
  const current = fs.readFileSync(file, 'utf8');
  const ref = `@${rel.split(path.sep).join('/')}/FORMAT.md`;
  if (/^#{1,6} .*Thinkmap/m.test(current) || current.includes(ref)) return { action: 'kept', file, text };
  const sep = current.endsWith('\n\n') ? '' : current.endsWith('\n') ? '\n' : '\n\n';
  fs.writeFileSync(file, `${current}${sep}${text}`);
  return { action: 'appended', file, text };
}

export function initPlan(target, { name = 'My Project', force = false, today = new Date() } = {}) {
  const abs = path.resolve(target);
  if (fs.existsSync(abs) && fs.readdirSync(abs).length && !force) {
    throw new Error(`${abs} is not empty — use --force to add the template files anyway (existing files are kept)`);
  }
  const date = today.toISOString().slice(0, 10);
  const written = [];
  const skipped = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const src = path.join(dir, e.name);
      if (e.isDirectory()) { walk(src); continue; }
      const rel = path.relative(TEMPLATE_DIR, src);
      const dest = path.join(abs, rel);
      if (fs.existsSync(dest)) { skipped.push(rel); continue; }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const text = fs.readFileSync(src, 'utf8').replaceAll('{{PROJECT}}', name).replaceAll('{{DATE}}', date);
      fs.writeFileSync(dest, text);
      written.push(rel);
    }
  };
  walk(TEMPLATE_DIR);
  // Every phase folder keeps a tickets/ folder from day one (FORMAT.md §1). Git drops empty
  // folders, so a .gitkeep holds it until the first ticket exists.
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (!e.isDirectory() || !PHASE_DIR_RE.test(e.name)) continue;
    const keep = path.join(e.name, 'tickets', '.gitkeep');
    if (fs.existsSync(path.join(abs, keep))) continue;
    fs.mkdirSync(path.dirname(path.join(abs, keep)), { recursive: true });
    fs.writeFileSync(path.join(abs, keep), '');
    written.push(keep);
  }
  return { dir: abs, written, skipped };
}

// Folder and file names the layout rules accept (FORMAT.md §1). Shared with the validator.
export const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
export const PHASE_DIR_RE = new RegExp(`^(\\d{2,})-${SLUG}$`);
export const FEATURE_FILE_RE = new RegExp(`^(F\\d+)-${SLUG}\\.md$`);
// P2-T05-F04-sprint-api.md — ticket id, then the short id of its topic (F04), then a slug.
// The F<nn> part is optional so plans written before 0.6.0 stay readable; the validator warns.
export const TICKET_FILE_RE = new RegExp(`^(P\\d+-T\\d+)(?:-(F\\d+))?-(${SLUG})\\.md$`);
export const phaseFolderNumber = (phaseId) => String(parseInt(String(phaseId).replace(/^P/, ''), 10)).padStart(2, '0');

// The phase folder (NN-slug) that holds phase P<n>, or null. Looks at the folder number only,
// so a folder with the right number and a different slug is found too.
export function findPhaseDir(planDir, phaseId) {
  const abs = path.resolve(planDir);
  const nn = phaseFolderNumber(phaseId);
  if (!fs.existsSync(abs)) return null;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const m = e.isDirectory() && PHASE_DIR_RE.exec(e.name);
    if (m && String(parseInt(m[1], 10)).padStart(2, '0') === nn) return e.name;
  }
  return null;
}

// `thinkmap phase P2 workflow` — the complete skeleton of one phase in one go:
//   02-workflow/phase.md (valid front matter, status: auto) and 02-workflow/tickets/.gitkeep.
// Sessions never build this tree by hand, so every project has the same layout, whether or
// not a phase has tickets yet. Re-running on an existing phase only adds what is missing.
export function scaffoldPhase(planDir, { id, slug, title = null, today = new Date() } = {}) {
  const abs = path.resolve(planDir);
  const m = /^P?(\d+)$/.exec(String(id ?? '').trim());
  if (!m) throw new Error(`phase id must look like P1 (got "${id}")`);
  const phaseId = `P${parseInt(m[1], 10)}`;
  const nn = phaseFolderNumber(phaseId);
  const cleanSlug = String(slug ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!cleanSlug || !new RegExp(`^${SLUG}$`).test(cleanSlug)) throw new Error(`slug must be lowercase words joined by "-" (got "${slug}")`);
  if (!fs.existsSync(path.join(abs, 'project.md'))) throw new Error(`${abs} has no project.md — run init first`);

  const existing = findPhaseDir(abs, phaseId);
  const folder = existing ?? `${nn}-${cleanSlug}`;
  if (existing && existing !== `${nn}-${cleanSlug}`) {
    throw new Error(`phase ${phaseId} already lives in ${path.join(abs, existing)} — rename that folder instead of creating a second one`);
  }
  let projectId = 'PROJECT';
  try { projectId = String(parsePlanFile(fs.readFileSync(path.join(abs, 'project.md'), 'utf8'))?.data?.id || 'PROJECT'); } catch { /* keep default */ }
  const date = today.toISOString().slice(0, 10);
  const phaseTitle = title || cleanSlug.split('-').map((w, i) => (i ? w : w[0].toUpperCase() + w.slice(1))).join(' ');

  const written = [];
  const skipped = [];
  const put = (rel, text) => {
    const dest = path.join(abs, rel);
    if (fs.existsSync(dest)) { skipped.push(rel); return; }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, text);
    written.push(rel);
  };
  put(path.join(folder, 'phase.md'), `---\nid: ${phaseId}\ntype: phase\ntitle: ${phaseTitle}\nstatus: auto\nparent: ${projectId}\nupdated: ${date}\n---\n\nWhat this phase delivers, in one paragraph.\n`);
  put(path.join(folder, 'tickets', '.gitkeep'), '');
  return { dir: abs, folder, id: phaseId, title: phaseTitle, written, skipped };
}

// `init` leaves a copy of FORMAT.md in the plan folder for people and sessions without
// Thinkmap. The validator and the plugin skills follow the bundled template/FORMAT.md, so
// every Thinkmap update (npx, dependency, clone or plugin) leaves that copy behind. These
// two detect the drift (`thinkmap format`, a validate warning, the session briefing) and
// bring the copy back in line (`thinkmap format --write`).
const normalise = (s) => s.replace(/\r\n/g, '\n').trimEnd();

export function formatCopyStatus(planDir) {
  const file = path.join(path.resolve(planDir), 'FORMAT.md');
  if (!fs.existsSync(file)) return { file, exists: false, upToDate: null };
  const upToDate = normalise(fs.readFileSync(file, 'utf8')) === normalise(fs.readFileSync(TEMPLATE_FORMAT, 'utf8'));
  return { file, exists: true, upToDate };
}

export function syncFormatCopy(planDir) {
  const s = formatCopyStatus(planDir);
  if (s.upToDate) return { ...s, changed: false, created: false };
  fs.mkdirSync(path.dirname(s.file), { recursive: true });
  fs.copyFileSync(TEMPLATE_FORMAT, s.file);
  return { file: s.file, exists: true, upToDate: true, changed: true, created: !s.exists };
}
