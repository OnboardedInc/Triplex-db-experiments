// EXP-P2X probe 8: stamp once per statement. INSERT ... SELECT <projection> FROM (VALUES params only)
// so XTDB does not compile a projection per VALUES cell (operator/table.clj:106-113 @ c6c1962, the
// cause of the heap exhaustion in the batched preload). Checks mixed real and stamped rows, NULL
// parameters, and that the stamp still equals _system_from. Run: XTDB_URL=... node p8-insert-select.mjs
import { makeXtdbClient } from '../../../../packages/xtdb/dist/index.js';

const c = makeXtdbClient(process.env.XTDB_URL);
const STAMP = "((CURRENT_TIMESTAMP - TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z') / INTERVAL 'PT0.000001S')";
const pos = (o) => `((${STAMP} - 1577836800000000) * 8 + ${o})`;
const t = `p8_${Date.now()}`;
const rows = [
  // _id, rp (real position or null), ro (ordinal or null), vn (number or null), vo, vi, vio
  ['a', 5, null, 1.5, null, '{"type":"number","value":1.5}', null],
  ['b', null, 0, null, null, null, null],
  ['c', null, 1, null, 1, null, 1],
];
const sql = `INSERT INTO ${t} (_valid_from, _id, pos, vn, vi) SELECT TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', v.id, COALESCE(v.rp, ${pos('v.ro')}), COALESCE(v.vn, ${pos('v.vo')}), COALESCE(v.vi, '{"type":"number","value":' || CAST(${pos('v.vio')} AS VARCHAR) || '}') FROM (VALUES ${rows.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}) AS v (id, rp, ro, vn, vo, vi, vio)`;
try {
  await c.submit([{ sql, params: rows.flat() }]);
  const out = await c.query(`SELECT _id, pos, vn, vi, ${STAMP.replace('CURRENT_TIMESTAMP', '_system_from')} AS sys FROM ${t} ORDER BY _id`);
  const sys = BigInt(out[0].sys);
  const base = (sys - 1577836800000000n) * 8n;
  console.log(JSON.stringify({
    rows: out.map((r) => ({ ...r })),
    checks: {
      realKept: String(out[0].pos) === '5' && Number(out[0].vn) === 1.5 && out[0].vi === '{"type":"number","value":1.5}',
      stampedOrdinal0: BigInt(out[1].pos) === base,
      stampedOrdinal1: BigInt(out[2].pos) === base + 1n && BigInt(out[2].vn) === base + 1n && out[2].vi === `{"type":"number","value":${base + 1n}}`,
      nullStaysNull: out[1].vn === null && out[1].vi === null,
    },
  }));
} catch (e) {
  console.log('ERR', String(e.message).slice(0, 300), String(e.detail?.message ?? '').slice(0, 300));
}
await c.close();
