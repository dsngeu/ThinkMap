import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { probe, findServers, decide, stopServer } from '../src/handoff.js';
import { startServer } from '../src/server.js';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'thinkmap.js');
const planDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'thinkmap-serve-'));
const freePort = () => new Promise((resolve) => { const s = http.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const quiet = () => {};

// Run the real CLI in a child process; resolve once it prints its first line(s).
// Every child is stopped when the file ends, even after a failed assertion.
const children = [];
after(() => { for (const c of children) if (c.exitCode === null) c.kill(); });
function serve(dir, port, extra = []) {
  const child = spawn(process.execPath, [CLI, 'serve', dir, '--port', String(port), '--no-update-check', ...extra], { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  let out = '';
  const ready = new Promise((resolve, reject) => {
    child.stdout.on('data', (d) => { out += d; if (/serving|already serving/.test(out)) resolve(out); });
    child.on('exit', () => resolve(out));
    setTimeout(() => reject(new Error(`no output: ${out}`)), 8000);
  });
  return { child, ready, output: () => out };
}
const exited = (child) => new Promise((resolve) => (child.exitCode !== null ? resolve() : child.on('exit', resolve)));

test('decide: reuse the same version, replace another version, ignore other plans', () => {
  const dir = planDir();
  const mine = { port: 4400, kind: 'thinkmap', plan: fs.realpathSync(dir), version: '0.6.1', pid: 1 };
  const other = { port: 4400, kind: 'thinkmap', plan: '/somewhere/else', version: '0.5.0', pid: 2 };
  assert.deepEqual(decide([], { planDir: dir, version: '0.6.1' }), { action: 'start' });
  assert.deepEqual(decide([other, { port: 4401, kind: 'other' }], { planDir: dir, version: '0.6.1' }), { action: 'start' });
  assert.equal(decide([other, mine], { planDir: dir, version: '0.6.1' }).action, 'reuse');
  assert.equal(decide([mine], { planDir: dir, version: '0.6.1', restart: true }).action, 'replace');
  assert.equal(decide([{ ...mine, version: '0.5.0' }], { planDir: dir, version: '0.6.1' }).action, 'replace');
});

test('probe tells nothing, a foreign server and a Thinkmap server apart', async () => {
  const free = await freePort();
  assert.equal(await probe(free), null);
  const foreign = http.createServer((req, res) => res.end('hello')).listen(0, '127.0.0.1');
  await new Promise((r) => foreign.once('listening', r));
  assert.deepEqual(await probe(foreign.address().port), { port: foreign.address().port, kind: 'other' });
  foreign.close();
  const dir = planDir();
  const srv = await startServer({ planDir: dir, port: await freePort(), log: quiet, version: '9.9.9' });
  const p = await probe(srv.port);
  assert.equal(p.kind, 'thinkmap');
  assert.equal(p.plan, fs.realpathSync(dir));
  assert.equal(p.version, '9.9.9');
  assert.equal(p.pid, process.pid);
  assert.ok((await findServers(srv.port, 2)).some((s) => s.port === srv.port));
  // never stops the process that asks
  assert.deepEqual(await stopServer(p), { ok: false, pid: process.pid, reason: 'it is this process' });
  srv.close();
});

test('serve reuses a running copy for the same plan, replaces it with --restart, leaves other plans alone', async () => {
  const dir = planDir();
  const port = await freePort();
  const first = serve(dir, port);
  assert.match(await first.ready, new RegExp(`serving .*\\n {3}http://localhost:${port}`));

  // same plan, same version: no second copy
  const again = serve(dir, port);
  assert.match(await again.ready, /already serving/);
  await exited(again.child);
  assert.equal(first.child.exitCode, null);

  // a different plan on the same port is not touched: the new one moves to the next port
  const other = serve(planDir(), port);
  assert.match(await other.ready, new RegExp(`http://localhost:${port + 1}`));
  assert.equal(first.child.exitCode, null);
  other.child.kill();

  // --restart (as after an update) stops the old copy and takes its port
  const fresh = serve(dir, port, ['--restart']);
  const out = await fresh.ready;
  assert.match(out, new RegExp(`↻ stopped Thinkmap .* on port ${port} \\(process ${first.child.pid}\\)`));
  assert.match(out, new RegExp(`http://localhost:${port} `));
  await exited(first.child);
  fresh.child.kill();
  await exited(fresh.child);
});
