import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Effect, Exit } from 'effect';
import { Capabilities, DatabaseScope } from '../../../packages/core/dist/runtime/index.js';
import { runtimeConformance, triplesConformanceCases } from '../../../packages/testkit/dist/index.js';
import { makeDatomicRuntime, DatomicClient } from '../../../packages/datomic/dist/index.js';

// [CX-VDA01] Why: independently run the unchanged public-export suite with immediate owned-scope cleanup and exact manifests. Rejected: adopting the builder's G1 receipt as fresh execution.
const hash = x => createHash('sha256').update(x).digest('hex');
const id = `CX-VDA01-conformance-${randomUUID()}`;
const out = path.join(import.meta.dirname, id + '.json');
const ownerPath = '/Users/sam/projects/triplex-db-2/lab/locks/datomic-dev/owner.json';
const owner = fs.readFileSync(ownerPath, 'utf8');
const client = new DatomicClient('http://127.0.0.1:8470', 35000);
const health = await client.health();
assert.deepEqual(health, JSON.parse(fs.readFileSync('lab/experiments/EXP-DA01/round3/SUMMARY.json', 'utf8')).health);
const walk = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(root, d.name)) : [path.join(root, d.name)]);
const manifest = () => Object.fromEntries(['core', 'testkit', 'datomic'].flatMap(p => walk(`packages/${p}/dist`)).sort().map(p => [p, hash(fs.readFileSync(p))]));
const before = manifest();
const report = { id, startedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), owner: JSON.parse(owner), ownerSha256: hash(owner), health, built: before, cases: triplesConformanceCases.map(c => c.name), executions: [], completed: false };
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
const save = () => fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
async function one(phase, name, program) {
  const scope = DatabaseScope.test(`${id}-${phase}-${randomUUID()}`);
  const created = await client.create(scope);
  const item = { phase, name, scope, created, startedAt: new Date().toISOString() };
  report.executions.push(item); save();
  try {
    const exit = await Effect.runPromiseExit(program(scope).pipe(Effect.scoped, Effect.timeout('110 seconds')));
    item.status = Exit.isSuccess(exit) ? 'PASS' : 'FAIL';
    if (!Exit.isSuccess(exit)) item.error = String(exit.cause);
    console.log(JSON.stringify({ phase, name, status: item.status, ...(item.error ? { error: item.error } : {}) }));
  } finally {
    item.cleanup = await client.delete(scope); item.endedAt = new Date().toISOString(); save();
    assert.equal(item.cleanup.db, created.db); assert.equal(item.cleanup.deleted, true);
  }
}
try {
  assert.equal(triplesConformanceCases.length, 44);
  const runtime = makeDatomicRuntime({ url: 'http://127.0.0.1:8470' });
  await one('suite', 'complete unchanged suite', scope => runtimeConformance(runtime, { scope, capabilities: Capabilities.none }));
  for (const phase of ['current', 'reopen']) for (const entry of triplesConformanceCases) {
    await one(phase, entry.name, scope => entry.run.pipe(Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none }))));
  }
  assert.deepEqual(manifest(), before);
  assert.equal(fs.readFileSync(ownerPath, 'utf8'), owner);
  assert.deepEqual(await client.health(), health);
  assert.equal(report.executions.length, 89);
  assert.equal(report.executions.filter(x => x.status === 'PASS').length, 89);
  report.completed = true;
} finally { client.close(); report.endedAt = new Date().toISOString(); save(); }
console.log(JSON.stringify({ report: out, executed: 88, suite: report.executions[0].status, cleanup: report.executions.filter(x => x.cleanup?.deleted).length }));
