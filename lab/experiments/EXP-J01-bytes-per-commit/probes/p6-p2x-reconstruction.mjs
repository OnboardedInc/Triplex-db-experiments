// EXP-J01 probe 6: where the EXP-P2X subject-stamp candidate's 95,364 bytes per 10-fact commit come from.
// Captures one A0 10-fact command on the raw 43-character scope EXP-P2X's p10 used (`p10-A0-<uuid>`; A0
// must reproduce p10's 27,581 bytes), rebuilds the candidate's statements for the same rows from its source
// at fb6681a (persistStamped and stampedInsert, read with git show), replays them on one raw connection
// (METADATA on BEGIN, as the candidate's client sends it), and adds one source at a time.
// Run: XTDB_URL=... node p6-p2x-reconstruction.mjs   (writes a receipt)
import { randomUUID } from 'node:crypto';
import { Effect, Layer, ManagedRuntime } from 'effect';
import postgres from '../../../../packages/xtdb/node_modules/postgres/src/index.js';
import { URLS, commandOps, core, measuringXtdbClient, runtimeApi, writeReceipt, xtdb } from '../bench/lib.mjs';
import { COLS, col, dissect, rowClass } from '../bench/xtdb-replay.mjs';

// ---- capture A0 on a raw p10-style scope
const capture = async (scope) => {
  const measuring = measuringXtdbClient(URLS.xtdb);
  const adapter = xtdb.makeXtdbStorageAdapter(measuring.client, scope);
  const layer = runtimeApi.Runtime.define({ name: 'j01-p6', storage: Layer.succeed(runtimeApi.StorageAdapter, adapter), queries: Layer.succeed(runtimeApi.QueryExecutor, xtdb.makeXtdbQueryExecutor(measuring.client, scope)) })
    .layer({ scope: runtimeApi.DatabaseScope.test(scope), capabilities: runtimeApi.Capabilities.none });
  const managed = ManagedRuntime.make(layer);
  const triples = await managed.runPromise(Effect.gen(function* () { return yield* core.Triples; }));
  await managed.runPromise(triples.transact(commandOps(0, 1, 0, 'p2x'), {}));
  measuring.arm(true);
  await managed.runPromise(triples.transact(commandOps(1, 10, 1, 'p2x'), { commandId: `p10:${randomUUID()}` }));
  await managed.dispose(); await measuring.client.close();
  return measuring.records[0];
};
const scope = `p10-A0-${randomUUID()}`;
const a0 = await capture(scope);
const { byKind, rows } = dissect(a0.statements);

// ---- the candidate's statement builders (EXP-P2X fb6681a, XtdbStorageAdapter.ts lines 70-145, 540-720)
const COMMIT_STAMP_SQL = "((CURRENT_TIMESTAMP - TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z') / INTERVAL 'PT0.000001S')";
const positionSql = (o) => `((${COMMIT_STAMP_SQL} - 1577836800000000) * 8 + ${o})`;
class Stamp { constructor(ordinal, form) { this.ordinal = ordinal; this.form = form; } }
const stampedInsert = (table, columns, values) => {
  const forms = columns.map((_c, j) => values.map((r) => r[j]).find((c) => c instanceof Stamp)?.form);
  const sourceColumns = columns.flatMap((_c, j) => (forms[j] === undefined ? [`c${j}`] : [`c${j}`, `o${j}`]));
  const projection = columns.map((_c, j) => {
    const form = forms[j];
    if (form === undefined) return `v.c${j}`;
    const o = `v.o${j}`;
    const stamp = form === 'raw' ? `(${COMMIT_STAMP_SQL} + ${o} * 0)` : form === 'number-identity' ? `'{"type":"number","value":' || CAST(${positionSql(o)} AS VARCHAR) || '}'` : positionSql(o);
    return `COALESCE(v.c${j}, ${stamp})`;
  });
  const params = values.flatMap((row) => row.flatMap((cell, j) => (forms[j] === undefined ? [cell] : cell instanceof Stamp ? [null, cell.ordinal] : [cell, null])));
  return { sql: `INSERT INTO ${table} (_valid_from, ${columns.join(', ')}) SELECT TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', ${projection.join(', ')} FROM (VALUES ${values.map(() => `(${sourceColumns.map(() => '?').join(', ')})`).join(', ')}) AS v (${sourceColumns.join(', ')})`, params };
};
const metadataLiteral = (v) => typeof v === 'string' ? `'${v.replaceAll("'", "''")}'` : typeof v === 'number' ? String(v) : Array.isArray(v) ? `[${v.map(metadataLiteral).join(', ')}]` : `{${Object.entries(v).map(([k, x]) => `${k}: ${metadataLiteral(x)}`).join(', ')}}`;

const build = (target, { stampedRows = true, stampedBookkeeping = true, sql = true, heads = true, feed = true, metadata = true } = {}) => {
  const J = (...xs) => JSON.stringify(xs);
  const claim = byKind('insert-claims')[0].params; // [_id, scope, command_id, tx_id, recorded_at, position]
  const attempt = byKind('insert-attempts')[0].params; // [_id, scope, op, attempt, position]
  const op = attempt[2];
  const entity = rows.find((r) => rowClass(r) === 'data')[col('entity_id')];
  const cells = rows.map((r) => {
    const row = [J(target, r[col('id')]), target, ...r.slice(2, COLS.length - 1)];
    const isPosition = r[col('attribute')] === ':_tx/position';
    if (stampedRows) {
      row[col('recorded_position')] = new Stamp(0, 'position');
      if (isPosition) row[col('value_number')] = new Stamp(0, 'position');
    }
    row.push(isPosition && stampedRows ? new Stamp(0, 'number-identity') : r[col('value_identity')]);
    return row;
  });
  const plain = (table, columns, values) => ({ sql: `INSERT INTO ${table} (_valid_from, ${columns.join(', ')}) VALUES ${values.map(() => `(TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', ${columns.map(() => '?').join(', ')})`).join(', ')}`, params: values.flat().map((c) => (c instanceof Stamp ? 0 : c)) });
  const ins = (table, columns, values) => (stampedRows ? stampedInsert : plain)(table, columns, values);
  const bk = (table, columns, values) => (stampedBookkeeping ? stampedInsert : plain)(table, columns, values);
  const changes = rows.filter((r) => rowClass(r) === 'data').map((r) => ['assert', r[col('entity_id')], r[col('attribute')], r[col('valid_from')], r[col('valid_to')], 0]);
  const out = [];
  if (sql) {
    out.push({ sql: `ASSERT NOT EXISTS (SELECT 1 FROM tx_claims FOR ALL VALID_TIME WHERE _id IN (?)) AND NOT EXISTS (SELECT 1 FROM tx_heads FOR ALL VALID_TIME WHERE _id IN (?) AND position > ?), 'triplex-cas-conflict'`, params: [J(target, claim[2]), J(target, entity), 0] });
    out.push({ sql: `ASSERT NOT EXISTS (SELECT 1 FROM tx_assertions FOR ALL VALID_TIME WHERE _id IN (${cells.map(() => '?').join(', ')})) AND NOT EXISTS (SELECT 1 FROM tx_attempts FOR ALL VALID_TIME WHERE _id = ?), 'triplex-identity-conflict'`, params: [...cells.map((c) => c[0]), J(target, op)] });
  }
  out.push(ins('tx_assertions', COLS, cells));
  out.push(bk('tx_claims', ['_id', 'scope_key', 'command_id', 'tx_id', 'recorded_at', 'position'], [[J(target, claim[2]), target, claim[2], claim[3], claim[4], new Stamp(0, 'position')]]));
  if (heads) out.push(bk('tx_heads', ['_id', 'scope_key', 'entity_id', 'position'], [[J(target, entity), target, entity, new Stamp(0, 'position')]]));
  if (feed) out.push(bk('tx_feed', ['_id', 'scope_key', 'operation_id', 'position', 'stamp', 'ordinals', 'tx_ids', 'command_ids', 'changes'], [[J(target, op), target, op, new Stamp(0, 'position'), new Stamp(0, 'raw'), 1, JSON.stringify([claim[3]]), JSON.stringify([claim[2]]), JSON.stringify(changes)]]));
  out.push(bk('tx_meta', ['_id', 'scope_key', 'position'], [[target, target, new Stamp(0, 'position')]]));
  out.push(bk('tx_attempts', ['_id', 'scope_key', 'operation_id', 'attempt_id', 'position', 'stamp'], [[J(target, op), target, op, attempt[3], new Stamp(0, 'position'), new Stamp(0, 'raw')]]));
  const meta = { triplex: 'p2x-1', scope: target, op, n: 1, subj: [entity], attrs: [...new Set(changes.map((c) => c[2]))].sort(), cmd: [claim[2]], vf: Math.min(...changes.map((c) => c[3])) };
  return { statements: out, begin: metadata ? `BEGIN READ WRITE WITH (METADATA = ${metadataLiteral(meta)})` : 'BEGIN READ WRITE' };
};

// ---- raw submitter: XtdbClient's parameter typing, a custom BEGIN, record sizing by offsets
const pg = postgres(URLS.xtdb, { max: 1, prepare: false, onnotice: () => {} });
const typed = (v) => pg.typed(v, v === null ? 0 : typeof v === 'string' ? 25 : typeof v === 'boolean' ? 16 : Number.isSafeInteger(v) ? 20 : 701);
const placeholders = (sql) => { let n = 0, q = false, o = ''; for (const ch of sql) { if (ch === "'") q = !q; o += !q && ch === '?' ? `$${++n}` : ch; } return o; };
const submit = async (begin, statements) => {
  await pg.unsafe(begin);
  for (const s of statements) await pg.unsafe(placeholders(s.sql), s.params.map(typed));
  await pg.unsafe('COMMIT SYNC');
  return Number((await pg.unsafe('SHOW LATEST_SUBMITTED_TX'))[0].tx_id);
};
const size = async (id) => {
  const fence = await submit('BEGIN READ WRITE', [{ sql: 'INSERT INTO j01_fence (_id, at) VALUES (?, ?)', params: [randomUUID(), Date.now()] }]);
  const msgs = await pg.unsafe(`SELECT msg_id FROM xt.source_log_msgs WHERE msg_id BETWEEN ${id} AND ${fence}`);
  return msgs.map((m) => Number(m.msg_id)).sort((a, b) => a - b).find((x) => x > id) - id;
};
// The candidate's ASSERTs plan against tx_heads and tx_feed; create them once in a throwaway scope.
await submit('BEGIN READ WRITE', [
  { sql: 'INSERT INTO tx_heads (_id, scope_key, entity_id, position) VALUES (?, ?, ?, ?)', params: [randomUUID(), `j01-p6-init-${randomUUID()}`, 'x', 0] },
  { sql: 'INSERT INTO tx_feed (_id, scope_key, operation_id, position) VALUES (?, ?, ?, ?)', params: [randomUUID(), `j01-p6-init-${randomUUID()}`, 'x', 0] },
]);
const replay = async (name, options) => {
  const target = `p10-C0-${randomUUID()}`;
  if (target.length !== scope.length) throw new Error('scope length');
  const { statements, begin } = build(target, options);
  const bytes = await size(await submit(begin, statements));
  return { name, recordBytes: bytes, statements: statements.length, params: statements.reduce((n, s) => n + s.params.length, 0), sqlChars: statements.reduce((n, s) => n + s.sql.length, 0) };
};
const steps = [
  await replay('candidate rows and bookkeeping as plain INSERT ... VALUES (put-docs), no ASSERTs, no heads/feed/METADATA', { stampedRows: false, stampedBookkeeping: false, sql: false, heads: false, feed: false, metadata: false }),
  await replay('+ the two merged ASSERTs (_id point lookups)', { stampedRows: false, stampedBookkeeping: false, heads: false, feed: false, metadata: false }),
  await replay('+ tx_heads and tx_feed rows (plain)', { stampedRows: false, stampedBookkeeping: false, metadata: false }),
  await replay('+ METADATA on BEGIN', { stampedRows: false, stampedBookkeeping: false }),
  await replay('+ stamped bookkeeping inserts (INSERT ... SELECT)', { stampedRows: false }),
  await replay('+ stamped tx_assertions insert (INSERT ... SELECT) = the candidate', {}),
];
await pg.end();
const increments = steps.map((s, i) => ({ ...s, bytes: i === 0 ? s.recordBytes : s.recordBytes - steps[i - 1].recordBytes }));
const out = { scopeKeyLength: scope.length, a0RecordBytes: a0.recordBytes, p2xReported: { a0: 27581, candidate: 95364 }, increments, reconstructedCandidate: steps.at(-1).recordBytes };
const receipt = writeReceipt('p2x-reconstruction', out);
console.log(JSON.stringify({ receipt: receipt.id, ...out }, null, 1));
process.exit(0);
