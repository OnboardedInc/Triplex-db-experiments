// [EXP-K01-R2] Why: retain every diagnostic and cleanup result under one admitted heavy job. Rejected: ad-hoc commands with unrecorded first failures.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const evidence = 'lab/experiments/EXP-K01-seed-clone/evidence/round2';
const env = { ...process.env, TX2_CONFIG_DIR: root, XTDB_URL: 'postgres://xtdb:xtdb@127.0.0.1:5471/xtdb' };
const base = ['--lane', 'xtdb', '--slot', 's1', '--holder', 'CX-K01-R2', '--exp', 'EXP-K01'];
let n = 0;
const attemptTag = Date.now();
function run(label, args, { optional = false, extraEnv = {} } = {}) {
  const file = `${evidence}/${attemptTag}-${String(++n).padStart(2, '0')}-${label}`;
  process.stderr.write(`[K01-R2] ${label}\n`);
  const t = Date.now();
  const r = spawnSync(process.execPath, args, { env: { ...env, ...extraEnv }, encoding: 'utf8', maxBuffer: 256 << 20, timeout: 1800_000 });
  fs.writeFileSync(file + '.stdout', r.stdout ?? '');
  fs.writeFileSync(file + '.stderr', r.stderr ?? '');
  fs.writeFileSync(file + '.result.json', JSON.stringify({ args, exit: r.status, signal: r.signal, error: r.error?.message, elapsedS: (Date.now() - t) / 1000 }, null, 2) + '\n');
  if (r.status !== 0 && !optional) throw new Error(`${label} failed: ${r.stderr?.slice(-1000)}`);
  return r;
}
const engine = (label, cmd, args = [], options = {}) => run(label, ['lab/bin/engine.mjs', cmd, ...base, ...args], options);
const check = (label, cmd, args = []) => run(label, ['lab/bench/clone-check.ts', cmd, '--url', env.XTDB_URL, '--container', 'tx2-xtdb-s1', ...args]);
const seedDir = 'runs/xtdb-seed/k01-r2-golden';
try {
  for (;;) {
    const disk = fs.statfsSync(root);
    if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw new Error('host disk below 5 GiB floor');
    const admitted = engine('admission', 'up', ['--fresh'], { optional: true });
    if (admitted.status === 0) break;
    if (!admitted.stderr.includes('pool refuses')) throw new Error(admitted.stderr);
    process.stderr.write('[K01-R2] waiting 30 s for engine admission; residents untouched\n');
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
  engine('tools', 'toolcheck');
  // [EXP-K01-R2] Why: a no-flag s1-only config observes T2 without touching resident configuration. Rejected: editing shared config or recreating a dev resident.
  const noFlag = `${root}/runs/k01-r2-no-flag`;
  fs.mkdirSync(`${noFlag}/lab/config`, { recursive: true });
  const slots = JSON.parse(fs.readFileSync('lab/config/slots.json', 'utf8'));
  slots.slots.xtdb.s1.javaOpts = slots.slots.xtdb.s1.javaOpts.replace(' -Dlog4j2.shutdownHookEnabled=false', '');
  fs.writeFileSync(`${noFlag}/lab/config/slots.json`, JSON.stringify(slots, null, 2));
  fs.copyFileSync('xtdb-config.yaml', `${noFlag}/xtdb-config.yaml`);
  engine('T2-up', 'up', ['--fresh'], { extraEnv: { TX2_CONFIG_DIR: noFlag } });
  const t2 = engine('T2-stop', 'stop', [], { optional: true, extraEnv: { TX2_CONFIG_DIR: noFlag } });
  engine('T2-down', 'down', ['--remove-volume'], { extraEnv: { TX2_CONFIG_DIR: noFlag } });
  if (JSON.parse(t2.stdout).verdict.stoppedLine) {
    for (let k = 2; k <= 5; k++) {
      engine(`T2-${k}-up`, 'up', ['--fresh'], { extraEnv: { TX2_CONFIG_DIR: noFlag } });
      engine(`T2-${k}-stop`, 'stop', [], { extraEnv: { TX2_CONFIG_DIR: noFlag } });
      engine(`T2-${k}-down`, 'down', ['--remove-volume'], { extraEnv: { TX2_CONFIG_DIR: noFlag } });
    }
    for (let k = 1; k <= 5; k++) {
      engine(`T1-${k}-up`, 'up', ['--fresh']);
      engine(`T1-${k}-stop`, 'stop');
      engine(`T1-${k}-down`, 'down', ['--remove-volume']);
    }
  }
  engine('singlecut-up', 'up', ['--fresh']);
  run('singlecut-seed', ['lab/bench/xtdb-seed.ts', '--subjects', '500', '--composition', 'public', '--out', 'runs/xtdb-seed/k01-r2-singlecut']);
  engine('singlecut-probe', 'one-cut-probe', ['--manifest', 'runs/xtdb-seed/k01-r2-singlecut/manifest.json']);
  engine('singlecut-logs', 'logs', ['--tail', '5000']);
  engine('singlecut-stop', 'stop');
  engine('singlecut-down', 'down', ['--remove-volume']);
  engine('golden-up', 'up', ['--fresh']);
  run('seed', ['lab/bench/xtdb-seed.ts', '--subjects', '500', '--composition', 'public', '--out', seedDir]);
  check('before-cut-diagnostic', 'diagnostic');
  engine('golden', 'golden', ['--manifest', `${seedDir}/manifest.json`]);
  engine('reference-logs', 'logs', ['--tail', '5000']);
  engine('source-down', 'down', ['--remove-volume']);
  engine('clone', 'clone', ['--golden-record', `${seedDir}/golden.json`]);
  engine('clone-logs', 'logs', ['--tail', '5000']);
  engine('clone-stop', 'stop');
  engine('clone-listing', 'listing', ['--golden-record', `${seedDir}/golden.json`, '--out', `${evidence}/clone-listing.json`]);
} finally {
  engine('cleanup-source-clone', 'down', ['--remove-volume'], { optional: true });
  const record = `${seedDir}/golden.json`;
  if (fs.existsSync(record)) engine('cleanup-golden', 'golden-rm', ['--golden-record', record], { optional: true });
  else if (fs.existsSync(seedDir)) {
    for (const name of fs.readdirSync(seedDir).filter(n => n.startsWith('golden-attempt-'))) {
      const attempt = JSON.parse(fs.readFileSync(path.join(seedDir, name)));
      if (attempt.copy) engine('cleanup-unpublished-golden', 'golden-rm', ['--volume', attempt.volume], { optional: true });
    }
  }
  engine('cleanup-status', 'status', [], { optional: true });
}
