// [EXP-OBS01] Why: admit the entire probe before starting collection, avoiding idle budget exhaustion.
// Rejected: starting an observer while its heavy driver is still queued.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const repo = path.resolve(import.meta.dirname, '../..');
const runId = process.argv[2];
const lane = process.argv[3] ?? 'xtdb';
if (!['xtdb', 'qlever'].includes(lane)) throw new Error('unsupported probe lane');
if (!runId || !/^[a-z0-9-]+$/.test(runId)) throw new Error('run id required');
const evidence = path.join(repo, 'lab/experiments/EXP-OBS01/evidence', runId); fs.mkdirSync(evidence, { recursive: true });
function engine(args, label, allowFail = false) {
  const r = spawnSync(process.execPath, ['lab/bin/engine.mjs', ...args], { cwd: repo, encoding: 'utf8' });
  fs.writeFileSync(path.join(evidence, label + '.log'), (r.stdout ?? '') + (r.stderr ?? ''));
  if (!allowFail && r.status !== 0) throw new Error(`${label}: ${r.status}`);
  return r;
}
const slot = ['--lane', lane, '--slot', 's1', '--holder', 'CX-OBS01'];
engine(['observer-up', ...slot, '--image', 'python@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90', '--observer-cpus', '5', '--run-id', runId, '--receipt-id', runId, '--key-id', runId + '-key', '--key-file', process.argv[4] ? path.resolve(process.argv[4]) : path.join(repo, 'runs/OBS01/diagnostic.key')], 'up');
try {
  const probe = spawnSync('python3', ['-I', '-B', `lab/observer/probe_${lane}.py`, evidence], { cwd: repo, encoding: 'utf8' });
  fs.writeFileSync(path.join(evidence, 'driver.log'), (probe.stdout ?? '') + (probe.stderr ?? ''));
  if (probe.status !== 0) throw new Error('probe failed');
  await new Promise(resolve => setTimeout(resolve, 2000));
} finally {
  engine(['observer-down', ...slot], 'down');
}
engine(['observer-retain', '--run-id', runId, '--holder', 'CX-OBS01'], 'retain');
console.log(JSON.stringify({ runId, evidence }));
