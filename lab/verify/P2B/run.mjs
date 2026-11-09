// [CX-VP2B] Why: bind fresh results to exact source, runner, native binary and reused public dependency bytes before and after execution. Rejected: an exit code detached from its inputs.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const req=createRequire(import.meta.url), root=process.cwd();
const out=path.join('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2B',`gates-${randomUUID()}`);
fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=args=>{const r=spawnSync('git',args,{encoding:'utf8'});if(r.status)throw Error(r.stderr);return r.stdout.trim();};
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.isFile()?[path.join(dir,e.name)]:[]);
const sources=[...walk('packages/broker/src'),...walk('packages/xtdb/src'),...walk('packages/qlever/src'),...walk('lab/verify/P2B').filter(p=>/\.(?:mjs|ts|cjs)$/.test(p)),'pnpm-lock.yaml'];
const native=req.resolve('better-sqlite3',{paths:[path.resolve('packages/broker')]});
const nativeDir=path.resolve(path.dirname(native),'..');
const deps=[...walk('packages/broker/node_modules/@triplex-build/triplex/dist'),...walk('packages/broker/node_modules/@triplex-build/triplex-testkit/dist'),...walk(path.join(nativeDir,'build/Release')).filter(p=>p.endsWith('.node'))];
const files=[...sources,...deps];
const snapshot=()=>Object.fromEntries(files.map(p=>[p,{sha256:sha(fs.readFileSync(p)),realpath:fs.realpathSync(p)}]));
const before=snapshot();
fs.writeFileSync(path.join(out,'before.json'),JSON.stringify({head:git(['rev-parse','HEAD']),sourceDiff:git(['diff','HEAD','--','packages','pnpm-lock.yaml']),node:process.version,execPath:process.execPath,inputs:before},null,2));
const allCommands=[
{cwd:'packages/broker',args:[path.resolve('node_modules/tsdown/dist/run.mjs')]},
{cwd:'.',args:['node_modules/vitest/vitest.mjs','run','--config','lab/verify/P2B/backends.config.mjs']},
{cwd:'.',args:['node_modules/vitest/vitest.mjs','run','--config','lab/verify/P2B/review.config.mjs']},
];
const commands=process.argv.includes('--probes-only') ? allCommands.slice(2) : allCommands;
const results=[];
for(const [i,c] of commands.entries()){
 const st=fs.statfsSync(root,{bigint:true});if(st.bavail*st.bsize<5n*1024n**3n)throw Error('Host disk below 5 GiB');
 const fd=fs.openSync(path.join(out,`command-${i}.log`),'wx');
 const result=spawnSync(process.execPath,c.args,{cwd:path.resolve(c.cwd),stdio:['ignore',fd,fd]});fs.closeSync(fd);
 results.push({...c,status:result.status,signal:result.signal,error:result.error?String(result.error):undefined});
 console.log(JSON.stringify({out,command:i,status:result.status}));
 if(result.status!==0)break;
}
const after=snapshot(),unchanged=JSON.stringify(before)===JSON.stringify(after);
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({out,results,unchanged,after},null,2)+'\n');
if(!unchanged||results.length!==commands.length||results.some(r=>r.status!==0))process.exitCode=1;
