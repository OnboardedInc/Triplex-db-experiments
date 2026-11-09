// @ts-nocheck -- [EXP-CHECKJS] runtime-built or optional package modules absent from this standalone project; runtime-populated records, optional option bags, or branch-specific union members; runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Generate only an isolated TS adapter package with the ordinary Q build tools.
 * Inspiration: the reviewed ordinary Core generation and isolated A build's
 * before/after input checks. This adapts no engine, live export, source or loader.
 */
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  ROOT, owned, files, pin, exclusiveJson, verifyAdmission, verifyPins, readJson,
} from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { verifyDependencyLock } from '../../../.artifacts/read-basis-core-build-v1/compiler-inputs.mjs';

const argument = name => process.argv[process.argv.indexOf(name) + 1];
const contract = await readJson(await owned(ROOT, argument('--contract')));
assert.equal(contract.mode, 'ISOLATED_ORDINARY_QLEVER_SDK_WRAPPER_BUILD');
const admission = await verifyAdmission(ROOT, { backend: 'qlever', jobId: contract.jobId });
assert.deepEqual(admission.job.manifest.requiredOwners, []);
const lock = await readJson(await owned(ROOT, contract.dependencies.path));
await verifyDependencyLock(ROOT, lock); await verifyPins(ROOT, contract.guards);
const destination = await owned(ROOT,
  `packages/qlever/.artifacts/wrapper-repair-sdk-v1/${contract.jobId}-${admission.grant.attemptId}`,
  { missing: true });
const save = (name, value) => exclusiveJson(ROOT, path.join(admission.artifacts, name), value);
const outcome = { format: 'triplex-isolated-qlever-sdk-build/1', status: 'PREPARING',
  packageRoot: path.relative(ROOT, destination), phases: [], engineCalls: 0,
  ordinaryPackageCommands: true, liveSourceOrDistWrites: false, loaderInstalled: false,
  scope: 'OWNED_PACKAGE_GENERATION_AND_PUBLIC_DTS_ONLY_NOT_RUNTIME_OR_NATIVE_ACCEPTANCE' };
let failure;
try {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.mkdir(destination); // Never overwrite a former attempt or its output.
  const copies = [];
  for (const entry of contract.sourceFiles) {
    const relative = path.relative(path.join(ROOT, 'packages/qlever'), path.join(ROOT, entry.path));
    assert(relative.startsWith('src/') || ['package.json', 'tsdown.config.ts', 'tsconfig.json'].includes(relative));
    const target = path.join(destination, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    let bytes = await fs.readFile(await owned(ROOT, entry.path));
    if (relative === 'src/compiler.ts') bytes = await fs.readFile(await owned(ROOT, contract.candidateCompiler.path));
    if (relative === 'tsconfig.json') {
      const config = JSON.parse(bytes); assert.equal(config.extends, '../../tsconfig.node.json');
      config.extends = path.join(ROOT, 'tsconfig.node.json');
      bytes = Buffer.from(JSON.stringify(config, null, 2) + '\n');
    }
    await fs.writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
    assert.notEqual((await fs.stat(target)).ino, (await fs.stat(path.join(ROOT, entry.path))).ino);
    copies.push({ original: entry, copy: await pin(ROOT, target),
      adaptation: relative === 'src/compiler.ts' ? 'EXACT_REVIEWED_WRAPPER_BRANCH'
        : relative === 'tsconfig.json' ? 'ABSOLUTE_SAME_OWNED_EXTENDS_TARGET' : 'EXACT_INDEPENDENT_COPY' });
  }
  await fs.writeFile(path.join(destination, 'public.types.ts'),
    await fs.readFile(await owned(ROOT, contract.publicWitness.path)), { flag: 'wx', mode: 0o600 });
  const witnessConfig = { extends: path.join(ROOT, 'tsconfig.node.json'),
    compilerOptions: { noEmit: true }, files: ['./public.types.ts'], include: [] };
  await fs.writeFile(path.join(destination, 'public.types.tsconfig.json'),
    JSON.stringify(witnessConfig, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await save('actual-source-copies-before-build.json', { copies, dependencies: contract.dependencies,
    sourcePatch: contract.sourcePatch, witnessConfig, node: process.version });
  const command = async (label, cli, args, milliseconds) => {
    const argv = ['--max-old-space-size=768', await owned(ROOT, cli), ...args];
    const environment = { ...process.env, NODE_OPTIONS: '--max-old-space-size=768',
      CI: '1', NO_UPDATE_NOTIFIER: '1', RAYON_NUM_THREADS: '2' };
    // Build processes have no engine endpoint or credential handle to consume.
    delete environment.QLEVER_URL; delete environment.QLEVER_ACCESS_TOKEN_FILE;
    await save(label + '-inputs.json', { argv, cwd: path.relative(ROOT, destination),
      nodeOptions: environment.NODE_OPTIONS, inputDigest: lock.dependencySha256,
      engineCredentialsRemoved: true });
    const result = spawnSync(process.execPath, argv, { cwd: destination, env: environment,
      encoding: 'utf8', timeout: milliseconds, maxBuffer: 4 * 1024 ** 2 });
    for (const channel of ['stdout', 'stderr']) await fs.writeFile(path.join(admission.artifacts, label + '.' + channel),
      result[channel] ?? '', { flag: 'wx', mode: 0o600 });
    const observed = { label, status: result.status, signal: result.signal,
      errorCode: result.error?.code ?? null };
    outcome.phases.push(observed); await save(label + '-outcome.json', observed);
    assert.equal(result.status, 0, label + '_FAILED'); assert.equal(result.signal, null);
  };
  await command('ordinary-tsdown', contract.tsdownCli, [], 120000);
  await command('ordinary-declarations', contract.typescriptCli,
    ['--declaration', '--emitDeclarationOnly', '--rootDir', 'src', '--outDir', 'dist'], 120000);
  await command('actual-public-declaration-witness', contract.typescriptCli,
    ['--project', 'public.types.tsconfig.json'], 30000);

  // Parse/print only to remove non-executable comments/format differences. It is
  // not a proof of arbitrary JS equivalence; the changed compiler needs review.
  const ts = (await import(pathToFileURL(await owned(ROOT, contract.typescriptModule)).href)).default;
  const normalized = (text, name) => ts.createPrinter({ removeComments: true }).printFile(
    ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true,
      name.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS));
  const generated = await files(ROOT, path.join(destination, 'dist'));
  const relative = file => path.relative(path.join(destination, 'dist'), file);
  const baseline = new Map(contract.baselineDist.map(entry =>
    [path.relative('packages/qlever/dist', entry.path), entry]));
  assert.deepEqual(generated.map(relative).sort(), [...baseline.keys()].sort(), 'PUBLIC_ARTIFACT_MEMBERSHIP_CHANGED');
  const comparisons = [];
  for (const file of generated.filter(file => file.endsWith('.js') || file.endsWith('.d.ts'))) {
    const name = relative(file), before = await fs.readFile(await owned(ROOT, baseline.get(name).path), 'utf8');
    const after = await fs.readFile(file, 'utf8'), equal = normalized(before, name) === normalized(after, name);
    comparisons.push({ name, equal, before: baseline.get(name), after: await pin(ROOT, file) });
    assert(equal || name === 'compiler.js', 'UNRELATED_PUBLIC_EXECUTABLE_OR_DECLARATION_CHANGE');
  }
  assert.equal(comparisons.filter(entry => !entry.equal).length, 1, 'EXPECTED_ONE_COMPILER_LOGIC_CHANGE');
  assert.equal(comparisons.find(entry => !entry.equal)?.name, 'compiler.js');
  const currentPackage = await readJson(path.join(destination, 'package.json'));
  assert.deepEqual(currentPackage.exports, contract.publicExports);
  const resolveScript = `process.stdout.write(import.meta.resolve('@triplex-build/triplex-qlever',process.argv[1]))`;
  const resolution = spawnSync(process.execPath,
    ['--experimental-import-meta-resolve', '--input-type=module', '-e', resolveScript,
      pathToFileURL(path.join(destination, 'public.types.ts')).href],
    { cwd: destination, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=256' }, encoding: 'utf8', timeout: 10000, maxBuffer: 65536 });
  assert.equal(resolution.status, 0); assert.equal(resolution.stdout,
    pathToFileURL(path.join(destination, 'dist/index.js')).href, 'PUBLIC_SELF_REFERENCE_OUTSIDE_PRIVATE_ARTIFACT');
  outcome.publicFacadeResolution = { url: resolution.stdout, modulesImported: 0,
    meaning: 'Pinned Node import-condition resolution only; no SDK evaluation' };
  outcome.sourceCopies = copies; outcome.comparisons = comparisons;
  outcome.generated = await Promise.all(generated.map(file => pin(ROOT, file)));
  for (const file of [...await files(ROOT, path.join(destination, 'src')), ...generated,
    ...['package.json', 'tsconfig.json', 'tsdown.config.ts', 'public.types.ts', 'public.types.tsconfig.json']
      .map(name => path.join(destination, name))]) await fs.chmod(file, 0o444);
  outcome.status = 'GENERATED_PRIVATE_PUBLIC_ARTIFACT_ONLY';
} catch (error) {
  failure = error; outcome.status = 'FAILED_OR_PARTIAL_NO_RUNTIME_ACCEPTANCE';
  outcome.error = { class: error?.name ?? 'Error', code: error?.code ?? null };
} finally {
  await verifyDependencyLock(ROOT, lock); await verifyPins(ROOT, contract.guards);
  await save('build.json', outcome);
}
if (failure) throw failure;
await save('checks.json', { status: 'PASS_PRIVATE_SDK_GENERATION_ONLY', engineCalls: 0,
  ordinaryPackageCommands: true, publicDeclarationWitness: true,
  liveSourceOrDistWrites: false, onlyCompilerExecutableChanged: true, sourcePatchApplied: true });
