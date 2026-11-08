// [EXP-K01-R2] Why: wait for pool capacity without occupying an expensive-job token. Rejected: holding a heavy token while lane D is resident (wastes shared measurement capacity).
import fs from 'node:fs';
import { spawnSync, spawn } from 'node:child_process';
for (;;) {
  const disk = fs.statfsSync(process.cwd());
  if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw new Error('host free disk below 5 GiB');
  const r = spawnSync(process.execPath, ['lab/bin/engine.mjs', 'status'], { encoding: 'utf8' });
  const used = /pool: ([\d.]+) GiB of ([\d.]+) GiB/.exec(r.stdout);
  if (used && Number(used[2]) - Number(used[1]) >= 3.5) break;
  process.stderr.write(`[K01-R2 ${new Date().toISOString()}] waiting for pool capacity; no heavy token held\n`);
  await new Promise(resolve => setTimeout(resolve, 30000));
}
// [EXP-K01-R2] Why: status only guides timing; engine.mjs makes the atomic reservation. Rejected: treating observed capacity as ownership (another job can win the slot).
const child = spawn(process.execPath, ['lab/bin/heavy.mjs', '--label', 'CX-K01-R2-live', '--', process.execPath, 'lab/experiments/EXP-K01-seed-clone/round2-live.mjs'], { stdio: 'inherit' });
child.on('exit', code => { process.exitCode = code ?? 1; });
