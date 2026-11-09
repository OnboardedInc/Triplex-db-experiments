// @ts-nocheck -- [EXP-CHECKJS] runtime-built or optional package modules absent from this standalone project. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Metadata only: capture existing files/resolution, never run a compiler or SDK.
 * Reuse the reviewed installed-package collector; optional/conditional gaps remain
 * explicit. The resulting exact manifest still needs its separate build grant.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  ROOT, files, pin, readJson, exclusiveJson,
} from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { captureInstalledPackages } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/inputs.mjs';
import { openContext, pinInputs } from '../../../qualification/devloop/state.mjs';
import { validateManifest } from '../../../qualification/devloop/scheduler.mjs';
import { preserveInputPreimages } from '../../../qualification/devloop/preimages.mjs';

const output = 'qualification/extensions/qlever-wrapper-repair-v1/build-v1';
const jobId = 'qlever-wrapper-sdk-build-v1';
const sourceFiles = await Promise.all([
  ...await files(ROOT, path.join(ROOT, 'packages/qlever/src')),
  ...['package.json', 'tsdown.config.ts', 'tsconfig.json'].map(name => path.join(ROOT, 'packages/qlever', name)),
].map(file => pin(ROOT, file)));
const baselineDist = await Promise.all((await files(ROOT, path.join(ROOT, 'packages/qlever/dist'))).map(file => pin(ROOT, file)));
const candidateCompiler = await pin(ROOT, '.artifacts/qlever-wrapper-text-lowering-v1/candidate/compiler.ts');
const sourcePatch = await pin(ROOT, '.artifacts/qlever-wrapper-text-lowering-v1/candidate.patch');
assert.equal(sourceFiles.find(entry => entry.path === 'packages/qlever/src/compiler.ts')?.sha256,
  '9c60e5a7f491a92ffdb5f7d42cdf57d28dd01d6959066d2b4ed32850e14b012f');
assert.equal(candidateCompiler.sha256, '304e2d527cbc0083a4ed75ea7c2f730e1b69d2337734f6d86c2ded5fbb96a01e');
assert.equal(sourcePatch.sha256, '19d552e2db4447631df4b58f4829033e1f33bcf93eb36a9a63e8b25d29766bc7');
const publicWitness = await pin(ROOT, path.join(import.meta.dirname, 'public.types.ts'));
const guards = [...sourceFiles, ...baselineDist, candidateCompiler, sourcePatch, publicWitness];
for (const file of [
  ...['CONTRACT.md', 'oracle.json', 'plan.json', 'build.mjs', 'prepare-build.mjs'].map(name => path.join(import.meta.dirname, name)),
  'tsconfig.node.json', 'tsconfig.base.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
  'qualification/reviews/qlever-wrapper-text-lowering-v1-source-independent.json',
  'qualification/reviews/qlever-wrapper-text-lowering-v1-binding-independent.json',
  'qualification/reviews/qlever-wrapper-text-lowering-v1-actual-independent.json',
  '.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs',
  '.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/inputs.mjs',
  'tools/bootstrap/with-env.sh', 'scripts/triplex-devloop.mjs', 'qualification/devloop/policy.json',
  ...['io', 'state', 'migration', 'preimages', 'scheduler', 'executor', 'worker', 'evidence', 'compare']
    .map(name => `qualification/devloop/${name}.mjs`),
]) guards.push(await pin(ROOT, file));

const lock = await captureInstalledPackages({ root: ROOT, roots: [
  { name: '@triplex-build/triplex', from: 'packages/qlever/package.json', role: 'runtime' },
  { name: 'effect', from: 'packages/qlever/package.json', role: 'runtime' },
  { name: 'tsdown', from: 'packages/qlever/package.json', role: 'compiler' },
  { name: 'typescript', from: 'packages/qlever/package.json', role: 'compiler' },
  { name: '@types/node', from: 'packages/qlever/package.json', role: 'types' },
], maximumBytes: 512 * 1024 ** 2 });
const member = (name, packagePath) => {
  const entry = lock.packages.find(pkg => pkg.name === name)?.files.find(file => file.packagePath === packagePath);
  assert(entry, `MISSING_PINNED_TOOL_MEMBER:${name}:${packagePath}`); return entry.path;
};
const dependencies = await exclusiveJson(ROOT, path.join(output, 'dependencies.json'), lock);
const contract = {
  mode: 'ISOLATED_ORDINARY_QLEVER_SDK_WRAPPER_BUILD', jobId,
  sourceFiles, baselineDist, candidateCompiler, sourcePatch, publicWitness,
  publicExports: (await readJson(path.join(ROOT, 'packages/qlever/package.json'))).exports,
  tsdownCli: member('tsdown', 'dist/run.mjs'),
  typescriptCli: member('typescript', 'lib/tsc.js'),
  typescriptModule: member('typescript', 'lib/typescript.js'),
  dependencies, guards,
  copiedVsReferenced: 'Independent small Q source/config copies; current public Core/Effect/compiler/native compiler bindings/Node remain pinned installed references. No engine binary or service is involved.',
  generationScope: 'Ordinary Q package commands into isolated private exports; current live source/dist unchanged. Public runtime/semantic/capacity acceptance not implied.',
  dependencyScope: 'Reviewed recursive installed package file trees and selected resolver metadata. Off-platform/missing optional/unselected conditions explicit; no complete OS/conditional environment closure claim.',
};
const contractPin = await exclusiveJson(ROOT, path.join(output, 'contract.json'), contract);
const expected = await exclusiveJson(ROOT, path.join(output, 'expected.json'), {
  status: 'PASS_PRIVATE_SDK_GENERATION_ONLY', engineCalls: 0,
  ordinaryPackageCommands: true, publicDeclarationWitness: true,
  liveSourceOrDistWrites: false, onlyCompilerExecutableChanged: true, sourcePatchApplied: true,
});
const pins = new Map();
const add = (entry, role) => {
  const old = pins.get(entry.path); if (old) assert.equal(old.sha256, entry.sha256);
  else pins.set(entry.path, { path: entry.path, sha256: entry.sha256, role });
};
for (const entry of guards) add(entry,
  entry.path.includes('/dist/') ? 'build' : entry.path.endsWith('oracle.json') ? 'oracle'
    : entry.path.endsWith('.json') || entry.path.endsWith('.md') || entry.path.endsWith('.patch') ? 'recipe'
      : entry.path.includes('/src/') || entry.path.includes('/candidate/') ? 'source' : 'runner');
for (const pkg of lock.packages) for (const entry of pkg.files) add(entry, 'dependency');
add(lock.environment.nodeBinary, 'build'); add(dependencies, 'recipe'); add(contractPin, 'recipe'); add(expected, 'oracle');
const manifest = {
  format: 'triplex-devloop-job/1', id: jobId, kind: 'build', backend: 'qlever', queryPath: 'qlever-datalog',
  author: 'qlever-wrapper-sdk-owner', problemId: 'wrapper-string-range-numeric-domain',
  logicalTaskId: 'private-ordinary-q-sdk-explicit-wrapper-branch',
  hypothesis: 'An isolated ordinary public Q adapter package can generate the reviewed explicit text-wrapper branch without changing other executable modules, public declarations, live source/dist, numeric WHERE or engine bytes',
  goals: [2, 10], dependsOn: ['qlever-wrapper-text-lowering-pure-v1'], requiredOwners: [],
  inspiration: [{ reference: 'packages/qlever/package.json/tsdown.config.ts; reviewed Core ordinary-generation and A isolated-package recipes',
    mechanism: 'Generate actual public SDK exports with existing pinned tools and before/after identity checks',
    adaptation: 'One owned Q package copy/public self-reference; compiler branch only, no engine build/loader/live export mutation' }],
  command: { argv: [process.execPath, '--max-old-space-size=256',
    'qualification/extensions/qlever-wrapper-repair-v1/build.mjs', '--contract', contractPin.path],
    cwd: '.', env: { NODE_OPTIONS: '--max-old-space-size=256' } },
  resources: { heavy: true, memoryBytes: 2 * 1024 ** 3, cpuUnits: 2, diskBytes: 512 * 1024 ** 2,
    timeoutMilliseconds: 300000, maximumLogBytes: 4 * 1024 ** 2 },
  inputs: [...pins.values()],
  evidence: { checks: [{ key: 'isolated-sdk-generation', expectedInput: expected.path, actual: 'artifacts/checks.json' }],
    requiredCheckKeys: ['isolated-sdk-generation'] },
  profile: { name: 'isolated-ordinary-q-wrapper-sdk-v1', outerNodeOldSpaceMiB: 256,
    childNodeOldSpaceMiB: 768, sourceModules: 18, nativeEngineCalls: 0,
    actualRuntimeQualification: false, defaultOrPerformancePromotion: false },
};
const context = await openContext(ROOT); validateManifest(manifest, context.policy); await pinInputs(context, manifest.inputs);
const manifestPin = await exclusiveJson(ROOT, path.join(output, 'manifest.json'), manifest);
const preimages = await preserveInputPreimages(context, manifest.inputs,
  path.join(output, 'prepared-source-preimages.json'), { phase: 'private-q-sdk-source-proposal-only-no-compiler-or-backend-grant' });
console.log(JSON.stringify({ manifest: manifestPin, contract: contractPin, dependencies, preimages,
  packageCount: lock.packages.length, dependencyBytes: lock.totalBytes, inputs: pins.size,
  state: 'PREPARED_SOURCE_ONLY_NOT_ENQUEUED_NO_COMPILER_OR_BACKEND_GRANT' }));
