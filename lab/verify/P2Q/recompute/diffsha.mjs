#!/usr/bin/env node
// V-P2Q check 7 (identity): try to reproduce each receipt's identity.diffSha256, which lib.mjs computes as
// sha256(trim(`git diff HEAD`)) of the checkout that ran the bench. A dirty tree is reproduced when its tracked
// modifications equal some later branch commit's content for a subset of files: then
// `git diff <head> <later> -- <subset>` prints the same text. Read-only git (diff, rev-parse) only.
// Usage: node diffsha.mjs <repo> <receiptsDir> <outDir>
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [repo, receiptsDir, outDir] = process.argv.slice(2);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).trim();
const sha = (s) => createHash('sha256').update(s).digest('hex');
const chain = ['4d0430a', '384d634', '2b73620', '650b18f', 'd7c6086'].map((c) => git('rev-parse', c));

const pairs = new Map();
for (const f of fs.readdirSync(receiptsDir).filter((x) => x.endsWith('.json'))) {
  const r = JSON.parse(fs.readFileSync(path.join(receiptsDir, f), 'utf8'));
  const key = `${r.identity.gitHead}|${r.identity.diffSha256}`;
  if (!pairs.has(key)) pairs.set(key, { head: r.identity.gitHead, diffSha256: r.identity.diffSha256, dirty: r.identity.dirty, receipts: [] });
  pairs.get(key).receipts.push(r.id);
}
const results = [];
for (const p of pairs.values()) {
  const out = { ...p, match: null, tried: 0 };
  if (p.diffSha256 === sha('')) { out.match = { note: 'sha256 of the empty diff: tracked files equal HEAD' }; results.push(out); continue; }
  const start = chain.indexOf(p.head);
  for (const later of chain.slice(start + 1)) {
    const modified = git('diff', '--name-status', p.head, later).split('\n').filter((l) => l.startsWith('M\t')).map((l) => l.slice(2));
    if (modified.length > 14) continue;
    for (let mask = 1; mask < 1 << modified.length && !out.match; mask++) {
      const subset = modified.filter((_f, i) => mask & (1 << i));
      out.tried++;
      if (sha(git('diff', p.head, later, '--', ...subset)) === p.diffSha256) out.match = { later, files: subset };
    }
    if (out.match) break;
  }
  results.push(out);
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'diffsha.json'), JSON.stringify(results, null, 2) + '\n');
for (const r of results) console.log(JSON.stringify({ head: r.head.slice(0, 7), diff: r.diffSha256.slice(0, 12), dirty: r.dirty, receipts: r.receipts.length, tried: r.tried, match: r.match ? { later: r.match.later?.slice(0, 7), files: r.match.files, note: r.match.note } : null, ids: r.receipts }));
