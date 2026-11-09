// [CX-VCRNS-R2] Why: retain fresh evaluator responses with exact source, test, fixture and payload identities.
// Rejected: calling the builder's historical receipt an independent execution or retaining only hand-written results.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { canonText, recomputeNS, nsP5Traffic } from '../../../bin/claim.mjs';
import { run, sealed } from '../fixture.mjs';
import { regressions, positiveP5, firstSecondOnly, sweepPlan, h } from './fixtures.mjs';

const root = new URL('../../../../', import.meta.url);
const source = fs.readFileSync(new URL('lab/bin/claim.mjs', root));
const target = '2cdb3d2f8f52087c87a8492597065143a4598d82';
const targetSource = execFileSync('git', ['show', `${target}:lab/bin/claim.mjs`], { cwd: root });
const oldFindings = regressions.map(([id, make, mutate, expectedCode]) => {
  const f = make(), positive = run(f), expectedContextSha256 = h(canonText(f.trusted));
  mutate(f);
  const { bundle, trusted } = sealed(f);
  return {
    id, positiveStatus: positive.status, expectedCode, actual: recomputeNS(bundle, trusted),
    trustedContextUnchanged: expectedContextSha256 === h(canonText(f.trusted)),
    fixturePayloadSha256: h(bundle.payload), witnessedHeadSha256: trusted.headSha256,
  };
});
const f = positiveP5(), full = run(f), before = sealed(f), contextSha256 = h(canonText(f.trusted));
const coverage = () => ({
  sweep: { startNs: f.raw.events.sweep.startNs, endNs: f.raw.events.sweep.endNs },
  measuredTraffic: { startNs: f.raw.events.sweepTraffic.sweep.startNs, endNs: f.raw.events.sweepTraffic.sweep.endNs },
  completedReads: f.raw.events.sweepTraffic.sweep.reads.length,
  writerEvents: f.raw.events.sweepTraffic.sweep.offers.length,
  observedSeconds: f.raw.events.sweepTraffic.sweep.readers.length,
});
const fullCoverage = coverage();
firstSecondOnly(f.raw.events.sweepTraffic.sweep);
const after = sealed(f), short = recomputeNS(after.bundle, after.trusted), shortCoverage = coverage();
const sameSparseEventsFullWindow = structuredClone(f.raw.events.sweepTraffic);
sameSparseEventsFullWindow.sweep.endNs = sweepPlan.endNs;
const contrast = nsP5Traffic(sameSparseEventsFullWindow, sweepPlan, () => h('correct'), []);
const evidence = {
  format: 'CX-VCRNS-round2-observations/1', observedAt: new Date().toISOString(), targetCommit: target,
  evaluatorSha256: h(source), targetEvaluatorSha256: h(targetSource), evaluatorUnchanged: source.equals(targetSource),
  tools: Object.fromEntries(['fixtures.mjs', 'observe.mjs', 'review.test.mjs'].map(file => [file, h(fs.readFileSync(new URL(file, import.meta.url)))])),
  copiedFixtureSha256: h(fs.readFileSync(new URL('../fixture.mjs', import.meta.url))),
  oldFindings,
  N01: {
    sweepPlan, planPreimageSha256: h(canonText({ sweepPlan, subjectListSha256: f.trusted.subjectListSha256, minimumSamples: f.trusted.minimumSamples })),
    binding: f.raw.binding, expectedContextSha256: contextSha256,
    trustedContextUnchanged: contextSha256 === h(canonText(f.trusted)),
    full: { coverage: fullCoverage, result: full, payloadSha256: h(before.bundle.payload), headSha256: before.trusted.headSha256 },
    firstSecondOnly: { coverage: shortCoverage, result: short, payloadSha256: h(after.bundle.payload), headSha256: after.trusted.headSha256 },
    sameSparseEventsFullWindow: contrast,
  },
  scope: 'Synthetic normalized events; evaluator-owned deterministic callback/JSON-decoder stand-ins. No engine, SQLite adapter qualification, or NS admission PASS.',
};
process.stdout.write(JSON.stringify(evidence, null, 2) + '\n');
