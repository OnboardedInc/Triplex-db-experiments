// @ts-nocheck -- [EXP-CHECKJS] runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Metadata-only successor/failure audit; no worker, SDK or endpoint invocation. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { openContext } from '../devloop/state.mjs';
import { verifyAttempt } from '../devloop/evidence.mjs';
const root = path.resolve(import.meta.dirname, '../..'), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = name => readFile(path.join(root, name)), json = async name => JSON.parse(await read(name));
const dir5 = 'qualification/native-jobs/qlever-public-string-extension-v5', dir6 = 'qualification/native-jobs/qlever-public-string-extension-v6';
const m5 = await json(dir5 + '/manifest.json'), m6 = await json(dir6 + '/manifest.json');
const c5 = await json(dir5 + '/contract.json'), c6 = await json(dir6 + '/contract.json');
assert.equal(sha(await read(dir6 + '/manifest.json')), 'c40fb811d846dbd62f4f1081a67dbd0d581f870b5276c81ad51055c248ccd277');
assert.equal(sha(await read(dir6 + '/contract.json')), '69cab85984eacfb8549231057c9a3084b52c946a89c7af8cfbddfaef7f71c74c');
const old = await verifyAttempt(await openContext(root), 'qlever-public-string-extension-v5', '0001');
assert.equal(old.terminal.status, 'failed_process'); assert(old.terminal.cleanup.groupGone);
const attempt = '.devloop/jobs/qlever-public-string-extension-v5/attempts/0001';
const grant = await json(attempt + '/grant.json'), owner = grant.requiredOwnerChecks.find(row => row.ownerId === 'foundation-qlever').observation;
assert.equal(owner.imageSha256, `sha256:${c5.imageSha256}`); assert.equal(c6.imageSha256, owner.imageSha256);
assert.equal(owner.containerId, c5.containerId); assert.equal(c6.containerId, owner.containerId); assert(owner.running); assert.equal(owner.memoryBytes, 2 * 1024 ** 3);
const artifacts = old.terminal.outputs.filter(row => row.path.startsWith('artifacts/')).map(row => row.path).sort();
assert.deepEqual(artifacts, ['artifacts/input-identity.json', 'artifacts/runner-failure.json']);
const failure = await json(attempt + '/artifacts/runner-failure.json');
assert.equal(failure.class, 'AssertionError'); assert.equal(failure.messageSha256, '7ea307c43024a86c1fa80313c4cc08d3d89c1d1a09dcca8c9c343c65a01b9e86');
for (const key of ['resources', 'profile', 'evidence', 'requiredOwners', 'queryPath', 'backend']) assert.deepEqual(m6[key], m5[key], `NON_METADATA_CHANGE:${key}`);
const argv = [...m5.command.argv]; argv[argv.indexOf('--contract') + 1] = dir6 + '/contract.json';
assert.deepEqual(m6.command, { ...m5.command, argv });
const allowed = new Set(['jobId', 'runId', 'asciiScopeLabel', 'unicodeScopeLabel', 'imageSha256']);
for (const key of new Set([...Object.keys(c5), ...Object.keys(c6)])) if (!allowed.has(key)) assert.deepEqual(c6[key], c5[key]);
for (const key of ['runId', 'asciiScopeLabel', 'unicodeScopeLabel']) assert.notEqual(c6[key], c5[key]);
assert.deepEqual(m6.dependsOn, ['qlever-public-string-components-v5', 'qlever-public-string-noemit-v5']);
for (const entry of m6.inputs) assert.equal(sha(await read(entry.path)), entry.sha256, `CURRENT_INPUT_DRIFT:${entry.path}`);
for (const file of ['packages/qlever/experiments/string-order-probe.ts', 'qualification/extensions/string-order-v1/probe-support.mjs', 'qualification/extensions/string-order-v1/runner.mjs'])
  assert.equal(m6.inputs.find(row => row.path === file).sha256, m5.inputs.find(row => row.path === file).sha256);
const expectedOwner = { ...owner, imageSha256: c6.imageSha256 };
const matches = value => value.running && value.containerId === c6.containerId && value.imageSha256 === c6.imageSha256 && value.memoryBytes === 2 * 1024 ** 3;
assert(matches(expectedOwner)); assert(!matches({ ...expectedOwner, imageSha256: c5.imageSha256 }));
assert(!matches({ ...expectedOwner, containerId: 'wrong' })); assert(!matches({ ...expectedOwner, memoryBytes: 1024 ** 3 }));
const report = { format: 'triplex-qlever-string-owner-format-independent/1', status: 'CLEAR_EXACT_METADATA_ONLY_V6_FOR_ROOT_CONDITIONAL_DIAGNOSTIC',
  manifest: dir6 + '/manifest.json', manifestSha256: sha(await read(dir6 + '/manifest.json')), contractSha256: sha(await read(dir6 + '/contract.json')),
  declaredCurrentPins: m6.inputs.length, drift: 0, sameWorkerSupportRunner: true, sameOraclesProfileResources: true,
  strictFullPrefixedImageMatch: true, wrongBareImageCidCapRefused: true,
  predecessor: { run: 'qlever-public-string-extension-v5/0001', terminalSha256: old.terminalSha256, status: old.terminal.status,
    sourcePreimages: old.sourcePreimages, actualArtifactNames: artifacts, actualCanonicalImage: owner.imageSha256,
    oldContractImage: c5.imageSha256, failure,
    interpretation: 'Exact owner guard failed before worker credential read, client construction, SDK/admin dispatch or fixture events, by pinned owning-source flow plus retained partials; no endpoint activity or idle-engine inference' },
  priorReviewCorrection: 'The v5 final source review did not compare bare contract image spelling against the canonical prefixed owner observation. Its clearance and failed attempt remain preserved; this new review checks that exact boundary.',
  reusedGateAuthority: 'Unchanged worker/support/public DTS retain the exact v5 component/noEmit identities reviewed in qlever-public-string-v5-source-independent.json; no new source/type or native behavior proof is manufactured',
  reviewerBackendCalls: 0, reviewerWorkerImports: 0, reviewerFakeReplay: 0,
  limitations: ['Native string behavior,settings restoration,full overlap and actual responses remain unexecuted for v6', 'No immutable runtime/OS closure,physical cancellation,configured-entity capacity,performance or default promotion claim'],
};
const output = 'qualification/reviews/qlever-public-string-v6-owner-format-independent.json';
await writeFile(path.join(root, output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ output, sha256: sha(await read(output)), status: report.status, inputs: report.declaredCurrentPins }));
