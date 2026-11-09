// [CX-VCRNS-R3] Why: retain actual fresh function results and source/input digests for every scoped probe.
// Rejected: treating a builder's prior receipt or a bare test count as independent content verification.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { canonText } from '../../../bin/claim.mjs';
import { helper, traffic, trafficCalibration, sweepPlan, h, trafficMutations, boundMutations, integrationObservation } from './probes.mjs';

const root = new URL('../../../../', import.meta.url), targetCommit = 'cb1178d9d9ed1e45aedf25f3a546fa4a678d53d8';
const evaluator = fs.readFileSync(new URL('lab/bin/claim.mjs', root));
const target = execFileSync('git', ['show', `${targetCommit}:lab/bin/claim.mjs`], { cwd: root });
const trafficProbes = trafficMutations.map(([id, mutate, expectedReason]) => {
  const s = traffic(), c = trafficCalibration(), pin = h(canonText(c)), positive = helper(s, c);
  mutate(s);
  return {
    id, expectedReason, positive, actual: helper(s, c), contextUnchanged: pin === h(canonText(c)),
    expectedInterval: { startNs: sweepPlan.startNs, endNs: sweepPlan.endNs },
    suppliedInterval: { startNs: s.sweep.startNs, endNs: s.sweep.endNs },
    readCount: s.sweep.reads.length, writerCount: s.sweep.offers.length, observedReaderSeconds: s.sweep.readers.map(r => r.second),
    inputsSha256: h(canonText(s)), calibrationSha256: pin,
  };
});
const integration = [
  integrationObservation('N01', f => trafficMutations[0][1](f.raw.events.sweepTraffic)),
  ...boundMutations.map(([id, mutate]) => integrationObservation(id, mutate)),
];
const report = {
  format: 'CX-VCRNS-round3-observations/1', observedAt: new Date().toISOString(), targetCommit,
  evaluatorSha256: h(evaluator), targetEvaluatorSha256: h(target), evaluatorUnchanged: evaluator.equals(target),
  toolHashes: Object.fromEntries(['probes.mjs', 'observe.mjs', 'review.test.mjs'].map(file => [file, h(fs.readFileSync(new URL(file, import.meta.url)))])),
  copiedFixtureHashes: Object.fromEntries(['../fixture.mjs', '../round2/fixtures.mjs', '../../../bin/test/ns-round2-fixture.mjs'].map(file => [file, h(fs.readFileSync(new URL(file, import.meta.url)))])),
  trafficProbes, integration,
  scope: 'Fresh synthetic normalized-event arithmetic QA; trusted JSON codecs and deterministic oracle/durability test callbacks. No NS admission or production adapter qualification.',
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
