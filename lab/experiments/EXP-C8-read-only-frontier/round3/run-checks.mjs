import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

// [EXP-C8-R3] Why: retain exact statuses for permitted light checks. Rejected: a summary without command output.
const output = 'lab/experiments/EXP-C8-read-only-frontier/round3';
const results = [];
const root = process.cwd();
const run = (name, args, env = {}, cwd = root) => {
  const started = new Date().toISOString();
  const result = spawnSync(process.execPath, args, { cwd, env: { ...process.env, XTDB_INTEGRATION: '0', QLEVER_INTEGRATION: '0', ...env }, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  writeFileSync(`${output}/${name}.log`, result.stdout + result.stderr);
  results.push({ name, args, env, cwd, started, finished: new Date().toISOString(), status: result.status, signal: result.signal });
  writeFileSync(`${output}/checks.json`, JSON.stringify(results, null, 2) + '\n');
  console.log(name, result.status, (result.stdout + result.stderr).slice(-1600));
};
for (const pkg of ['core', 'xtdb', 'qlever', 'qualification'])
  run(`typecheck-${pkg}`, ['node_modules/typescript/bin/tsc', '--noEmit', '-p', `packages/${pkg}/tsconfig.json`]);
run('lint', ['node_modules/oxlint/bin/oxlint', 'packages/core/src/native/FrontierClosure.ts', 'packages/qualification/src/engine-write-counter.ts', 'packages/qualification/src/native/support-paths.ts', 'packages/qualification/src/native/xtdb-workloads.ts', 'packages/qualification/src/native/qlever-workloads.ts', 'packages/qualification/test/c8-support-paths.test.ts', 'packages/qualification/test/engine-write-counter.test.ts', 'packages/xtdb/src/XtdbStorageAdapter.ts']);
run('qlever-light', ['node_modules/vitest/vitest.mjs', 'run', '--config', 'lab/verify/C8/vitest.config.ts', 'lab/verify/C8/light-live.test.ts'], { C8_LIGHT_LIVE: '1' });
run('counter-live', [`${root}/node_modules/vitest/vitest.mjs`, 'run', 'test/engine-write-counter.test.ts', '-t', 'queries count zero writes; one update counts one write'], { QLEVER_INTEGRATION: '1' }, `${root}/packages/qualification`);
run('c8-live', [`${root}/node_modules/vitest/vitest.mjs`, 'run', 'test/c8-reads-never-write.test.ts', '-t', 'C8 on QLever'], { QLEVER_INTEGRATION: '1', C8_LOAD_MS: '2000', C8_READERS: '1' }, `${root}/packages/qualification`);
process.exitCode = results.some(r => r.status !== 0) ? 1 : 0;
