import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import assert from 'node:assert/strict';
const head = '245a49664d6e6def36877bdee1b0ec2e0e0cc919';
const dir = path.resolve('lab/verify/P5A/evidence/k01-' + Date.now());
fs.mkdirSync(dir, { recursive: true });
const hash = b => createHash('sha256').update(b).digest('hex');
const sources = {};
const queue = ['g0', 'g0-schema'], seen = new Set();
for (const name of queue) {
  if (seen.has(name)) continue;
  seen.add(name);
  const file = `lab/bench/lib/${name}.ts`;
  const source = execFileSync('git', ['show', `${head}:${file}`], { encoding: 'utf8' });
  for (const match of source.matchAll(/from\s+["']\.\/([^"']+)\.(?:js|ts)["']/g))
    if (!seen.has(match[1])) queue.push(match[1]);
  sources[file] = hash(source);
  fs.writeFileSync(path.join(dir, name + '.ts'), source);
  // [CX-VP5A] Why: immutable K01 source preimages must resolve this checkout's adapter declarations from the reviewer stack. Rejected: importing mutable sibling worktree code.
  const adapted = name === 'g0-schema' ? source.replace('adapterSchema(schemaSources());', `adapterSchema(schemaSources(${JSON.stringify(path.resolve('packages/xtdb/src'))}));`) : source;
  fs.writeFileSync(path.join(dir, name + '.js'), ts.transpileModule(adapted, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/(["']\.\/[^"']+)\.ts(["'])/g, '$1.js$2'));
}
const api = await import(pathToFileURL(path.join(dir, 'g0.js')).href);
const rows = Object.fromEntries(Object.entries(api.fields).map(([table, fields]) => [table,
  ['tx_assertions', 'tx_claims', 'tx_attempts', 'tx_meta'].includes(table)
    ? [Object.fromEntries(fields.map(f => [f, f === 'scope_key' ? 'review-scope' : null]))] : []]));
const expected = { scope: 'review-scope', position: 1, world: 'N01', counts: Object.fromEntries(Object.entries(rows).map(([k,v]) => [k, v.length])) };
const reader = { endpoint: 'fixture://k01-review', count: async table => rows[table].length,
  scopes: async () => [{ scope_key: expected.scope, position: 1 }],
  scan: async function* (table) { yield* rows[table]; } };
const pin = await api.readG0(reader, expected);
assert.equal((await api.admitG0(reader, pin, expected)).status, 'PASS');
const results = [];
for (const [field, value] of [['valid_from', 1], ['retracted_position', 1], ['value_string', 'changed-value']]) {
  const before = structuredClone(rows.tx_assertions[0]);
  rows.tx_assertions[0][field] = value;
  const changed = await api.readG0(reader, expected);
  assert.notEqual(changed.D, pin.D);
  await assert.rejects(api.admitG0(reader, pin, expected), /content mismatch/);
  results.push({ field, oldD: pin.D, changedD: changed.D, admission: 'REFUSED' });
  rows.tx_assertions[0] = before;
}
fs.writeFileSync(path.join(dir, 'comparison.json'), JSON.stringify({ head, sources,
  schemaAdaptation: 'Only generated schema module default path redirected to this worktree packages/xtdb/src',
  fixture: 'Complete declared table fields; N01 gate fixture isolates K01 D sensitivity, not W0 engine qualification',
  expected, pin, results, node: process.version, compiler: ts.version,
  schemaSources: Object.fromEntries(Object.entries((await import(pathToFileURL(path.join(dir, 'g0-schema.js')).href)).schemaSources(path.resolve('packages/xtdb/src'))).map(([k,v]) => [k,hash(v)])),
}, null, 2));
process.stdout.write(JSON.stringify({ dir, mutationsRefused: results.length }) + '\n');
