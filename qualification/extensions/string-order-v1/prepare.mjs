/** Metadata capture only; no target import, compiler, install or native call. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { captureInstalledPackages } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/inputs.mjs';
import { files, pin, exclusiveJson, objectDigest, relative, owned } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { canonical, SDK_CALLS } from './probe-support.mjs';
import { validateManifest } from '../../devloop/scheduler.mjs';

const root = path.resolve(import.meta.dirname, '../../..'), here = relative(root, import.meta.dirname);
const meta = '.artifacts/qlever-public-string-preparation-v5';
const output = 'qualification/native-jobs/qlever-public-string-extension-v5';
const component = 'qualification/component-jobs/qlever-public-string-components-v5';
const typecheck = 'qualification/component-jobs/qlever-public-string-noemit-v5';
const write = (file, value) => exclusiveJson(root, file, value);
const writeOracle = async (file, value) => {
  const target = await owned(root, file, { missing: true }); await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, canonical(value) + '\n', { flag: 'wx', mode: 0o600 }); return pin(root, target);
};
const policy = JSON.parse(await readFile(path.join(root, 'qualification/devloop/policy.json'), 'utf8'));
const writeManifest = (file, value) => { validateManifest(value, policy); return write(file, value); };
const asInput = (entry, role) => ({ path: entry.path, role, sha256: entry.sha256 });
const sourcePaths = [
  ...await files(root, path.join(root, here)),
  path.join(root, 'packages/qlever/experiments/string-order-probe.ts'),
  ...await files(root, path.join(root, 'packages/core/src')),
  ...await files(root, path.join(root, 'packages/qlever/src')),
  ...['io', 'state', 'migration', 'preimages', 'scheduler', 'executor', 'worker', 'evidence', 'compare'].map(name => path.join(root, 'qualification/devloop', name + '.mjs')),
  path.join(root, 'qualification/devloop/policy.json'), path.join(root, 'scripts/triplex-devloop.mjs'),
  ...['.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs', '.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/inputs.mjs',
    'packages/core/package.json', 'packages/qlever/package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
    'tsconfig.base.json', 'tsconfig.node.json', 'tools/bootstrap/with-env.sh', 'tools/bootstrap/check-storage.py',
    'qualification/reviews/string-order-extension-v1-contract-independent.json', 'qualification/evidence/runtime-dependency-scope-v1.json',
    'qualification/reviews/read-basis-generated-public-final-independent.json', 'qualification/reviews/read-basis-core-pack-final-independent.json',
    'provenance/bounded-storage.json', '.devloop/owner.json'].map(file => path.join(root, file)),
];
const source = [];
for (const file of [...new Set(sourcePaths)].sort()) source.push(await pin(root, file));
const build = [];
for (const directory of ['packages/core/dist', 'packages/qlever/dist']) for (const file of await files(root, path.join(root, directory))) build.push(await pin(root, file));
const graph = await captureInstalledPackages({ root, roots: [
  { name: '@triplex-build/triplex', role: 'runtime', from: 'packages/qlever/experiments/string-order-probe.ts' },
  { name: 'effect', role: 'runtime', from: 'packages/qlever/experiments/string-order-probe.ts' },
  { name: '@types/node', role: 'type', from: 'package.json' },
  { name: 'typescript', role: 'compiler', from: 'package.json' },
], maximumBytes: 256 * 1024 ** 2 });
// This experiment does not install selector hooks or copy package trees. Keep
// the collector's unresolved conditions, but state the actual checked layout.
const { dependencySha256: _unused, ...payload } = graph;
payload.unresolvedConditionalScope = 'Checked current installed runtime/type/compiler graph and selected ESM resolution. No copied immutable runtime, native addon, OS library or complete off-platform/conditional closure claim.';
const lock = { ...payload, dependencySha256: objectDigest(payload) };
const dependencyPin = await write(`${meta}/dependency-lock.json`, lock);
const guardPin = await write(`${meta}/guard-pins.json`, [...source, ...build]);
const oracle = JSON.parse(await readFile(path.join(root, here, 'oracle.json'), 'utf8'));
const membership = { membershipExact: true, rowsByExpectedIdentity: oracle.unicodeInput.map(({ entity, label }) => ({ entity, label })), returnedCount: 7, uniqueIdentityCount: 7 };
const common = Object.fromEntries(oracle.commonTasks.map(task => [task.id, task.expectedRows ?? membership]));
const native = { ...common, ...Object.fromEntries(oracle.nativeSparqlOnlyTasks.map(task => [task.id,
  task.expectedEntityOrder.map(entity => oracle.unicodeInput.map(({ entity, label }) => ({ entity, label })).find(row => row.entity === entity))])) };
const expected = {
  datalog: await writeOracle(`${output}/datalog.expected.json`, common),
  native: await writeOracle(`${output}/native.expected.json`, native),
  settings: await writeOracle(`${output}/settings.expected.json`, { restored100: true, noOtherQAtEnd: true, beforeBudget: '100', selectedBudget: '1', nativeAfterBudget: '100', finalBudget: '100', pendingSdkCallsZero: true, nativeClientCloseReturned: true }),
  invariants: await writeOracle(`${output}/invariants.expected.json`, { firstDatalogCursorPresent: true, continuedDatalogTerminal: true, reopenedDatalogTerminal: true,
    greaterRangeDatalogTerminal: true, lesserRangeDatalogTerminal: true, correctedHistoryLineage: true, allCapturedBasisValid: true,
    originalDatalogPageMembership: true, originalNativePageMembership: true }),
  identity: await writeOracle(`${output}/identity.expected.json`, { status: 'BEFORE_AND_AFTER_IDENTICAL', dependencySha256: lock.dependencySha256, guardPinCount: source.length + build.length, installedLayoutOnly: true, copiedImmutableRuntimeClaimed: false }),
};
const runId = randomUUID(), contract = {
  mode: 'PUBLIC_QLEVER_STRING_EXTENSION_BOTH', jobId: 'qlever-public-string-extension-v5', runId,
  asciiScopeLabel: `string-order-ascii-${runId}`, unicodeScopeLabel: `string-order-unicode-${runId}`,
  containerId: 'e225d359e2a8211de8c5b3551e1aff8952b92b41922c4f90505ca4c6afc30b3f',
  imageSha256: '37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec',
  oracleSha256: (await pin(root, `${here}/oracle.json`)).sha256,
  dependencyLock: dependencyPin, guardPins: guardPin,
  profile: { datalog: 'F1-persisted-minus-paired-bounded-Eoff-planner1-semantic5s32rows2MiB', native: 'native-SPARQL-planner100-semantic5s32rows2MiB',
    sdkCalls: SDK_CALLS, maximumSdkCalls: 31, sdkDispatchWindowMs: 120000, perCallSignalMs: 5000, normalSettingsControls: 7,
    maximumSettingsControls: 9, perArtifactBytes: 2 * 1024 ** 2, totalArtifactBytes: 32 * 1024 ** 2,
    policy: 'WRONG_ORDER_RETAINED_AND_BOUNDED_CONTINUATION;MISSING_CURSOR_SKIP_ONLY_CURSOR_DEPENDENTS;UNKNOWN_ACK_HTTP_OWNER_BUDGET_BASIS_LINEAGE_STOP;FINALLY100_NO_RETRY' },
  implementation: `${here}/IMPLEMENTATION.md`, status: 'PREPARED_NOT_AUTHORIZED_NOT_EXECUTED',
};
const contractPin = await write(`${output}/contract.json`, contract);
const byPath = new Map();
const add = (entry, role) => { if (!byPath.has(entry.path)) byPath.set(entry.path, asInput(entry, role)); else assert.equal(byPath.get(entry.path).sha256, entry.sha256); };
source.forEach(entry => add(entry, entry.path.endsWith('/runner.mjs') ? 'runner' : entry.path.endsWith('oracle.json') ? 'oracle' : 'source'));
build.forEach(entry => add(entry, 'build'));
lock.packages.forEach(pkg => pkg.files.forEach(entry => add(entry, 'dependency')));
add(lock.environment.nodeBinary, 'build'); add(dependencyPin, 'recipe'); add(guardPin, 'recipe'); add(contractPin, 'recipe');
Object.values(expected).forEach(entry => add(entry, 'oracle'));
const commonManifest = {
  format: 'triplex-devloop-job/1', kind: 'verification', backend: 'qlever', author: 'qlever-agent', dependsOn: [], goals: [2, 3, 7, 10],
  hypothesis: 'Independent finite components and strict public-DTS checks can reject probe wiring and bounded continuation defects before any native operation.',
  inspiration: [{ reference: 'qualification/extensions/string-order-v1/CONTRACT.md; W3C SPARQL1.1 STR/ORDER BY; retained qlever-native-page-sample-v1/0001',
    mechanism: 'Separate observed native STR-order discrepancy from public schema/SDK string order, range and old-cut pagination semantics.',
    adaptation: 'Independent ASCII and native Unicode oracle, exact cursor/P1 lineage and finite diagnostic continuation; no normalization, packet rewrite or new global Datalog Unicode policy.' }],
  logicalTaskId: 'public-string-order-range-pagination-extension', problemId: 'qlever-native-string-order',
  retention: { scratch: 'rebuildable-ephemeral-only', meaning: 'Keep all new fixture assertions/history/commands and first failure evidence; no deletion, retry, stop or fault action.' },
};
const manifest = { ...commonManifest, id: contract.jobId, queryPath: 'qlever-datalog', requiredOwners: ['foundation-qlever'],
  hypothesis: 'The actual public ASCII order/range/page and native normative Unicode cases can expose or narrowly qualify schema-to-result semantics independently of prior packet expectations.',
  command: { argv: [process.execPath, '--max-old-space-size=384', `${here}/runner.mjs`, '--contract', `${output}/contract.json`], cwd: '.',
    env: { NODE_OPTIONS: '--max-old-space-size=384', QLEVER_URL: 'http://127.0.0.1:17019', QLEVER_ACCESS_TOKEN_FILE: path.join(root, '.runtime/engines/qlever-main/access-token') } },
  resources: { heavy: true, memoryBytes: 896 * 1024 ** 2, cpuUnits: 1, diskBytes: 64 * 1024 ** 2, timeoutMilliseconds: 180000, maximumLogBytes: 8 * 1024 ** 2 },
  inputs: [...byPath.values()], evidence: { checks: Object.entries(expected).map(([key, entry]) => ({ key: `string-${key}`, expectedInput: entry.path, actual: `artifacts/${({ datalog: 'datalog-answers.json', native: 'native-answers.json', settings: 'settings-status.json', invariants: 'public-invariants.json', identity: 'input-identity.json' })[key]}` })),
    requiredCheckKeys: Object.keys(expected).map(key => `string-${key}`) }, profile: contract.profile,
};
const nativeManifestPin = await writeManifest(`${output}/manifest.json`, manifest);
const compExpected = await writeOracle(`${component}/expected.json`, { passed: true, componentTests: 10, operationalCalls: 0 });
const compInputs = [...byPath.values()].filter(entry => entry.path.startsWith(`${here}/`) || entry.path.startsWith('.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/') ||
  entry.path.startsWith('qualification/devloop/') || entry.path === 'scripts/triplex-devloop.mjs' || entry.path === '.devloop/owner.json' || entry.path === 'provenance/bounded-storage.json');
compInputs.push(asInput(lock.environment.nodeBinary, 'build'), asInput(compExpected, 'oracle'));
const compManifestPin = await writeManifest(`${component}/manifest.json`, { ...commonManifest, id: 'qlever-public-string-components-v5', queryPath: 'qlever-datalog', requiredOwners: [],
  command: { argv: [process.execPath, '--max-old-space-size=128', `${here}/component-runner.mjs`], cwd: '.', env: { NODE_OPTIONS: '--max-old-space-size=128' } },
  resources: { heavy: true, memoryBytes: 512 * 1024 ** 2, cpuUnits: 1, diskBytes: 8 * 1024 ** 2, timeoutMilliseconds: 60000, maximumLogBytes: 1024 ** 2 },
  inputs: compInputs, evidence: { checks: [{ key: 'string-components', expectedInput: compExpected.path, actual: 'artifacts/checks.json' }], requiredCheckKeys: ['string-components'] },
});
const typeExpected = await writeOracle(`${typecheck}/expected.json`, { passed: true, strictNoEmit: true, nativeCalls: 0, generatedFiles: 0 });
const typeManifestPin = await writeManifest(`${typecheck}/manifest.json`, { ...commonManifest, id: 'qlever-public-string-noemit-v5', queryPath: 'qlever-datalog', requiredOwners: [],
  command: { argv: [process.execPath, '--max-old-space-size=128', `${here}/type-runner.mjs`], cwd: '.', env: { NODE_OPTIONS: '--max-old-space-size=128' } },
  resources: { heavy: true, memoryBytes: 1.5 * 1024 ** 3, cpuUnits: 2, diskBytes: 16 * 1024 ** 2, timeoutMilliseconds: 120000, maximumLogBytes: 2 * 1024 ** 2 },
  inputs: [...byPath.values(), asInput(typeExpected, 'oracle')], evidence: { checks: [{ key: 'string-noemit', expectedInput: typeExpected.path, actual: 'artifacts/checks.json' }], requiredCheckKeys: ['string-noemit'] },
});
await write(`${meta}/prepared.json`, { status: 'SOURCE_COMPONENT_TYPE_MANIFESTS_PREPARED;NO_NATIVE_AUTHORIZATION', contract: contractPin, nativeManifest: nativeManifestPin,
  componentManifest: compManifestPin, typeManifest: typeManifestPin, sources: source.length, builds: build.length, declaredNativeInputs: byPath.size,
  dependencyPackages: lock.packages.map(pkg => ({ name: pkg.name, version: pkg.version, roles: pkg.roles })), dependencyBytes: lock.totalBytes,
  dependencySha256: lock.dependencySha256, sourceContentSha256: objectDigest(source), futureNativeOnly: true,
});
process.stdout.write(canonical({ nativeManifest: nativeManifestPin, componentManifest: compManifestPin, typeManifest: typeManifestPin, dependencyBytes: lock.totalBytes, inputs: byPath.size }) + '\n');
