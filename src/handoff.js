// Before `thinkmap serve` starts, look at what already runs on the port (and the next few,
// where an earlier copy may have landed). Every project uses 4400 by default, so a server
// is only replaced when it serves this same plan folder:
//   same plan, same version   → reuse it, don't start a second copy
//   same plan, other version  → stop it and take its port (the open page reconnects)
//   other plan / not Thinkmap → leave it alone; start on the next free port
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };

// What answers on 127.0.0.1:<port>: null (nothing), { kind: 'other' } or a Thinkmap server.
// Works with servers from before this file existed: /api/graph has always carried root + planDir.
export async function probe(port, timeoutMs = 1500) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/graph`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return { port, kind: 'other' };
    const g = await r.json();
    if (!g || !Array.isArray(g.nodes) || typeof g.planDir !== 'string') return { port, kind: 'other' };
    return { port, kind: 'thinkmap', plan: real(path.resolve(g.root || '.', g.planDir)), version: g.app?.version ?? null, pid: Number(g.app?.pid) || null };
  } catch (e) {
    return e?.cause?.code === 'ECONNREFUSED' ? null : { port, kind: 'other' };
  }
}

export const findServers = async (port, span = 10) => (await Promise.all(Array.from({ length: span }, (_, i) => probe(port + i)))).filter(Boolean);

/** @returns {{ action: 'start' } | { action: 'reuse' | 'replace', server: object }} */
export function decide(found, { planDir, version, restart = false }) {
  const plan = real(planDir);
  const mine = found.find((s) => s.kind === 'thinkmap' && s.plan === plan);
  if (!mine) return { action: 'start' };
  return mine.version === version && !restart ? { action: 'reuse', server: mine } : { action: 'replace', server: mine };
}

// The process listening on a port, for servers that don't report their pid (before 0.6.1).
function listenerPid(port) {
  if (process.platform === 'win32') return null;
  try {
    const out = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return Number(out.split('\n')[0]) || null;
  } catch { return null; }
}
// Never stop a process unless its command line is a Thinkmap one.
function isThinkmapProcess(pid) {
  if (process.platform === 'win32') return true; // pid came from the server itself
  try {
    return /thinkmap/i.test(execFileSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch { return false; }
}

export async function stopServer(server, { waitMs = 4000 } = {}) {
  const pid = server.pid ?? listenerPid(server.port);
  if (!pid) return { ok: false, pid: null, reason: 'could not find its process' };
  if (pid === process.pid) return { ok: false, pid, reason: 'it is this process' };
  if (!isThinkmapProcess(pid)) return { ok: false, pid, reason: `process ${pid} does not look like Thinkmap` };
  try { process.kill(pid, 'SIGTERM'); } catch (e) { return { ok: false, pid, reason: e.code === 'EPERM' ? 'not allowed to stop it' : e.message }; }
  const until = Date.now() + waitMs;
  while (Date.now() < until) {
    if (!(await probe(server.port, 300))) return { ok: true, pid };
    await new Promise((r) => setTimeout(r, 100));
  }
  return { ok: false, pid, reason: 'it did not stop in time' };
}
