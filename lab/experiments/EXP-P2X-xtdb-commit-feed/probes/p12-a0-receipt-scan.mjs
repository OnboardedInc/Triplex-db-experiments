// EXP-P2X probe 12: cost of A0's receipt lookup (a scope_key scan of tx_attempts) against the
// candidate's _id point lookup, on the same engine state. Run: XTDB_URL=... node p12-a0-receipt-scan.mjs
import { randomUUID } from 'node:crypto';
import { makeXtdbClient } from '../../../../packages/xtdb/dist/index.js';

const c = makeXtdbClient(process.env.XTDB_URL);
const [{ n }] = await c.query('SELECT COUNT(*) AS n FROM tx_attempts FOR ALL VALID_TIME');
const time = async (sql, params) => {
  const t = [];
  for (let i = 0; i < 7; i++) { const t0 = performance.now(); await c.query(sql, params); t.push(performance.now() - t0); }
  t.sort((a, b) => a - b);
  return { p50: Math.round(t[3]), max: Math.round(t[6]) };
};
const scope = `p12:${randomUUID()}`, op = randomUUID();
console.log(JSON.stringify({
  attemptRows: Number(n),
  a0ScopeKeyScanMs: await time('SELECT operation_id FROM tx_attempts FOR ALL VALID_TIME WHERE scope_key = ? AND operation_id = ?', [scope, op]),
  candidateIdLookupMs: await time('SELECT stamp FROM tx_attempts FOR ALL VALID_TIME WHERE _id = ?', [JSON.stringify([scope, op])]),
}));
await c.close();
