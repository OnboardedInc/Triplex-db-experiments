// [CX-VQNODELAY] Why: recompute from observed bytes and scan every changed pin independently.
// Rejected: trusting the builder's aggregate numbers or its declared pin list.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const sha = x => createHash('sha256').update(x).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const builder = '08a117761279de9ea0562b4f134b68df08889d6a';
const evidence = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QNODELAY';
const result = { classification: 'INDEPENDENT OFFLINE AUDIT; no performance admission', builder, startedAt: new Date().toISOString(), checksums: [], attempts: [], pins: [] };
for (const line of fs.readFileSync('lab/experiments/EXP-QNODELAY/SHA256SUMS', 'utf8').trim().split('\n')) {
  const [, expected, file] = /^(\w{64})\s+(.+)$/.exec(line);
  const actual = sha(fs.readFileSync(file));
  assert.equal(actual, expected, file);
  result.checksums.push({ file, sha256: actual });
}
for (const attempt of ['attempt1', 'attempt2', 'attempt3', 'attempt4']) {
  const dir = path.join(evidence, attempt), raw = fs.readFileSync(path.join(dir, 'result.json'));
  const r = JSON.parse(raw), groups = {};
  for (const [i, [p, h]] of Object.entries(r.sources).entries()) {
    assert.equal(sha(fs.readFileSync(path.join(dir, `source-${i}${path.extname(p)}`))), h);
    if (attempt === 'attempt4' && !p.includes('/dist/')) assert.equal(sha(fs.readFileSync(p)), h, p);
  }
  const indices = new Set();
  for (const s of r.samples) {
    const nonce = `${r.attempt}:${s.round}:${s.size}:${s.i}`;
    const key = `${s.round}/${s.size}/${s.i}`;
    assert(!indices.has(key)); indices.add(key);
    assert(s.query.includes(JSON.stringify(nonce)));
    assert.equal(s.warmup, s.i < 0);
    assert(Date.parse(s.at) >= Date.parse(r.startedAt) && Date.parse(s.at) <= Date.parse(r.endedAt));
    const expected = [{ nonce: { type: 'literal', value: nonce }, payload: { type: 'literal', value: 'x'.repeat(s.size) } }];
    assert.equal(sha(s.decodedBindingBytes), s.decodedBindingsSha256);
    if (r.completed) {
      assert.deepEqual(JSON.parse(s.decodedBindingBytes), expected);
      assert.equal(sha(JSON.stringify(expected)), s.expectedSha256);
      assert.equal(s.contentEqual, true);
    }
    if (s.warmup) continue;
    for (const size of [s.size, 'all']) (groups[`${s.connectionMode}/${size}`] ??= []).push(s.ms);
  }
  const summaries = Object.entries(groups).map(([key, xs]) => {
    xs.sort((a, b) => a - b);
    return { key, n: xs.length, p50Ms: xs[Math.ceil(xs.length * .5) - 1], p99Ms: xs[Math.ceil(xs.length * .99) - 1], stalls: xs.filter(x => x >= 35).length };
  });
  if (r.completed) {
    assert.equal(r.samples.length, 520);
    for (const cell of r.summary) {
      const xs = r.samples.filter(s => !s.warmup && s.round === cell.round && s.size === cell.payloadBytes).map(s => s.ms).sort((a,b)=>a-b);
      assert.equal(cell.p50Ms, xs[Math.ceil(xs.length * .5) - 1]);
      assert.equal(cell.p99Ms, xs[Math.ceil(xs.length * .99) - 1]);
      assert.equal(cell.stallCount, xs.filter(x => x >= 35).length);
    }
  }
  result.attempts.push({ attempt, sha256: sha(raw), completed: r.completed, error: r.error, samples: r.samples.length, summaries });
}
const changed = git('diff', '--name-only', builder + '^', builder).split('\n');
const oldNew = changed.filter(p => fs.existsSync(p)).map(p => {
  let old = null;
  try { old = sha(execFileSync('git', ['show', `${builder}^:${p}`], { stdio: ['ignore','pipe','ignore'] })); } catch {}
  return { path: p, old, new: sha(fs.readFileSync(p)) };
});
const acceptance = git('ls-files', 'lab/acceptance').split('\n');
for (const p of acceptance.filter(p => p.endsWith('.json'))) {
  const raw = fs.readFileSync(p, 'utf8');
  for (const file of oldNew.filter(x => x.old)) {
    if (!raw.includes(file.path)) continue;
    // Record all path references, including adjacent pins not in the builder's reported section.
    for (const [i, line] of raw.split('\n').entries()) if (line.includes(file.path)) {
      const context = raw.split('\n').slice(Math.max(0, i-2), i+5).join('\n');
      result.pins.push({ acceptanceFile: p, line: i+1, ...file, context });
    }
  }
}
result.acceptanceChanged = changed.filter(p => p.startsWith('lab/acceptance/'));
result.endedAt = new Date().toISOString();
fs.writeFileSync('lab/verify/QNODELAY/offline-audit.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ verifiedChecksums: result.checksums.length, attempts: result.attempts, pins: result.pins, acceptanceChanged: result.acceptanceChanged }, null, 2));
