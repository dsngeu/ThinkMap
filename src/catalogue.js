// The Thinkmap catalogue: ready-made agents and skills a project can add to its own .claude/.
//
// Adding copies the files from catalogue/ (bundled with this Thinkmap) into the project and
// records them in .claude/thinkmap-catalogue.json. Removing deletes only files recorded there,
// so a project's own agents and skills are never touched. Used by `thinkmap add/remove` and by
// the dashboard's Add / Remove buttons — one code path for both.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseToolFrontMatter } from './tooling.js';

export const CATALOGUE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'catalogue');
export const RECORD = '.claude/thinkmap-catalogue.json';
const RECORD_NOTE = 'Agents and skills added from the Thinkmap catalogue. Thinkmap only removes or updates the files listed here. Commit this file with them.';

const posix = (p) => p.split(path.sep).join('/');
const today = () => new Date().toISOString().slice(0, 10);

function listDir(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

// Where an item's files come from (in catalogue/) and go to (in the project), as relative paths.
function filesOf(item, catDir) {
  if (item.kind === 'agent') return [{ from: item.path, to: `.claude/agents/${item.name}.md` }];
  const src = path.join(catDir, item.path);
  return listDir(src).map((f) => ({ from: posix(path.relative(catDir, f)), to: `.claude/skills/${item.name}/${posix(path.relative(src, f))}` }));
}

const hashOf = (parts) => {
  const h = crypto.createHash('sha256');
  for (const [name, buf] of parts) h.update(name).update('\0').update(buf).update('\0');
  return h.digest('hex').slice(0, 16);
};
// Hash by destination path, so the catalogue copy and the project copy hash the same when equal.
const catalogueHash = (files, catDir) => hashOf(files.map((f) => [f.to, fs.readFileSync(path.join(catDir, f.from))]));
const projectHash = (files, root) => {
  try { return hashOf(files.map((to) => [to, fs.readFileSync(path.join(root, to))])); } catch { return null; }
};

export function loadCatalogue(catDir = CATALOGUE_DIR) {
  const manifest = JSON.parse(fs.readFileSync(path.join(catDir, 'catalogue.json'), 'utf8'));
  return manifest.items.map((it) => {
    const files = filesOf(it, catDir);
    const main = path.join(catDir, it.kind === 'agent' ? it.path : path.join(it.path, 'SKILL.md'));
    const { data } = parseToolFrontMatter(fs.readFileSync(main, 'utf8'));
    return { ...it, requires: it.requires || [], files, hash: catalogueHash(files, catDir), description: String(data.description || it.summary || '') };
  });
}

export function readRecord(root) {
  try {
    const r = JSON.parse(fs.readFileSync(path.join(root, RECORD), 'utf8'));
    return r && typeof r.items === 'object' && r.items ? r : { items: {} };
  } catch { return { items: {} }; }
}
function writeRecord(root, record) {
  const file = path.join(root, RECORD);
  if (!Object.keys(record.items).length) { fs.rmSync(file, { force: true }); return; }
  const items = Object.fromEntries(Object.entries(record.items).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(file, `${JSON.stringify({ note: RECORD_NOTE, items }, null, 2)}\n`);
}

// Never write or delete through a symlink, and never outside <root>/.claude/.
function safePath(root, rel) {
  const abs = path.resolve(root, rel);
  const claude = path.join(path.resolve(root), '.claude');
  if (!abs.startsWith(claude + path.sep)) throw new Error(`refusing to touch ${rel}: outside .claude/`);
  let p = path.resolve(root);
  for (const part of path.relative(p, abs).split(path.sep)) {
    p = path.join(p, part);
    let st = null;
    try { st = fs.lstatSync(p); } catch { break; }
    if (st.isSymbolicLink()) throw new Error(`refusing to touch ${rel}: ${posix(path.relative(root, p))} is a symbolic link`);
  }
  return abs;
}

// One state per catalogue item:
//   available — not in the project · installed — added and unchanged · update — a newer catalogue
//   version exists · modified — added, then changed in the project · conflict — the project has its
//   own file with this name.
export function catalogueStatus(root, catDir = CATALOGUE_DIR) {
  const abs = path.resolve(root);
  const record = readRecord(abs);
  const items = loadCatalogue(catDir).map((it) => {
    const rec = record.items[it.name];
    const recFiles = rec && Array.isArray(rec.files) ? rec.files : null;
    const present = recFiles && recFiles.length && recFiles.every((f) => fs.existsSync(path.join(abs, f)));
    let state = 'available';
    let updateAvailable = false;
    if (present) {
      const now = projectHash(recFiles, abs);
      updateAvailable = rec.hash !== it.hash;
      state = now !== rec.hash ? 'modified' : updateAvailable ? 'update' : 'installed';
    } else if (it.files.some((f) => fs.existsSync(path.join(abs, f.to)))) state = 'conflict';
    const { files, ...rest } = it;
    return { ...rest, state, updateAvailable, paths: present ? recFiles : files.map((f) => f.to), added: present ? rec.added || null : null };
  });
  const installed = items.filter((i) => ['installed', 'update', 'modified'].includes(i.state)).length;
  return { record: RECORD, installed, items };
}

const closure = (names, byName) => {
  const out = [];
  const visit = (n, from) => {
    const it = byName.get(n);
    if (!it) throw new Error(`"${n}" is not in the Thinkmap catalogue${from ? ` (needed by ${from})` : ''} — see \`thinkmap catalogue\``);
    if (out.includes(it)) return;
    for (const r of it.requires) visit(r, n);
    out.push(it);
  };
  for (const n of names) visit(n, null);
  return out;
};

// Add (or update) items and everything they require. All checks run before any file is written.
export function addItems(root, names, { force = false, catDir = CATALOGUE_DIR } = {}) {
  const abs = path.resolve(root);
  if (!names.length) throw new Error('name at least one catalogue item');
  const status = new Map(catalogueStatus(abs, catDir).items.map((i) => [i.name, i]));
  const byName = new Map(loadCatalogue(catDir).map((i) => [i.name, i]));
  const plan = closure(names, byName);
  const result = { added: [], updated: [], unchanged: [], kept: [] };
  const todo = [];
  for (const it of plan) {
    const s = status.get(it.name);
    if (s.state === 'conflict') throw new Error(`the project already has its own ${it.kind} "${it.name}" (${s.paths[0]}) — rename or remove that file first; Thinkmap never overwrites it`);
    if (s.state === 'installed') { result.unchanged.push(it.name); continue; }
    if (s.state === 'modified') {
      if (!(force && names.includes(it.name))) { result.kept.push(it.name); continue; }
    }
    for (const f of it.files) safePath(abs, f.to);
    todo.push({ it, was: s.state });
  }
  const record = readRecord(abs);
  for (const { it, was } of todo) {
    const old = record.items[it.name]?.files || [];
    for (const f of old) if (!it.files.some((x) => x.to === f)) fs.rmSync(safePath(abs, f), { force: true });
    for (const f of it.files) {
      const dest = safePath(abs, f.to);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(catDir, f.from), dest);
    }
    record.items[it.name] = { kind: it.kind, files: it.files.map((f) => f.to), hash: it.hash, added: today() };
    (was === 'available' ? result.added : result.updated).push(it.name);
  }
  writeRecord(abs, record);
  return result;
}

// Remove items Thinkmap added. Refuses a file changed in the project, or an item another added
// item needs, unless `force`.
export function removeItems(root, names, { force = false, catDir = CATALOGUE_DIR } = {}) {
  const abs = path.resolve(root);
  if (!names.length) throw new Error('name at least one catalogue item');
  const status = new Map(catalogueStatus(abs, catDir).items.map((i) => [i.name, i]));
  const record = readRecord(abs);
  for (const n of names) {
    const s = status.get(n);
    if (!s) throw new Error(`"${n}" is not in the Thinkmap catalogue`);
    if (!record.items[n]) throw new Error(s.state === 'conflict' ? `"${n}" is the project's own file, not one Thinkmap added — Thinkmap never removes it` : `"${n}" is not added to this project`);
    if (s.state === 'modified' && !force) throw new Error(`"${n}" was changed in this project since it was added — remove it with --force to delete those changes too`);
    const users = [...status.values()].filter((o) => record.items[o.name] && !names.includes(o.name) && o.requires.includes(n)).map((o) => o.name);
    if (users.length && !force) throw new Error(`"${n}" is needed by ${users.join(', ')} — remove ${users.length > 1 ? 'those' : 'that'} first`);
  }
  for (const n of names) for (const f of record.items[n].files) safePath(abs, f);
  for (const n of names) {
    for (const f of record.items[n].files) fs.rmSync(path.join(abs, f), { force: true });
    if (record.items[n].kind === 'skill') {
      const dir = path.join(abs, '.claude', 'skills', n);
      try { if (!listDir(dir).length) fs.rmSync(dir, { recursive: true, force: true }); } catch { /* already gone */ }
    }
    delete record.items[n];
  }
  writeRecord(abs, record);
  return { removed: [...names] };
}
