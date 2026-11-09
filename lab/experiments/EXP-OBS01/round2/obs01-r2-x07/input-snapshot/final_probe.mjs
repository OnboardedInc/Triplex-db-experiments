// [EXP-OBS01] Why: one heavy admission covers startup, fresh collection, interoperability, and cleanup.
// Rejected: leaving a diagnostic engine running while waiting to admit its driver.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
const repo = path.resolve(import.meta.dirname, '../..');
const runId = 'obs01-xtdb-05';
const dir = path.join(repo, 'lab/experiments/EXP-OBS01/evidence', runId); fs.mkdirSync(dir, { recursive: true });
function call(command, args, label) {
  const r = spawnSync(command, args, { cwd: repo, encoding: 'utf8', env: { ...process.env, TX2_CONFIG_DIR: path.join(repo, 'runs/OBS01/diagnostic-config') } });
  fs.writeFileSync(path.join(dir, label + '.log'), (r.stdout ?? '') + (r.stderr ?? ''));
  if (r.status !== 0) throw new Error(`${label} failed: ${r.status}`);
}
call(process.execPath, ['lab/observer/gate.mjs'], 'gate');
call(process.execPath, ['lab/bin/engine.mjs', 'up', '--lane', 'xtdb', '--slot', 's1', '--holder', 'CX-OBS01', '--exp', 'EXP-OBS01', '--cpuset-cpus', '0', '--observation-sources'], 'engine-up');
try {
  call(process.execPath, ['lab/observer/run_xtdb_probe.mjs', runId, 'xtdb', 'runs/OBS01/final-evaluator.key'], 'probe');
  call('python3', ['-I', '-B', 'lab/observer/verify_retained.py', '/Users/sam/projects/triplex-db-2/runs/engines/observers/' + runId + '/retention.json', 'runs/OBS01/final-evaluator.key'], 'authenticate');
} finally {
  call(process.execPath, ['lab/bin/engine.mjs', 'down', '--lane', 'xtdb', '--slot', 's1', '--holder', 'CX-OBS01', '--note', 'EXP-OBS01 final fresh-key source-bound diagnostic; retain state'], 'engine-down');
}
console.log(JSON.stringify({ runId, evidence: dir }));
