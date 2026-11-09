// [CX-VW02] Why: retain the clean-worktree unit failure, then rerun after setup with a new receipt.
// Rejected: overwriting the first attempt or repairing the submitted tests during review.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../../..'), out = path.join(import.meta.dirname, 'evidence');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const captured = JSON.parse(fs.readFileSync(path.join(out, 'receipt.json')));
const sourcesBefore = captured.sources;
const checkSources = () => { for (const [file, hash] of Object.entries(sourcesBefore)) assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, file); };
checkSources();
const commands = [
 ['unit-after-setup', ['node', '--experimental-strip-types', '--test', 'lab/bin/test/lab.test.mjs', 'lab/scenarios/lib/runner.test.mjs', 'lab/scenarios/v2/offline.test.ts', 'lab/scenarios/v2/claims.test.ts', 'lab/scenarios/v2/lanes.test.ts', 'lab/scenarios/v2/faults.test.ts']],
 ['live-types-explicit', ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '--module', 'NodeNext', '--target', 'ES2022', '--allowImportingTsExtensions', '--skipLibCheck', '--types', 'node', 'lab/scenarios/v2/run.ts', 'lab/scenarios/v2/admission.test.ts']],
];
const receipt = { startedAt: new Date().toISOString(), reason: 'first unit run lacked runs/; admission and baseline commands created it; rerun unchanged tests without hiding first failure', commands: [], builderAudit: {} };
for (const [name, argv] of commands) {
 const r = spawnSync(argv[0], argv.slice(1), { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
 for (const stream of ['stdout', 'stderr']) fs.writeFileSync(path.join(out, name + '.' + stream + '.txt'), r[stream] ?? '');
 receipt.commands.push({ name, argv, exit: r.status, signal: r.signal, stdoutSha256: sha(r.stdout ?? ''), stderrSha256: sha(r.stderr ?? '') });
 assert.equal(r.status, 0, name + ': ' + r.stderr);
 if (name === 'unit-after-setup') { assert.match(r.stdout, /# tests 48\n/); assert.match(r.stdout, /# pass 48\n/); assert.match(r.stdout, /# fail 0\n/); assert.match(r.stdout, /# skipped 0\n/); }
}
const builderDir = path.join(root, 'lab/experiments/EXP-W02/evidence/offline-2026-11-09T02-45-07-138Z-8af252');
const builder = JSON.parse(fs.readFileSync(path.join(builderDir, 'receipt.json')));
const mismatchedSources = Object.entries(builder.sources).filter(([file, h]) => sha(fs.readFileSync(path.join(root, file))) !== h).map(([f]) => f);
assert.deepEqual(mismatchedSources, []);
const logs = [];
for (const command of builder.commands) for (const stream of ['stdout', 'stderr']) {
 const file = command.name + '.' + stream + '.txt';
 assert.equal(sha(fs.readFileSync(path.join(builderDir, file))), command[stream + 'Sha256'], file); logs.push(file);
}
receipt.builderAudit = { receiptSha256: sha(fs.readFileSync(path.join(builderDir, 'receipt.json'))), sourcesMatched: Object.keys(builder.sources).length, rawLogsMatched: logs.length, commands: builder.commands.map(c => ({ name: c.name, exitCode: c.exitCode, contentChecked: c.contentChecked })), sourceUnchangedClaim: builder.sourceUnchanged, buildsUnchangedClaim: builder.buildsUnchanged, limitation: 'historical build hashes are not reproducible-build proof; independent current builds and types ran separately' };
checkSources(); receipt.sourceUnchanged = true; receipt.endedAt = new Date().toISOString();
fs.writeFileSync(path.join(out, 'followup-receipt.json'), JSON.stringify(receipt, null, 1) + '\n');
console.log(JSON.stringify(receipt));
