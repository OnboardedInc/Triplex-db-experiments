// [CX-VRQ01] Why: execute the builder's unchanged D-C1 assertion and require failure if its defect disappears.
// Rejected: it.fails/skip (would not prove the exact negative expectation stays active).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const mode = process.argv[2];
if (!['original', 'repair'].includes(mode)) throw new Error('original|repair required');
const base = 'lab/verify/RQ01';
const dir = path.join(base, `guard-${mode}`);
fs.mkdirSync(dir, { recursive: false });
const source = fs.readFileSync('packages/testkit/test/route-equivalence.test.ts', 'utf8');
const start = source.indexOf('  it("known-failing Q89a / R31 D-C1:');
const end = source.indexOf('  it("canonicalizes', start);
if (start < 0 || end < 0) throw new Error('D-C1 source boundaries changed');
let test = source.slice(start, end);
if (mode === 'repair') {
  if ((test.match(/instant: 1000,/g) ?? []).length !== 1) throw new Error('Unexpected D-C1 shape');
  test = test.replace('instant: 1000,', 'instant: 1002,');
}
const file = path.join(dir, 'case.probe.ts');
const contents = `import { expect, it } from "vitest";\nimport { runRouteEquivalence, routeRow, type RouteHistory } from "../../../../packages/testkit/src/route-equivalence.js";\nimport { makeOfflineRouteFixture } from "../../../../packages/testkit/src/offline-route-fixtures.js";\n${test}`;
fs.writeFileSync(file, contents);
const tools = '/Users/sam/projects/triplex-db-2/node_modules/vitest/vitest.mjs';
const command = ['node', tools, 'run', '--configLoader', 'runner', '--config', path.join(base, 'guard.config.mjs')];
const result = spawnSync(command[0], command.slice(1), { encoding: 'utf8', env: { ...process.env, VRQ01_GUARD: mode } });
fs.writeFileSync(path.join(dir, 'vitest.log'), `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ?? ''}`);
const expectedExit = mode === 'original' ? 0 : 1;
const exactAssertionFailed = mode !== 'repair' || `${result.stdout ?? ''}${result.stderr ?? ''}`.includes('expected 0 to be greater than 0');
const receipt = { mode, command, originalTestHash: createHash('sha256').update(source).digest('hex'), derivedProbeHash: createHash('sha256').update(contents).digest('hex'), transformation: mode === 'repair' ? 'Only extension instant 1000 -> 1002 (simulates decision stamp repair)' : 'Unchanged original D-C1 test body; imports point to reviewed local source', status: result.status, expectedExit, signal: result.signal, exactAssertionFailed, matchedExpectedExit: result.status === expectedExit && exactAssertionFailed };
fs.writeFileSync(path.join(dir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
process.exitCode = receipt.matchedExpectedExit ? 0 : 1;
