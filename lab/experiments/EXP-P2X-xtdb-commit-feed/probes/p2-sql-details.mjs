// EXP-P2X probe 2: SQL details for stamping text values, METADATA escaping, source-log windows.
// Run from this directory: XTDB_URL=... node p2-sql-details.mjs
import postgres from '../../../../packages/xtdb/node_modules/postgres/src/index.js';

const url = process.env.XTDB_URL;
if (!url) throw new Error('XTDB_URL');
const sql = postgres(url, { max: 4, prepare: false, onnotice: () => {} });
const json = (v) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x));
const show = async (label, f) => {
  try { console.log(label, json(await f())); } catch (e) { console.log(label, 'ERR', e.code, String(e.message).slice(0, 240)); }
};
const STAMP = `((CURRENT_TIMESTAMP - TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z') / INTERVAL 'PT0.000001S')`;
const t = `p2_${Date.now()}`;
await show('concat', () => sql.unsafe(`SELECT '{"type":"number","value":' || CAST(${STAMP} AS VARCHAR) || '}' AS v`));
await show('concat-text', () => sql.unsafe(`SELECT '{"type":"number","value":' || CAST(${STAMP} AS TEXT) || '}' AS v`));
// Stamped insert with mixed bound params and expressions, then compare with _system_from.
await show('dml', () => sql.begin(async (tx) => {
  await tx.unsafe(`INSERT INTO ${t} (_id, pos, ident, n) VALUES ($1, ${STAMP}, '{"type":"number","value":' || CAST(${STAMP} AS VARCHAR) || '}', $2)`, [tx.typed('a', 25), tx.typed(5, 20)]);
  return 'ok';
}));
await show('dml-readback', () => sql.unsafe(`SELECT _id, pos, ident, n, (_system_from - TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z') / INTERVAL 'PT0.000001S' AS sys FROM ${t}`));
// Bound int8 compared against stamped int column.
await show('param-compare', async () => {
  const [{ pos }] = await sql.unsafe(`SELECT pos FROM ${t}`);
  return sql.unsafe(`SELECT COUNT(*) AS n FROM ${t} WHERE pos <= $1 AND pos > $2`, [sql.typed(BigInt(pos), 20), sql.typed(BigInt(pos) - 1n, 20)]);
});
// METADATA escaping: quotes, backslashes, unicode.
const tricky = "a'b\\c\"d:é/_triplex/x";
const lit = `'${tricky.replaceAll("'", "''")}'`;
const res = await sql.reserve();
await show('meta-begin', () => res.unsafe(`BEGIN READ WRITE WITH (METADATA = {s: ${lit}, n: 1794082329542086, a: [${lit}, 'z']})`));
await show('meta-ins', () => res.unsafe(`INSERT INTO ${t} (_id, pos) VALUES ('m', 1)`));
await show('meta-commit', () => res.unsafe(`COMMIT`));
res.release();
await show('meta-readback', async () => {
  const [row] = await sql.unsafe(`SELECT user_metadata FROM xt.txs ORDER BY _id DESC LIMIT 1`);
  return { roundTrip: row.user_metadata.s === tricky && row.user_metadata.a[0] === tricky, n: row.user_metadata.n, typeofN: typeof row.user_metadata.n, got: row.user_metadata.s };
});
// Source-log window: lower bound must be a record start; does a mid-record upper bound work? LIMIT?
await show('log-window', async () => {
  const ids = (await sql.unsafe(`SELECT _id FROM xt.txs ORDER BY _id DESC LIMIT 3`)).map((r) => Number(r._id)).reverse();
  const mid = await sql.unsafe(`SELECT msg_id FROM xt.source_log_msgs WHERE msg_id BETWEEN $1 AND $2`, [sql.typed(ids[0], 20), sql.typed(ids[1] + 7, 20)]);
  const limited = await sql.unsafe(`SELECT msg_id FROM xt.source_log_msgs WHERE msg_id BETWEEN $1 AND $2 LIMIT 1`, [sql.typed(ids[0], 20), sql.typed(ids[2] + 1e9, 20)]);
  let badLower = null;
  try { await sql.unsafe(`SELECT msg_id FROM xt.source_log_msgs WHERE msg_id BETWEEN $1 AND $2`, [sql.typed(ids[0] + 3, 20), sql.typed(ids[2] + 1e9, 20)]); badLower = 'no error'; } catch (e) { badLower = String(e.message).slice(0, 120); }
  return { ids, midUpper: mid.map((r) => r.msg_id), limited: limited.map((r) => r.msg_id), badLower };
});
await show('txs-in', async () => {
  const ids = (await sql.unsafe(`SELECT _id FROM xt.txs ORDER BY _id DESC LIMIT 3`)).map((r) => BigInt(r._id));
  return sql.unsafe(`SELECT _id, committed FROM xt.txs WHERE _id IN ($1, $2, $3)`, ids.map((x) => sql.typed(x, 20)));
});
await show('create-twice', async () => {
  await sql.begin(async (tx) => { await tx.unsafe(`CREATE TABLE ${t}_c (_id, a)`); });
  await sql.begin(async (tx) => { await tx.unsafe(`CREATE TABLE ${t}_c (_id, a)`); });
  return 'ok';
});
await sql.end();
