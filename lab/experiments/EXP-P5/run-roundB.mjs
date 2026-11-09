// [EXP-P5B] Why: retain exact commands, raw logs, exit codes and attempt identities for the blocked B0.
// Rejected: terminal-only reports or promoting a historical test receipt to this source state.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
const output=process.argv[2];
if(!output)throw Error('usage: run-roundB.mjs <new durable output directory> (run through heavy.mjs)');
fs.mkdirSync(output,{recursive:false});
const stages=[],attempt=randomUUID();
const tracked=spawnSync('git',['ls-files','lab/bench','packages/qlever/src','packages/qlever/test','packages/w0/src','packages/core/src','pnpm-lock.yaml','lab/acceptance/obligations.json'],{encoding:'utf8'});
if(tracked.status!==0)throw Error('source inventory failed');
const paths=[...new Set([...tracked.stdout.trim().split('\n'),'lab/bench/p5-host-preflight.ts','packages/qlever/test/p5-host-store.test.ts','lab/experiments/EXP-P5/run-roundB.mjs'])];
const inventory=()=>Object.fromEntries(paths.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const before=inventory();
for(const f of paths){const target=path.join(output,'source',f);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(f,target);}
fs.writeFileSync(path.join(output,'source-before.json'),JSON.stringify(before,null,2)+'\n');

const store='--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store';
const commands=[
 ['harness-dependencies',['pnpm',store,'exec','turbo','run','build','--filter=@triplex-build/triplex-xtdb...','--filter=@triplex-build/triplex-qualification...']],
 ['qlever-build',['pnpm',store,'--filter','@triplex-build/triplex-qlever','build']],
 ['qlever-types',['pnpm',store,'--filter','@triplex-build/triplex-qlever','exec','tsc','--noEmit']],
 ['store-tests',['pnpm',store,'--filter','@triplex-build/triplex-qlever','exec','vitest','run','test/p5-host-store.test.ts','test/sqlite-broker.test.ts','--maxWorkers=1','--no-file-parallelism']],
 ['harness-types',['pnpm',store,'exec','tsc','-p','lab/bench/tsconfig.json','--noEmit']],
 ['merged-harness-tests',[process.execPath,'--experimental-strip-types','--test','lab/bench/test/bench.test.ts','lab/bench/test/p5.test.ts','lab/bench/test/p5-g0-guards.test.ts','lab/bench/test/p5-freshness.test.ts','lab/bench/test/p5-deadline.test.ts']],
 ['preflight',[process.execPath,'--experimental-strip-types','lab/bench/p5-host-preflight.ts',path.join(output,'preflight')]],
];
for(const [name,[command,...args]] of commands){
 const st=fs.statfsSync(output);if(st.bavail*st.bsize<5*1024**3)throw Error('host free below 5 GiB');
 const startedAt=new Date().toISOString(),start=performance.now(),fd=fs.openSync(path.join(output,name+'.log'),'wx');
 const result=spawnSync(command,args,{stdio:['ignore',fd,fd]});fs.closeSync(fd);
 stages.push({name,command,args,startedAt,finishedAt:new Date().toISOString(),wallMs:performance.now()-start,exit:result.status,signal:result.signal,error:result.error?String(result.error):null,logSha256:createHash('sha256').update(fs.readFileSync(path.join(output,name+'.log'))).digest('hex')});
 fs.writeFileSync(path.join(output,'stages.json'),JSON.stringify({attempt,classification:'DIAGNOSTIC',acceptance:false,stages},null,2)+'\n');
 console.log(JSON.stringify(stages.at(-1)));
}

const after=inventory();
fs.writeFileSync(path.join(output,'source-after.json'),JSON.stringify(after,null,2)+'\n');
fs.writeFileSync(path.join(output,'source-stability.json'),JSON.stringify({stable:JSON.stringify(before)===JSON.stringify(after)},null,2)+'\n');
