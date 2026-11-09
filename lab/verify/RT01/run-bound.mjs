// [CX-VRT01] Why: fresh attempts carry the command, runner bytes, source, lock and oracle identity. Rejected: exit-only receipts or reusing a prior result.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash,randomUUID } from 'node:crypto';
const [dir,command,...args]=process.argv.slice(2);
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const files=spawnSync('git',['ls-files','-z','packages/core','packages/xtdb','packages/qlever','packages/testkit','pnpm-lock.yaml'],{encoding:'utf8'}).stdout.split('\0').filter(Boolean);
const source=()=>Object.fromEntries(files.map(p=>[p,sha(p)]));
const start=new Date().toISOString(),before=source(),runner=sha('lab/verify/RT01/probe.ts');
const r=spawnSync(command,args,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2});
writeFileSync(dir+'/stdout',r.stdout??'');writeFileSync(dir+'/stderr',r.stderr??'');
const after=source();
writeFileSync(dir+'/execution.json',JSON.stringify({attempt:randomUUID(),start,end:new Date().toISOString(),head:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),slot:'offline-transport-only',command,args,runnerSha256:runner,runnerAfter:sha('lab/verify/RT01/probe.ts'),before,after,exit:r.status,signal:r.signal},null,2)+'\n');
console.log(r.stdout);process.stderr.write(r.stderr??'');process.exitCode=r.status??1;
