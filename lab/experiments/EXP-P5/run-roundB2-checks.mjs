// [EXP-P5B-R2] Why: retain exact fresh command outcomes after the resource-aborted B0. Rejected: adopting earlier smoke receipts for changed source.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
const out=process.argv[2];fs.mkdirSync(out,{recursive:false});
const all=spawnSync('git',['ls-files','lab/bench','packages/qlever/src','packages/qlever/test','packages/w0/src','packages/core/src','pnpm-lock.yaml','lab/acceptance/obligations.json'],{encoding:'utf8'});
if(all.status!==0)throw Error('source inventory failed');
const files=[...new Set([...all.stdout.trim().split('\n'),'lab/bench/lib/host-store.ts','lab/bench/lib/position-map.ts','lab/bench/p5-host-round2.ts','lab/bench/test/position-map.test.ts','lab/bench/test/host-map.test.ts','lab/experiments/EXP-P5/run-roundB2-checks.mjs'])];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const before=hashes();for(const f of files){const target=path.join(out,'source',f);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(f,target);}
const store='--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store',attempt=randomUUID(),stages=[];
const commands=[
 ['build',['pnpm',store,'--filter','@triplex-build/triplex-qlever','build']],
 ['bench-types',['pnpm',store,'exec','tsc','-p','lab/bench/tsconfig.json','--noEmit']],
 ['qlever-types',['pnpm',store,'--filter','@triplex-build/triplex-qlever','exec','tsc','--noEmit']],
 ['maps-and-harness',[process.execPath,'--experimental-strip-types','--test','lab/bench/test/position-map.test.ts','lab/bench/test/host-map.test.ts','lab/bench/test/p5.test.ts','lab/bench/test/p5-round2.test.ts','lab/bench/test/p5-freshness.test.ts','lab/bench/test/p5-deadline.test.ts']],
 ['sqlite-broker',['pnpm',store,'--filter','@triplex-build/triplex-qlever','exec','vitest','run','test/broker.test.ts','test/sqlite-broker.test.ts','test/p5-host-store.test.ts','--maxWorkers=1','--no-file-parallelism']],
];
for(const [name,[command,...args]] of commands){const free=fs.statfsSync(out);if(free.bavail*free.bsize<5*1024**3)throw Error('host free below 5 GiB');const start=performance.now(),startedAt=new Date().toISOString(),fd=fs.openSync(path.join(out,name+'.log'),'wx');const r=spawnSync(command,args,{stdio:['ignore',fd,fd]});fs.closeSync(fd);stages.push({name,command,args,exit:r.status,signal:r.signal,startedAt,finishedAt:new Date().toISOString(),wallMs:performance.now()-start,logSha256:createHash('sha256').update(fs.readFileSync(path.join(out,name+'.log'))).digest('hex')});console.log(JSON.stringify(stages.at(-1)));fs.writeFileSync(path.join(out,'stages.json'),JSON.stringify({attempt,classification:'DIAGNOSTIC',acceptance:false,stages},null,2)+'\n');}
const after=hashes();fs.writeFileSync(path.join(out,'source.json'),JSON.stringify({before,after,stable:JSON.stringify(before)===JSON.stringify(after)},null,2)+'\n');
