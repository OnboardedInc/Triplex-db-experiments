// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, writeFile, realpath, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..'), id = process.argv[2];
assert(/^[a-z0-9][a-z0-9-]*$/.test(id ?? ''));
const unitJob = process.argv[3] ?? 'duckdb-withdrawal-unit-v3';
assert(/^[a-z0-9][a-z0-9-]*$/.test(unitJob));
const manifest = JSON.parse(await readFile(path.join(root, '.runtime/duckdb', `${unitJob}.json`)));
const inputs = new Map(manifest.inputs.filter(x => !x.path.startsWith('packages/duckdb/dist/')).map(x => [x.path, x]));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const add = async (file, role) => {
  const absolute = await realpath(path.resolve(root, file));
  assert(absolute.startsWith(root + path.sep));
  inputs.set(path.relative(root, absolute), { path: path.relative(root, absolute), role, sha256: digest(await readFile(absolute)) });
};
const walk = async directory => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    assert(entry.isFile() || entry.isDirectory(), `Unexpected linked compiler input: ${file}`);
    if (entry.isDirectory()) await walk(file); else await add(file, 'dependency');
  }
};
const packages = new Set(), optionalOmissions = [];
const closure = async (resolver, name, optional = false) => {
  let entry;
  try {
    try { entry = resolver.resolve(name); }
    catch { entry = resolver.resolve(`${name}/package.json`); }
  }
  catch (error) {
    if (optional) { optionalOmissions.push({ name, code: error.code }); return; }
    throw error;
  }
  let directory = path.dirname(await realpath(entry)), metadata;
  while (true) {
    metadata = await readFile(path.join(directory, 'package.json'), 'utf8').then(JSON.parse).catch(() => null);
    if (metadata?.name === name) break;
    const parent = path.dirname(directory); assert(parent !== directory, `Missing owning compiler package ${name}`); directory = parent;
  }
  if (packages.has(directory)) return;
  packages.add(directory);
  await walk(directory);
  const next = createRequire(path.join(directory, 'package.json'));
  for (const dependency of Object.keys(metadata.dependencies ?? {})) await closure(next, dependency);
  for (const dependency of Object.keys(metadata.optionalDependencies ?? {})) await closure(next, dependency, true);
};
const require = createRequire(path.join(root, 'package.json'));
for (const name of ['typescript', 'tsdown', '@types/node']) await closure(require, name);
await walk(path.join(root, '.local/tools/pnpm-10.11.0/package'));
for (const file of ['tools/bootstrap/pnpm', 'tools/bootstrap/with-env.sh', 'packages/duckdb/tsdown.config.ts', 'packages/duckdb/tsconfig.json', 'tsconfig.node.json', 'tsconfig.base.json', 'packages/duckdb/experiments/copy-assets.mjs', 'packages/duckdb/experiments/withdrawal-build-checks.mjs', 'packages/duckdb/experiments/prepare-withdrawal-build-job.mjs']) await add(file, 'runner');
const expectedPath = `.runtime/duckdb/${id}.expected.json`;
await writeFile(path.join(root, expectedPath), JSON.stringify({ format: 'triplex-duckdb-withdrawal-build-checks/1', status: 'PASS', steps: ['typecheck', 'build', 'current-13-component-checks'], cppRecompiled: false }, null, 2) + '\n', { flag: 'wx' });
await add(expectedPath, 'oracle');
Object.assign(manifest, {
  id, problemId: 'duckdb-cancelled-queued-physical-work', logicalTaskId: 'current-duck-private-type-build-and-components',
  dependsOn: [unitJob],
  command: { argv: [process.execPath, 'packages/duckdb/experiments/withdrawal-build-checks.mjs'], cwd: '.', env: { NODE_OPTIONS: '--max-old-space-size=768' } },
  resources: { heavy: true, memoryBytes: 1610612736, cpuUnits: 2, diskBytes: 67108864, timeoutMilliseconds: 180000, maximumLogBytes: 8388608 },
  inputs: [...inputs.values()].sort((a, b) => a.path.localeCompare(b.path)),
  evidence: { checks: [{ key: 'private-type-build-components', expectedInput: expectedPath, actual: 'artifacts/build-result.json' }], requiredCheckKeys: ['private-type-build-components'] },
  paramsAndCut: { compilerPackages: packages.size, platformOptionalCompilerOmissions: optionalOmissions, noCppBuild: true },
});
const output = path.join(root, '.runtime/duckdb', `${id}.json`);
await writeFile(output, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: path.relative(root, output), inputs: inputs.size, compilerPackages: packages.size, status: 'PREPARED_NOT_BUILT' }));
