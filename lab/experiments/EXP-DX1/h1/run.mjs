import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
const composition = process.argv[2];
if (!['public', 'reach'].includes(composition)) throw Error('usage: run.sh public|reach [driver flags]');
const evidence = '/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H1';
const lock = '/Users/sam/Claude/Projects/triplex-db-2/locks/measure';
fs.mkdirSync(path.dirname(lock), { recursive: true });
while (true) {
  try { fs.mkdirSync(lock); break; }
  catch (e) { if (e.code !== 'EEXIST') throw e; }
  process.stderr.write('[DX-H1] waiting for measurement lock\n');
  await new Promise(r => setTimeout(r, 5000));
}
let child;
let held = true;
const release = () => { if (held) { held = false; fs.rmdirSync(lock); } };
process.on('exit', release);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { child?.kill(signal); });
try {
  const id = composition + '-' + Date.now();
  const destination = path.join(evidence, 'runs', id);
  fs.mkdirSync(destination, { recursive: true });
  fs.mkdirSync('runs', { recursive: true });
  const link = path.resolve('runs', 'DX-H1-' + id);
  fs.symlinkSync(destination, link, 'dir');
  const args = ['lab/bench/driver.ts', '--lane', 'datomic', '--composition', composition,
    '--profile', 'smoke', '--subjects', '400', '--level-s', '20', '--max-readers', '16',
    '--sweep-max', '400', '--history-sample', '50', '--reader-threads', '2',
    '--output', path.join(link, 'ns-report.json'), ...process.argv.slice(3)];
  const env = { ...process.env, DATOMIC_URL: process.env.DATOMIC_URL ?? 'http://127.0.0.1:8491',
    DATOMIC_READ_URLS: process.env.DATOMIC_READ_URLS ?? 'http://127.0.0.1:8492' };
  fs.writeFileSync(path.join(destination, 'command.json'), JSON.stringify({ args, endpoints: { DATOMIC_URL: env.DATOMIC_URL, DATOMIC_READ_URLS: env.DATOMIC_READ_URLS }, head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), startedAt: new Date().toISOString() }, null, 2));
  const log = fs.openSync(path.join(destination, 'console.log'), 'w');
  child = spawn(process.execPath, args, { env, stdio: ['ignore', log, log] });
  const timer = setTimeout(() => { child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 3000).unref(); }, 870_000);
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', (code) => resolve(code ?? 1)); });
  clearTimeout(timer);
  fs.closeSync(log);
  process.stderr.write('Evidence: ' + destination + '\n');
  process.exitCode = code;
} finally { release(); }
