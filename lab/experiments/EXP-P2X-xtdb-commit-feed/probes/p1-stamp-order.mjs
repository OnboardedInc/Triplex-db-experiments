// EXP-P2X probe 1: is the in-transaction stamp (CURRENT_TIMESTAMP as epoch microseconds) equal to the
// transaction's system time, unique, and strictly increasing in tx-id (log) order under concurrency?
// Run from this directory: XTDB_URL=... node p1-stamp-order.mjs [concurrency] [rounds]
import postgres from '../../../../packages/xtdb/node_modules/postgres/src/index.js';

const url = process.env.XTDB_URL;
if (!url) throw new Error('XTDB_URL');
const concurrency = Number(process.argv[2] ?? 32);
const rounds = Number(process.argv[3] ?? 10);
const sql = postgres(url, { max: concurrency + 2, prepare: false, onnotice: () => {} });
const STAMP = `((CURRENT_TIMESTAMP - TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z') / INTERVAL 'PT0.000001S')`;
const t = `p1_${Date.now()}`;
let n = 0;
for (let r = 0; r < rounds; r++) {
  await Promise.all(Array.from({ length: concurrency }, async () => {
    const id = ++n;
    const c = await sql.reserve();
    try {
      await c.unsafe(`BEGIN READ WRITE WITH (METADATA = {k: ${id}})`);
      await c.unsafe(`INSERT INTO ${t} (_id, pos) VALUES (${id}, ${STAMP})`);
      await c.unsafe('COMMIT');
    } finally { c.release(); }
  }));
}
const rows = await sql.unsafe(`SELECT _id, pos, ${'(_system_from - TIMESTAMP WITH TIME ZONE \'1970-01-01T00:00:00Z\') / INTERVAL \'PT0.000001S\''} AS sys FROM ${t}`);
const txs = await sql.unsafe(`SELECT _id AS tx, user_metadata, (system_time - TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z') / INTERVAL 'PT0.000001S' AS st FROM xt.txs WHERE committed = TRUE`);
const byKey = new Map(txs.filter((x) => x.user_metadata?.k !== undefined).map((x) => [Number(x.user_metadata.k), x]));
const joined = rows.map((row) => ({ id: Number(row._id), pos: BigInt(row.pos), sys: BigInt(row.sys), tx: BigInt(byKey.get(Number(row._id)).tx), st: BigInt(byKey.get(Number(row._id)).st) }));
joined.sort((a, b) => (a.tx < b.tx ? -1 : 1));
let equalSys = 0, equalTxs = 0, strict = 0;
for (let i = 0; i < joined.length; i++) {
  if (joined[i].pos === joined[i].sys) equalSys++;
  if (joined[i].pos === joined[i].st) equalTxs++;
  if (i > 0 && joined[i].pos > joined[i - 1].pos) strict++;
}
console.log(JSON.stringify({
  commits: joined.length, posEqualsSystemFrom: equalSys, posEqualsTxsSystemTime: equalTxs,
  strictlyIncreasingInTxOrder: `${strict}/${joined.length - 1}`, distinct: new Set(joined.map((x) => x.pos)).size,
  typeofPos: typeof rows[0].pos, sample: joined.slice(0, 3).map((x) => ({ ...x, pos: String(x.pos), sys: String(x.sys), tx: String(x.tx), st: String(x.st) })),
}));
await sql.end();
