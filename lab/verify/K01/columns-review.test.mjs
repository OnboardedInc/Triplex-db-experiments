// [EXP-K01-VK01-R7] Why: enumerate storage independently and change every stored input through the actual SQL reader and granting gate. Rejected: looping only over G0's own projection, which cannot expose an omitted column.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { test, after } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typedCatalog } from '../../bench/lib/g0-catalog.ts';
import { admitG0, readG0, bounded, fields } from '../../bench/lib/g0.ts';
const root = path.resolve(import.meta.dirname, '../../..');
const out = process.env.TX2_K01_COLUMNS_OUT ?? '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VK01/round8/attempt-1/columns';
const sources = Object.fromEntries(fs.readdirSync(path.join(root, 'packages/xtdb/src'), { recursive: true }).filter(f => f.endsWith('.ts')).map(f => [f, fs.readFileSync(path.join(root, 'packages/xtdb/src', f), 'utf8')]));
const assertion = [.../export const assertionColumns = \[([\s\S]*?)\] as const/.exec(sources['codecs.ts'])[1].matchAll(/"([a-z_]+)"/g)].map(m => m[1]);
const declarations = {};
const locations = {};
for (const [file, source] of Object.entries(sources)) {
  const expanded = source.replaceAll('${assertionColumns.join(", ")}', assertion.join(', '));
  for (const m of expanded.matchAll(/CREATE TABLE (tx_[a-z_]+) \(([^)]+)\)/g)) {
    assert.ok(!declarations[m[1]], 'duplicate independent declaration');
    declarations[m[1]] = m[2].split(',').map(c => c.trim());
    locations[m[1]] = { file, line: expanded.slice(0, m.index).split('\n').length };
  }
}
const expected = { scope: 'review-lineage', position: 2, world: 'N01', counts: { tx_assertions: 2, tx_claims: 2, tx_attempts: 2, tx_meta: 1 } };
const cases = [];
const readerSource = fs.readFileSync(path.join(root, 'lab/bench/lib/g0-xtdb.ts'), 'utf8');
const parsed = ts.createSourceFile('g0-xtdb.ts', readerSource, ts.ScriptTarget.Latest, true);
const declaration = parsed.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'openG0');
assert.ok(declaration, 'current SQL reader must exist');
const extracted = declaration.getText(parsed).replace(/^export /, '').replaceAll('import.meta.dirname', JSON.stringify(path.join(root, 'lab/bench/lib'))).replaceAll('await import(', 'await fixtureImport(');
const javascript = ts.transpileModule(extracted, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
function value(table, column, i) {
  if (column === 'scope_key') return expected.scope;
  if (column === 'position' && table === 'tx_meta') return expected.position;
  if (/position|source_k|depth|ordinal|row_count|schema_version|valid_at|recorded_at|valid_from|valid_to|retracted_at/.test(column)) return i + 1;
  if (column === 'value_number') return 3.25;
  if (column === 'value_boolean') return 1;
  if (column === 'value_datetime') return 1000;
  if (column === 'value_type') return 'string';
  if (column === 'value_json') return '{"nested":[1,"original"]}';
  if (column === 'value_identity') return '{"type":"string","value":"key-' + i + '"}';
  return table + '/' + column + '/' + i;
}
async function fixture() {
  const tables = Object.fromEntries(Object.entries(declarations).map(([table, cols]) => [table, Array.from({ length: expected.counts[table] ?? 1 }, (_, i) => Object.fromEntries(cols.map(c => [c, value(table, c, i)])))]));
  const calls = [];
  const client = {
    async query(sql, params, _basis, options) {
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(options.timeoutMs, 600_000);
      calls.push({ sql, params: structuredClone(params), aborted: options.signal.aborted });
      if(sql.includes('FROM information_schema.tables'))return Object.keys(tables).sort().map(table_name=>({table_name}));
      if(sql.includes('FROM information_schema.columns'))return Object.entries(tables).flatMap(([table_name,rows])=>declarations[table_name].map(column_name=>({table_name,column_name,xt_type:':utf8'})));
      const table = /FROM (tx_[a-z_]+)/.exec(sql)?.[1];
      assert.ok(table && tables[table], 'unexpected SQL: ' + sql);
      if (sql.startsWith('SELECT scope_key, position')) return tables[table].map(({ scope_key, position }) => ({ scope_key, position }));
      const rows = tables[table].filter(row => params.length===0 || row.scope_key === params[0]);
      if (sql.startsWith('SELECT COUNT(*)')) return [{ n: rows.length }];
      const projection = /^SELECT (.+?) FROM/.exec(sql)[1];
      const offset = Number(/OFFSET (\d+)/.exec(sql)[1]);
      const limit = Number(/LIMIT (\d+)/.exec(sql)[1]);
      return rows.slice(offset, offset + limit).map(row => projection === '*' ? structuredClone(row) : Object.fromEntries(projection.split(',').map(c => c.trim()).filter(c => Object.hasOwn(row, c)).map(c => [c, structuredClone(row[c])])));
    },
    async close() { calls.push({ close: true }); },
  };
  const fixtureImport = async url => {
    if (url.endsWith('/packages/xtdb/dist/index.js')) return { makeXtdbClient(endpoint, options) { assert.equal(endpoint, 'offline-measured-endpoint'); assert.equal(options.maxConnections, 1); return client; } };
    if (url.endsWith('/packages/core/dist/runtime/index.js')) return { DatabaseScope: { test: scope => scope } };
    throw Error('unexpected import: ' + url);
  };
  const open = vm.runInNewContext(javascript + ';openG0', { path, pathToFileURL, fields, typedCatalog, bounded, fixtureImport, AbortSignal, Object, Number, String, openWire:async()=>({scan:(sql,params,signal)=>client.query(sql,params,undefined,{signal,timeoutMs:600000}),close:async()=>{}}) });
  const handle = await open('offline-measured-endpoint');
  return { tables, calls, handle };
}
test('independent inventory covers eleven tables and eighty-nine columns without exclusions', () => {
  assert.equal(Object.keys(declarations).length, 11);
  assert.equal(Object.values(declarations).flat().length, 89);
  assert.deepEqual(Object.keys(fields).sort(), Object.keys(declarations).sort());
  for (const [table, columns] of Object.entries(declarations)) assert.deepEqual([...fields[table]].sort(), [...columns].sort(), table);
});
for (const [table, columns] of Object.entries(declarations)) for (const column of columns) test(`independent SQL-reader clone mutation refuses ${table}.${column}`, async () => {
  const f = await fixture();
  try {
    const pin = await readG0(f.handle.reader, expected);
    const before = structuredClone(f.tables[table][0]);
    const old = before[column];
    f.tables[table][0][column] = typeof old === 'number' ? old + 7 : old + '-changed';
    const after = structuredClone(f.tables[table][0]);
    const scanStart = f.calls.length;
    let result, error;
    try { result = await admitG0(f.handle.reader, pin, expected, undefined, 1000); } catch (e) { error = e.message; }
    cases.push({ table, column, before, after, pin, result, error, calls: f.calls, scanStart });
    assert.ok(error && /G0 (content mismatch|count mismatch|foreign scope or wrong position)/.test(error), 'fresh clone must refuse: ' + table + '.' + column);
    assert.equal(result, undefined);
    assert.ok(f.calls.length > scanStart, 'must perform fresh endpoint reads');
  } finally { await f.handle.close(); }
});
for (const variant of ['dynamic-add', 'dynamic-change', 'dynamic-delete', 'sparse-null-to-value']) test(`SQL-reader preserves ${variant}`, async () => {
  const f = await fixture();
  try {
    const row = f.tables.tx_query_members[0];
    if (variant.startsWith('dynamic') && variant !== 'dynamic-add') row.binding_0 = { value: ['old', 1] };
    if (variant === 'sparse-null-to-value') delete row.ordinal;
    const pin = await readG0(f.handle.reader, expected);
    if (variant === 'dynamic-delete') delete row.binding_0;
    else if (variant === 'sparse-null-to-value') row.ordinal = 7;
    else row.binding_0 = { value: ['new', 1] };
    await assert.rejects(admitG0(f.handle.reader, pin, expected), /G0 content mismatch/);
    cases.push({ variant, pin, after: row, calls: f.calls, refused: true });
  } finally { await f.handle.close(); }
});
test('SQL-reader sparse NULL representation and row order are stable, but every table is freshly scanned', async () => {
  const f = await fixture();
  try {
    delete f.tables.tx_query_members[0].ordinal;
    const pin = await readG0(f.handle.reader, expected);
    f.tables.tx_query_members[0].ordinal = null;
    for (const rows of Object.values(f.tables)) rows.reverse();
    const scanStart = f.calls.length;
    const result = await admitG0(f.handle.reader, pin, expected);
    assert.equal(result.status, 'PASS');
    assert.equal(result.endpoint, 'offline-measured-endpoint');
    assert.equal(f.calls.slice(scanStart).filter(c => c.sql?.startsWith('SELECT *')).length, 11);
    cases.push({ variant: 'unchanged-sparse-order', pin, result, scanStart, calls: f.calls });
  } finally { await f.handle.close(); }
});
for (const variant of ['negative-to-positive', 'positive-to-negative', 'side-binding']) test(`SQL-reader clone refuses sign-of-zero change: ${variant}`, async () => {
  const f = await fixture();
  try {
    const row = variant === 'side-binding' ? f.tables.tx_query_members[0] : f.tables.tx_assertions[0];
    const column = variant === 'side-binding' ? 'binding_0' : 'value_number';
    if (variant !== 'side-binding') {
      row.value_type = 'number';
      row.value_string = null;
      row.value_identity = '{"type":"number","value":0}';
    }
    row[column] = variant === 'positive-to-negative' ? 0 : -0;
    const pin = await readG0(f.handle.reader, expected);
    const beforeNegativeZero = Object.is(row[column], -0);
    row[column] = variant === 'positive-to-negative' ? -0 : 0;
    const afterNegativeZero = Object.is(row[column], -0);
    let result, error;
    try { result = await admitG0(f.handle.reader, pin, expected); } catch (e) { error = e.message; }
    cases.push({ variant, table: variant === 'side-binding' ? 'tx_query_members' : 'tx_assertions', column, beforeNegativeZero, afterNegativeZero, pin, result, error, calls: f.calls });
    assert.equal(beforeNegativeZero, variant !== 'positive-to-negative');
    assert.equal(afterNegativeZero, variant === 'positive-to-negative');
    assert.ok(error, 'a changed stored number sign must not receive G0 PASS');
  } finally { await f.handle.close(); }
});
after(() => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'inventory.json'), JSON.stringify({ declarations, locations, exclusions: [] }, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'cases.json'), JSON.stringify(cases, null, 2) + '\n');
});
