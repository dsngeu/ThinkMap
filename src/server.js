// Local web server: serves the viewer, pushes a fresh graph to the browser
// (Server-Sent Events) whenever a plan file changes or a new commit lands.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { buildGraph, findRepoRoot } from './graph.js';

export const VIEWER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web', 'index.html');

export function exportHtml(graph) {
  const data = JSON.stringify(graph).replace(/</g, '\\u003c');
  return fs.readFileSync(VIEWER, 'utf8').replace('<!--PLAN_DATA-->', `<script>window.__PLAN__=${data};</script>`);
}

export function startServer({ planDir, port = 4400, host = '127.0.0.1', log = console.log, version = null, checkUpdate = null, onUpdate = null, updateHint = null, cli = 'thinkmap' }) {
  const absDir = path.resolve(planDir);
  const repoRoot = findRepoRoot(absDir);
  const clients = new Set();
  let graph;
  let json = '';
  let key = '';
  // Viewer-facing app info: version now, "newer version exists" once the check (if any) returns.
  // pid lets a later `thinkmap serve` for the same plan replace this server when the version changed.
  const app = { version, latest: null, updateAvailable: false, updateHint, cli, pid: process.pid };
  const serialize = () => { json = JSON.stringify({ ...graph, app }); };

  const rebuild = () => {
    graph = buildGraph(absDir, { repoRoot });
    const nextKey = JSON.stringify({ ...graph, generatedAt: null });
    if (nextKey === key) return false;
    key = nextKey;
    serialize();
    return true;
  };
  rebuild();

  const broadcast = () => {
    for (const res of clients) res.write(`event: graph\ndata: ${json}\n\n`);
  };
  // Check at start and again every few hours: a server can stay up for days while a new version ships.
  let announced = null;
  const runCheck = () => Promise.resolve().then(checkUpdate).then((u) => {
    if (!u) return;
    const changed = app.latest !== u.latest || app.updateAvailable !== Boolean(u.newer);
    app.latest = u.latest; app.updateAvailable = Boolean(u.newer);
    if (changed) { serialize(); broadcast(); }
    if (u.newer && onUpdate && announced !== u.latest) { announced = u.latest; onUpdate(u); }
  }).catch(() => { /* offline: no banner */ });
  const updateTimer = checkUpdate ? setInterval(runCheck, 6 * 60 * 60 * 1000) : null;
  if (checkUpdate) runCheck();

  let timer = null;
  const scheduleRebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        if (rebuild()) {
          broadcast();
          log(`↻ plan updated (${graph.nodes.length} nodes, ${graph.stats.errors} errors)`);
        }
      } catch (e) {
        log(`rebuild failed: ${e.message}`);
      }
    }, 150);
  };

  let watcher = null;
  let waitForDir = null;
  const watchPlan = () => {
    try {
      watcher = fs.watch(absDir, { recursive: true }, scheduleRebuild);
    } catch (e) {
      log(`file watching unavailable (${e.message}) — refresh the page manually`);
    }
  };
  if (fs.existsSync(absDir)) watchPlan();
  else {
    // Served before `init`: say so, and start watching the moment the folder appears.
    log(`! ${absDir} does not exist yet — the page explains how to create it (${cli} init --name "Project").`);
    waitForDir = setInterval(() => {
      if (!fs.existsSync(absDir)) return;
      clearInterval(waitForDir); waitForDir = null;
      watchPlan();
      scheduleRebuild();
    }, 1500);
  }
  // The Tooling tab reads <root>/.claude (and a plugin's own folders); watch those too, if present.
  const extraWatchers = [];
  const root = repoRoot || absDir;
  const isPlugin = fs.existsSync(path.join(root, '.claude-plugin', 'plugin.json'));
  for (const d of ['.claude', ...(isPlugin ? ['agents', 'skills', 'commands', 'hooks'] : [])]) {
    const p = path.join(root, d);
    if (p === absDir || !fs.existsSync(p)) continue;
    try { extraWatchers.push(fs.watch(p, { recursive: true }, scheduleRebuild)); } catch { /* best effort */ }
  }

  // New commits can turn tickets green, so poll HEAD.
  let head = null;
  const gitPoll = repoRoot
    ? setInterval(() => {
        execFile('git', ['rev-parse', 'HEAD'], { cwd: repoRoot }, (err, out) => {
          const h = err ? null : out.trim();
          if (head !== null && h !== head) scheduleRebuild();
          head = h;
        });
      }, 3000)
    : null;

  const heartbeat = setInterval(() => {
    for (const res of clients) res.write(': ping\n\n');
  }, 25000);

  const server = http.createServer((req, res) => {
    // Only answer requests addressed to localhost (blocks DNS-rebinding tricks).
    const hostHeader = (req.headers.host ?? '').replace(/:\d+$/, '');
    if (!['localhost', '127.0.0.1', '[::1]'].includes(hostHeader)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(VIEWER, 'utf8'));
    } else if (url.pathname === '/api/graph') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(json);
    } else if (url.pathname === '/api/file') {
      // Serve one plan file for the in-page preview. Only files inside the plan folder.
      const rel = url.searchParams.get('path') || '';
      const abs = path.resolve(repoRoot || absDir, rel);
      if (!abs.startsWith(absDir + path.sep) || !abs.endsWith('.md')) { res.writeHead(403).end('outside plan folder'); return; }
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(abs, 'utf8'));
    } else if (url.pathname === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`event: graph\ndata: ${json}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
    } else {
      res.writeHead(404).end('not found');
    }
  });

  return new Promise((resolve, reject) => {
    // Try `port`, then the next ones while they are taken (another project's map, say).
    let tried = port;
    const onError = (err) => {
      if (err.code === 'EADDRINUSE' && tried < port + 10) server.listen(++tried, host);
      else reject(err);
    };
    server.on('error', onError);
    // One 'listening' handler for all attempts: a callback per listen() call would also fire for
    // the attempts that failed and report a port this server never got.
    server.once('listening', () => {
      server.off('error', onError);
      const p = server.address().port;
      resolve({
        url: `http://localhost:${p}`,
        port: p,
        close: () => {
          watcher?.close();
          clearInterval(waitForDir);
          for (const w of extraWatchers) w.close();
          clearInterval(gitPoll);
          clearInterval(heartbeat);
          clearInterval(updateTimer);
          for (const res of clients) res.end();
          server.close();
        },
      });
    });
    server.listen(port, host);
  });
}
