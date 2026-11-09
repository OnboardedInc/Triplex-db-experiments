// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing; option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
// EXP-J01 XTDB attribution: bytes of source log per Triplex command, by source.
//
// 1. Commits real commands (1, 10, 10, 10, 50 facts, each with a commandId) through the Triplex runtime
//    on one fresh scope and sizes each command's source-log record (next offset minus own offset).
// 2. Replays the captured 10-fact statements into fresh replay scopes of the same key length, adding one
//    source at a time (telescoping, so the increments sum exactly to the replayed total), then checks the
//    replayed total against the real record. The same scope-key length keeps every byte length equal.
// 3. Column variants on the full replay isolate the change payload, value_identity and the scope key.
//
// Usage: node xtdb-attribution.mjs [--encoding a0|compact] [--label TEXT]
import { randomUUID } from 'node:crypto';
import { commandOps, laneRuntime, writeReceipt, xtdb } from './lib.mjs';
import { COLS, assertionsInsert, col, dissect, makeReplayer, newIdsAssert, rowClass } from './xtdb-replay.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const encoding = opt('--encoding', undefined);
const compact = encoding === 'compact';
const label = opt('--label', encoding ?? 'A0');

const rt = await laneRuntime('xtdb', { scope: `j01-xa-${randomUUID()}`, commitEncoding: encoding });
await rt.run(rt.triples.transact(commandOps(0, 1, 0), { commandId: `j01:${randomUUID()}` }));
rt.measuring.arm(true);
const sizes = [1, 10, 10, 10, 50];
for (const [i, facts] of sizes.entries())
  await rt.run(rt.triples.transact(commandOps(i + 1, facts, i + 1), { commandId: `j01:${randomUUID()}` }));
const real = rt.measuring.records.map((r, i) => ({ facts: sizes[i], recordBytes: r.recordBytes, interleaved: r.interleaved, ops: r.ops, statements: r.statements.length, params: r.statements.reduce((n, s) => n + s.params.length, 0), sqlChars: r.statements.reduce((n, s) => n + s.sql.length, 0) }));
const ten = rt.measuring.records[1];
const scope = rt.scopeKey;
await rt.close();

const { statements, byKind, rows } = dissect(ten.statements);
const rowsOf = (...classes) => rows.filter((row) => classes.includes(rowClass(row)));
const idsOf = (...classes) => rowsOf(...classes).map((row) => row[col('id')]);
const commandId = byKind('insert-claims')[0].params[2];
const operationId = byKind('insert-attempts')[0].params[2];
// Guard statements for a subset of sources, in the encoding under test (A0's four ASSERTs, or the
// compact pair from the adapter's own builder).
const guards = ({ cas, operation, claim, idClasses }) => {
  const ids = idsOf(...idClasses);
  if (compact) {
    const [serialization, identity] = xtdb.compactGuards(scope, 0, operationId, claim ? [commandId] : [], ids);
    return [...(cas ? [{ ...serialization, kind: 'assert-cas' }] : []), ...(operation ? [{ ...identity, kind: 'assert-identity' }] : [])];
  }
  return [
    ...(cas ? byKind('assert-cas') : []),
    ...(operation ? byKind('assert-operation') : []),
    ...(claim ? byKind('assert-claim') : []),
    ...(ids.length ? [newIdsAssert(scope, ids)] : []),
  ];
};
const inserts = ({ attempts, claims, classes }) => [
  ...(classes.length ? [assertionsInsert(rowsOf(...classes))] : []),
  ...(claims ? byKind('insert-claims') : []),
  ...byKind('insert-meta'),
  ...(attempts ? byKind('insert-attempts') : []),
];
// Cumulative source sets, in the adapter's statement order (guards first, then inserts).
const steps = [
  ['base: record + tx_meta (position counter)', {}],
  ['tx_attempts (operation receipt)', { attempts: true }],
  ['tx_claims (command claim)', { claims: true }],
  [compact ? 'ASSERT serialization: scope CAS + command not claimed' : 'ASSERT scope CAS', { cas: true, ...(compact ? { claim: true } : {}) }],
  [compact ? 'ASSERT identity: operation not recorded' : 'ASSERT operation not duplicate', { operation: true }],
  ...(compact ? [] : [['ASSERT command not claimed', { claim: true }]]),
  ['data rows (10 tx_assertions)', { data: true }],
  ['guard: data assertion ids', { dataIds: true }],
  ['journal envelope rows (position, instant, command-id, changed-entity) + their ids', { envelope: true }],
  ['journal change rows (10 :_tx/change) + their ids', { change: true }],
];
const { replay, close } = makeReplayer(scope);
const incremental = [];
const acc = {};
for (const [name, flags] of steps) {
  Object.assign(acc, flags);
  const classes = [...(acc.data ? ['data'] : []), ...(acc.envelope ? ['journal-envelope'] : []), ...(acc.change ? ['journal-change'] : [])];
  const idClasses = [...(acc.dataIds ? ['data'] : []), ...(acc.envelope ? ['journal-envelope'] : []), ...(acc.change ? ['journal-change'] : [])];
  incremental.push(await replay(name, [...guards({ ...acc, idClasses }), ...inserts({ ...acc, classes })]));
}
const exact = await replay('full replay of the captured statements', statements);
const variant = async (name, mapRow) =>
  replay(name, statements.map((s) => (s.kind === 'insert-assertions' ? { ...assertionsInsert(rows.map((row) => mapRow([...row]))) } : s)));
const variants = [
  await variant('change rows without value_identity', (row) => { if (rowClass(row) === 'journal-change') row[col('value_identity')] = null; return row; }),
  await variant('change rows without value_json and value_identity', (row) => { if (rowClass(row) === 'journal-change') { row[col('value_json')] = null; row[col('value_identity')] = null; } return row; }),
  await variant('all rows without value_identity', (row) => { row[col('value_identity')] = null; return row; }),
  await variant('all rows with _id = id (no scope copy in the key)', (row) => { row[col('_id')] = row[col('id')]; return row; }),
];
await close();

const increments = incremental.map((r, i) => ({ source: r.name, cumulativeBytes: r.recordBytes, bytes: i === 0 ? r.recordBytes : r.recordBytes - incremental[i - 1].recordBytes }));
const out = {
  lane: 'xtdb', label, commitEncoding: encoding ?? 'a0 (default)', scopeKeyLength: scope.length,
  real, tenFactRecordBytes: ten.recordBytes,
  statements: statements.map((s) => ({ kind: s.kind, params: s.params.length, sqlChars: s.sql.length })),
  rowCounts: { data: rowsOf('data').length, envelope: rowsOf('journal-envelope').length, change: rowsOf('journal-change').length },
  changeJsonBytes: rowsOf('journal-change').map((r) => ({ valueJson: Buffer.byteLength(r[col('value_json')]), valueIdentity: Buffer.byteLength(r[col('value_identity')]) })),
  increments, replayedTotal: incremental.at(-1).recordBytes, exactReplay: exact.recordBytes,
  closure: { realVsReplay: ten.recordBytes - exact.recordBytes, incrementalVsReal: incremental.at(-1).recordBytes - ten.recordBytes, sumOfIncrements: increments.reduce((n, x) => n + x.bytes, 0) },
  variants: variants.map((v) => ({ variant: v.name, recordBytes: v.recordBytes, savedVsFull: exact.recordBytes - v.recordBytes })),
};
void COLS;
const receipt = writeReceipt(`xtdb-attribution-${label}`, { ...out, raw: { tenFactStatements: ten.statements } });
console.log(JSON.stringify({ receipt: receipt.id, ...out }, null, 1));
process.exit(0);
