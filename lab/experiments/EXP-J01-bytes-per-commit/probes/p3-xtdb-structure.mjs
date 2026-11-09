// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members; option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
// EXP-J01 probe 3: which structural costs dominate an A0 XTDB record beyond the journal payload?
// Captures one real 10-fact A0 commit, then replays variants (each in a fresh scope of equal key length):
// parameters versus SQL literals in the ASSERTs, one merged ASSERT, no ASSERTs, no bookkeeping inserts,
// journal rows with a short value_identity, and journal rows absent (the bound of any journal encoding).
// Run: node p3-xtdb-structure.mjs   (writes a receipt)
import { randomUUID } from 'node:crypto';
import { commandOps, laneRuntime, writeReceipt } from '../bench/lib.mjs';
import { assertionsInsert, col, dissect, makeReplayer, rowClass } from '../bench/xtdb-replay.mjs';

const rt = await laneRuntime('xtdb', { scope: `j01-xa-${randomUUID()}` });
await rt.run(rt.triples.transact(commandOps(0, 1, 0), { commandId: `j01:${randomUUID()}` }));
rt.measuring.arm(true);
await rt.run(rt.triples.transact(commandOps(1, 10, 1), { commandId: `j01:${randomUUID()}` }));
const real = rt.measuring.records[0];
const scope = rt.scopeKey;
await rt.close();

const { byKind, rows } = dissect(real.statements);
const { replay, close } = makeReplayer(scope);
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const lit = { literalScope: true };
const cas = byKind('assert-cas')[0], op = byKind('assert-operation')[0], claim = byKind('assert-claim')[0], guard = byKind('assert-new-ids')[0];
const literalAsserts = [
  { ...lit, kind: 'x', sql: `ASSERT (SELECT COALESCE(MAX(position), 0) FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ${q(scope)}) = 0, 'triplex-cas-conflict'` },
  { ...lit, kind: 'x', sql: `ASSERT NOT EXISTS (SELECT 1 FROM tx_attempts FOR ALL VALID_TIME WHERE scope_key = ${q(scope)} AND operation_id = ${q(op.params[1])}), 'triplex-operation-duplicate'` },
  { ...lit, kind: 'x', sql: `ASSERT NOT EXISTS (SELECT 1 FROM tx_claims FOR ALL VALID_TIME WHERE scope_key = ${q(scope)} AND command_id = ${q(claim.params[1])}), 'triplex-command-conflict'` },
  { ...lit, kind: 'x', sql: `ASSERT NOT EXISTS (SELECT 1 FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ${q(scope)} AND id IN (${guard.params.slice(1).map(q).join(', ')})), 'triplex-assertion-identity-conflict'` },
];
const mergedAssert = [{ ...lit, kind: 'x', sql: `ASSERT (SELECT COALESCE(MAX(position), 0) FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ${q(scope)}) = 0 AND NOT EXISTS (SELECT 1 FROM tx_attempts FOR ALL VALID_TIME WHERE scope_key = ${q(scope)} AND operation_id = ${q(op.params[1])}) AND NOT EXISTS (SELECT 1 FROM tx_claims FOR ALL VALID_TIME WHERE scope_key = ${q(scope)} AND command_id = ${q(claim.params[1])}) AND NOT EXISTS (SELECT 1 FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ${q(scope)} AND id IN (${guard.params.slice(1).map(q).join(', ')})), 'triplex-commit-guard'` }];
const paramAsserts = [cas, op, claim, guard];
const inserts = (rowSet = rows) => [assertionsInsert(rowSet), ...byKind('insert-claims'), ...byKind('insert-meta'), ...byKind('insert-attempts')];
const shortIdentity = (row) => {
  if (rowClass(row) !== 'data') { row[col('value_identity')] = 'sha256:' + 'x'.repeat(43); }
  return row;
};
const variants = [];
const run = async (name, stmts) => { const r = await replay(name, stmts); variants.push(r); return r; };
const full = await run('A0 as captured', [...paramAsserts, ...inserts()]);
await run('ASSERTs with SQL literals instead of parameters', [...literalAsserts, ...inserts()]);
await run('one merged ASSERT with SQL literals', [...mergedAssert, ...inserts()]);
await run('no ASSERTs (bound)', inserts());
await run('no bookkeeping inserts: claims, meta, attempts (bound)', [...paramAsserts, assertionsInsert(rows)]);
await run('journal rows with a 50-character value_identity digest', [...paramAsserts, ...inserts(rows.map((r) => shortIdentity([...r])))]);
await run('no journal rows and no journal ids in the guard (bound of any journal encoding)', [
  cas, op, claim,
  { ...guard, params: [guard.params[0], ...guard.params.slice(1).filter((id) => rows.find((r) => r[col('id')] === id && rowClass(r) === 'data'))], sql: guard.sql.replace(/IN \(([^)]*)\)/, `IN (${rows.filter((r) => rowClass(r) === 'data').map(() => '?').join(', ')})`) },
  ...inserts(rows.filter((r) => rowClass(r) === 'data')),
]);
await run('one merged literal ASSERT and no journal rows (bound)', [
  { ...mergedAssert[0], sql: mergedAssert[0].sql.replace(/id IN \(([^)]*)\)/, `id IN (${rows.filter((r) => rowClass(r) === 'data').map((r) => q(r[col('id')])).join(', ')})`) },
  ...inserts(rows.filter((r) => rowClass(r) === 'data')),
]);
await close();
const out = { realRecordBytes: real.recordBytes, variants: variants.map((v) => ({ variant: v.name, recordBytes: v.recordBytes, vsA0: v.recordBytes - full.recordBytes, ratio: Math.round((full.recordBytes / v.recordBytes) * 100) / 100 })) };
const receipt = writeReceipt('xtdb-structure-probe', out);
console.log(JSON.stringify({ receipt: receipt.id, ...out }, null, 1));
process.exit(0);
