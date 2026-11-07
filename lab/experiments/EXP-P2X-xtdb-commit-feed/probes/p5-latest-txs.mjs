// EXP-P2X probe 5: inspect the latest transactions, and the attempt and scope-head rows of the scope
// named in their METADATA. Run: XTDB_URL=... node p5-latest-txs.mjs
import { makeXtdbClient } from '../../../../packages/xtdb/dist/index.js';

const c = makeXtdbClient(process.env.XTDB_URL);
const latest = await c.query('SELECT _id, committed, error, user_metadata FROM xt.txs ORDER BY _id DESC LIMIT 4');
for (const r of latest) console.log(JSON.stringify(r).slice(0, 500));
const scope = latest.map((r) => r.user_metadata?.scope).find(Boolean);
console.log('scope', scope);
console.log('attempts', JSON.stringify(await c.query('SELECT _id, scope_key, operation_id, position, stamp FROM tx_attempts FOR ALL VALID_TIME WHERE scope_key = ?', [scope])));
console.log('meta', JSON.stringify(await c.query('SELECT _id, position FROM tx_meta FOR ALL VALID_TIME WHERE _id = ?', [scope])));
await c.close();
