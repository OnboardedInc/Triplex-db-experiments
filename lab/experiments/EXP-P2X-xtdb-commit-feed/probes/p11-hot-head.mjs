// EXP-P2X probe 11: does the scope head (one tx_meta _id rewritten by every commit) get slower to
// read as its version count grows? Times the source-cut point read for the scopes with the most
// tx_feed rows (one per commit) against a scope with few. Run: XTDB_URL=... node p11-hot-head.mjs
import { makeXtdbClient } from '../../../../packages/xtdb/dist/index.js';

const c = makeXtdbClient(process.env.XTDB_URL);
const scopes = await c.query('SELECT scope_key, COUNT(*) AS commits FROM tx_feed FOR ALL VALID_TIME GROUP BY scope_key ORDER BY commits DESC LIMIT 3');
const few = await c.query('SELECT scope_key, COUNT(*) AS commits FROM tx_feed FOR ALL VALID_TIME GROUP BY scope_key ORDER BY commits ASC LIMIT 1');
const out = [];
for (const { scope_key: scope, commits } of [...scopes, ...few]) {
  const times = [];
  for (let i = 0; i < 15; i++) {
    const t0 = performance.now();
    await c.query('SELECT position FROM tx_meta FOR ALL VALID_TIME WHERE _id = ?', [scope]);
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  out.push({ scope: String(scope).slice(0, 40), commits: Number(commits), p50: Math.round(times[7] * 10) / 10, max: Math.round(times[14] * 10) / 10 });
}
console.log(JSON.stringify(out));
await c.close();
