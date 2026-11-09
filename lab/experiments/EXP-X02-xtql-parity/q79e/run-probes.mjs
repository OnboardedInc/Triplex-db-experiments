// [EXP-X02-Q79e] Why: rerun previous reviewer inputs against the grammar classifier. Rejected: adopting historical results.
// [EXP-X02-R3] Why: retain each reviewer probe's actual exit and output.
// Rejected: treating a wrapper's zero exit as semantic acceptance.
import { spawnSync } from 'node:child_process';
import { openSync, closeSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const dir = import.meta.dirname;
const outcomes = [];
for (const [tool, output] of [
  ['grammar-live', 'grammar-live'],
  ['subquery-regression', 'subquery-regression'],
  ['delta-live', 'delta-live'],
  ['offline-source', 'offline-source'],
  ['probe-source', 'source-hazards'],
  ['probe-sums', 'source-sums'],
  ['delta-offline', 'delta-offline'],
  ['delta-sums', 'delta-sums'],
]) {
  const fd = openSync(path.join(dir, tool + '.log'), 'wx');
  const result = spawnSync(process.execPath, ['--import', 'tsx', path.join(dir, tool + '.ts'), path.join(dir, output + '.json')], {stdio: ['ignore', fd, fd], env: {...process.env, DOCKER_HOST: 'unix:///Users/sam/.colima/triplex2/docker.sock'}});
  closeSync(fd);
  outcomes.push({tool, output: output + '.json', status: result.status, signal: result.signal, error: result.error?.message});
  console.log(tool, result.status, result.signal);
}
writeFileSync(path.join(dir, 'exec-outcomes.json'), JSON.stringify(outcomes, null, 2) + '\n', {flag: 'wx'});
if (outcomes.some(o => o.status !== 0)) process.exitCode = 1;
