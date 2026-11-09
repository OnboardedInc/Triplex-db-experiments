// [CX-VRT01] Why: retain fresh command exits and exact source bindings. Rejected: adopting the builder's historical green logs.
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = process.cwd();
const output = 'lab/verify/RT01/round3/packages';
const paths = spawnSync('git', ['ls-files', '-z', 'packages/core', 'packages/testkit', 'packages/xtdb', 'packages/qlever', 'pnpm-lock.yaml'], {encoding:'utf8'}).stdout.split('\0').filter(Boolean);
const hashes = () => Object.fromEntries(paths.map(p => [p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const before = hashes();
const results = [];
for (const pkg of ['core','testkit','xtdb','qlever']) {
  for (const [phase, cmd, args] of [ ['build','tsdown',[]], ['types','tsc',['--noEmit']], ['tests','vitest',['run','--maxWorkers=1','--no-file-parallelism']], ...(pkg === 'core' ? [['runtime-types','tsc',['--noEmit','-p','test/runtime/tsconfig.json']],['entity-types','tsc',['--noEmit','-p','test/entity/tsconfig.json']]] : []) ]) {
    const start = new Date().toISOString();
    const r = spawnSync(`${root}/node_modules/.bin/${cmd}`, args, {cwd:`${root}/packages/${pkg}`, encoding:'utf8', timeout:180000, maxBuffer:16*1024**2});
    const file = `${pkg}-${phase}.txt`;
    writeFileSync(`${output}/${file}`,`${r.stdout??''}${r.stderr??''}`);
    results.push({pkg,phase,start,end:new Date().toISOString(),status:r.status,signal:r.signal,file});
    console.log(pkg,phase,r.status);
    if (r.status !== 0) break;
  }
}
writeFileSync(`${output}/phases.json`, JSON.stringify({before,after:hashes(),results}, null, 2)+'\n');
process.exitCode = results.some(r => r.status !== 0) || JSON.stringify(before) !== JSON.stringify(hashes()) ? 1 : 0;
