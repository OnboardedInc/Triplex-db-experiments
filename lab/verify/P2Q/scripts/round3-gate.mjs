// [CX-VP2Q-3] Why: retain source-bound commands and first failures under the verifier tree.
// Rejected: a mutable last-run log (would erase failed adversarial cases).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const [name, ...command] = process.argv.slice(2);
const root = process.cwd();
const out = path.join(root, 'lab/verify/P2Q/evidence-round3');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const stat = fs.statfsSync(root);
if (stat.bavail * stat.bsize < 5 * 1024 ** 3) throw new Error('below 5 GiB free');
const files = git('ls-files', '--cached', '--others', '--exclude-standard', 'packages/core/src', 'packages/qlever/src', 'lab/experiments/EXP-P2Q-qlever-log-broker/bench', 'lab/verify/P2Q/tests', 'lab/verify/P2Q/scripts', 'lab/verify/P2Q/vitest.config.ts', 'vitest.workspace-aliases.ts', 'pnpm-lock.yaml').split('\n');
const preimages = files.map(file => ({ file, sha256: hash(fs.readFileSync(file)) }));
const record = { name, command, started: new Date().toISOString(), head: git('rev-parse', 'HEAD'), target: git('rev-parse', '957e3a3'), status: git('status', '--short'), node: process.version, freeBytes: stat.bavail * stat.bsize, environment: { V_P2Q_LIVE: process.env.V_P2Q_LIVE ?? null, V_P2Q_SEEDS: process.env.V_P2Q_SEEDS ?? null, QLEVER_URL: process.env.QLEVER_URL ?? null }, preimages };
const log = path.join(out, `${name}.log`);
const fd = fs.openSync(log, 'wx');
const exit = await new Promise(resolve => {
  const child = spawn(command[0], command.slice(1), { stdio: ['ignore', fd, fd], env: { ...process.env, V_P2Q_OUT: process.env.V_P2Q_OUT ?? out, V_P2Q_RUNS: path.join(root, 'lab/verify/P2Q/state-round3') } });
  child.on('close', (code, signal) => resolve({ code, signal }));
  child.on('error', error => resolve({ error: String(error), code: 127 }));
});
fs.closeSync(fd);
Object.assign(record, { finished: new Date().toISOString(), ...exit, logSha256: hash(fs.readFileSync(log)), sourceStillMatches: preimages.every(p => hash(fs.readFileSync(p.file)) === p.sha256) });
fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ name, ...exit, sourceStillMatches: record.sourceStillMatches }));
process.exitCode = exit.code ?? 1;
