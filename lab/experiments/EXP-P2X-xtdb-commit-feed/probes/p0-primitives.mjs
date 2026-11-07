// EXP-P2X probe 0: XTDB 2.2.0 primitives the candidate commit path depends on.
// Run from this directory: XTDB_URL=... node p0-primitives.mjs
import postgres from '../../../../packages/xtdb/node_modules/postgres/src/index.js';

const url = process.env.XTDB_URL;
if (!url) throw new Error('XTDB_URL');
const sql = postgres(url, { max: 4, prepare: false, onnotice: () => {} });
const json = (v) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x));
const show = async (label, f) => {
  try { console.log(label, json(await f())); } catch (e) { console.log(label, 'ERR', e.code, String(e.message).slice(0, 240)); }
};
const t = `p0_${Date.now()}`;
const exprs = {
  epoch: `EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)`,
  dur: `(CURRENT_TIMESTAMP - TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z')`,
  durBig: `CAST((CURRENT_TIMESTAMP - TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z') AS BIGINT)`,
  tsBig: `CAST(CURRENT_TIMESTAMP AS BIGINT)`,
  usec: `EXTRACT(MICROSECOND FROM CURRENT_TIMESTAMP)`,
  sec: `EXTRACT(SECOND FROM CURRENT_TIMESTAMP)`,
  epochBig: `CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) AS BIGINT)`,
  durDiv: `(CURRENT_TIMESTAMP - TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z') / INTERVAL 'PT0.000001S'`,
};
for (const [k, e] of Object.entries(exprs)) await show(`select ${k}`, () => sql.unsafe(`SELECT ${e} AS v`));

// DML: is CURRENT_TIMESTAMP inside a READ WRITE transaction the tx system time?
await show('dml', () => sql.begin(async (tx) => { await tx.unsafe(`INSERT INTO ${t} (_id, ts) VALUES (1, CURRENT_TIMESTAMP)`); return 'ok'; }));
await show('dml-readback', () => sql.unsafe(`SELECT _id, ts, _system_from FROM ${t}`));
await show('txs-tail', () => sql.unsafe(`SELECT _id, system_time, committed FROM xt.txs ORDER BY _id DESC LIMIT 2`));

// METADATA with arrays and nested values on one reserved connection.
const res = await sql.reserve();
await show('meta-begin', () => res.unsafe(`BEGIN READ WRITE WITH (METADATA = {cmd: 'c1', subj: ['s1','s2'], pos: 3, attrs: [':a', ':b'], vf: 10, vt: NULL})`));
await show('meta-ins', () => res.unsafe(`INSERT INTO ${t} (_id, ts) VALUES (2, CURRENT_TIMESTAMP)`));
await show('meta-commit', () => res.unsafe(`COMMIT`));
res.release();
await show('meta-readback', () => sql.unsafe(`SELECT _id, system_time, user_metadata FROM xt.txs ORDER BY _id DESC LIMIT 1`));
await show('source-log tail', async () => {
  const tip = Number((await sql.unsafe(`SELECT MAX(_id) AS m FROM xt.txs`))[0].m);
  return (await sql.unsafe(`SELECT msg_id, msg_type, log_offset FROM xt.source_log_msgs WHERE msg_id BETWEEN $1 AND $2`,
    [sql.typed(Math.max(0, tip - 2000), 20), sql.typed(tip + 1e9, 20)])).slice(-4);
});
await sql.end();
