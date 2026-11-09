import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// [CX-VDA01] Why: the review verdict requires observed wrong bytes at the exact candidate, plus fresh control checks and cleanup. Rejected: deriving FIX-FIRST solely from a failed test label.
const dir = import.meta.dirname;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const candidate = '9df8c63be4c7de786103e974f1b1f0a54bc5bfa4';
execFileSync('git', ['diff', '--exit-code', candidate, '--', 'packages/datomic', 'packages/core', 'packages/testkit', 'lab/bin', 'lab/config', 'pnpm-lock.yaml']);
const tests = read('final-tests.json');
assert.equal(tests.numPassedTests, 123); assert.equal(tests.numFailedTests, 1); assert.equal(tests.numPendingTests, 0); assert.equal(tests.success, false);
const failures = tests.testResults.flatMap(s => s.assertionResults.filter(t => t.status === 'failed').map(t => t.fullName));
assert.deepEqual(failures, ['Q89b forced live routes refuse T and TP; source retains rows hidden by position retirement']);
const conformanceFile = fs.readdirSync(dir).find(n => /^CX-VDA01-conformance-.*\.json$/.test(n));
const conformance = read(conformanceFile);
assert.equal(conformance.head, candidate); assert.equal(conformance.completed, true);
assert.equal(conformance.executions.length, 89);
for (const e of conformance.executions) { assert.equal(e.status, 'PASS'); assert.equal(e.cleanup.db, e.created.db); assert.equal(e.cleanup.deleted, true); }
for (const [file, digest] of Object.entries(conformance.built)) assert.equal(hash(fs.readFileSync(file)), digest);
const native = fs.readdirSync(dir).filter(n => /^CX-VDA01-native-.*\.json$/.test(n)).map(n => ({ file: n, ...read(n) })).filter(n => n.scriptSha256 === hash(fs.readFileSync(path.join(dir, 'native-repro.mjs'))));
assert.equal(native.length, 1);
const reproduction = native[0];
assert.equal(reproduction.head, candidate); assert.equal(reproduction.findingReproduced, true); assert.equal(reproduction.cleanup.deleted, true); assert.equal(reproduction.cleanup.db, reproduction.created.db);
for (const [file, digest] of Object.entries(reproduction.source)) assert.equal(hash(fs.readFileSync(file)), digest);
const requests = Object.fromEntries(reproduction.requests.map(x => [x.label, x]));
assert.equal(requests['before-ground-T'].parsed.rows.length, 40);
for (const axis of ['T', 'TP']) {
  assert.equal(requests[`after-literal-${axis}`].status, 409);
  assert.equal(requests[`after-literal-${axis}`].parsed.code, 'BasisNotAvailable');
  assert.equal(requests[`after-source-${axis}`].count, 40);
  for (const route of ['ground', 'ident']) {
    const r = requests[`after-${route}-${axis}`];
    assert.equal(r.status, 200); assert.equal(r.parsed.rows.length, 30);
    assert.ok(r.body.edn.includes('triplex.gateway.query/visible'));
  }
}
assert.notEqual(requests['before-ground-T'].raw, requests['after-ground-T'].raw);
const expected = JSON.parse(fs.readFileSync('lab/experiments/EXP-DA01/round3/SUMMARY.json', 'utf8'));
assert.deepEqual(reproduction.health, expected.health); assert.deepEqual(conformance.health, expected.health);
assert.deepEqual(reproduction.owner, expected.owner); assert.deepEqual(conformance.owner, expected.owner);
assert.equal(fs.readFileSync('/Users/sam/projects/triplex-db-2/lab/locks/datomic-dev/owner.json', 'utf8'), JSON.stringify(expected.owner, null, 2) + '\n');
const health = await (await fetch(expected.owner.endpoint + '/health')).json(); assert.deepEqual(health, expected.health);
const preservation = [];
for (const proof of expected.preservation) {
  const response = await fetch(`${expected.owner.endpoint}/v1/db/${proof.db}/basis`);
  const body = await response.json(); assert.equal(response.status, 200); assert.deepEqual(body, proof.basis);
  preservation.push({ db: proof.db, status: response.status, body });
}
const policy = JSON.parse(fs.readFileSync('lab/config/g0-expected-skips.json', 'utf8'));
const liveNames = tests.testResults.filter(s => s.name.includes('/packages/datomic/') && !s.name.endsWith('/client.test.ts') && !s.name.endsWith('/query.test.ts')).flatMap(s => s.assertionResults.map(t => `packages/datomic/test/${path.basename(s.name)} :: ${t.fullName.trim()}`));
assert.equal(liveNames.length, 16); assert.deepEqual([...liveNames].sort(), [...policy.skips.datomic].sort());
const context = read('context-results.json'); assert.equal(context.reproducibleStaging, true); assert.equal(context.scratchRemoved, true); assert.equal(context.imageRebuilt, false);
assert.equal(context.checks.length, 2); for (const c of context.checks) { assert.equal(c.files, 811); for (const key of ['reusedRefused', 'extraFileRefused', 'symlinkRefused', 'emptyDirectoryRefused', 'changedBytesRefused']) assert.equal(c[key], true); }
assert.equal(context.checks[0].manifestSha256, context.checks[1].manifestSha256);
assert.ok(Date.parse(reproduction.startedAt) > Date.parse(conformance.startedAt));
const summary = { at: new Date().toISOString(), reviewer: 'CX-VDA01', candidate, verdict: 'FIX-FIRST', finding: { id: 'F1', severity: 'High', file: 'packages/datomic/gateway/src/triplex/gateway/query.clj:36', reproduction: reproduction.file }, finalTests: { total: 124, pass: 123, fail: 1, skipped: 0, failures }, conformance: { file: conformanceFile, current: 44, reopen: 44, completeSuite: true, cleaned: 89 }, policy: { datomicSkippedOffline: 16, allExecutedLive: true }, context, health, owner: reproduction.owner, preservation, tools: { node: process.version, pnpm: execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim(), effect: JSON.parse(fs.readFileSync('node_modules/effect/package.json', 'utf8')).version }, limits: ['Dev storage: durability and P2 receipt results DIAGNOSTIC under Q88a', 'No Docker image rebuild or engine lifecycle action; fresh staging independently reproduced', 'No production, tenancy, erasure, scale or P1-P5 acceptance'] };
fs.writeFileSync(path.join(dir, 'SUMMARY.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
const walk = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(root, d.name)) : [path.join(root, d.name)]);
const files = walk(dir).filter(p => !['FILES.json', 'collect.log'].includes(path.basename(p))).map(p => ({ path: path.relative(dir, p), bytes: fs.statSync(p).size, sha256: hash(fs.readFileSync(p)) }));
fs.writeFileSync(path.join(dir, 'FILES.json'), JSON.stringify({ at: new Date().toISOString(), files }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ verdict: summary.verdict, finding: summary.finding, conformance: summary.conformance, files: files.length, preservation }, null, 2));
