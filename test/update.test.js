import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { compareVersions, detectInstall, updatePlan, checkLatest, runUpdate, npxCacheEntries, SPEC } from '../src/update.js';

test('compareVersions handles numeric segments and v-prefix', () => {
  assert.equal(compareVersions('0.2.0', '0.1.0'), 1);
  assert.equal(compareVersions('0.1.0', '0.2.0'), -1);
  assert.equal(compareVersions('v1.10.0', '1.9.9'), 1);
  assert.equal(compareVersions('1.0.0', '1.0'), 0);
  assert.equal(compareVersions('1.0.0-beta', '1.0.0'), 0);
});

test('detectInstall recognises npx cache, dependency and clone', () => {
  const npx = detectInstall('/Users/me/.npm/_npx/7cba2675a78f2144/node_modules/thinkmap', () => false);
  assert.equal(npx.kind, 'npx');
  assert.equal(npx.cacheDir, path.join('/Users/me/.npm/_npx/7cba2675a78f2144'));
  const dep = detectInstall('/work/app/node_modules/thinkmap', () => false);
  assert.equal(dep.kind, 'dependency');
  assert.equal(dep.projectDir, path.join('/work/app'));
  assert.equal(detectInstall('/Users/me/thinkmap', (p) => p.endsWith('.git')).kind, 'clone');
  assert.equal(detectInstall('/tmp/x', () => false).kind, 'unknown');
});

test('updatePlan picks the right command per install kind', () => {
  const npx = updatePlan({ kind: 'npx', cacheDir: '/c' });
  assert.match(npx.cmd, /^npm/);
  assert.deepEqual(npx.args.slice(0, 3), ['install', '--prefix', '/c']);
  assert.equal(npx.args.at(-1), SPEC);
  const dep = updatePlan({ kind: 'dependency', projectDir: '/p' });
  assert.equal(dep.cwd, '/p');
  assert.equal(dep.args.at(-1), SPEC);
  assert.deepEqual(updatePlan({ kind: 'clone', dir: '/d' }), { cmd: 'git', args: ['pull', '--ff-only'], cwd: '/d', explain: 'git pull in /d' });
  assert.equal(updatePlan({ kind: 'unknown' }), null);
});

test('checkLatest compares with GitHub, fails soft, respects opt-out', async () => {
  const fetchOk = async () => ({ ok: true, json: async () => ({ version: '0.3.0' }) });
  assert.deepEqual(await checkLatest({ current: '0.2.0', fetchFn: fetchOk, env: {} }), { current: '0.2.0', latest: '0.3.0', newer: true });
  assert.equal((await checkLatest({ current: '0.3.0', fetchFn: fetchOk, env: {} })).newer, false);
  assert.equal(await checkLatest({ current: '0.2.0', fetchFn: async () => ({ ok: false }), env: {} }), null);
  assert.equal(await checkLatest({ current: '0.2.0', fetchFn: async () => { throw new Error('offline'); }, env: {} }), null);
  assert.equal(await checkLatest({ current: '0.2.0', fetchFn: fetchOk, env: { THINKMAP_NO_UPDATE_CHECK: '1' } }), null);
});

test('runUpdate explains and refuses when the install kind is unknown', () => {
  const lines = [];
  const r = runUpdate({ pkgDir: '/nowhere/thinkmap-x', log: (s) => lines.push(s), spawn: () => { throw new Error('must not spawn'); } });
  assert.equal(r.ok, false);
  assert.match(lines.join('\n'), /Re-install it/);
});

test('npxCacheEntries finds every cached Thinkmap copy and its spec', () => {
  const fsx = {
    '/n/aaaa/node_modules/thinkmap/package.json': true,
    '/n/bbbb/node_modules/thinkmap/package.json': true,
    '/n/cccc/node_modules/thinkmap/package.json': true, // another package also called thinkmap
  };
  const pkgs = { '/n/aaaa/package.json': '{"dependencies":{"thinkmap":"github:dsngeu/ThinkMap"}}', '/n/bbbb/package.json': '{"dependencies":{"thinkmap":"github:dsngeu/ThinkMap#master"}}', '/n/cccc/package.json': '{"dependencies":{"thinkmap":"npm:other-thinkmap@1"}}' };
  const list = npxCacheEntries('/n', () => ['aaaa', 'bbbb', 'cccc', 'not-a-hash', 'dddd'], (p) => Boolean(fsx[p]), (p) => { if (!pkgs[p]) throw new Error('nope'); return pkgs[p]; });
  assert.deepEqual(list, [{ dir: path.join('/n/aaaa'), spec: 'github:dsngeu/ThinkMap' }, { dir: path.join('/n/bbbb'), spec: 'github:dsngeu/ThinkMap#master' }]);
});

test('runUpdate in npx mode re-installs each cached copy', () => {
  const calls = [];
  const r = runUpdate({ pkgDir: '/h/.npm/_npx/abcd/node_modules/thinkmap', log: () => {}, spawn: (cmd, args, o) => { calls.push({ cmd, args, cwd: o.cwd }); return { status: 0 }; } });
  // the fake path has no real cache siblings, so it falls back to its own entry
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cwd, path.join('/h/.npm/_npx/abcd'));
  assert.equal(calls[0].args.at(-1), SPEC);
  assert.equal(r.ok, true);
});
