// EXP-J01 probe 7: source-log bytes of candidate XTDB commit layouts for the same 10-fact command, before
// any is built. Captures one A0 command (82-character DatabaseScope, A0 = 30,061 bytes), rebuilds its
// statements in each layout, replays each on one raw connection in a fresh scope of equal key length.
//   C1  guards as two ASSERTs (serialization: scope CAS + claims; identity: operation + new ids), the scope
//       bound once ($1 reused) and the id lists as one text[] parameter each (= ANY), everything else A0.
//   H2  C1 + the journal as ONE physical row per command (a compact :_tx/record), the 14 logical journal
//       facts derived on read (needs read-path support in both lanes; not buildable inside EXP-J01's files).
//   H3  H2 + the operation receipt and command claim carried by that record row (no tx_attempts, tx_claims).
//   H4  H3 + a 22-character scope digest in place of the 82-character scope key in scope_key and every _id
//       (every read filters on scope_key, so this is a lane-wide read-path change too).
// Run: node p7-xtdb-designs.mjs   (writes a receipt)
import { createHash, randomUUID } from 'node:crypto';
import postgres from '../../../../packages/xtdb/node_modules/postgres/src/index.js';
import { URLS, commandOps, laneRuntime, runtimeApi, writeReceipt } from '../bench/lib.mjs';
import { COLS, col, dissect, rowClass } from '../bench/xtdb-replay.mjs';

const rt = await laneRuntime('xtdb', { scope: `j01-xa-${randomUUID()}` });
await rt.run(rt.triples.transact(commandOps(0, 1, 0), { commandId: `j01:${randomUUID()}` }));
rt.measuring.arm(true);
await rt.run(rt.triples.transact(commandOps(1, 10, 1), { commandId: `j01:${randomUUID()}` }));
const real = rt.measuring.records[0];
const scope = rt.scopeKey;
await rt.close();
const { byKind, rows } = dissect(real.statements);

const pg = postgres(URLS.xtdb, { max: 1, prepare: false, onnotice: () => {} });
const typed = (v) => pg.typed(v, v === null ? 0 : Array.isArray(v) ? 1009 : typeof v === 'string' ? 25 : typeof v === 'boolean' ? 16 : Number.isSafeInteger(v) ? 20 : 701);
const placeholders = (sql) => { let n = 0, q = false, o = ''; for (const ch of sql) { if (ch === "'") q = !q; o += !q && ch === '?' ? `$${++n}` : ch; } return o; };
const submit = async (statements) => {
  await pg.unsafe('BEGIN READ WRITE');
  for (const s of statements) await pg.unsafe(s.dollar ? s.sql : placeholders(s.sql), s.params.map(typed));
  await pg.unsafe('COMMIT SYNC');
  return Number((await pg.unsafe('SHOW LATEST_SUBMITTED_TX'))[0].tx_id);
};
const size = async (id) => {
  const fence = await submit([{ sql: 'INSERT INTO j01_fence (_id, at) VALUES (?, ?)', params: [randomUUID(), Date.now()] }]);
  const msgs = await pg.unsafe(`SELECT msg_id FROM xt.source_log_msgs WHERE msg_id BETWEEN ${id} AND ${fence}`);
  return msgs.map((m) => Number(m.msg_id)).sort((a, b) => a - b).find((x) => x > id) - id;
};
const escaped = (s) => JSON.stringify(s).slice(1, -1);
const sub = (p, target) => (typeof p === 'string' ? p.split(scope).join(target).split(escaped(scope)).join(escaped(target)) : Array.isArray(p) ? p.map((x) => sub(x, target)) : p);
const insertRows = (table, columns, values) => ({ sql: `INSERT INTO ${table} (_valid_from, ${columns.join(', ')}) VALUES ${values.map(() => `(TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', ${columns.map(() => '?').join(', ')})`).join(', ')}`, params: values.flat() });
const claim = byKind('insert-claims')[0], meta = byKind('insert-meta')[0], attempt = byKind('insert-attempts')[0];
const commandId = claim.params[2], operationId = attempt.params[2];
const serialization = (claims) => ({ dollar: true, sql: `ASSERT (SELECT COALESCE(MAX(position), 0) FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = $1) = $2${claims ? ' AND NOT EXISTS (SELECT 1 FROM tx_claims FOR ALL VALID_TIME WHERE scope_key = $1 AND command_id = ANY($3))' : ''}, 'triplex-cas-conflict'`, params: [scope, 0, ...(claims ? [[commandId]] : [])] });
const identity = (ids, attempts = true) => ({ dollar: true, sql: `ASSERT ${attempts ? 'NOT EXISTS (SELECT 1 FROM tx_attempts FOR ALL VALID_TIME WHERE scope_key = $1 AND operation_id = $2) AND ' : ''}NOT EXISTS (SELECT 1 FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = $1 AND id = ANY($${attempts ? 3 : 2})), 'triplex-identity-conflict'`, params: [scope, ...(attempts ? [operationId] : []), ids] });
const data = rows.filter((r) => rowClass(r) === 'data');
const journal = rows.filter((r) => rowClass(r) !== 'data');
// The compact journal record: one json fact per command holding what the 14 logical facts carry that the data rows do not.
const recordRow = (extra = {}) => {
  const template = journal.find((r) => r[col('attribute')] === ':_tx/change');
  const row = [...template];
  const value = {
    position: journal.find((r) => r[col('attribute')] === ':_tx/position')[col('value_number')],
    instant: journal.find((r) => r[col('attribute')] === ':_tx/instant')[col('value_datetime')],
    commandId, changedEntities: [data[0][col('entity_id')]], changes: data.map((r) => ['a', r[col('id')]]), ...extra,
  };
  row[col('attribute')] = ':_tx/record';
  row[col('value_json')] = JSON.stringify(value);
  row[col('value_identity')] = JSON.stringify({ type: 'json', value });
  return row;
};
const layouts = {
  A0: real.statements,
  C1: [serialization(true), identity(rows.map((r) => r[col('id')])), insertRows('tx_assertions', COLS, rows), claim, meta, attempt],
  H2: [serialization(true), identity([...data, recordRow()].map((r) => r[col('id')])), insertRows('tx_assertions', COLS, [...data, recordRow()]), claim, meta, attempt],
  H3: [serialization(false), identity([...data, recordRow({ operationId, attemptId: attempt.params[3] })].map((r) => r[col('id')]), false), insertRows('tx_assertions', COLS, [...data, recordRow({ operationId, attemptId: attempt.params[3] })]), meta],
};
const out = { a0RealRecordBytes: real.recordBytes, layouts: {} };
const digestOf = (target) => `s${createHash('sha256').update(target).digest('base64url').slice(0, 21)}`;
layouts.H4 = layouts.H3;
for (const [name, statements] of Object.entries(layouts)) {
  const full = runtimeApi.DatabaseScope.test(`j01-rp-${randomUUID()}`);
  const target = name === 'H4' ? digestOf(full) : full;
  const stmts = statements.map((s) => ({ ...s, params: s.params.map((p, i) => (s.sql.startsWith('ASSERT (SELECT COALESCE(MAX(position)') && i === 1 ? 0 : sub(p, target))) }));
  const bytes = await size(await submit(stmts));
  out.layouts[name] = { recordBytes: bytes, ratioVsA0: Math.round((real.recordBytes / bytes) * 100) / 100, statements: stmts.length, params: stmts.reduce((n, s) => n + s.params.length, 0) };
}
await pg.end();
const receipt = writeReceipt('xtdb-designs-probe', out);
console.log(JSON.stringify({ receipt: receipt.id, ...out }, null, 1));
process.exit(0);
