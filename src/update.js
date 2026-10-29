// `thinkmap update` / `thinkmap version` and the "new version available" check.
//
// Thinkmap is fetched from GitHub three ways (npx cache, project dependency, plain clone)
// and none of them updates by itself. This module works out which one is in use and runs
// the matching update. The version check is one GET of package.json on GitHub's raw CDN —
// nothing about the project is sent — and is skipped with THINKMAP_NO_UPDATE_CHECK=1.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PKG_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SPEC = 'github:dsngeu/ThinkMap';
export const LATEST_URL = 'https://raw.githubusercontent.com/dsngeu/ThinkMap/master/package.json';

export function currentVersion(pkgDir = PKG_DIR) {
  try { return JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')).version ?? null; } catch { return null; }
}

// "1.2.3" vs "1.10.0" → -1 / 0 / 1 (pre-release tags ignored)
export function compareVersions(a, b) {
  const num = (v) => String(v ?? '0').replace(/^v/, '').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
  const [x, y] = [num(a), num(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

// Where is this copy of Thinkmap running from?
//   npx        ~/.npm/_npx/<hash>/node_modules/thinkmap   → re-install into that cache folder
//   dependency <project>/node_modules/thinkmap             → npm install in the project
//   clone      a folder with .git                          → git pull
export function detectInstall(pkgDir = PKG_DIR, exists = fs.existsSync) {
  const abs = path.resolve(pkgDir);
  const parts = abs.split(/[\\/]/);
  const nm = parts.lastIndexOf('node_modules');
  if (nm > 0 && parts[nm - 2] === '_npx' && /^[0-9a-f]+$/i.test(parts[nm - 1])) {
    return { kind: 'npx', dir: abs, cacheDir: parts.slice(0, nm).join(path.sep) };
  }
  if (nm > 0) return { kind: 'dependency', dir: abs, projectDir: parts.slice(0, nm).join(path.sep) || path.sep };
  if (exists(path.join(abs, '.git'))) return { kind: 'clone', dir: abs };
  return { kind: 'unknown', dir: abs };
}

export function updatePlan(info) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  switch (info.kind) {
    case 'npx':
      return { cmd: npm, args: ['install', '--prefix', info.cacheDir, '--no-audit', '--no-fund', '--no-progress', SPEC], cwd: info.cacheDir,
        explain: `re-fetch ${SPEC} into the npx cache (${info.cacheDir})` };
    case 'dependency':
      return { cmd: npm, args: ['install', '--no-audit', '--no-fund', '--no-progress', SPEC], cwd: info.projectDir,
        explain: `npm install ${SPEC} in ${info.projectDir} (updates package-lock.json)` };
    case 'clone':
      return { cmd: 'git', args: ['pull', '--ff-only'], cwd: info.dir, explain: `git pull in ${info.dir}` };
    default:
      return null;
  }
}

// Every Thinkmap copy in the npx cache (~/.npm/_npx/<hash>/node_modules/thinkmap). Old copies
// (before `update` existed) keep running from their own entry, so an update refreshes them all.
export function npxCacheEntries(npxDir, readdir = fs.readdirSync, exists = fs.existsSync, readFile = fs.readFileSync) {
  const out = [];
  let names = [];
  try { names = readdir(npxDir); } catch { return out; }
  for (const name of names) {
    if (!/^[0-9a-f]+$/i.test(name)) continue;
    const dir = path.join(npxDir, name);
    if (!exists(path.join(dir, 'node_modules', 'thinkmap', 'package.json'))) continue;
    let spec = SPEC;
    try { spec = JSON.parse(readFile(path.join(dir, 'package.json'), 'utf8')).dependencies?.thinkmap || SPEC; } catch { /* keep default */ }
    if (!/dsngeu\/thinkmap/i.test(spec)) continue; // some other package called thinkmap
    out.push({ dir, spec });
  }
  return out;
}

// Resolves to { current, latest, newer } or null (offline, blocked, or disabled).
export async function checkLatest({ current = currentVersion(), timeoutMs = 3000, fetchFn = globalThis.fetch, env = process.env } = {}) {
  if (env.THINKMAP_NO_UPDATE_CHECK || !fetchFn) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchFn(LATEST_URL, { signal: ctrl.signal, headers: { 'user-agent': `thinkmap/${current ?? '0'}` } });
    if (!res.ok) return null;
    const latest = (await res.json()).version;
    if (!latest) return null;
    return { current, latest, newer: compareVersions(latest, current) > 0 };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function howToUpdate(info) {
  return {
    npx: `thinkmap update   (or: npx ${SPEC} update)`,
    dependency: `npx thinkmap update   (runs npm install ${SPEC} in your project)`,
    clone: `git -C ${info.dir} pull`,
    unknown: `re-install from ${SPEC}`,
  }[info.kind];
}

// Runs the update in the foreground; returns { ok, before, after, plan }.
export function runUpdate({ pkgDir = PKG_DIR, log = console.log, spawn = spawnSync } = {}) {
  const info = detectInstall(pkgDir);
  const plan = updatePlan(info);
  const before = currentVersion(pkgDir);
  if (!plan) {
    log(`✗ Thinkmap runs from ${info.dir}, which is neither an npx cache, a node_modules folder nor a git clone.\n  Re-install it: npx ${SPEC} serve --open`);
    return { ok: false, before, after: before, plan: null, info };
  }
  log(`⬆ Updating Thinkmap ${before ?? ''} — ${plan.explain}\n  $ ${plan.cmd} ${plan.args.join(' ')}\n`);
  let ok;
  if (info.kind === 'npx') {
    // Refresh every cached copy, so the plain `npx github:dsngeu/ThinkMap` entry is fixed even when
    // this run came from a differently-spelled spec (e.g. `#master`).
    const entries = npxCacheEntries(path.dirname(info.cacheDir));
    const todo = entries.length ? entries : [{ dir: info.cacheDir, spec: SPEC }];
    ok = true;
    for (const e of todo) {
      const args = ['install', '--prefix', e.dir, '--no-audit', '--no-fund', '--no-progress', e.spec];
      if (todo.length > 1) log(`  → ${e.dir} (${e.spec})`);
      const r = spawn(plan.cmd, args, { cwd: e.dir, stdio: 'inherit' });
      if (r.status !== 0) ok = false;
    }
  } else {
    const r = spawn(plan.cmd, plan.args, { cwd: plan.cwd, stdio: 'inherit' });
    ok = r.status === 0;
  }
  const after = currentVersion(pkgDir);
  if (!ok) log(`\n✗ update failed. Try by hand:\n  ${plan.cmd} ${plan.args.join(' ')}`);
  else if (after === before) log(`\n✓ Already up to date (${after}).`);
  else log(`\n✓ Thinkmap ${before} → ${after}. Restart \`thinkmap serve\` to load the new viewer.`);
  return { ok, before, after, plan, info };
}
