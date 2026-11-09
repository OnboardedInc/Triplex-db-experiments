// [CX-VQNODELAY-R3] Why: run exact candidate guards in isolated source copies, including newly authored ordinary timing writers.
// Rejected: editing the ledger or candidate to make probes pass, or treating pattern matching as exhaustive dataflow analysis.
import fs from 'node:fs';
import path from 'node:path';
import { createHash,randomUUID } from 'node:crypto';
import { execFileSync,spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const head='b7aec0f7297015a15afe72eda027590773b0827d';
const own='lab/verify/QNODELAY/round3';
const durable='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round3';
const scratch=path.join(durable,'source-attempt2');
if(fs.existsSync(scratch))throw Error('new source attempt required');
const sha=x=>createHash('sha256').update(x).digest('hex');
const report={id:randomUUID(),startedAt:new Date().toISOString(),classification:'INDEPENDENT OFFLINE COVERAGE QA; no engine runs',builder:head,reviewHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,scratch,files:[],commands:[],mutations:[]};
const names=execFileSync('git',['ls-tree','-r','--name-only',head],{encoding:'utf8'}).trim().split('\n').filter(p=>
  ((p.startsWith('lab/')||p.startsWith('packages/'))&&((/\.(?:[cm]?[jt]s|tsx|jsx|py|sh)$/.test(p) || p.endsWith('/package.json') || ['lab/receipts/source-inventory.json','lab/receipts/tsconfig.json'].includes(p)))) || /^tsconfig.*\.json$/.test(p) || ['package.json','pnpm-workspace.yaml','pnpm-lock.yaml'].includes(p));
for(const p of names){
  const bytes=execFileSync('git',['show',`${head}:${p}`],{maxBuffer:8e6});
  const dest=path.join(scratch,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes,{flag:'wx'});
  report.files.push({path:p,sha256:sha(bytes),bytes:bytes.length});
}
fs.symlinkSync('/Users/sam/projects/triplex-db-2/node_modules',path.join(scratch,'node_modules'),'dir');
const run=(label,args)=>{
  const r=spawnSync(process.execPath,args,{cwd:scratch,encoding:'utf8',maxBuffer:8e6,timeout:120000,env:{...process.env,TRIPLEX_QLEVER_CONNECTION_MODE:'per-request'}});
  const stdout=path.join(own,`${label}.stdout.log`),stderr=path.join(own,`${label}.stderr.log`);
  fs.writeFileSync(stdout,r.stdout??'',{flag:'wx'});fs.writeFileSync(stderr,r.stderr??'',{flag:'wx'});
  const entry={label,args,status:r.status,signal:r.signal,error:r.error?.message,stdout,stderr};report.commands.push(entry);return{...entry,text:(r.stdout??'')+'\n'+(r.stderr??'')};
};
const unit=run('coverage-tests',['--test','lab/receipts/coverage.test.mjs']);assert.equal(unit.status,0,unit.text);
const baseline=run('baseline',['lab/receipts/check-writers.mjs']);assert.equal(baseline.status,0,baseline.text);
const decl=run('declarations',['node_modules/typescript/bin/tsc','--noEmit','-p','lab/receipts/tsconfig.json']);assert.equal(decl.status,0,decl.text);
const probes=[
  {name:'js-elapsed-positive',file:'lab/new-qlever-writer.mjs',code:'console.log(JSON.stringify({lane:"qlever",elapsedMsDiagnostic:42}));\n'},
  {name:'shell-queryms-positive',file:'packages/new-qlever-writer.sh',code:'echo \'{"lane":"qlever","queryMs":42}\'\n'},
  {name:'shell-seconds',file:'lab/new-qlever-writer.sh',code:'printf \'%s\\n\' \'{"lane":"qlever","seconds":0.042}\'\n'},
  {name:'shell-time',file:'packages/new-qlever-writer.sh',code:'printf \'%s\\n\' \'{"engine":"qlever","time":42}\'\n'},
  {name:'python-seconds-alias',file:'lab/new-qlever-writer.py',code:'import json as j\nimport sys\nsys.stdout.write(j.dumps({"lane":"qlever","seconds":0.042}) + "\\n")\n'},
  {name:'js-seconds-stderr',file:'packages/new-qlever-writer.mjs',code:'process.stderr.write(\'{"lane":"qlever","seconds":0.042}\\n\');\n'},
  {name:'shell-duration-positive',file:'lab/new-qlever-writer.sh',code:'printf \'%s\\n\' \'{"lane":"qlever","duration_s":0.042}\'\n'},
];
for(const p of probes){
  const target=path.join(scratch,p.file);assert(!fs.existsSync(target));fs.writeFileSync(target,p.code,{flag:'wx'});
  const observed=run(p.name,['lab/receipts/check-writers.mjs']);
  report.mutations.push({...p,sourceSha256:sha(p.code),guardStatus:observed.status,rejectedForNewSource:observed.text.includes(`${p.file}: new timing/serialization source requires review`)});
  fs.rmSync(target);
}
// Exact new C8 serializer with fresh inputs; current environment deliberately disagrees with keep-alive input.
report.c8=[];
for(const mode of ['keep-alive','per-request',undefined,'unknown']){
  const file=path.join(scratch,`c8-${mode??'absent'}.json`);
  const input={lane:'qlever',qleverConnectionMode:mode,label:report.id,graphs:{g:{edges:1,reach:1,native:[{totalMs:7,steps:[['read',3]]}],datalog:[5]}}};
  fs.writeFileSync(file,JSON.stringify(input),{flag:'wx'});
  const r=run(`c8-${mode??'absent'}`,['lab/experiments/EXP-C8-read-only-frontier/summarize-timing.mjs',file]);
  if(mode==='keep-alive'||mode==='per-request'){
    assert.equal(r.status,0);const row=JSON.parse(fs.readFileSync(r.stdout,'utf8'));
    assert.equal(row.qleverConnectionMode,mode);assert.equal(row.nativeTotalMs,'7-7');assert.deepEqual(row.datalogMs,[5]);report.c8.push({mode,status:r.status,row});
  }else{assert.notEqual(r.status,0);assert.equal(fs.readFileSync(r.stdout,'utf8'),'');report.c8.push({mode:mode??'absent',status:r.status});}
}
for(const {path:p,sha256:h} of report.files)assert.equal(sha(fs.readFileSync(path.join(scratch,p))),h,`scratch source changed: ${p}`);
for(const p of ['lab/receipts/coverage.mjs','lab/receipts/coverage.test.mjs','lab/receipts/check-writers.mjs','lab/receipts/source-inventory.json','lab/experiments/EXP-C8-read-only-frontier/summarize-timing.mjs'])assert.equal(sha(fs.readFileSync(p)),sha(fs.readFileSync(path.join(scratch,p))),`review source changed: ${p}`);
report.runnerSha256=sha(fs.readFileSync(`${own}/review.mjs`));
report.sourcesUnchanged=true;report.endedAt=new Date().toISOString();
fs.writeFileSync(`${own}/result.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({baseline:baseline.status,tests:unit.status,mutations:report.mutations,c8:report.c8,sources:report.files.length},null,2));
