// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking. Binding errors remain checked by lab/bin/checkjs.mjs.
// EXP-J01 probe 8: how long a scope_key scan takes on the shared dev XTDB (every A0 guard and Datalog
// clause filters tx_assertions or tx_meta by scope_key, which XTDB evaluates by scanning all scopes).
// Run: XTDB_URL=... node p8-dev-scan.mjs
import postgres from '../../../../packages/xtdb/node_modules/postgres/src/index.js';

const sql = postgres(process.env.XTDB_URL, { max: 1, prepare: false, onnotice: () => {} });
for (const q of [
  "SELECT COUNT(*) AS n FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = 'j01-none'",
  'SELECT COUNT(*) AS n FROM tx_assertions FOR ALL VALID_TIME',
  'SELECT COUNT(*) AS n FROM tx_meta FOR ALL VALID_TIME',
  'SELECT _id FROM xt.txs ORDER BY _id DESC LIMIT 1',
]) {
  const t = performance.now();
  const r = await sql.unsafe(q);
  console.log(JSON.stringify({ ms: Math.round(performance.now() - t), row: r[0], query: q }));
}
await sql.end();
