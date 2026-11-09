import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
// [CX-VP5A] Why: finish short offline checks sequentially under one heavy grant, rechecking disk for each. Rejected: occupying several shared slots or running after a stale preflight.
const root = 'lab/verify/P5A';
fs.copyFileSync(root + '/evidence/adversarial-attempt.json', root + '/evidence/first-adversarial-attempt.json');
const jobs = [
  ['adversarial-final.tap', ['--experimental-strip-types', '--test', root + '/adversarial.test.ts']],
  ['g6-final.log', [root + '/run-rq01.mjs', 'd5cd32e6829100c0d9968ddb83713525e1510b3a']],
  ['k01-final.log', [root + '/compare-k01.mjs']],
];
const results = [];
for (const [file, args] of jobs) {
  const out = fs.openSync(root + '/evidence/' + file, 'wx');
  const child = spawn(process.execPath, [root + '/disk-guard.mjs', process.execPath, ...args], { stdio: ['ignore', out, out] });
  const code = await new Promise((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
  fs.closeSync(out);
  results.push({ file, args, code, sha256: createHash('sha256').update(fs.readFileSync(root + '/evidence/' + file)).digest('hex') });
  fs.writeFileSync(root + '/evidence/final-jobs.json', JSON.stringify({ results }, null, 2));
  if (code) { process.exitCode = code; break; }
}
process.stdout.write(JSON.stringify(results) + '\n');
