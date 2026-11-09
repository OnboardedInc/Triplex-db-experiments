// [CX-VRQ01] Why: measure semantic witnesses and isolate one bad route at a time.
// Rejected: mutating every route (would confound HE-2 with reference failures).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  generateRouteHistory, generateRouteBases, routeHead, routeRow, routeShape,
  RouteRefusal, runRouteEquivalence, makeRouteEquivalenceCases, replayRouteAnswer,
} from '../../../packages/testkit/src/route-equivalence.ts';
import { makeOfflineRouteFixture } from '../../../packages/testkit/src/offline-route-fixtures.ts';

const out = path.resolve(process.argv[2] ?? 'lab/verify/RQ01/evidence/a1');
fs.mkdirSync(out, { recursive: false });
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n');
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const files = [
  'packages/testkit/src/route-equivalence.ts', 'packages/testkit/src/offline-route-fixtures.ts',
  'packages/testkit/test/route-equivalence.test.ts', 'packages/core/src/content/Sha256.ts',
  'lab/research/R31-route-equivalence.md', 'lab/acceptance/RULINGS-PENDING.md',
  'lab/verify/RQ01/review.mjs', 'lab/verify/RQ01/source-loader.mjs',
  'lab/verify/RQ01/content-shim.mjs', 'pnpm-lock.yaml',
];
const before = Object.fromEntries(files.map(f => [f, sha(f)]));
const summary = { head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), node: process.version, before, results: [] };

// Independent small model: does not call foldRouteHistory or replayRouteAnswer.
const modelRows = (history, request, mode = '') => {
  const ledger = new Map();
  for (const commit of history.commits) {
    if (mode === 'ignore-real-valid-edit' && commit.writes.some(a => a.op === 'assert' && a.row.valid_to !== null && commit.writes.some(r => r.op === 'retract' && ledger.get(r.id)?.entity_id === a.row.entity_id && ledger.get(r.id)?.attribute === a.row.attribute))) continue;
    for (const write of commit.writes) {
      if (mode === 'ignore-correction' && commit.position === 2048) continue;
      if (write.op === 'assert') ledger.set(write.row.id, { ...write.row, recorded_at: commit.instant, recorded_position: commit.position });
      else if (mode !== 'drop-retraction') Object.assign(ledger.get(write.id), { retracted_at: commit.instant, retracted_position: commit.position, retract_tx_id: `tx:${commit.position}` });
    }
  }
  const p = request.basis.recordedPosition ?? history.commits.at(-1).position;
  const t = request.basis.recordedAt ?? Infinity;
  const v = request.basis.validAt ?? history.now;
  return [...ledger.values()].filter(r =>
    (request.entityId === undefined || r.entity_id === request.entityId) &&
    r.recorded_position <= p && r.recorded_at <= t &&
    !(mode === 'drop-same-ms-tie' && r.id === 'tie:B') &&
    (request.history || ((!((r.retracted_position ?? Infinity) <= p && (r.retracted_at ?? Infinity) <= t)) && r.valid_from <= v && (r.valid_to === null || v < r.valid_to)))
  );
};
const modelFixture = (mode = '') => {
  let history;
  return {
    lane: 'CX-VRQ01-independent-model', reset: h => { history = structuredClone(h); },
    append: c => { history.commits.push(structuredClone(c)); }, event: () => {},
    routes: ['control', 'injected'].map(id => ({
      id, eligible: (r, h) => (r.basis.recordedPosition ?? 0) <= routeHead(h),
      refusals: ['BasisNotAvailable'], force: () => {},
      read: async request => {
        const activeMode = id === 'injected' ? mode : '';
        if (activeMode === 'empty-ineligible') return { rows: [], eligible: false, taken: id, basis: request.basis };
        if ((request.basis.recordedPosition ?? 0) > routeHead(history) && activeMode !== 'future-old-data')
          throw new RouteRefusal('BasisNotAvailable', 'Future position');
        return { rows: modelRows(history, request, activeMode), taken: id, basis: request.basis };
      },
    })),
  };
};
const row = (id, subject = 's', value = id, from = 0, to = null) => ({ op: 'assert', row: routeRow(id, subject, value, from, to) });
const base = commits => ({ seed: 89001, now: 2000, commits });
const retractHistory = base([
  { position: 1024, instant: 1000, writes: [row('retracted')] },
  { position: 2048, instant: 1001, writes: [{ op: 'retract', id: 'retracted' }] },
]);
const tieHistory = base([
  { position: 1024, instant: 1000, writes: [row('tie:A')] },
  { position: 2048, instant: 1000, writes: [row('tie:B')] },
]);
const correctionHistory = base([
  { position: 1024, instant: 1000, writes: [row('old')] },
  { position: 2048, instant: 1001, writes: [{ op: 'retract', id: 'old' }, row('corrected', 's', 'new', 10, 20)] },
]);
const faultCases = [
  ['drop-retraction', retractHistory, { basis: { validAt: 2000, recordedPosition: 2048 } }, ['HE-1', 'HE-2']],
  ['drop-same-ms-tie', tieHistory, { basis: { validAt: 2000, recordedAt: 1000 } }, ['HE-1', 'HE-2']],
  ['future-old-data', tieHistory, { basis: { validAt: 2000, recordedPosition: 999999 } }, ['HE-1', 'HE-3']],
  ['empty-ineligible', tieHistory, { basis: { validAt: 2000, recordedPosition: 999999 } }, ['HE-1', 'HE-3', 'HE-6']],
  ['ignore-correction', correctionHistory, { basis: { validAt: 15, recordedPosition: 2048 } }, ['HE-1', 'HE-2']],
];
for (const [mode, history, request, required] of faultCases) {
  const clean = await runRouteEquivalence({ fixture: modelFixture(), history, requests: [request] });
  assert.equal(clean.violations.length, 0, `${mode}: clean control must pass`);
  const broken = await runRouteEquivalence({ fixture: modelFixture(mode), history, requests: [request] });
  for (const rule of required) assert(broken.violations.some(v => v.rule === rule && (v.route === 'injected' || v.route === '*')), `${mode}: missing ${rule}`);
  assert(!broken.violations.some(v => v.route === 'control'), 'Correct route must remain clean');
  save(`${mode}.json`, { clean, broken });
  summary.results.push({ test: mode, caught: true, cleanViolations: clean.violations.length, violations: broken.violations.length, rules: [...new Set(broken.violations.map(v => v.rule))] });
}

const analyze = seed => {
  const history = generateRouteHistory(seed);
  const requests = generateRouteBases(history);
  const seen = new Map();
  const kinds = { singleAssert: 0, groupAssert5to50: 0, singleRetract: 0, groupRetract: 0, cardinalityManyThenRetractOne: 0, sameSubjectReplace: 0, assertRetractSameRow: 0, sameSubjectBoundedValidEdit: 0, futureDated: 0, nestedInteriorOrdinals: 0, claimsOnlyOrPositionOnly: 0, explicitAbortedCommit: 0, controlledLateStage: 0, adjacentSameMs: 0, clockRollback: 0, crossSubjectReplace: 0, crossSubjectBoundedEdit: 0 };
  for (const [i, c] of history.commits.entries()) {
    const a = c.writes.filter(w => w.op === 'assert');
    const r = c.writes.filter(w => w.op === 'retract');
    if (a.length === 1 && r.length === 0) kinds.singleAssert++;
    if (a.length >= 5 && a.length <= 50 && r.length === 0) kinds.groupAssert5to50++;
    if (r.length === 1) kinds.singleRetract++;
    if (r.length > 1) kinds.groupRetract++;
    if (!c.writes.length) kinds.claimsOnlyOrPositionOnly++;
    if (c.position % 1024 !== 0) kinds.nestedInteriorOrdinals++;
    if (i > 0 && c.instant === history.commits[i - 1].instant) kinds.adjacentSameMs++;
    if (i > 0 && c.instant < history.commits[i - 1].instant) kinds.clockRollback++;
    for (const w of a) if (w.row.valid_from > history.now) kinds.futureDated++;
    const existingRetracts = r.map(w => seen.get(w.id)).filter(Boolean);
    for (const prior of existingRetracts) {
      const sameAttributePeers = [...seen.values()].filter(other => other.id !== prior.id && other.entity_id === prior.entity_id && other.attribute === prior.attribute);
      if (sameAttributePeers.length && r.length === 1) kinds.cardinalityManyThenRetractOne++;
      for (const next of a) if (next.row.attribute === prior.attribute) {
        if (next.row.entity_id === prior.entity_id) {
          kinds.sameSubjectReplace++;
          if (next.row.valid_to !== null) kinds.sameSubjectBoundedValidEdit++;
        } else {
          kinds.crossSubjectReplace++;
          if (next.row.valid_to !== null) kinds.crossSubjectBoundedEdit++;
        }
      }
    }
    for (const w of c.writes) {
      if (w.op === 'assert') seen.set(w.row.id, w.row);
      else { if (a.some(x => x.row.id === w.id)) kinds.assertRetractSameRow++; seen.delete(w.id); }
    }
  }
  const subjects = [...new Set(history.commits.flatMap(c => c.writes.filter(w => w.op === 'assert').map(w => w.row.entity_id)))];
  const allRows = history.commits.flatMap(c => c.writes.filter(w => w.op === 'assert').map(w => w.row));
  const v = [...new Set(allRows.flatMap(r => [r.valid_from - 1, r.valid_from, r.valid_from + 1, ...(r.valid_to === null ? [] : [r.valid_to - 1, r.valid_to, r.valid_to + 1])]))];
  const pRequests = requests.filter(r => routeShape(r) === 'P');
  const tRequests = requests.filter(r => routeShape(r) === 'T');
  const tpRequests = requests.filter(r => routeShape(r) === 'TP');
  const postPurgeHorizon = routeHead(history) + 2048;
  return {
    seed, commits: history.commits.length, subjects, historyKinds: kinds,
    shapeCounts: Object.fromEntries(['L', 'V', 'P', 'T', 'TP', 'H'].map(shape => [shape, requests.filter(r => routeShape(r) === shape).length])),
    uniqueRequests: new Set(requests.map(r => JSON.stringify(r))).size, totalRequests: requests.length,
    basisWitnesses: {
      everyCommittedP: history.commits.every(c => pRequests.some(r => r.basis.recordedPosition === c.position)),
      everyTPlusMinusHalf: history.commits.every(c => [-0.5, 0, 0.5].every(d => tRequests.some(r => r.basis.recordedAt === c.instant + d))),
      everyVBoundaryPlusMinusOne: v.every(t => requests.some(r => routeShape(r) === 'V' && r.basis.validAt === t)),
      omittedValidAt: requests.some(r => r.basis.validAt === undefined),
      futureP: pRequests.some(r => r.basis.recordedPosition > routeHead(history)),
      futureT: tRequests.some(r => r.basis.recordedAt > Math.max(...history.commits.map(c => c.instant))),
      allEntitiesEveryCommittedP: subjects.every(e => history.commits.every(c => requests.some(r => r.history && r.entityId === e && r.basis.recordedPosition === c.position))),
      tpEarlierTThanP: tpRequests.some(r => history.commits.some(c => c.position === r.basis.recordedPosition && c.instant > r.basis.recordedAt)),
      tpLaterTThanP: tpRequests.some(r => history.commits.some(c => c.position === r.basis.recordedPosition && c.instant < r.basis.recordedAt)),
      purgeHorizonAndPredecessor: [postPurgeHorizon, postPurgeHorizon - 1].map(p => ({ position: p, present: pRequests.some(r => r.basis.recordedPosition === p) })),
      abortGapProvenance: false, interiorOrdinalProvenance: false,
    },
  };
};
const coverage = [1, 42, 890, 89, 891].map(analyze);
save('coverage.json', coverage);
summary.results.push({ test: 'generator-coverage', path: 'coverage.json' });

// [CX-VRQ01] Why: witness that nonmatching subjects fail to exercise replacements.
// Rejected: counting index%8 labels (labels do not prove an operation's semantics).
for (const seed of [1, 42, 890, 89, 891]) {
  const h = generateRouteHistory(seed);
  const witnesses = h.commits.filter((_, i) => i % 8 === 3 || i % 8 === 6).map(c => ({
    position: c.position,
    retract: c.writes.filter(w => w.op === 'retract').map(w => ({ id: w.id, row: h.commits.flatMap(x => x.writes).find(x => x.op === 'assert' && x.row.id === w.id)?.row })),
    assert: c.writes.filter(w => w.op === 'assert').map(w => w.row),
  }));
  save(`replace-witnesses-${seed}.json`, witnesses);
}

const missedCorrection = await makeRouteEquivalenceCases({ fixture: modelFixture('ignore-real-valid-edit'), history: generateRouteHistory(42) })[0].run();
assert.equal(missedCorrection.violations.length, 0);
save('real-correction-mutant-generated-pass.json', { ...missedCorrection, observations: { count: missedCorrection.observations.length, sha256: createHash('sha256').update(JSON.stringify(missedCorrection.observations)).digest('hex') } });
const correctionWitness = await runRouteEquivalence({ fixture: modelFixture('ignore-real-valid-edit'), history: correctionHistory, requests: [{ basis: { validAt: 15, recordedPosition: 2048 } }] });
assert(correctionWitness.violations.some(v => v.rule === 'HE-1'));
save('real-correction-mutant-witness-fail.json', correctionWitness);
summary.results.push({ test: 'real-correction-mutant', generatedGateUnexpectedlyPassed: true, generatedObservations: missedCorrection.observations.length, witnessViolations: correctionWitness.violations.length });

const empty = await makeRouteEquivalenceCases({ fixture: modelFixture('drop-retraction'), history: retractHistory, requests: [] })[0].run();
assert.equal(empty.observations.length, 0);
assert.equal(empty.violations.length, 0);
save('empty-request-pass.json', empty);
summary.results.push({ test: 'empty-request-gate', unexpectedlyPassed: true, observations: empty.observations.length });

// [CX-VRQ01] Why: expose tension between raw-lifetime HE-1 and immutable-byte HE-5.
// Rejected: inferring either contract from a baseline that never retracts an existing row.
const oldRequest = { basis: { validAt: 2000, recordedPosition: 1024 } };
const initial = base([{ position: 1024, instant: 1000, writes: [row('metadata')] }]);
const retirement = { position: 2048, instant: 1001, writes: [{ op: 'retract', id: 'metadata' }] };
const metadata = await runRouteEquivalence({ fixture: modelFixture(), history: initial, requests: [oldRequest], extension: retirement });
save('retirement-metadata.json', metadata);
summary.results.push({ test: 'retirement-metadata-reproducibility', rules: [...new Set(metadata.violations.map(v => v.rule))], violations: metadata.violations.length });

const dc1History = base([{ position: 1024, instant: 1001, writes: [row('B', 'Y')] }]);
const dc1Options = { history: dc1History, requests: [{ entityId: 'X', basis: { validAt: 2000, recordedAt: 1001 } }], extension: { position: 2048, instant: 1000, writes: [row('A', 'X')] } };
const dc1 = await runRouteEquivalence({ fixture: makeOfflineRouteFixture('qlever'), ...dc1Options });
assert(dc1.violations.length > 0);
assert(dc1.violations.every(v => v.rule === 'HE-5'));
assert.deepEqual([...new Set(dc1.violations.map(v => v.route))].sort(), makeOfflineRouteFixture('qlever').routes.map(r => r.id).sort());
save('dc1-known-failing-Q89a.json', dc1);
await assert.rejects(() => makeRouteEquivalenceCases({ fixture: makeOfflineRouteFixture('qlever'), ...dc1Options })[0].run());
summary.results.push({ test: 'D-C1-Q89a', violations: dc1.violations.length, rules: ['HE-5'], positiveGateRejected: true });

summary.after = Object.fromEntries(files.map(f => [f, sha(f)]));
summary.sourceStillMatches = JSON.stringify(summary.before) === JSON.stringify(summary.after);
assert(summary.sourceStillMatches);
summary.completedAt = new Date().toISOString();
save('receipt.json', summary);
console.log(JSON.stringify(summary.results, null, 2));
