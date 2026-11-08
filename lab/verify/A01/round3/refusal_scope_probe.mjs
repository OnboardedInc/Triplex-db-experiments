// [CX-VA01-R3] Why: the refusal fixture must move to an actually refused shape while Q52 stays supported. Rejected: keeping only a generic DIAGNOSTIC assertion that might pass for an unrelated blocker.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { coreContext, contractBlockers } from './scratch/lab/bin/claim.mjs';
const d = JSON.parse(readFileSync(new URL('./scratch/lab/acceptance/obligations.json', import.meta.url), 'utf8'));
const ctx = coreContext(d);
const results = ['G9.erasure.residual-shapes', 'G7.migration.schema-evolution'].map(id => {
  const o = d.obligations.find(o => o.id === id);
  const refusals = contractBlockers([o], [], false, ctx).filter(r => r.code === 'ORACLE-REFUSES');
  return { id, refusals };
});
assert.equal(results[0].refusals.length, 0);
assert.ok(results[1].refusals.some(r => r.detail.includes('scale-evolution')));
console.log(JSON.stringify(results, null, 2));
