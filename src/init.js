// `thinkmap init` — set up docs/plan/ in any project from the bundled template.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEMPLATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'template');

export const CLAUDE_SNIPPET = `## Planning (Thinkmap)

All plans, discussion points and tickets live in \`docs/plan/\` and **must** follow
@docs/plan/FORMAT.md. The Thinkmap viewer draws them as a live mind map.

- Discussing? Write each decision / open question / suggestion / caution into the plan
  files as you go, with \`What:\` and \`Why:\` lines. Don't keep decisions only in chat.
- Working a ticket? Set it \`in-progress\`, log in its *Handoff log*, set \`done\` when finished.
- Put the ticket ID in commit messages: \`feat(auth): signup endpoint [P1-T01]\`.
- Edit only the ticket you own; never delete plan files — mark them \`dropped\`.
`;

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
  return { dir: abs, written, skipped };
}
