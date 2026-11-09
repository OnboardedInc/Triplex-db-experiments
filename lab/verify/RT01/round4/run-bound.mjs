// [CX-VRT01-R2] Why: fresh commands must bind exact source, build, runner and output bytes before a review result is adopted. Rejected: a previous attempt's successful exit.
import { spawnSync } from 'node:child_process';
import { readFileSync,writeFileSync,readdirSync,statSync } from 'node:fs';
import { createHash,randomUUID } from 'node:crypto';
const [dir,command,...args]=process.argv.slice(2),hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const files=spawnSync('git',['ls-files','-z','packages','pnpm-lock.yaml','scripts/check-packages.mjs'],{encoding:'utf8'}).stdout.split('\0').filter(Boolean);
const snapshot=()=>Object.fromEntries(files.map(p=>[p,hash(p)]));
if(process.env.BIND_BUILDS==='1')for(const pkg of readdirSync('packages')){const dir='packages/'+pkg+'/dist';if(statSync(dir,{throwIfNoEntry:false})?.isDirectory())for(const p of readdirSync(dir,{recursive:true}))if(statSync(dir+'/'+p).isFile())files.push(dir+'/'+p);}
const runners=args.filter(p=>/\.(ts|mjs|py)$/.test(p)&&statSync(p,{throwIfNoEntry:false})?.isFile());
const scripts=()=>Object.fromEntries(['lab/verify/RT01/round4/run-bound.mjs',...runners].map(p=>[p,hash(p)]));
const before=snapshot(),runnerBefore=scripts(),started=new Date().toISOString();
const result=spawnSync(command,args,{encoding:'utf8',timeout:900000,maxBuffer:32*1024**2,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',TSX_DISABLE_CACHE:'1'}});
writeFileSync(dir+'/stdout',result.stdout??'');writeFileSync(dir+'/stderr',result.stderr??'');
const after=snapshot(),runnerAfter=scripts();
const output={};for(const p of readdirSync(dir))if(p!=='execution.json'&&statSync(dir+'/'+p).isFile())output[p]=hash(dir+'/'+p);
const stable=JSON.stringify(before)===JSON.stringify(after)&&JSON.stringify(runnerBefore)===JSON.stringify(runnerAfter);
writeFileSync(dir+'/execution.json',JSON.stringify({attempt:randomUUID(),started,ended:new Date().toISOString(),head:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),product:'472c2c2439922b52e33206510b6cecb0812206ed',slot:'offline-no-engine',command,args,before,after,runnerBefore,runnerAfter,stable,exit:result.status,signal:result.signal,outputs:output},null,2)+'\n');
console.log(result.stdout);process.stderr.write(result.stderr??'');process.exitCode=stable?(result.status??1):1;
