// [EXP-K01-R2] Why: isolate the Log4j prediction after G3 blocks the seeded sequence. Rejected: calling cleanup's unobserved stop a certified result.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { POOL_FILE, readJson } from '../../bin/lib.mjs';
const base = ['--lane', 'xtdb', '--slot', 's1', '--holder', 'CX-K01-R2', '--exp', 'EXP-K01'];
function run(command, args = []) {
  const result = spawnSync(process.execPath, ['lab/bin/engine.mjs', command, ...base, ...args], { env: { ...process.env, TX2_CONFIG_DIR: process.cwd() }, encoding: 'utf8', timeout: 120000 });
  const stem = `lab/experiments/EXP-K01-seed-clone/evidence/round2/T1-${command}`;
  fs.writeFileSync(stem + '.stdout', result.stdout ?? '');
  fs.writeFileSync(stem + '.stderr', result.stderr ?? '');
  fs.writeFileSync(stem + '.result.json', JSON.stringify({ command, args, exit: result.status, signal: result.signal }, null, 2) + '\n');
  if (result.status !== 0) throw new Error(result.stderr);
}
const retained = readJson(POOL_FILE(), {}).retainedVolumes?.find(v => v.volume === 'tx2-xtdb-s1-data' && v.holder !== 'CX-K01-R2');
if (retained) throw new Error(`s1 retains ${retained.holder}'s source; owner cleanup is required before --fresh`);
let ownsSlot = false;
try { run('up', ['--fresh']); ownsSlot = true; run('stop'); run('logs', ['--tail', '5000']); }
finally { if (ownsSlot) run('down', ['--remove-volume']); run('status'); }
