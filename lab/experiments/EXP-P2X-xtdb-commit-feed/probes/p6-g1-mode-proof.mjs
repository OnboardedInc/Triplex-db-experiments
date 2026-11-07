// EXP-P2X probe 6: prove which commit path a G1 run used. Only subject-stamp writes tx_feed and
// tx_heads, so G1 scopes that appear there ran the candidate. Run: XTDB_URL=... node p6-g1-mode-proof.mjs
import { makeXtdbClient } from '../../../../packages/xtdb/dist/index.js';

const c = makeXtdbClient(process.env.XTDB_URL);
const count = async (sql) => {
  try { return (await c.query(sql)).map((r) => ({ ...r })); } catch (e) { return `ERR ${String(e.message).slice(0, 120)}`; }
};
console.log(JSON.stringify({
  at: new Date().toISOString(),
  feedRowsG1: await count("SELECT COUNT(*) AS n, COUNT(DISTINCT scope_key) AS scopes FROM tx_feed FOR ALL VALID_TIME WHERE scope_key LIKE '%lab-g1-xtdb%'"),
  headRowsG1: await count("SELECT COUNT(*) AS n FROM tx_heads FOR ALL VALID_TIME WHERE scope_key LIKE '%lab-g1-xtdb%'"),
  metaRowsG1: await count("SELECT COUNT(*) AS n FROM tx_meta FOR ALL VALID_TIME WHERE scope_key LIKE '%lab-g1-xtdb%'"),
}));
await c.close();
