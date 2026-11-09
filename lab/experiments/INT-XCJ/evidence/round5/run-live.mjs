import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { LOCKS } from '../../../../bin/lib.mjs';

// [INT-XCJ] Why: observe shared-resident status and semaphore owners after heavy admission, immediately before the one J01 run.
// Rejected: dispatch-time-only observations (the wait can change concurrent load).
const root = process.cwd();
const output = path.join(root, 'lab/experiments/INT-XCJ/evidence/round5');
const status = spawnSync(process.execPath, ['lab/bin/engine.mjs', 'status', '--lane', 'xtdb', '--slot', 'dev'], { encoding: 'utf8' });
fs.writeFileSync(path.join(output, 'engine-at-live-start.log'), status.stdout + status.stderr);
const heavyDir = path.join(LOCKS, 'heavy');
const owners = fs.readdirSync(heavyDir).filter(f => /^\d+$/.test(f)).sort().flatMap(slot => {
  try { return [{ slot, ...JSON.parse(fs.readFileSync(path.join(heavyDir, slot, 'owner.json'), 'utf8')) }]; }
  catch (error) { return [{ slot, observationError: String(error) }]; }
});
fs.writeFileSync(path.join(output, 'heavy-at-live-start.json'), JSON.stringify({ at: new Date().toISOString(), owners }, null, 2) + '\n');
const env = { ...process.env, QLEVER_INTEGRATION: '0', XTDB_INTEGRATION: '1', XTDB_URL: 'postgres://xtdb:xtdb@127.0.0.1:5470/xtdb' };
delete env.TRIPLEX_COMMIT_ENCODING;
const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'test/commit-encoding.test.ts', '-t', 'XTDB compact commit guards against the engine', '--reporter=default', '--reporter=json', '--outputFile=' + path.join(output, 'J01-live.json')];
const started = new Date().toISOString();
const child = spawn(process.execPath, args, { cwd: path.join(root, 'packages/xtdb'), env, stdio: 'inherit' });
child.on('close', (code, signal) => {
  fs.writeFileSync(path.join(output, 'live-execution.json'), JSON.stringify({ started, ended: new Date().toISOString(), argv: [process.execPath, ...args], cwd: 'packages/xtdb', exit: code, signal, engineStatusExit: status.status, environment: { QLEVER_INTEGRATION: '0', XTDB_INTEGRATION: '1', XTDB_URL: env.XTDB_URL, TRIPLEX_COMMIT_ENCODING: null } }, null, 2) + '\n');
  process.exitCode = code ?? 1;
});
