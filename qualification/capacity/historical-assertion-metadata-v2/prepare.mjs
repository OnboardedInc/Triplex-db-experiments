// @ts-nocheck -- [EXP-CHECKJS] runtime-built or optional package modules absent from this standalone project. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Metadata/preimage preparation only. Does not import the oracle or tests. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { ROOT, pin, verifyPins, exclusiveJson, readJson } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { openContext, readState, pinInputs } from '../../devloop/state.mjs';
import { validateManifest } from '../../devloop/scheduler.mjs';
import { preserveInputPreimages } from '../../devloop/preimages.mjs';

const SOURCE = 'qualification/capacity/historical-assertion-metadata-v2';
const OUTPUT = path.join(SOURCE, 'offline-v1');
const jobId = 'historical-assertion-metadata-oracle-v2-components-v1';
const oldReviewPath = 'qualification/reviews/historical-assertion-metadata-v1-source-independent.json';
const oldReview = await readJson(path.join(ROOT, oldReviewPath));
await verifyPins(ROOT, oldReview.reviewedFiles);
assert.equal((await pin(ROOT, oldReviewPath)).sha256, '45d561da86238d0509d3c7d2dd9eabdd57310c445b8a98666ad241a715b8e58b');
const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
assert.equal(git.status, 0);
const sourceCheckpoint = git.stdout.trim();
assert.equal(sourceCheckpoint, 'eb1490533d19346a430417a740dfbb56e8789f75');
const oldTest = await readFile(path.join(ROOT, 'qualification/capacity/historical-assertion-metadata-v1/oracle.test.mjs'), 'utf8');
const newTest = await readFile(path.join(ROOT, SOURCE, 'oracle.test.mjs'), 'utf8');
assert(newTest.startsWith(oldTest), 'Original seven definitions must remain byte-identical');
const testNames = [...newTest.matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
assert.equal(testNames.length, 9);
assert.equal(new Set(testNames).size, 9);
const files = new Map();
async function add(file, role) {
  const input = await pin(ROOT, file);
  assert(!files.has(input.path), 'Overlapping declared input');
  files.set(input.path, { ...input, role });
}
for (const [name, role] of [
  ['oracle.mjs', 'source'], ['oracle.test.mjs', 'runner'],
  ['run.mjs', 'runner'], ['prepare.mjs', 'runner'], ['README.md', 'recipe'],
]) await add(path.join(SOURCE, name), role);
for (const old of oldReview.reviewedFiles) await add(old.path, 'fixture');
await add(oldReviewPath, 'recipe');
await add(oldReview.proposal.path, 'recipe');
await add('qualification/reviews/configured-entity-xtdb-tiny-v4-terminal-independent.json', 'recipe');
await add('packages/core/src/Value.ts', 'fixture');
await add('.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs', 'runner');
for (const file of [
  'tools/bootstrap/with-env.sh', 'tools/bootstrap/check-storage.py',
  'scripts/triplex-devloop.mjs', 'qualification/devloop/policy.json',
  ...['io', 'state', 'migration', 'preimages', 'scheduler', 'executor', 'worker', 'evidence', 'compare'].map(name => `qualification/devloop/${name}.mjs`),
]) await add(file, 'controller');
await add(process.execPath, 'build');
const expected = await exclusiveJson(ROOT, path.join(OUTPUT, 'expected.json'), {
  status: 'PASS_FINITE_METADATA_ORACLE_ONLY', cases: 9, sdkCalls: 0,
  compilerInvocations: 0, backendCalls: 0, helperImplementations: 0,
});
await add(expected.path, 'oracle');
const delta = await exclusiveJson(ROOT, path.join(OUTPUT, 'delta.json'), {
  format: 'triplex-historical-assertion-oracle-source-delta/1',
  status: 'SOURCE_ONLY_NINE_DEFINITIONS_UNEXECUTED', sourceCheckpoint,
  predecessorReview: await pin(ROOT, oldReviewPath),
  preservedV1: oldReview.reviewedFiles,
  originalSevenTestDefinitionsBytePrefixIdentical: true,
  newOracle: await pin(ROOT, path.join(SOURCE, 'oracle.mjs')),
  newTests: await pin(ROOT, path.join(SOURCE, 'oracle.test.mjs')),
  changes: [
    'Deep-freeze the finite EVENTS, SAME_TIME_EVENTS and CASES authority; clone each assertion input in every fresh lifetime replay.',
    'Treat validTo:null as open-ended while retaining finite half-open validity.',
    'Retain the original seven definitions and add nested typed-value/lifetime mutation and null-validity controls.',
  ],
  unchanged: [
    'Original finite events/ten primary cases and P/R/lineage expectations.',
    'Public R/V input boundary; capturedUpperP is only a pure oracle coordinate.',
    'Distinct new snapshot-result target versus ordinary raw lifetime compatibility.',
    'No A/B helper implementation, SDK/compiler/backend execution or product/default change.',
  ],
  testsExecuted: 0, sdkOrBackendCalls: 0,
});
await add(delta.path, 'recipe');
const contract = await exclusiveJson(ROOT, path.join(OUTPUT, 'contract.json'), {
  format: 'triplex-historical-assertion-oracle-offline-contract/1',
  status: 'PREPARED_NOT_EXECUTED_ROOT_GRANT_REQUIRED', jobId, sourceCheckpoint,
  sourceGeneration: 'historical-assertion-metadata-oracle-v2',
  testNames, delta, predecessorReview: await pin(ROOT, oldReviewPath),
  entry: path.join(SOURCE, 'run.mjs'),
  childArgv: ['--max-old-space-size=256', '--test', '--test-isolation=none', '--test-concurrency=1', '--test-reporter=tap', path.join(SOURCE, 'oracle.test.mjs')],
  childTimeoutMilliseconds: 60000, maximumCapturedOutputBytes: 2 * 1024 ** 2,
  guardInputs: [...files.values()],
  dependencies: {
    node: { version: process.version, platform: process.platform, architecture: process.arch, executable: await pin(ROOT, process.execPath) },
    testImports: ['node:test', 'node:assert/strict', './oracle.mjs'],
    installedThirdPartyPackagesImported: [],
    admission: 'Existing pinned common/controller path; source-only guard, no SDK/compiler/engine import.',
    conditions: ['node', 'import', 'default'], customConditions: [], customPreloadsOrLoaders: [],
    scope: 'Pinned Node executable and declared files/builtin imports only; not a complete OS, Python stdlib or host read closure.',
  },
  scope: 'Nine finite pure oracle definitions only; client-replay labels do not construct clients. No helper implementation, runtime assertion read, configured capacity or performance acceptance.',
});
await add(contract.path, 'recipe');
const manifest = {
  format: 'triplex-devloop-job/1', id: jobId, kind: 'verification', backend: 'xtdb', queryPath: 'xtdb-native',
  author: 'xtdb-oracle-source-owner', problemId: 'historical-assertion-snapshot-oracle-authority',
  logicalTaskId: 'finite-event-oracle-clone-and-null-validity',
  hypothesis: 'Detached immutable finite event authority and explicit unbounded validity correct the independently identified oracle defects without changing public/raw lifetime semantics.',
  goals: [1, 3, 10], dependsOn: [], requiredOwners: [],
  inspiration: [{ reference: oldReviewPath, mechanism: 'Independent source review exposed nested-value aliasing and nullable validity disagreement.', adaptation: 'Narrow oracle-only correction and two regressions; no backend/helper implementation or row masking.' }],
  command: { argv: [process.execPath, '--max-old-space-size=256', path.join(SOURCE, 'run.mjs')], cwd: '.', env: { NODE_OPTIONS: '--max-old-space-size=256' } },
  resources: { heavy: true, memoryBytes: 768 * 1024 ** 2, cpuUnits: 1, diskBytes: 64 * 1024 ** 2, timeoutMilliseconds: 120000, maximumLogBytes: 4 * 1024 ** 2 },
  inputs: [...files.values()].map(({ path, role, sha256 }) => ({ path, role, sha256 })),
  evidence: { checks: [{ key: 'finite-metadata-oracle9', expectedInput: expected.path, actual: 'artifacts/checks.json' }], requiredCheckKeys: ['finite-metadata-oracle9'] },
  profile: { name: 'finite-metadata-oracle-v2-offline9', cases: 9, nodeOldSpaceMiB: 256, builtInReporter: 'tap', backendCalls: 0, sdkCalls: 0, driverObservationClaimed: false, helperImplementations: 0 },
};
const context = await openContext(ROOT);
assert(!(await readState(context)).jobs[jobId], 'Fresh unexecuted job identity required');
validateManifest(manifest, context.policy);
await pinInputs(context, manifest.inputs);
const frozen = await exclusiveJson(ROOT, path.join(OUTPUT, 'manifest.json'), manifest);
const preimages = await preserveInputPreimages(context, manifest.inputs, path.join(OUTPUT, 'prepared-source-preimages.json'), { phase: 'metadata-oracle-v2-offline-source-proposal' });
await exclusiveJson(ROOT, path.join(OUTPUT, 'prepared.json'), { status: 'PREPARED_ONLY_NO_ENQUEUE_OR_TESTS', manifest: frozen, contract, delta, preimages, testsExecuted: 0, sdkOrBackendCalls: 0 });
console.log(JSON.stringify({ manifest: frozen, contract, delta, preimages, inputs: manifest.inputs.length, testsExecuted: 0, state: 'SOURCE_REVIEW_REQUIRED_BEFORE_PURE_GRANT' }));
