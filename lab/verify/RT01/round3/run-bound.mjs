// [CX-VRT01-R2] Why: fresh commands must bind exact source, build, runner and output bytes before a review result is adopted. Rejected: a previous attempt's successful exit.
import { spawnSync } from 'node:child_process';
import { readFileSync,writeFileSync,readdirSync,statSync } from 'node:fs';
import { createHash,randomUUID } from 'node:crypto';
const [dir,command,...args]=process.argv.slice(2),hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const files=spawnSync('git',['ls-files','-z','packages/core','packages/testkit','packages/xtdb','packages/qlever','pnpm-lock.yaml'],{encoding:'utf8'}).stdout.split('\0').filter(Boolean);
const snapshot=()=>Object.fromEntries(files.map(p=>[p,hash(p)]));
const runners=args.filter(p=>/\.(ts|mjs|py)$/.test(p)&&statSync(p,{throwIfNoEntry:false})?.isFile());
const scripts=()=>Object.fromEntries(['lab/verify/RT01/round3/run-bound.mjs',...runners].map(p=>[p,hash(p)]));
const before=snapshot(),runnerBefore=scripts(),started=new Date().toISOString();
const result=spawnSync(command,args,{encoding:'utf8',timeout:300000,maxBuffer:32*1024**2,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',TSX_DISABLE_CACHE:'1'}});
writeFileSync(dir+'/stdout',result.stdout??'');writeFileSync(dir+'/stderr',result.stderr??'');
const after=snapshot(),runnerAfter=scripts();
const output={};for(const p of readdirSync(dir))if(p!=='execution.json'&&statSync(dir+'/'+p).isFile())output[p]=hash(dir+'/'+p);
const stable=JSON.stringify(before)===JSON.stringify(after)&&JSON.stringify(runnerBefore)===JSON.stringify(runnerAfter);
writeFileSync(dir+'/execution.json',JSON.stringify({attempt:randomUUID(),started,ended:new Date().toISOString(),head:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),product:'4b305bc8886d4bcdd73f36be65b53fda3e1846cd',slot:'offline-no-engine',command,args,before,after,runnerBefore,runnerAfter,stable,exit:result.status,signal:result.signal,outputs:output},null,2)+'\n');
console.log(result.stdout);process.stderr.write(result.stderr??'');process.exitCode=stable?(result.status??1):1;
