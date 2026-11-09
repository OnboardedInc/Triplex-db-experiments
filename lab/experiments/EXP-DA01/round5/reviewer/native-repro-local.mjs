// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking; runtime-populated records, option bags, or branch-specific union members; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Effect } from 'effect';
import { DatabaseScope } from '../../../../../packages/core/dist/runtime/index.js';
import { DatomicClient, makeDatomicStorageAdapter } from '../../../../../packages/datomic/dist/index.js';

// [CX-VDA01] Why: retain both sides of the guard and complete before/after bytes for every indirect attribute form. Rejected: reporting a syntax-only suspicion.
const attempt = `CX-VDA01-native-${randomUUID()}`;
const file = path.join(process.env.DA01_REVIEW_OUTPUT ?? import.meta.dirname, attempt + '.json');
const url = 'http://127.0.0.1:8470';
const client = new DatomicClient(url, 35000);
const scope = DatabaseScope.test(attempt);
const ownerPath = '/Users/sam/projects/triplex-db-2/lab/locks/datomic-dev/owner.json';
const ownerBytes = fs.readFileSync(ownerPath, 'utf8');
const health = await client.health();
assert.deepEqual(health, JSON.parse(fs.readFileSync(process.env.DA01_AUTHORITY_SUMMARY ?? 'lab/experiments/EXP-DA01/round3/SUMMARY.json', 'utf8')).health);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = () => Object.fromEntries(execFileSync('git', ['ls-files', 'packages/datomic', 'packages/core', 'packages/testkit', 'pnpm-lock.yaml'], { encoding: 'utf8' }).trim().split('\n').map(file => [file, hash(fs.readFileSync(file))]));
const sourceBefore = inputs();
const report = { attempt, startedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), scriptSha256: hash(fs.readFileSync(import.meta.filename)), source: sourceBefore, health, owner: JSON.parse(ownerBytes), scope, requests: [], cleanup: null };
const save = () => fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(file, '', { flag: 'wx' });
const created = await client.create(scope); report.created = created; save();
const a = makeDatomicStorageAdapter(client, scope);
const forms = {
  literal: '[:find ?id :in $ $rules :where [?f :f/live _] [?f :f/id ?id] [(triplex.gateway.query/visible $ ?f 30.0 10.0 POSITION)]]',
  ground: '[:find ?id :in $ $rules :where [(ground :f/live) ?a] [?f ?a _] [?f :f/id ?id] [(triplex.gateway.query/visible $ ?f 30.0 10.0 POSITION)]]',
  ident: '[:find ?id :in $ $rules :where [?a :db/ident :f/live] [?f ?a _] [?f :f/id ?id] [(triplex.gateway.query/visible $ ?f 30.0 10.0 POSITION)]]',
};
// [CX-VDA01-R2] Why: compare the first-section classifier with Datomic's repeated-section normalization using the same 40/30 control. Rejected: claiming original F1 closure proves all EDN representations (parser disagreement remains possible).
if (process.env.DA01_DUPLICATE_QUERY === '1') {
  report.queryVariant = 'duplicate-sections';
  forms.ground = '[:find ?id :in $ $rules :where [?f :f/id ?id] :where [?f :f/live _] [?f :f/id ?id] [(triplex.gateway.query/visible $ ?f 30.0 10.0 POSITION)]]';
  forms.ident = '[:find ?id :in $ $rules :where [$rules ?f :f/live _] [$rules ?f :f/id ?id] [(triplex.gateway.query/visible $rules ?f 30.0 10.0 POSITION)] :in $rules $]';
}
async function query(label, edn, basis) {
  edn = edn.replace('POSITION', basis.recordedPosition === undefined ? 'nil' : `${basis.recordedPosition}`);
  const body = { edn, relations: [], basis };
  const response = await fetch(`${url}/v1/db/${created.db}/q`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const raw = await response.text();
  const item = { label, body, status: response.status, raw, parsed: JSON.parse(raw) };
  report.requests.push(item); save(); return item;
}
const run = Effect.runPromise;
try {
  await run(a.withTransaction(Effect.gen(function* () {
    const p = yield* a.nextCommitPosition();
    for (let i = 0; i < 40; i++) yield* a.insert({ entityId: 's', attribute: ':value', value: { type: 'string', value: `v${i}` }, validFrom: 0 }, 'assert', 10, `f${i}`, p);
  })));
  const basis = { validAt: 30, recordedAt: 10 };
  const before = await query('before-ground-T', forms.ground, basis);
  await run(a.withTransaction(Effect.gen(function* () {
    const p = yield* a.nextCommitPosition();
    for (let i = 0; i < 10; i++) assert.equal(yield* a.retract(`f${i}`, 20, 'retire', p), true);
  })));
  for (const [label, cut] of Object.entries({ T: basis, TP: { ...basis, recordedPosition: 2 } })) {
    for (const [form, edn] of Object.entries(forms)) await query(`after-${form}-${label}`, edn, cut);
    const rows = await client.rows(created.db, { entityIds: ['s'], basis: cut });
    report.requests.push({ label: `after-source-${label}`, count: rows.length, rows }); save();
  }
  const after = report.requests.find(x => x.label === 'after-ground-T');
  assert.equal(before.status, 200); assert.equal(before.parsed.rows.length, 40);
  assert.equal(after.status, 200); assert.equal(after.parsed.rows.length, 30);
  assert.notDeepEqual(before.parsed.rows, after.parsed.rows);
  for (const item of report.requests.filter(x => x.label.startsWith('after-'))) {
    if (item.label.includes('literal')) { assert.equal(item.status, 409); assert.equal(item.parsed.code, 'BasisNotAvailable'); }
    else if (item.label.includes('source')) assert.equal(item.count, 40);
    else { assert.equal(item.status, 200); assert.equal(item.parsed.rows.length, 30); }
  }
  report.findingReproduced = true;
  assert.equal(fs.readFileSync(ownerPath, 'utf8'), ownerBytes);
  assert.deepEqual(await client.health(), health);
  assert.deepEqual(inputs(), sourceBefore);
} finally {
  report.cleanup = await client.delete(scope); client.close(); report.endedAt = new Date().toISOString(); save();
  assert.equal(report.cleanup.db, created.db); assert.equal(report.cleanup.deleted, true);
}
console.log(JSON.stringify({ file, findingReproduced: report.findingReproduced, outcomes: report.requests.map(x => ({ label: x.label, status: x.status, count: x.count ?? x.parsed?.rows?.length, code: x.parsed?.code })), cleanup: report.cleanup }, null, 2));
