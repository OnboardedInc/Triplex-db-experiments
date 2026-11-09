import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// [CX-VDA01-R3] Why: ACCEPT requires fresh canonical-result/route equality, refusal bytes, full controls and exact source/slot binding. Rejected: trusting a builder PASS or merely observing no thrown exception (neither proves the requested content).
const root = import.meta.dirname, dir = path.join(root, 'round3');
const hash = x => createHash('sha256').update(x).digest('hex');
const read = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const authority = JSON.parse(fs.readFileSync('lab/experiments/EXP-DA01/round5/SUMMARY.json', 'utf8'));
const candidate = '89c31355ec63d4dc01a337ec73ef4ef394b77293';
const merge = '87124a17fca92f1aa0d432c0aba429cce6241007';
execFileSync('git', ['diff', '--exit-code', candidate, '--', 'packages/datomic', 'packages/core', 'packages/testkit', 'lab/bin', 'lab/config', 'pnpm-lock.yaml']);
const baseline = read('baseline-tests.json'), focused = read('surface-tests.json'), final = read('final-tests.json');
for (const [result, expected] of [[baseline, 128], [focused, 3], [final, 131]]) {
  assert.equal(result.success, true); assert.equal(result.numPassedTests, expected); assert.equal(result.numFailedTests, 0); assert.equal(result.numPendingTests, 0);
}
const conformanceFile = fs.readdirSync(dir).find(f => /^CX-VDA01-conformance-.*\.json$/.test(f));
const conformance = read(conformanceFile);
assert.equal(conformance.head, merge); assert.equal(conformance.completed, true); assert.equal(conformance.executions.length, 89);
for (const e of conformance.executions) { assert.equal(e.status, 'PASS'); assert.equal(e.cleanup.deleted, true); assert.equal(e.cleanup.db, e.created.db); }
for (const [f, h] of Object.entries(conformance.built)) assert.equal(hash(fs.readFileSync(f)), h);
const nativeFile = fs.readdirSync(dir).find(f => /^CX-VDA01-native-.*\.json$/.test(f));
const native = read(nativeFile); assert.equal(native.head, merge); assert.equal(native.queryVariant, 'duplicate-sections'); assert.equal(native.findingReproduced, undefined);
assert.equal(native.scriptSha256, hash(fs.readFileSync(path.join(root, 'native-repro.mjs'))));
assert.equal(native.cleanup.deleted, true); assert.equal(native.cleanup.db, native.created.db);
for (const [f, h] of Object.entries(native.source)) assert.equal(hash(fs.readFileSync(f)), h);
const requests = Object.fromEntries(native.requests.map(r => [r.label, r]));
assert.equal(requests['before-ground-T'].status, 409); assert.equal(requests['before-ground-T'].parsed.code, 'BasisNotAvailable');
for (const axis of ['T', 'TP']) {
  assert.equal(requests[`after-ground-${axis}`].status, 409); assert.equal(requests[`after-ground-${axis}`].parsed.code, 'BasisNotAvailable');
  assert.equal(requests[`after-ident-${axis}`].status, 400); assert.equal(requests[`after-ident-${axis}`].parsed.code, 'InvalidValue');
  assert.equal(requests[`after-literal-${axis}`].status, 409); assert.equal(requests[`after-source-${axis}`].count, 40);
}
const attempts = fs.readdirSync(path.join(dir, 'attempts')).map(name => {
  const base = path.join(dir, 'attempts', name);
  const input = JSON.parse(fs.readFileSync(path.join(base, 'inputs.json'), 'utf8'));
  const events = fs.readFileSync(path.join(base, 'observations.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).map(e => e.value);
  assert.equal(input.head, merge); assert.deepEqual(input.health, authority.health); assert.deepEqual(input.owner, authority.owner);
  const created = events.filter(e => e.kind === 'created'), cleanup = events.filter(e => e.kind === 'cleanup');
  if (created.length) { assert.equal(created.length, 1); assert.equal(cleanup.length, 1); assert.equal(cleanup[0].db, created[0].db); assert.equal(cleanup[0].deleted, true); }
  assert.ok(events.some(e => e.kind === 'finished' || e.kind === 'completion'));
  return { name, input, events };
});
const current = attempts.filter(a => a.input.reviewerSources && Object.entries(a.input.reviewerSources).every(([f, h]) => f.endsWith('-collect.mjs') || hash(fs.readFileSync(path.join(root, f))) === h));
const last = prefix => current.filter(a => a.name.startsWith(prefix)).sort((a, b) => a.input.startedAt.localeCompare(b.input.startedAt)).at(-1);
const matrix = last('matrix-'); assert.ok(matrix);
const matrixRows = matrix.events.filter(e => e.kind === 'independent-matrix'); assert.equal(matrixRows.length, 916);
for (const e of matrixRows) { if (e.eligible) assert.deepEqual([...e.observed.rows].sort(), [...e.expected].sort()); else assert.equal(e.observed.code, 'BasisNotAvailable'); }
assert.ok(last('pagination-').events.find(e => e.kind === 'pagination-straddle'));
assert.ok(last('basis-free-').events.find(e => e.kind === 'basis-free-contracts'));
const grammar = last('grammar-').events.filter(e => e.kind === 'grammar-case');
assert.ok(grammar.length >= 13); for (const e of grammar) { assert.equal(e.outcome.status, 'refused'); assert.ok(['BasisNotAvailable', 'InvalidValue'].includes(e.outcome.code)); }
const surfaces = last('R3-surfaces-'); assert.ok(surfaces);
const surfaceRows = surfaces.events.filter(e => e.kind === 'surface-equivalence'); assert.equal(surfaceRows.length, 608);
let surfaceAnswers = 0, surfaceBasisRefusals = 0, surfaceUnsupportedRefusals = 0;
for (const e of surfaceRows) {
  if (e.actual.kind === 'refusal' && e.actual.status === 400 && e.actual.code === 'InvalidValue') surfaceUnsupportedRefusals++;
  else { assert.deepEqual(e.actual, e.control); if (e.actual.kind === 'answer') { assert.deepEqual(e.actual.rows, [...e.expected].sort()); assert.equal(e.actual.route, e.family); surfaceAnswers++; } else { assert.equal(e.actual.code, 'BasisNotAvailable'); assert.equal(e.actual.status, 409); surfaceBasisRefusals++; } }
}
assert.equal(surfaceUnsupportedRefusals, 0); assert.equal(surfaceAnswers, 418); assert.equal(surfaceBasisRefusals, 190);
const unsupported = last('R3-unsupported-').events.filter(e => e.kind === 'surface-refusal'); assert.equal(unsupported.length, 150);
for (const e of unsupported) assert.deepEqual(e.actual, { status: 400, code: 'InvalidValue' });
const ruleEvents = last('R3-rules-').events;
const ruleAnswers = ruleEvents.filter(e => e.kind === 'rule-equivalence'), ruleRefusals = ruleEvents.filter(e => e.kind === 'rule-refusal');
assert.equal(ruleAnswers.length, 48); for (const e of ruleAnswers) assert.deepEqual(e.actual, e.expected);
assert.equal(ruleRefusals.length, 8); for (const e of ruleRefusals) assert.equal(e.actual.tag, 'DatalogValidationError');
assert.ok(Date.parse(surfaces.input.startedAt) >= final.startTime);
const context = read('context-results.json'); assert.equal(context.reproducibleStaging, true); assert.equal(context.scratchRemoved, true); assert.equal(context.imageRebuilt, false);
assert.equal(context.checks.length, 2); assert.equal(context.checks[0].manifestSha256, context.checks[1].manifestSha256);
for (const c of context.checks) { assert.equal(c.files, 812); for (const k of ['reusedRefused', 'extraFileRefused', 'symlinkRefused', 'emptyDirectoryRefused', 'changedBytesRefused']) assert.equal(c[k], true); }
const owner = JSON.parse(fs.readFileSync('/Users/sam/projects/triplex-db-2/lab/locks/datomic-dev/owner.json', 'utf8')); assert.deepEqual(owner, authority.owner);
const health = await (await fetch(authority.owner.endpoint + '/health')).json(); assert.deepEqual(health, authority.health);
for (const recorded of [native, conformance]) { assert.deepEqual(recorded.health, health); assert.deepEqual(recorded.owner, owner); }
const preservation = [];
for (const p of authority.preservation) { const r = await fetch(`${authority.owner.endpoint}/v1/db/${p.db}/basis`); const body = await r.json(); assert.equal(r.status, 200); assert.deepEqual(body, p.basis); preservation.push({ db: p.db, status: r.status, body }); }
const summary = { at: new Date().toISOString(), reviewer: 'CX-VDA01-R3', candidate, reviewMerge: merge, verdict: 'ACCEPT', acceptanceScope: 'lane D adapter merge only; default-off for final acceptance until DA04; Q88a durability DIAGNOSTIC', findings: [], priorFindingsClosed: { R1F1: true, R2F1: true, reproduction: nativeFile }, tests: { baselinePass: 128, focusedPass: 3, finalPass: 131, fail: 0, skipped: 0 }, independentMatrix: { attempt: matrix.name, observations: 916, answers: matrixRows.filter(e => e.eligible).length, typedRefusals: matrixRows.filter(e => !e.eligible).length, paginationStraddle: true }, generatedProperties: { attempt: surfaces.name, surfaceVariants: 19, cuts: 8, families: 2, phases: 2, equivalentObservations: 608, surfaceAnswers, surfaceBasisRefusals, surfaceUnsupportedRefusals, unsupportedInputObservations: 150, supportedRuleAnswers: 48, typedCrossRuleRefusals: 8, total: 814 }, conformance: { file: conformanceFile, current: 44, secondOpening: 44, completeSuite: true, cleaned: 89 }, context, health, owner, preservation, limits: ['No production/durability/P1-P5/scale/erasure/tenancy acceptance', 'Native % rules, cross-rule composition and native nested-map pull projections refuse; they are not newly supported', 'Public TemporalBasis lacks arbitrary P; SPI and captured pagination positions tested', 'Unsealed future record time remains Q89a/Q90 work', 'No engine lifecycle, Docker access, fresh image build, root-wide checks or fresh package consumer'] };
fs.writeFileSync(path.join(dir, 'SUMMARY.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
const walk = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(root, e.name)) : [path.join(root, e.name)]);
const tools = ['round3-surfaces.test.ts', 'round3-collect.mjs', 'round2-utils.ts', 'round2-matrix.test.ts', 'round2-grammar.test.ts', 'review.test.ts', 'native-repro.mjs', 'context.mjs', 'conformance.mjs', 'vitest.config.ts', 'VERIFY-round3.md'];
const files = [...walk(dir), ...tools.map(f => path.join(root, f))].filter(f => !['FILES.json', 'collect.log'].includes(path.basename(f))).map(f => ({ path: path.relative(root, f), bytes: fs.statSync(f).size, sha256: hash(fs.readFileSync(f)) }));
fs.writeFileSync(path.join(dir, 'FILES.json'), JSON.stringify({ at: new Date().toISOString(), relativeTo: 'lab/verify/DA01', files }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ verdict: summary.verdict, candidate, tests: summary.tests, matrix: summary.independentMatrix, properties: summary.generatedProperties, conformance: summary.conformance, files: files.length }, null, 2));
