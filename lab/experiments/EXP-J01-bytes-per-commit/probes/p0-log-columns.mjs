// EXP-J01 probe 0: what xt.source_log_msgs exposes for one record (columns and sizes).
// Run: XTDB_URL=... node p0-log-columns.mjs
import postgres from '../../../../packages/xtdb/node_modules/postgres/src/index.js';

const sql = postgres(process.env.XTDB_URL, { max: 1, prepare: false, onnotice: () => {} });
const [tip] = await sql.unsafe('SELECT _id FROM xt.txs ORDER BY _id DESC LIMIT 1');
const id = Number(tip._id);
const rows = await sql.unsafe(`SELECT * FROM xt.source_log_msgs WHERE msg_id BETWEEN ${id} AND ${id}`);
const clip = (v) => (typeof v === 'string' ? v.slice(0, 1500) : v);
console.log(JSON.stringify({ tip: id, columns: rows[0] ? Object.keys(rows[0]) : null, sample: rows.slice(0, 1).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, clip(v)]))) }, null, 1));
await sql.end();
