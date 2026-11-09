// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated dynamic parameters. Binding errors remain checked by lab/bin/checkjs.mjs.
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Bind the real package exports, native binaries and runtime dependency bytes.
// This prepares a command; only the CLI's completed attempt can report a result.
// Inspiration/rationale: qualification/devloop/README.md and portable-export-v1.
const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const id = process.argv[2];
if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new TypeError('Pass a new lower-case job id');
const mode=process.argv[3] ?? 'sdk';
if(!['sdk','interval','recursion','resources'].includes(mode))throw new TypeError('Choose sdk, interval, recursion or resources mode');
const entry=mode==='interval'?'temporal-entry':mode==='recursion'?'recursion-entry':mode==='resources'?'resource-entry':'sdk-entry';
const paths = new Map();
async function add(path, role) {
  const absolute = await fs.realpath(join(root, path));
  if (!absolute.startsWith(root + '/')) throw new Error('Input escaped bounded storage');
  const stat = await fs.stat(absolute);
  if (stat.isDirectory()) {
    for (const entry of await fs.readdir(absolute, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isFile()) throw new Error('Unexpected linked input: ' + entry.name);
      await add(relative(root, join(absolute, entry.name)), role);
    }
  } else {
    const key = relative(root, absolute);
    const sha256 = createHash('sha256').update(await fs.readFile(absolute)).digest('hex');
    paths.set(key, { path: key, role, sha256 });
  }
}
for (const name of ['core','sql','testkit','duckdb']) {
  await add(`packages/${name}/src`, 'source'); await add(`packages/${name}/dist`, 'build');
  await add(`packages/${name}/package.json`, 'dependency');
}
for (const path of ['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tools/bootstrap/with-env.sh','tools/bootstrap/check-storage.py','packages/duckdb/experiments/prepare-sdk-job.mjs',`packages/duckdb/experiments/${entry}.ts`]) await add(path, /(?:package\.json|\.yaml)$/.test(path) ? 'dependency' : 'runner');
await add(`packages/duckdb/experiments/${entry}.expected.json`, 'oracle');
await add('vendor/duckdb-temporal/runtime/native/src', 'source');
for (const path of ['artifact.json','temporal_datalog.duckdb_extension','temporal_control.node','owner_probe/artifact.json','owner_probe/temporal_owner_probe.duckdb_extension','owner_probe/temporal_writer.node']) await add(`vendor/duckdb-temporal/runtime/build/${path}`, 'build');
const require = createRequire(join(root, 'packages/duckdb/package.json'));
for (const packageName of ['effect','ulidx','@duckdb/node-api','@duckdb/node-bindings','@duckdb/node-bindings-darwin-arm64']) {
  const apiRequire = createRequire(require.resolve('@duckdb/node-api'));
  const resolver = packageName === 'ulidx' ? createRequire(join(root, 'packages/core/package.json'))
    : packageName === '@duckdb/node-bindings-darwin-arm64' ? createRequire(apiRequire.resolve('@duckdb/node-bindings'))
    : packageName === '@duckdb/node-bindings' ? apiRequire : require;
  let location = dirname(resolver.resolve(packageName === '@duckdb/node-bindings-darwin-arm64' ? packageName + '/duckdb.node' : packageName));
  while (JSON.parse(await fs.readFile(join(location, 'package.json'), 'utf8').catch(() => '{}')).name !== packageName) {
    const parent = dirname(location); if (parent === location) throw new Error('No owning dependency package: ' + packageName); location = parent;
  }
  await add(relative(root, await fs.realpath(location)), 'dependency');
}
const manifest = {
  format:'triplex-devloop-job/1', id, kind:'verification', queryPath:'duckdb-datalog', backend:'duckdb', author:'duckdb-public-bridge-owner',
  problemId:'duckdb-current-public-integration', logicalTaskId:mode==='interval'?'engine-boundary-point-interval-cut-reopen':mode==='recursion'?'focused-recursive-plans-domain-evidence-and-native-deadline':mode==='resources'?'leased-public-reader-functional-spill-cap-and-interrupt':'shared44-plus-int64-fractional-history-reopen',
  hypothesis:'The current public SDK bridge retains native C++ ownership and exact scalar/temporal carriers before and after reopening; no target-scale or all-ten-goal claim',
  goals:[1,2,3,4,5,6,7,8,9,10], dependsOn:['duckdb-core-build-v2','duckdb-owner-build-v1'],
  inspiration:[{reference:'packages/duckdb/SOURCE-ADAPTATION.json',mechanism:'Reuse the qualified native engine and public transaction protocol',adaptation:'Fresh current SDK exports, v2 lossless integer projection and explicit native-schema adoption boundary'}],
  command:{argv:[process.execPath,`packages/duckdb/experiments/${entry}.ts`],cwd:'.',env:{}},
  resources:{heavy:true,memoryBytes:2*1024**3,cpuUnits:2,diskBytes:256*1024**2,timeoutMilliseconds:600000,maximumLogBytes:8*1024**2},
  inputs:[...paths.values()].sort((a,b)=>a.path.localeCompare(b.path)),
  evidence:{checks:[{key:entry,expectedInput:`packages/duckdb/experiments/${entry}.expected.json`,actual:'artifacts/result.json'}],requiredCheckKeys:[entry]},
  retention:{scratch:'forensic-backend-state',meaning:'Retain fresh database/reopen state until reviewed; no automatic backend deletion'},
};
const output = join(root, '.runtime/duckdb', id + '.json');
await fs.writeFile(output, JSON.stringify(manifest,null,2)+'\n', { flag:'wx' });
console.log(JSON.stringify({output:relative(root,output),files:manifest.inputs.length,claim:'PREPARED_NOT_EXECUTED'}));
