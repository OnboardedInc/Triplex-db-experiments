import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// [CX-VDF01] Why: distinguish a content-checked historical G0 result from a new execution claim.
// Rejected: trusting the builder's printed count or adopting a previous PASS as fresh qualification.
const root = path.resolve(import.meta.dirname, '../../..');
const durable = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01';
const runId = 'G0-datomic-20261109T074723Z-fe429c';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const receiptBytes = fs.readFileSync(path.join(root, `lab/runs/G0/${runId}.json`));
const receipt = JSON.parse(receiptBytes);
assert.deepEqual(receiptBytes, fs.readFileSync(path.join(durable, 'gates', runId, 'receipt.json')));
let objects = 0;
for (const entry of receipt.objects) {
  if (!entry.sha256) continue;
  const bytes = fs.readFileSync(path.join(durable, 'objects', entry.sha256));
  assert.equal(bytes.length, entry.bytes);
  assert.equal(sha(bytes), entry.sha256);
  if (entry.path.startsWith(`runs/G0/${runId}/`)) {
    assert.deepEqual(bytes, fs.readFileSync(path.join(durable, 'gates', runId, 'raw', path.basename(entry.path))));
  }
  objects++;
}
const raw = name => fs.readFileSync(path.join(durable, 'gates', runId, 'raw', name));
const counts = { executed: 0, pass: 0, fail: 0, skip: 0 };
const details = [];
for (const pkg of ['core', 'host', 'testkit', 'datomic', 'qualification']) {
  const outcome = JSON.parse(raw(`vitest-${pkg}.json`));
  const assertions = outcome.testResults.flatMap(s => s.assertionResults);
  const c = { pass: assertions.filter(a => a.status === 'passed').length,
    fail: assertions.filter(a => a.status === 'failed').length,
    skip: assertions.filter(a => ['skipped', 'pending', 'todo'].includes(a.status)).length };
  assert.equal(c.pass + c.fail + c.skip, assertions.length);
  assert.equal(c.pass, outcome.numPassedTests);
  assert.equal(c.fail, outcome.numFailedTests);
  assert.equal(c.skip, outcome.numPendingTests + outcome.numTodoTests);
  assert.equal(outcome.success, true);
  assert.ok(outcome.startTime >= Date.parse(receipt.startedAt));
  assert.ok(outcome.startTime <= Date.parse(receipt.endedAt));
  counts.pass += c.pass; counts.fail += c.fail; counts.skip += c.skip;
  counts.executed += c.pass + c.fail;
  details.push({ name: pkg, ...c });
}
for (const name of ['node-test-qualification', 'node-test-engine-cases', 'node-test-ns-bench']) {
  const text = raw(`${name}.stdout.txt`).toString();
  const get = key => Number(text.match(new RegExp(`^# ${key} (\\d+)$`, 'm'))?.[1] ?? NaN);
  const c = { pass: get('pass'), fail: get('fail'), skip: get('skipped') + get('todo') };
  assert.ok(Object.values(c).every(Number.isSafeInteger));
  counts.pass += c.pass; counts.fail += c.fail; counts.skip += c.skip;
  counts.executed += c.pass + c.fail;
  details.push({ name, ...c });
}
// The Python oracle suite is counted by gate.mjs as well as the node/Vitest suites.
const oracle = raw('oracle-unittest.stderr.txt').toString();
const oracleTests = Number(oracle.match(/Ran (\d+) tests?/)?.[1]);
assert.ok(Number.isSafeInteger(oracleTests));
assert.match(oracle, /\nOK\s*$/);
counts.executed += oracleTests; counts.pass += oracleTests;
details.push({ name: 'oracle-unittest', pass: oracleTests, fail: 0, skip: 0 });
const workload = JSON.parse(raw('oracle-validate-workloads.stdout.txt'));
assert.equal(workload.result, 'PASS');
assert.equal(workload.checked_cases, 71);
assert.deepEqual(workload.unchecked_case_ids, []);
counts.executed += 71; counts.pass += 71;
details.push({ name: 'oracle-validate-workloads', pass: 71, fail: 0, skip: 0 });
assert.deepEqual(counts, { executed: receipt.counts.executed, pass: receipt.counts.pass,
  fail: receipt.counts.fail, skip: receipt.counts.skip });
const skips = JSON.parse(raw('observed-skips.json'));
const expectedSkips = JSON.parse(fs.readFileSync(path.join(root, 'lab/config/g0-expected-skips.json')));
for (const [pkg, names] of Object.entries(skips)) {
  for (const name of names) assert.ok(expectedSkips.skips[pkg]?.includes(name));
}
assert.equal(Object.values(skips).flat().length, counts.skip);
const changed = execFileSync('git', ['diff', '--name-only', '1a7e09bd485d494b1b36095e567707e71140d3ba', 'bc8a5edb', '--', 'packages'],
  { cwd: root, encoding: 'utf8' }).trim();
assert.equal(changed, '');
const result = { kind: 'historical-evidence-audit-only', auditedAt: new Date().toISOString(),
  runId, receiptSha256: sha(receiptBytes), objectsChecked: objects, counts, details,
  packageSourceUnchangedFromRecordedImplementation: true,
  freshFullG0Execution: false };
fs.writeFileSync(path.join(import.meta.dirname, 'historical-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
