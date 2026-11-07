import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..');
const artifacts = process.env.TRIPLEX_RUN_ARTIFACTS;
assert(artifacts, 'Use canonical admission');
const steps = [];
const run = (name, command, argv) => {
  const result = spawnSync(command, argv, { cwd: root, env: process.env, encoding: 'utf8', maxBuffer: 8 * 1024 ** 2 });
  writeFileSync(path.join(artifacts, `${name}.stdout`), result.stdout ?? '');
  writeFileSync(path.join(artifacts, `${name}.stderr`), result.stderr ?? '');
  assert.equal(result.status, 0, `${name} failed; exact stdout/stderr retained`);
  steps.push(name);
};
run('typecheck', 'tools/bootstrap/pnpm', ['--filter', '@triplex-build/triplex-duckdb', 'typecheck']);
run('build', 'tools/bootstrap/pnpm', ['--filter', '@triplex-build/triplex-duckdb', 'build']);
run('current-13-component-checks', process.execPath, ['packages/duckdb/experiments/withdrawal-unit-checks.mjs']);
const outputs = [];
const visit = directory => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    assert(entry.isFile() || entry.isDirectory(), 'Unexpected linked build output');
    if (entry.isDirectory()) visit(file);
    else outputs.push({ path: path.relative(root, file), bytes: statSync(file).size,
      sha256: createHash('sha256').update(readFileSync(file)).digest('hex') });
  }
};
visit(path.join(root, 'packages/duckdb/dist'));
writeFileSync(path.join(artifacts, 'build-inventory.json'), JSON.stringify(outputs, null, 2) + '\n');
writeFileSync(path.join(artifacts, 'build-result.json'), JSON.stringify({
  format: 'triplex-duckdb-withdrawal-build-checks/1', status: 'PASS', steps, cppRecompiled: false,
}, null, 2) + '\n');
