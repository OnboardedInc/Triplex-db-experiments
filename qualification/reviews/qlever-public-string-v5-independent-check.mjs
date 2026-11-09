// @ts-nocheck -- [EXP-CHECKJS] runtime-built or optional package modules absent from this standalone project; runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Final offline source/retained-gate audit; never imports the worker or any SDK. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { openContext } from '../devloop/state.mjs';
import { verifyAttempt } from '../devloop/evidence.mjs';
import { verifyDependencyLock } from '../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/inputs.mjs';
const root = path.resolve(import.meta.dirname, '../..'), sha = value => createHash('sha256').update(value).digest('hex');
const directory = 'qualification/native-jobs/qlever-public-string-extension-v5';
const manifestBytes = await readFile(path.join(root, directory, 'manifest.json'));
assert.equal(sha(manifestBytes), '518f77388b5b7693293a06320e2f5a8f28ab2663448658854f36f99718019c48');
const manifest = JSON.parse(manifestBytes); assert.equal(manifest.inputs.length, 3542);
assert.equal(new Set(manifest.inputs.map(row => row.path)).size, 3542);
for (const entry of manifest.inputs) assert.equal(sha(await readFile(path.join(root, entry.path))), entry.sha256, `CURRENT_INPUT_DRIFT:${entry.path}`);
const contractBytes = await readFile(path.join(root, directory, 'contract.json'));
assert.equal(sha(contractBytes), 'e8939a29ed89451a2d27a3c08d5343e8ce62882cb68c6a305657224751b37c55');
const contract = JSON.parse(contractBytes), lock = JSON.parse(await readFile(path.join(root, contract.dependencyLock.path)));
await verifyDependencyLock(root, lock); assert.equal(lock.packages.length, 7); assert.equal(lock.totalBytes, 79_972_368);
assert.equal(contract.oracleSha256, '8f4da85e806e2503c62b373bfeaa44c8d91be55a029dc01c08eb2a3d53a6b19d');
const context = await openContext(root), gates = [];
for (const id of ['qlever-public-string-components-v5', 'qlever-public-string-noemit-v5']) {
  const checked = await verifyAttempt(context, id, '0001');
  assert.equal(checked.terminal.status, 'completed_verified_bytes'); assert.equal(checked.terminal.cleanup.groupGone, true);
  const artifacts = path.join(root, '.devloop/jobs', id, 'attempts/0001/artifacts');
  if (id.includes('components')) {
    const tap = await readFile(path.join(artifacts, 'components.tap'), 'utf8');
    for (const expression of [/# tests 10\n/, /# pass 10\n/, /# fail 0\n/]) assert.match(tap, expression);
    assert.match(tap, /original page/); // The R guard is a real fresh component, not a v4 receipt.
  } else {
    assert.equal((await readFile(path.join(artifacts, 'noemit.stdout'))).length, 0);
    assert.equal((await readFile(path.join(artifacts, 'noemit.stderr'))).length, 0);
    assert.equal(JSON.parse(await readFile(path.join(artifacts, 'compiler-outcome.json'))).status, 0);
  }
  gates.push({ run: `${id}/0001`, terminalSha256: checked.terminalSha256,
    retainedBytesUnchanged: true, sourcePreimages: checked.sourcePreimages });
}
const report = { format: 'triplex-qlever-string-final-source-independent/1', status: 'CLEAR_FOR_EXACT_BOUNDED_NATIVE_DIAGNOSTIC_ONLY',
  manifest: `${directory}/manifest.json`, manifestSha256: sha(manifestBytes), contractSha256: sha(contractBytes),
  currentDeclaredPins: 3542, drift: 0, dependencyPackages: 7, dependencyBytes: lock.totalBytes,
  dependencyScope: 'Seven recursively captured installed Core/runtime/type/compiler packages plus manually guarded Q facade/source/public tree; normal package-local resolution, no copied immutable/runtime/OS closure claim',
  settledIoSha256: '47252e53edd42bb463e228e3603c5f837e605f973b949818d6defd9bd5a52ca3',
  codeReview: ['Actual public Attribute/EntityType handles encode raw strings once; TypeExpr native rows/parameters and scope/V/P basis are checked',
    '31 finite SDK operations,120s dispatch envelope,5s per call;32row/2MiB responses and bounded setting/JSON evidence',
    'Datalog ordering and wrapper ranges use admitted public APIs; original opaque cursor remains unchanged across correction and fresh Runtime lifecycles',
    'Each queryPage basis requires original R1000.25; native/queryAll receive no invented explicit R',
    'Shared command correction binds old/new assertion IDs,payloads,tx lineage,valid interval,ACK/P2 and history before continuing',
    'Native LIMIT/OFFSET continuation and actual client reopen retain original P1; latest P2 remains separate',
    'Wrong returned order/cursor status remains semantic failure; only missing-cursor dependent calls skip; no sorting/casefolding or rewritten oracle',
    'HTTP,unknown ACK,basis/lineage,ownership,privacy,budget or dependency drift stops remaining packet; finally100 and close are attempted and actual outcomes retained',
    'All11 controller/admission inputs are now explicit; actual before/after installed/source guards do not prove an immutable runtime closure'],
  historicalPredecessors: 'Provisional source review and v1-v4 preparation/gates remain unchanged; final v5 changed worker is qualified only by its fresh v5 source gates',
  gates, reviewerBackendCalls: 0, reviewerWorkerImports: 0, reviewerFakeReplay: 0,
  limitations: ['This review proves no returned native behavior,scale/performance,physical cancellation or configured-entity presence/type-version capacity',
    'Sampled other-Q checks are not full exclusivity or an idle-engine proof; exact complete canonical overlaps require post-terminal review',
    'Datalog broad Unicode order remains unresolved; only frozen ASCII policy and native SPARQL Unicode cases are required'],
};
await writeFile(path.join(root, 'qualification/reviews/qlever-public-string-v5-source-independent.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ status: report.status, manifestSha256: report.manifestSha256, gates: gates.map(row => row.run), nativeCalls: 0 }));
