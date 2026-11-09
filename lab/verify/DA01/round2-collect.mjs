import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// [CX-VDA01-R2] Why: qualify the observed parser mismatch separately from passing controls, using only this round's exact sources, attempts and cleanup. Rejected: a builder PASS or zero exit from a defect-characterization script (neither proves correct results).
const root = import.meta.dirname, dir = path.join(root, 'round2');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const authority = JSON.parse(fs.readFileSync('lab/experiments/EXP-DA01/round4/SUMMARY.json', 'utf8'));
const candidate = execFileSync('git', ['rev-parse', 'da76bad'], { encoding: 'utf8' }).trim();
const reviewMerge = 'aea78ce0ef6c821757d04312a3077e76188e5569';
execFileSync('git', ['diff', '--exit-code', candidate, '--', 'packages/datomic', 'packages/core', 'packages/testkit', 'lab/bin', 'lab/config', 'pnpm-lock.yaml']);
const baseline = read('baseline-tests.json'); assert.equal(baseline.numPassedTests, 124); assert.equal(baseline.numFailedTests, 0); assert.equal(baseline.numPendingTests, 0);
const final = read('final-tests-2.json');
assert.equal(final.numPassedTests, 127); assert.equal(final.numFailedTests, 1); assert.equal(final.numPendingTests, 0);
const failed = final.testResults.flatMap(s => s.assertionResults.filter(t => t.status === 'failed').map(t => t.fullName));
assert.deepEqual(failed, ['R2 native query grammar rejects every unsupported historical live selection']);
const nativeFiles = fs.readdirSync(dir).filter(n => /^CX-VDA01-native-.*\.json$/.test(n));
const natives = nativeFiles.map(file => ({ file, ...read(file) }));
const repro = natives.find(r => r.queryVariant === 'duplicate-sections'); assert.ok(repro); assert.equal(repro.findingReproduced, true);
assert.equal(repro.scriptSha256, hash(fs.readFileSync(path.join(root, 'native-repro.mjs'))));
const old = natives.find(r => !r.queryVariant); assert.ok(old); assert.equal(old.findingReproduced, undefined);
const oldRequests = Object.fromEntries(old.requests.map(r => [r.label, r]));
for (const form of ['ground', 'ident']) for (const axis of ['T', 'TP']) { assert.equal(oldRequests[`after-${form}-${axis}`].status, 409); assert.equal(oldRequests[`after-${form}-${axis}`].parsed.code, 'BasisNotAvailable'); }
const reqs = Object.fromEntries(repro.requests.map(r => [r.label, r]));
assert.equal(reqs['before-ground-T'].status, 200); assert.equal(reqs['before-ground-T'].parsed.rows.length, 40);
for (const axis of ['T', 'TP']) {
  assert.equal(reqs[`after-literal-${axis}`].status, 409); assert.equal(reqs[`after-literal-${axis}`].parsed.code, 'BasisNotAvailable'); assert.equal(reqs[`after-source-${axis}`].count, 40);
  for (const form of ['ground', 'ident']) { const r = reqs[`after-${form}-${axis}`]; assert.equal(r.status, 200); assert.equal(r.parsed.rows.length, 30); assert.ok(r.body.edn.includes('triplex.gateway.query/visible')); }
}
for (const n of natives) { assert.deepEqual(n.health, authority.health); assert.equal(n.head, reviewMerge); assert.equal(n.cleanup.deleted, true); assert.equal(n.cleanup.db, n.created.db); }
for (const [f, digest] of Object.entries(repro.source)) assert.equal(hash(fs.readFileSync(f)), digest);
const conformanceFile = fs.readdirSync(dir).find(n => n.startsWith('CX-VDA01-conformance-') && n.endsWith('.json'));
const conformance = read(conformanceFile); assert.equal(conformance.head, reviewMerge); assert.equal(conformance.completed, true); assert.equal(conformance.executions.length, 89);
for (const e of conformance.executions) { assert.equal(e.status, 'PASS'); assert.equal(e.cleanup.deleted, true); assert.equal(e.created.db, e.cleanup.db); }
for (const [f, digest] of Object.entries(conformance.built)) assert.equal(hash(fs.readFileSync(f)), digest);
const attempts = fs.readdirSync(path.join(dir, 'attempts')).map(name => {
  const base = path.join(dir, 'attempts', name), input = JSON.parse(fs.readFileSync(path.join(base, 'inputs.json'), 'utf8'));
  const events = fs.readFileSync(path.join(base, 'observations.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).map(e => e.value);
  const cleanup = events.filter(e => e.kind === 'cleanup'), created = events.filter(e => e.kind === 'created');
  if (created.length) { assert.equal(created.length, 1); assert.equal(cleanup.length, 1); assert.equal(cleanup[0].db, created[0].db); assert.equal(cleanup[0].deleted, true); }
  const completion = events.find(e => e.kind === 'finished') ?? events.find(e => e.kind === 'completion'); assert.ok(completion);
  assert.deepEqual(input.health, authority.health); assert.equal(input.head, reviewMerge);
  return { name, input, events, cleanup };
});
const currentHash = Object.fromEntries(fs.readdirSync(root).filter(f => f.startsWith('round2-') && f !== 'round2-collect.mjs').map(f => [f, hash(fs.readFileSync(path.join(root, f)))]));
const latest = attempts.filter(a => a.input.reviewerSources && Object.entries(a.input.reviewerSources).every(([f, h]) => f === 'round2-collect.mjs' || currentHash[f] === h));
const matrix = latest.find(a => a.name.startsWith('matrix-')); assert.ok(matrix);
const coverage = matrix.events.find(e => e.kind === 'matrix-coverage'); assert.equal(coverage.expectedObservations, 916);
const observations = matrix.events.filter(e => e.kind === 'independent-matrix'); assert.equal(observations.length, 916);
for (const e of observations) {
  if (e.eligible) assert.deepEqual([...e.observed.rows].sort(), [...e.expected].sort());
  else assert.equal(e.observed.code, 'BasisNotAvailable');
}
assert.ok(latest.find(a => a.name.startsWith('pagination-'))?.events.find(e => e.kind === 'pagination-straddle'));
assert.ok(latest.find(a => a.name.startsWith('basis-free-'))?.events.find(e => e.kind === 'basis-free-contracts'));
const grammar = latest.find(a => a.name.startsWith('grammar-')); assert.ok(grammar);
const cases = grammar.events.filter(e => e.kind === 'grammar-case');
assert.equal(cases.find(c => c.name === 'duplicateWhere').outcome.status, 'answered');
assert.equal(cases.find(c => c.name === 'duplicateInLive').outcome.status, 'answered');
for (const kind of ['ground', 'ident', 'literal', 'lookup', 'omitted', 'nested', 'explicitSource']) assert.equal(cases.find(c => c.name === kind).outcome.code, 'BasisNotAvailable');
const context = read('context-results.json'); assert.equal(context.reproducibleStaging, true); assert.equal(context.scratchRemoved, true); assert.equal(context.imageRebuilt, false); assert.equal(context.checks.length, 2);
assert.equal(context.checks[0].manifestSha256, context.checks[1].manifestSha256);
const ownerBytes = fs.readFileSync('/Users/sam/projects/triplex-db-2/lab/locks/datomic-dev/owner.json', 'utf8'); assert.deepEqual(JSON.parse(ownerBytes), authority.owner);
const health = await (await fetch(authority.owner.endpoint + '/health')).json(); assert.deepEqual(health, authority.health);
const preservation = [];
for (const p of authority.preservation) { const r = await fetch(`${authority.owner.endpoint}/v1/db/${p.db}/basis`); const body = await r.json(); assert.equal(r.status, 200); assert.deepEqual(body, p.basis); preservation.push({ db: p.db, status: r.status, body }); }
const summary = { at: new Date().toISOString(), reviewer: 'CX-VDA01-R2', candidate, reviewMerge, verdict: 'FIX-FIRST', finding: { id: 'R2-F1', severity: 'High', location: 'packages/datomic/gateway/src/triplex/gateway/query.clj:28', mechanism: 'First-section route/input proof differs from later repeated sections executed by Datomic', reproduction: repro.file }, originalF1: { closed: true, reproduction: old.file }, tests: { baseline: { pass: 124, fail: 0, skipped: 0 }, final: { pass: 127, fail: 1, skipped: 0, failed } }, independentMatrix: { attempt: matrix.name, ...coverage, observations: observations.length, answers: observations.filter(e => e.eligible).length, refusals: observations.filter(e => !e.eligible).length }, conformance: { file: conformanceFile, current: 44, secondOpening: 44, completeSuite: true, cleaned: 89 }, context, health, owner: JSON.parse(ownerBytes), preservation, limits: ['Dev-storage durability/P2 receipts DIAGNOSTIC under Q88a', 'Future record-time refusal remains Q89a/Q90 work; tested current history behavior, not watermark acceptance', 'Physical position cuts can use :f/live over as-of, as allowed by Q89e; record-time/interior cuts must refuse', 'Public TemporalBasis has no explicit position field; position matrix uses SPI, public pages capture and preserve positions', 'No Docker lifecycle, image rebuild, production, scale or root-wide checks'] };
fs.writeFileSync(path.join(dir, 'SUMMARY.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
const walk = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(root, e.name)) : [path.join(root, e.name)]);
const files = [...walk(dir), ...fs.readdirSync(root).filter(f => f.startsWith('round2-') || ['review.test.ts', 'native-repro.mjs', 'context.mjs', 'conformance.mjs', 'vitest.config.ts'].includes(f)).map(f => path.join(root, f)), path.join(root, 'VERIFY-round2.md')].filter(f => !['FILES.json', 'collect.log'].includes(path.basename(f))).map(f => ({ path: path.relative(root, f), bytes: fs.statSync(f).size, sha256: hash(fs.readFileSync(f)) }));
fs.writeFileSync(path.join(dir, 'FILES.json'), JSON.stringify({ at: new Date().toISOString(), relativeTo: 'lab/verify/DA01', files }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ verdict: summary.verdict, originalF1: summary.originalF1, finding: summary.finding, tests: summary.tests, matrix: summary.independentMatrix, conformance: summary.conformance, files: files.length }, null, 2));
