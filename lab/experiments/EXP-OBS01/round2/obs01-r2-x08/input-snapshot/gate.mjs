// [EXP-OBS01] Why: run interoperability against the exact consumer, without merging its branch.
// Rejected: treating a copy of the oracle rewritten by the collector as an independent check.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
const repo = path.resolve(import.meta.dirname, '../..');
const oracle = path.join(repo, 'runs/OBS01/oracle'); fs.mkdirSync(oracle, { recursive: true });
for (const name of ['observe.py', 'gates.py', 'gates_round2.py']) {
  const bytes = execFileSync('git', ['show', `463703d:lab/acceptance/oracle/${name}`], { cwd: repo });
  fs.writeFileSync(path.join(oracle, name), bytes);
}
for (const [command, args] of [['python3', ['-I', '-B', 'lab/observer/test_collector.py']], [process.execPath, ['--test', 'lab/observer/test_engine.mjs']]]) {
  const result = spawnSync(command, args, { cwd: repo, stdio: 'inherit', env: { ...process.env, TX2_ENGINE_DIR: path.join(repo, 'runs/OBS01/test-engines') } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
