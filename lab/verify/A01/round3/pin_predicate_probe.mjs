// [CX-VA01-R3] Why: compare the new public blocker path with the independent Python predicate. Rejected: relying on one partial-pin fixture alone.
import { readFileSync } from 'node:fs';
import { coreContext, contractBlockers } from './scratch/lab/bin/claim.mjs';
const d = JSON.parse(readFileSync(new URL('./scratch/lab/acceptance/obligations.json', import.meta.url), 'utf8'));
const vectors = JSON.parse(readFileSync(0, 'utf8'));
const results = vectors.map(v => {
  const ctx = coreContext(d, { pins: v.pins, overrides: { oracleRunners: v.runners } });
  const reasons = contractBlockers([{ id: 'review-pin-only', cases: [], oracles: [v.id] }], [], false, ctx);
  const actual = !reasons.some(r => r.code === 'ORACLE-RUNNER-UNPINNED');
  return { label: v.label, oracle: v.id, expected: v.expected, actual, match: actual === v.expected, codes: reasons.map(r => r.code) };
});
console.log(JSON.stringify(results, null, 2));
process.exitCode = results.every(v => v.match) ? 0 : 1;
