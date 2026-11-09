// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members. Binding errors remain checked by lab/bin/checkjs.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { LOCKS } from '../../../../bin/lib.mjs';

// [INT-XCJ] Why: observe shared-resident status and semaphore owners after heavy admission, immediately before the one retry.
// Rejected: dispatch-time-only observations (the wait can change concurrent load).
const root = process.cwd();
const output = path.join(root, 'lab/experiments/INT-XCJ/evidence/round4');
const status = spawnSync(process.execPath, ['lab/bin/engine.mjs', 'status', '--lane', 'qlever', '--slot', 'dev'], { encoding: 'utf8' });
fs.writeFileSync(path.join(output, 'engine-at-live-start.log'), status.stdout + status.stderr);
const heavyDir = path.join(LOCKS, 'heavy');
const owners = fs.readdirSync(heavyDir).filter(f => /^\d+$/.test(f)).sort().flatMap(slot => {
  try { return [{ slot, ...JSON.parse(fs.readFileSync(path.join(heavyDir, slot, 'owner.json'), 'utf8')) }]; }
  catch (error) { return [{ slot, observationError: String(error) }]; }
});
fs.writeFileSync(path.join(output, 'heavy-at-live-start.json'), JSON.stringify({ at: new Date().toISOString(), owners }, null, 2) + '\n');
const env = { ...process.env, QLEVER_INTEGRATION: '1', XTDB_INTEGRATION: '0', QLEVER_URL: 'http://127.0.0.1:7070' };
delete env.TRIPLEX_COMMIT_ENCODING;
const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'test/c8-reads-never-write.test.ts', '-t', 'C8 on QLever', '--reporter=default', '--reporter=json', '--outputFile=' + path.join(output, 'QLever-C8-live.json')];
const started = new Date().toISOString();
const child = spawn(process.execPath, args, { cwd: path.join(root, 'packages/qualification'), env, stdio: 'inherit' });
child.on('close', (code, signal) => {
  fs.writeFileSync(path.join(output, 'live-execution.json'), JSON.stringify({ started, ended: new Date().toISOString(), argv: [process.execPath, ...args], cwd: 'packages/qualification', exit: code, signal, engineStatusExit: status.status, environment: { QLEVER_INTEGRATION: '1', XTDB_INTEGRATION: '0', QLEVER_URL: env.QLEVER_URL, TRIPLEX_COMMIT_ENCODING: null, C8_READERS: env.C8_READERS ?? null, C8_LOAD_MS: env.C8_LOAD_MS ?? null } }, null, 2) + '\n');
  process.exitCode = code ?? 1;
});
