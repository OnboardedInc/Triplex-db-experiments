/** Metadata capture only. No recipe import, test, ConfigStore write or service. */
import path from 'node:path';
import { ROOT, pin, exclusiveJson, files } from '../../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { captureInstalledPackages } from '../../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/inputs.mjs';
import { openContext, pinInputs } from '../../../../qualification/devloop/state.mjs';
import { validateManifest } from '../../../../qualification/devloop/scheduler.mjs';
import { preserveInputPreimages } from '../../../../qualification/devloop/preimages.mjs';
const output = 'qualification/capacity/configured-entities-v1/components-v2', guards = [];
for (const file of ['recipe.mjs', 'recipe.test.mjs', 'components.mjs', 'prepare-components.mjs'])
  guards.push(await pin(ROOT, path.join(import.meta.dirname, file)));
for (const file of ['CONTRACT.md', 'oracle.mjs', 'plan.json'])
  guards.push(await pin(ROOT, `qualification/capacity/configured-entities-v1/${file}`));
for (const file of ['packages/core/src/config/Attribute.ts', 'packages/core/src/config/EntityType.ts', 'packages/core/src/config/TypeSchema.ts',
  'packages/core/src/config/ConfigStore.ts', 'packages/core/src/config/ConfigNode.ts', 'packages/core/src/Triple.ts',
  '.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs', '.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/inputs.mjs',
  'tools/bootstrap/with-env.sh', 'scripts/triplex-devloop.mjs', 'qualification/devloop/policy.json',
  ...['io','state','migration','preimages','scheduler','executor','worker','evidence','compare'].map(name => `qualification/devloop/${name}.mjs`)]) guards.push(await pin(ROOT, file));
const lock = await captureInstalledPackages({ root: ROOT, roots: [
  { name: '@triplex-build/triplex', from: 'packages/qualification/package.json', role: 'runtime' },
  { name: 'effect', from: 'packages/qualification/package.json', role: 'runtime' },
], maximumBytes: 128 * 1024 ** 2 });
const dependencies = await exclusiveJson(ROOT, path.join(output, 'dependencies.json'), lock);
const contract = { mode: 'SEVEN_OFFLINE_SCHEMA_RECIPE_CONTROLS', guards, dependencies,
  sourceStatus: 'SOURCE_ONLY_UNEXECUTED', serviceCallsAllowed: 0, backendWritesAllowed: 0,
  dependencyScope: 'Recursive installed public Core/runtime packages and resolution metadata guarded before/after; no copied immutable runtime or whole OS closure claim',
  claim: 'Public schema derivation/local validation and independent tiny replay only; no actual configured entity, release, receipt, history/reopen or capacity qualification' };
const contractPin = await exclusiveJson(ROOT, path.join(output, 'contract.json'), contract);
const expected = await exclusiveJson(ROOT, path.join(output, 'expected.json'), { backendCalls: 0, cases: 7, configurationDerivedOnly: true, status: 'PASS_OFFLINE_RECIPE_ONLY' });
// Canonical output is intentionally the exact same ordinary exclusiveJson bytes.
const pins = new Map(), add = (entry, role) => pins.set(entry.path, { path: entry.path, role, sha256: entry.sha256 });
for (const entry of guards) add(entry, entry.path.endsWith('oracle.mjs') ? 'oracle'
  : entry.path.endsWith('/recipe.mjs') || entry.path.startsWith('packages/core/src/') ? 'source' : 'runner');
for (const pkg of lock.packages) for (const entry of pkg.files) add(entry, 'dependency');
add(lock.environment.nodeBinary, 'build'); add(dependencies, 'recipe'); add(contractPin, 'recipe'); add(expected, 'oracle');
const manifest = { format: 'triplex-devloop-job/1', id: 'configured-entity-recipe-components-v1', kind: 'verification',
  backend: 'xtdb', queryPath: 'xtdb-datalog', author: 'configured-entity-recipe-owner',
  problemId: 'configured-entities-versus-raw-fact-subjects', logicalTaskId: 'portable-capacity-schema-tiny-oracle',
  hypothesis: 'Existing public schema handles can generate bounded typed configured-entity descriptors with independently replayed structural/domain/history counts, without claiming raw subjects as configured capacity',
  goals: [1, 3, 10], dependsOn: [], requiredOwners: [],
  inspiration: [{ reference: 'packages/core/src/config/{Attribute,EntityType,TypeSchema,ConfigStore}.ts; EntityValidation.e2e.test.ts',
    mechanism: 'Use existing typed attributes/schema releases, with fixture-explicit presence and type-version facts',
    adaptation: 'Stream sparse1/representative10 atomic entity commands; independently count domain, structural, configuration and journal metadata' }],
  command: { argv: [process.execPath, '--max-old-space-size=256', 'packages/qualification/experiments/configured-entities-v1/components.mjs', '--contract', contractPin.path], cwd: '.', env: { NODE_OPTIONS: '--max-old-space-size=256' } },
  resources: { heavy: true, memoryBytes: 768 * 1024 ** 2, cpuUnits: 1, diskBytes: 64 * 1024 ** 2, timeoutMilliseconds: 120000, maximumLogBytes: 4 * 1024 ** 2 },
  inputs: [...pins.values()],
  evidence: { checks: [{ key: 'configured-recipe-offline7', expectedInput: expected.path, actual: 'artifacts/checks.json' }], requiredCheckKeys: ['configured-recipe-offline7'] },
  profile: { name: 'configured-entity-source-components-v1', nodeOldSpaceMiB: 256, cases: 7, fixtureEntities: 8, profiles: ['sparse1','representative10'], backendCalls: 0,
    claim: 'Offline recipe only; no ingestion/larger-stage/physical-growth qualification' },
};
const context = await openContext(ROOT); validateManifest(manifest, context.policy); await pinInputs(context, manifest.inputs);
const manifestPin = await exclusiveJson(ROOT, path.join(output, 'manifest.json'), manifest);
const preimages = await preserveInputPreimages(context, manifest.inputs, path.join(output, 'prepared-source-preimages.json'), { phase: 'configured-recipe-offline-preparation' });
console.log(JSON.stringify({ manifest: manifestPin, contract: contractPin, preimages, packageCount: lock.packages.length, dependencyBytes: lock.totalBytes, state: 'PREPARED_NO_COMPONENT_OR_BACKEND_GRANT' }));
