// [CX-VCRNS] Why: retain compact actual evaluator responses and exact fixture payload hashes for each finding.
// Rejected: saving only a hand-written verdict or copying prior-run summaries (neither reproduces the content).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { recomputeNS, canonText } from '../../bin/claim.mjs';
import { fixture, sealed, clone, p1, p4, p4Sequential, h, repo } from './fixture.mjs';

const cases = [
  ['R01', 'P1 empty main reads', () => p1()],
  ['R02', 'checkpoint beyond source prefix', () => {
    const f = fixture(); f.raw.events.consumer.transactions[1].frontierAfter = '999'; return f;
  }],
  ['R03', 'wrong epochs and split consumer identities', () => {
    const f = fixture();
    for (const rows of [f.raw.events.consumer.effects, f.raw.events.consumer.affected, ...f.raw.events.consumer.transactions.flatMap(t => [t.effects, t.affected])]) for (const row of rows) {
      row.epoch = 'wrong-epoch'; row.consumer = row.subject === 'pl:a' ? 'consumer-a' : 'consumer-b';
    }
    return f;
  }],
  ['R04', 'P4 sequential reads one year outside measurement window', () => p4Sequential(31536000000000000n)],
  ['R05', 'P4 2200 simultaneous reads with one loop label', () => p4()],
  ['R06', 'empty cross-check stream', () => fixture()],
];
const observations = cases.map(([id, description, make]) => {
  const f = make();
  f.raw.binding.attemptId = `CX-VCRNS-${id}`;
  f.trusted.binding = clone(f.raw.binding);
  const { bundle, trusted } = sealed(f);
  return {
    id, description, binding: f.raw.binding, fixturePayloadSha256: h(bundle.payload), witnessedHeadSha256: trusted.headSha256,
    expected: 'REFUSED', actual: recomputeNS(bundle, trusted),
  };
});
const reviewed = '2f299bfaeadc83ad644ad30e98d915e1c9dcf215';
const evaluator = fs.readFileSync(new URL('../../bin/claim.mjs', import.meta.url));
const reviewedBytes = execFileSync('git', ['show', `${reviewed}:lab/bin/claim.mjs`], { cwd: repo });
const report = {
  format: 'CX-VCRNS-observations/1', observedAt: new Date().toISOString(), reviewedCommit: reviewed,
  evaluatorSha256: h(evaluator), reviewedEvaluatorSha256: h(reviewedBytes), evaluatorUnchanged: evaluator.equals(reviewedBytes),
  node: process.version, toolSha256: h(fs.readFileSync(fileURLToPath(import.meta.url))),
  fixtureSha256: h(fs.readFileSync(new URL('./fixture.mjs', import.meta.url))),
  scope: 'Fresh synthetic normalized inputs. Evaluator-owned source/read/grade stand-ins; no engine or NS acceptance.',
  observations,
};
process.stdout.write(canonText(report) + '\n');
