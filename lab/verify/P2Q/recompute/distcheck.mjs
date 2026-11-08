#!/usr/bin/env node
// V-P2Q check 7 (identity): which package code did the receipts' distSha256 values run?
// 1. Recompute distSha256 of the experiment checkout's current dist, with lib.mjs's algorithm (read-only).
// 2. Compare that checkout's packages/qlever/src and packages/core/src files byte-for-byte with commit d7c6086.
// 3. List source mtimes newer than dist/index.js (the stale-dist guard lib.mjs added after cad02c).
// Usage: node distcheck.mjs <expCheckout> <verifyRepo> <outDir>
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [exp, repo, outDir] = process.argv.slice(2);
const dist = createHash('sha256');
const distFiles = [];
for (const pkg of ['packages/qlever/dist', 'packages/core/dist'])
  for (const file of fs.readdirSync(path.join(exp, pkg), { recursive: true }).filter((f) => String(f).endsWith('.js')).sort()) {
    dist.update(String(file)).update(fs.readFileSync(path.join(exp, pkg, String(file))));
    distFiles.push(`${pkg}/${file}`);
  }
const distSha256 = dist.digest('hex');
const builtAt = fs.statSync(path.join(exp, 'packages/qlever/dist/index.js')).mtime.toISOString();

const tracked = execFileSync('git', ['-C', repo, 'ls-tree', '-r', '--name-only', 'd7c6086', '--', 'packages/qlever/src', 'packages/core/src'], { encoding: 'utf8' }).trim().split('\n');
const differ = [], missing = [], newer = [];
const builtMs = fs.statSync(path.join(exp, 'packages/qlever/dist/index.js')).mtimeMs;
for (const file of tracked) {
  const local = path.join(exp, file);
  if (!fs.existsSync(local)) { missing.push(file); continue; }
  const blob = execFileSync('git', ['-C', repo, 'show', `d7c6086:${file}`], { maxBuffer: 64 * 1024 * 1024 });
  if (!blob.equals(fs.readFileSync(local))) differ.push(file);
  if (fs.statSync(local).mtimeMs > builtMs) newer.push({ file, mtime: fs.statSync(local).mtime.toISOString() });
}
// Untracked .ts files under the source trees (would be built but not hashed by git diff).
const untracked = [];
for (const dir of ['packages/qlever/src', 'packages/core/src'])
  for (const f of fs.readdirSync(path.join(exp, dir), { recursive: true }).map(String).filter((f) => f.endsWith('.ts')))
    if (!tracked.includes(`${dir}/${f}`)) untracked.push(`${dir}/${f}`);
const out = { exp, distSha256, builtAt, distFiles: distFiles.length, trackedSources: tracked.length, differFromD7c6086: differ, missing, untracked, sourcesNewerThanDist: newer };
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'distcheck.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
