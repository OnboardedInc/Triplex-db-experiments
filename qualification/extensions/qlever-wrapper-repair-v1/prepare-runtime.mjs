// @ts-nocheck -- [EXP-CHECKJS] runtime-built or optional package modules absent from this standalone project; runtime-populated records, optional option bags, or branch-specific union members; runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Source/metadata only. Does not import a target SDK, install or contact services.
 * Run only after the independent isolated-build hold is explicitly released.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { captureInstalledPackages } from '../../../.artifacts/read-basis-core-build-v1/compiler-inputs.mjs';
import { files, pin, exclusiveJson, objectDigest, relative, owned, verifyPins } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { openContext, readState } from '../../devloop/state.mjs';
import { validateManifest } from '../../devloop/scheduler.mjs';
import { preserveInputPreimages } from '../../devloop/preimages.mjs';
import { canonical, SDK_CALLS, sha } from '../string-order-v1/probe-support.mjs';
import { LOWERCASE_SDK_CALLS } from './lowercase-support.mjs';

const root = path.resolve(import.meta.dirname, '../../..'), here = relative(root, import.meta.dirname);
const meta = '.artifacts/qlever-wrapper-runtime-preparation-v1';
const write = (file, value) => exclusiveJson(root, file, value);
const writeText = async (file, text) => {
  const target = await owned(root, file, { missing: true }); await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, text, { flag: 'wx', mode: 0o444 }); return pin(root, target);
};
const expected = (file, value) => writeText(file, canonical(value) + '\n');
const context = await openContext(root), state = await readState(context);
const buildJob = state.jobs['qlever-wrapper-sdk-build-v3'], buildAttempt = buildJob.attempts.find(row => row.id === '0001');
assert.equal(buildJob.status, 'completed_verified_bytes'); assert.equal(buildAttempt.status, 'completed_verified_bytes');
const buildDirectory = '.devloop/jobs/qlever-wrapper-sdk-build-v3/attempts/0001';
const terminalPin = await pin(root, `${buildDirectory}/terminal.json`);
assert.equal(terminalPin.sha256, buildAttempt.terminalSha256);
const terminal = JSON.parse(await readFile(path.join(root, terminalPin.path)));
assert.equal(terminal.status, 'completed_verified_bytes');
const buildPin = await pin(root, `${buildDirectory}/artifacts/build.json`);
assert.equal(buildPin.sha256, terminal.outputs.find(row => row.path === 'artifacts/build.json').sha256);
const build = JSON.parse(await readFile(path.join(root, buildPin.path)));
assert.equal(build.generated.length, 70); assert.equal(build.engineCalls, 0); assert.equal(build.liveSourceOrDistWrites, false);
await verifyPins(root, [...build.generated, ...build.sourceCopies.map(row => row.copy)]);
const packageRoot = build.packageRoot;
assert.match(packageRoot, /^packages\/qlever\/\.artifacts\/wrapper-repair-sdk-v1\/qlever-wrapper-sdk-build-v3-0001$/);
const sdkBuild = { jobId: buildJob.manifest.id, attemptId: '0001', terminal: terminalPin, artifact: buildPin,
  packageRoot, generatedMembershipDigest: objectDigest(build.generated), generatedMembers: 70,
  scope: 'ONE_ANCHORED_ADAPTER_ONLY_BUILD;REFERENCED_INSTALLED_DEPENDENCIES;NO_ENGINE_BUILD_OR_LIVE_INTEGRATION' };
const privateLowercase = `${packageRoot}/probes/lowercase-v1.ts`, privateMixed = `${packageRoot}/probes/mixed-v1.ts`;
const helperImport = (entry, file) => {
  const value = path.relative(path.dirname(path.join(root, entry)), path.join(root, file));
  return value.startsWith('.') ? value : './' + value;
};
const lowercaseOriginal = await readFile(path.join(root, here, 'lowercase-probe.template.ts'), 'utf8');
assert.equal(lowercaseOriginal.split('from "SUPPORT_MODULE"').length, 2);
const lowercaseText = lowercaseOriginal.replace('from "SUPPORT_MODULE"', `from ${JSON.stringify(helperImport(privateLowercase, `${here}/lowercase-support.mjs`))}`);
const mixedOriginalPath = 'packages/qlever/experiments/string-order-probe.ts';
const mixedOriginal = await readFile(path.join(root, mixedOriginalPath), 'utf8');
assert.equal(sha(mixedOriginal), '33695bf500c6bc4f03a652bf4f0985401496f7912515588d712f035944d9a709');
const oldHelper = 'from "../../../qualification/extensions/string-order-v1/probe-support.mjs"';
const oldRoot = 'const root = path.resolve(import.meta.dirname, "../../.."), here = path.join(root, "qualification/extensions/string-order-v1");';
assert.equal(mixedOriginal.split(oldHelper).length, 2); assert.equal(mixedOriginal.split(oldRoot).length, 2);
const mixedText = mixedOriginal.replace(oldHelper, `from ${JSON.stringify(helperImport(privateMixed, 'qualification/extensions/string-order-v1/probe-support.mjs'))}`)
  .replace(oldRoot, 'const root = realpathSync(process.env["TRIPLEX_QUALIFICATION_ROOT"]!), here = path.join(root, "qualification/extensions/string-order-v1");')
  .replace('assert.equal(contract.mode, "PUBLIC_QLEVER_STRING_EXTENSION_BOTH");', 'assert.equal(contract.mode, "PUBLIC_QLEVER_STRING_EXTENSION_BOTH");\nassert.equal(import.meta.resolve("@triplex-build/triplex-qlever"), contract.publicFacadeUrl);');
const lowerEntry = await writeText(privateLowercase, lowercaseText), mixedEntry = await writeText(privateMixed, mixedText);
const appIndex = await write(`${meta}/applications.json`, { sdkBuild, lowercase: { original: await pin(root, `${here}/lowercase-probe.template.ts`), entry: lowerEntry,
  adaptations: ['EXACT_RELATIVE_OWNED_SUPPORT_MODULE_ONLY'] }, mixed: { original: await pin(root, mixedOriginalPath), entry: mixedEntry,
  adaptations: ['EXACT_RELATIVE_OWNED_SUPPORT_MODULE', 'EXPLICIT_OWNED_ROOT_ENVIRONMENT', 'EXACT_PUBLIC_SELF_REFERENCE_ASSERTION'],
  logicalCaseBodiesAndOldExpectationsUnchanged: true } });
const typeProject = await write(`${meta}/noemit.tsconfig.json`, { extends: path.join(root, 'tsconfig.node.json'), compilerOptions: {
  noEmit: true, allowJs: true, checkJs: false, rootDir: root }, files: [path.join(root, privateLowercase), path.join(root, privateMixed)] });
const graph = await captureInstalledPackages({ root, roots: [
  { name: '@triplex-build/triplex', role: 'runtime', from: privateLowercase }, { name: 'effect', role: 'runtime', from: privateLowercase },
  { name: '@types/node', role: 'type', from: 'package.json' }, { name: 'typescript', role: 'compiler', from: 'package.json' },
], maximumBytes: 256 * 1024 ** 2 });
const { dependencySha256: _unused, ...payload } = graph;
payload.unresolvedConditionalScope = 'Current installed runtime/type/compiler graph, distinct package roots and selected ESM entries only. Private Q public facade/members are manually pinned separately. No copied immutable runtime, OS/native addon or complete off-platform/conditional closure claim.';
const lock = { ...payload, dependencySha256: objectDigest(payload) };
const dependencyPin = await write(`${meta}/dependencies.json`, lock);
const sourceNames = ['CONTRACT.md', 'plan.json', 'oracle.json', 'lowercase-probe.template.ts', 'lowercase-support.mjs', 'lowercase-support.test.mjs',
  'runtime-runner.mjs', 'runtime-components.mjs', 'runtime-noemit.mjs', 'prepare-runtime.mjs'];
const sourcePaths = [
  ...sourceNames.map(file => `${here}/${file}`), mixedOriginalPath, privateLowercase, privateMixed,
  ...['CONTRACT.md', 'oracle.json', 'policy.json', 'IMPLEMENTATION.md', 'probe-support.mjs', 'probe-support.test.mjs'].map(file => `qualification/extensions/string-order-v1/${file}`),
  ...['io', 'state', 'migration', 'preimages', 'scheduler', 'executor', 'worker', 'evidence', 'compare'].map(name => `qualification/devloop/${name}.mjs`),
  'qualification/devloop/policy.json', 'scripts/triplex-devloop.mjs', '.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs',
  '.artifacts/read-basis-core-build-v1/compiler-inputs.mjs', 'tools/bootstrap/with-env.sh', 'tools/bootstrap/check-storage.py', 'provenance/bounded-storage.json', '.devloop/owner.json',
  'packages/core/package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.base.json', 'tsconfig.node.json',
  ...build.sourceCopies.map(row => row.copy.path), appIndex.path, typeProject.path,
];
const source = [];
for (const file of [...new Set(sourcePaths)].sort()) source.push(await pin(root, file));
for (const file of await files(root, path.join(root, 'packages/core/src'))) source.push(await pin(root, file));
const guardPin = await write(`${meta}/guards.json`, [...source, ...build.generated]);
const byPath = new Map();
const add = (entry, role) => { const prior = byPath.get(entry.path); if (prior) assert.equal(prior.sha256, entry.sha256); else byPath.set(entry.path, { path: entry.path, role, sha256: entry.sha256 }); };
source.forEach(entry => add(entry, entry.path.endsWith('oracle.json') ? 'oracle' : entry.path.endsWith('runtime-runner.mjs') ? 'runner' : 'source'));
build.generated.forEach(entry => add(entry, 'build')); add(buildPin, 'recipe'); add(terminalPin, 'recipe');
lock.packages.forEach(pkg => pkg.files.forEach(entry => add(entry, 'dependency')));
add(lock.environment.nodeBinary, 'build'); add(dependencyPin, 'recipe'); add(guardPin, 'recipe');
const policy = JSON.parse(await readFile(path.join(root, 'qualification/devloop/policy.json')));
const manifestWrite = async (file, value) => {
  validateManifest(value, policy);
  const entry = await write(file, value);
  const preimages = await preserveInputPreimages(context, value.inputs, path.join(path.dirname(file), 'prepared-source-preimages.json'));
  return { ...entry, preimages };
};
const common = { format: 'triplex-devloop-job/1', kind: 'verification', backend: 'qlever', author: 'qlever-agent', dependsOn: [], goals: [2, 3, 7, 10],
  logicalTaskId: 'isolated-public-wrapper-text-repair', problemId: 'qlever-wrapper-string-range',
  inspiration: [{ reference: 'packages/core/src/datalog/wrapper.ts:113-170;qualification/reviews/qlever-wrapper-text-lowering-v1-actual-independent.json',
    mechanism: 'Separate raw wrapper text boundaries from numeric-only Datalog WHERE lowering.', adaptation: 'One isolated Q adapter branch with independent lowercase ranges; keep mixed-case native collation failures and all existing packet expectations.' }],
  retention: { scratch: 'Retain all fixture history, original failures, source preimages and exact build; no deletion/retry/stop/restore/fault action.' } };
const nativeManifests = [];
for (const which of ['lowercase', 'mixed']) {
  const output = `qualification/native-jobs/qlever-wrapper-${which}-v1`, id = `qlever-wrapper-${which}-v1`, runId = randomUUID();
  const contract = { mode: which === 'lowercase' ? 'PUBLIC_Q_WRAPPER_LOWERCASE_PRIVATE_SDK' : 'PUBLIC_QLEVER_STRING_EXTENSION_BOTH', jobId: id, runId,
    appEntry: which === 'lowercase' ? lowerEntry : mixedEntry, sdkBuild, publicFacadeUrl: build.publicFacadeResolution.url,
    scopeName: `wrapper-lowercase-${runId}`, asciiScopeLabel: `wrapper-mixed-ascii-${runId}`, unicodeScopeLabel: `wrapper-mixed-unicode-${runId}`,
    containerId: 'e225d359e2a8211de8c5b3551e1aff8952b92b41922c4f90505ca4c6afc30b3f',
    imageSha256: 'sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec',
    oracle: await pin(root, `${here}/oracle.json`), oracleSha256: (await pin(root, 'qualification/extensions/string-order-v1/oracle.json')).sha256,
    dependencyLock: dependencyPin, guardPins: guardPin, sdkCalls: which === 'lowercase' ? LOWERCASE_SDK_CALLS : SDK_CALLS,
    profile: { sdkBuild: buildPin.sha256, engineMemoryBytes: 2 * 1024 ** 3, datalog: 'F1-persisted-minus-paired-bounded-Eoff-planner1', native: 'native100',
      sdkCalls: which === 'lowercase' ? 17 : 31, sdkDispatchWindowMs: 120000, perSdkCallMs: 5000, resultRows: 32, replyBytes: 2 * 1024 ** 2,
      totalEvidenceBytes: 32 * 1024 ** 2, normalSettingsControls: 7, maximumSettingsControls: 9,
      policy: 'SEMANTIC_WRONG_ROWS_RETAINED_WITH_FINITE_CONTINUATION;UNKNOWN_ACK_HTTP_OWNERSHIP_BUDGET_BASIS_STOP;FINALLY100_NO_RETRY' },
    status: 'PREPARED_NOT_GRANTED_NOT_EXECUTED' };
  const contractPin = await write(`${output}/contract.json`, contract);
  const checks = {};
  if (which === 'lowercase') {
    const oracle = JSON.parse(await readFile(path.join(root, here, 'oracle.json')));
    const answers = Object.fromEntries(oracle.cases.map(item => [item.id, item.expectedRows]));
    checks.answers = { file: 'lowercase-answers.json', pin: await expected(`${output}/answers.expected.json`, { native: answers, datalogCurrent: answers, datalogReopen: answers }) };
    checks.invariants = { file: 'public-invariants.json', pin: await expected(`${output}/invariants.expected.json`, { seedAckVerified: true, nativeMembershipVerified: true, datalogMembershipVerified: true, allReturnedBasesValid: true, allEightRangePagesTerminal: true, full17CallInventoryCompleted: true }) };
    checks.settings = { file: 'settings-status.json', pin: await expected(`${output}/settings.expected.json`, { restored100: true, pendingZero: true, noOtherCanonicalQAtEnd: true, clientCloseReturned: true, beforeBudget: '100', selectedBudget: '1', restoredBeforeNativeAfterBudget: '100', finalBudget: '100' }) };
  } else {
    const oracle = JSON.parse(await readFile(path.join(root, 'qualification/extensions/string-order-v1/oracle.json')));
    const membership = { membershipExact: true, rowsByExpectedIdentity: oracle.unicodeInput.map(({ entity, label }) => ({ entity, label })), returnedCount: 7, uniqueIdentityCount: 7 };
    const datalog = Object.fromEntries(oracle.commonTasks.map(item => [item.id, item.expectedRows ?? membership]));
    const native = { ...datalog, ...Object.fromEntries(oracle.nativeSparqlOnlyTasks.map(item => [item.id, item.expectedEntityOrder.map(entity => oracle.unicodeInput.map(({ entity, label }) => ({ entity, label })).find(row => row.entity === entity))])) };
    checks.datalog = { file: 'datalog-answers.json', pin: await expected(`${output}/datalog.expected.json`, datalog) };
    checks.native = { file: 'native-answers.json', pin: await expected(`${output}/native.expected.json`, native) };
    checks.invariants = { file: 'public-invariants.json', pin: await expected(`${output}/invariants.expected.json`, { firstDatalogCursorPresent: true, continuedDatalogTerminal: true, reopenedDatalogTerminal: true, greaterRangeDatalogTerminal: true, lesserRangeDatalogTerminal: true, correctedHistoryLineage: true, allCapturedBasisValid: true, originalDatalogPageMembership: true, originalNativePageMembership: true }) };
    checks.settings = { file: 'settings-status.json', pin: await expected(`${output}/settings.expected.json`, { restored100: true, noOtherQAtEnd: true, beforeBudget: '100', selectedBudget: '1', nativeAfterBudget: '100', finalBudget: '100', pendingSdkCallsZero: true, nativeClientCloseReturned: true }) };
  }
  checks.identity = { file: 'input-identity.json', pin: await write(`${output}/identity.expected.json`, { status: 'BEFORE_AND_AFTER_IDENTICAL', dependencySha256: lock.dependencySha256, guardPinCount: source.length + build.generated.length, installedLayoutOnly: true, copiedImmutableRuntimeClaimed: false }) };
  const inputs = new Map(byPath); const insert = (entry, role) => inputs.set(entry.path, { path: entry.path, role, sha256: entry.sha256 });
  insert(contractPin, 'recipe'); Object.values(checks).forEach(row => insert(row.pin, 'oracle'));
  const manifest = { ...common, id, queryPath: 'qlever-datalog', requiredOwners: ['foundation-qlever'],
    hypothesis: which === 'lowercase' ? 'The isolated wrapper branch repairs raw lowercase text ranges through public current/reopen SDK paths without requiring native collation correctness.' : 'The unchanged mixed-case/Unicode extension retains native semantic failures on the same isolated adapter artifact; no client order normalization or relaxed expectations.',
    command: { argv: [process.execPath, '--max-old-space-size=384', `${here}/runtime-runner.mjs`, '--contract', contractPin.path], cwd: '.', env: {
      NODE_OPTIONS: '--max-old-space-size=384', QLEVER_URL: 'http://127.0.0.1:17019', QLEVER_ACCESS_TOKEN_FILE: path.join(root, '.runtime/engines/qlever-main/access-token') } },
    resources: { heavy: true, memoryBytes: 896 * 1024 ** 2, cpuUnits: 1, diskBytes: 64 * 1024 ** 2, timeoutMilliseconds: 180000, maximumLogBytes: 8 * 1024 ** 2 },
    inputs: [...inputs.values()], evidence: { checks: Object.entries(checks).map(([key, row]) => ({ key: `wrapper-${key}`, expectedInput: row.pin.path, actual: `artifacts/${row.file}` })), requiredCheckKeys: Object.keys(checks).map(key => `wrapper-${key}`) }, profile: contract.profile };
  nativeManifests.push(await manifestWrite(`${output}/manifest.json`, manifest));
}
const componentDir = 'qualification/component-jobs/qlever-wrapper-runtime-components-v1', typeDir = 'qualification/component-jobs/qlever-wrapper-runtime-noemit-v1';
const componentExpected = await write(`${componentDir}/expected.json`, { passed: true, componentTests: 16, workerImports: 0, operationalCalls: 0 });
const typeContract = await write(`${typeDir}/contract.json`, { dependencyLock: dependencyPin, guardPins: guardPin, typeProject: typeProject.path });
const typeExpected = await write(`${typeDir}/expected.json`, { passed: true, strictNoEmit: true, workerImports: 0, nativeCalls: 0, generatedFiles: 0 });
const componentInputs = [...byPath.values()].filter(row => row.role !== 'dependency' && row.role !== 'build' && !row.path.startsWith('packages/'));
componentInputs.push({ path: lock.environment.nodeBinary.path, role: 'build', sha256: lock.environment.nodeBinary.sha256 }, { path: componentExpected.path, role: 'oracle', sha256: componentExpected.sha256 });
const componentManifest = await manifestWrite(`${componentDir}/manifest.json`, { ...common, id: 'qlever-wrapper-runtime-components-v1', queryPath: 'qlever-datalog', requiredOwners: [], hypothesis: 'Pure helper controls preserve finite calls, fixed ASCII ranges, page R and unchanged bounded phase restoration before runtime probes.',
  command: { argv: [process.execPath, '--max-old-space-size=128', `${here}/runtime-components.mjs`], cwd: '.', env: { NODE_OPTIONS: '--max-old-space-size=128' } },
  resources: { heavy: true, memoryBytes: 512 * 1024 ** 2, cpuUnits: 1, diskBytes: 8 * 1024 ** 2, timeoutMilliseconds: 60000, maximumLogBytes: 1024 ** 2 }, inputs: componentInputs,
  evidence: { checks: [{ key: 'wrapper-components', expectedInput: componentExpected.path, actual: 'artifacts/checks.json' }], requiredCheckKeys: ['wrapper-components'] } });
const typeManifest = await manifestWrite(`${typeDir}/manifest.json`, { ...common, id: 'qlever-wrapper-runtime-noemit-v1', queryPath: 'qlever-datalog', requiredOwners: [], hypothesis: 'Both exact private-package application entries typecheck against the anchored generated public facade without evaluating it or changing artifacts.',
  command: { argv: [process.execPath, '--max-old-space-size=128', `${here}/runtime-noemit.mjs`, '--contract', typeContract.path], cwd: '.', env: { NODE_OPTIONS: '--max-old-space-size=128' } },
  resources: { heavy: true, memoryBytes: 1.5 * 1024 ** 3, cpuUnits: 2, diskBytes: 16 * 1024 ** 2, timeoutMilliseconds: 120000, maximumLogBytes: 2 * 1024 ** 2 },
  inputs: [...byPath.values(), { path: typeContract.path, role: 'recipe', sha256: typeContract.sha256 }, { path: typeExpected.path, role: 'oracle', sha256: typeExpected.sha256 }],
  evidence: { checks: [{ key: 'wrapper-noemit', expectedInput: typeExpected.path, actual: 'artifacts/checks.json' }], requiredCheckKeys: ['wrapper-noemit'] } });
await write(`${meta}/prepared.json`, { status: 'PREPARED_ONLY_NO_RUNTIME_GRANT', sdkBuild, appIndex, dependencyPin, guardPin, sourcePins: source.length, generatedPins: build.generated.length,
  installedPackages: lock.packages.length, installedBytes: lock.totalBytes, manualPrivateQFacade: build.publicFacadeResolution, nativeManifests, componentManifest, typeManifest });
await verifyPins(root, build.generated);
process.stdout.write(JSON.stringify({ nativeManifests, componentManifest, typeManifest, dependencyPackages: lock.packages.length, dependencyBytes: lock.totalBytes }) + '\n');
