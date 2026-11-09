// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking. Binding errors remain checked by lab/bin/checkjs.mjs.
// EXP-J01 probe 1: is a source-log record the plain sum of its statements (SQL text plus the Arrow
// IPC argument bytes XTDB shows in xt.source_log_msgs.tx_ops), or is it compressed? Submits three
// hand-built transactions on one connection, finds each record by SHOW LATEST_SUBMITTED_TX, sizes it
// by the next message's offset (tx ids are byte offsets), and decodes its tx_ops.
// Run: XTDB_URL=... node p1-record-shape.mjs
import { randomUUID } from 'node:crypto';
import postgres from '../../../../packages/xtdb/node_modules/postgres/src/index.js';

const sql = postgres(process.env.XTDB_URL, { max: 1, prepare: false, onnotice: () => {} });
const typed = (v) => sql.typed(v, v === null ? 0 : typeof v === 'string' ? 25 : 20);
const submit = async (statements) => {
  await sql.unsafe('BEGIN READ WRITE');
  for (const s of statements) await sql.unsafe(s.sql, s.params.map(typed));
  await sql.unsafe('COMMIT SYNC');
  const [row] = await sql.unsafe('SHOW LATEST_SUBMITTED_TX');
  return row;
};
const fence = () => submit([{ sql: 'INSERT INTO j01_fence (_id, at) VALUES ($1, $2)', params: [randomUUID(), Date.now()] }]);
const parseOps = (text) => {
  const ops = [];
  const re = /:query "((?:[^"\\]|\\.)*)"(?:, :args (?:#bytes "([0-9a-f]*)"|nil))?/g;
  for (let m; (m = re.exec(text)); ) ops.push({ queryBytes: Buffer.byteLength(JSON.parse(`"${m[1]}"`)), argsBytes: m[2] ? m[2].length / 2 : 0 });
  return ops;
};
const measure = async (label, statements) => {
  const mine = await submit(statements);
  const f = await fence();
  const id = Number(mine.tx_id), fid = Number(f.tx_id);
  const msgs = await sql.unsafe(`SELECT msg_id, msg_type, tx_ops FROM xt.source_log_msgs WHERE msg_id BETWEEN ${id} AND ${fid}`);
  const ids = msgs.map((m) => Number(m.msg_id)).sort((a, b) => a - b);
  const next = ids.find((x) => x > id);
  const own = msgs.find((m) => Number(m.msg_id) === id);
  const ops = parseOps(own.tx_ops);
  const sum = ops.reduce((n, o) => n + o.queryBytes + o.argsBytes, 0);
  return { label, txId: id, recordBytes: next - id, between: ids.length - 2, ops, opsSum: sum, overhead: next - id - sum };
};
const scope = `j01-p1-${randomUUID()}`;
const out = [];
out.push(await measure('one row, 3 text params', [{ sql: 'INSERT INTO j01_probe (_id, scope_key, a) VALUES ($1, $2, $3)', params: [randomUUID(), scope, 'x'.repeat(10)] }]));
out.push(await measure('one row, 3 text params, 1000-char value', [{ sql: 'INSERT INTO j01_probe (_id, scope_key, a) VALUES ($1, $2, $3)', params: [randomUUID(), scope, 'x'.repeat(1000)] }]));
const rows = 20;
const params = [];
for (let i = 0; i < rows; i++) params.push(randomUUID(), scope, `v${i}`, null, null);
out.push(await measure('20 rows x 5 params (2 NULL per row)', [{ sql: `INSERT INTO j01_probe (_id, scope_key, a, b, c) VALUES ${Array.from({ length: rows }, (_v, r) => `($${r * 5 + 1}, $${r * 5 + 2}, $${r * 5 + 3}, $${r * 5 + 4}, $${r * 5 + 5})`).join(', ')}`, params }]));
console.log(JSON.stringify(out, null, 1));
await sql.end();
