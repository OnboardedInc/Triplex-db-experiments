import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { splitTransaction } from './mutate.mjs';
// [CX-VFD01] Why: bind counterexamples to original source, exact mutator bytes, fresh reports and retained databases.
// Rejected: treating exit zero as semantic acceptance or reusing the builder's PASS receipts.
const root = path.resolve(import.meta.dirname, '../../..');
const local = import.meta.dirname;
const base = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VFD01';
const read = (p) => JSON.parse(fs.readFileSync(p));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const head = '32f2843b298264851078d1697c15557bf13c7ea3';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const files = ['packages/core/src/feed/index.ts', 'packages/host/src/feed/ConsumerStore.ts',
  'packages/host/src/feed/Adapters.ts', 'packages/host/src/feed/BrokerReader.ts', 'packages/host/src/feed/index.ts',
  'packages/testkit/src/feed/index.ts', 'packages/host/test/feed/feed.test.ts', 'packages/host/test/feed/crash-child.mjs',
  'lab/bench/lib/feed.ts', 'pnpm-lock.yaml'];
const preimages = base + '/review-binding/preimages'; fs.mkdirSync(preimages, { recursive: true });
const bound = {};
for (const f of files) {
  const bytes = fs.readFileSync(path.join(root, f));
  const original = execFileSync('git', ['show', head + ':' + f], { cwd: root });
  assert.equal(sha(bytes), sha(original), 'Reviewed source moved: ' + f);
  bound[f] = sha(bytes);
  fs.mkdirSync(path.dirname(preimages + '/' + f), { recursive: true });
  fs.writeFileSync(preimages + '/' + f, bytes);
}
assert.equal(git('diff', head, '--name-only', '--', 'lab/acceptance'), '');
const baseline = read(local + '/baseline-native.json');
const mutant = read(local + '/mutant.json');
for (const r of [baseline, mutant]) {
  assert.equal(r.success, true); assert.equal(r.numPassedTests, 11); assert.equal(r.numFailedTests, 0);
  assert.ok(r.testResults[0].name.endsWith('/verify-fd01/packages/host/test/feed/feed.test.ts'));
  assert.ok(r.testResults[0].assertionResults.some((t) => t.title.includes('100 actual process stops')));
}
const results = fs.readdirSync(base).flatMap((d) => fs.existsSync(base + '/' + d + '/result.json') ? [read(base + '/' + d + '/result.json')] : []);
const probe = results.find((r) => r.keyedSplitMatrix);
const clock = results.find((r) => r.clocks && r.reportedLagMs !== undefined);
const duplicates = results.find((r) => r.rejection);
const traces = Object.fromEntries(results.filter((r) => r.statements).map((r) => [r.mode, r]));
assert.deepEqual(traces.baseline.statements, ['BEGIN IMMEDIATE', 'COMMIT']);
assert.deepEqual(traces.mutant.statements, ['BEGIN IMMEDIATE', 'COMMIT; BEGIN IMMEDIATE', 'COMMIT']);
assert.equal(probe.sourceUnchanged, true);
assert.deepEqual(probe.keyedSplitMatrix, { keyedCrashes: 300, controlCrashes: 300, controlDuplicates: 100 });
assert.equal(probe.splitAtomicityViolations, 100);
for (const c of probe.checks.filter((c) => c.expectedRejected !== undefined && !c.name.includes('publication') && !c.name.includes('decided-stamp')))
  assert.equal(c.rejected, c.expectedRejected, c.name);
assert.equal(clock.sourceUnchanged, true); assert.equal(clock.reportedLagMs, 1); assert.equal(clock.publicationLagMs, 300);
assert.equal(duplicates.rejection, 'Error: Keyed crash failed: after-effect/0');
const mutantSource = splitTransaction(fs.readFileSync(root + '/packages/host/src/feed/ConsumerStore.ts', 'utf8'));
fs.writeFileSync(base + '/review-binding/ConsumerStore.split-mutant.ts', mutantSource);
for (const name of fs.readdirSync(local).filter((p) => (/\.(mjs|log|json)$/.test(p) || p === 'VERIFY.md') && p !== 'seal.log' && p !== 'seal-final.log'))
  fs.copyFileSync(local + '/' + name, base + '/review-binding/' + name);
const receipt = {
  review: 'CX-VFD01', reviewedHead: head, generatedAt: new Date().toISOString(), engines: false, slot: null,
  source: bound, acceptanceUnchanged: true, mutatedSourceSha256: sha(mutantSource),
  baseline: { passed: 11, failed: 0, started: baseline.startTime, durationMs: baseline.testResults[0].endTime - baseline.testResults[0].startTime },
  splitMutant: { passed: 11, failed: 0, started: mutant.startTime, durationMs: mutant.testResults[0].endTime - mutant.testResults[0].startTime },
  probe: probe.dir, clock: clock.dir, duplicates: duplicates.dir,
  transactionTraces: { baseline: traces.baseline.dir, mutant: traces.mutant.dir },
  verdict: 'FIX-FIRST',
  interpretation: 'Split transactions survive conformance; source-publication clock rejection is absent. Offline review only.',
};
fs.writeFileSync(base + '/review-binding/receipt.json', JSON.stringify(receipt, null, 2));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
const sums = walk(base).sort().map((p) => sha(fs.readFileSync(p)) + '  ' + path.relative(base, p)).join('\n') + '\n';
fs.writeFileSync(local + '/SHA256SUMS', sums);
fs.writeFileSync(local + '/receipt.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
