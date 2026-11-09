// [CX-VQNODELAY-R4] Why: run reader tests and malformed-receipt controls against exact candidate bytes, offline.
// Rejected: manufacturing mode metadata for historical receipts or treating parser success as semantic acceptance.
import fs from 'node:fs';
import path from 'node:path';
import { createHash,randomUUID } from 'node:crypto';
import { execFileSync,spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { parseLatencyReceipt,parseLatencyReceipts } from '../../../receipts/parse.ts';
import { summarizeGridCell } from '../../../experiments/EXP-QG1-qlever-generations/summary-cell.mjs';
import { qleverConnectionModeOf,makeQleverClient } from '../../../../packages/qlever/src/QleverClient.ts';
const candidate='4e235a1d2b7ec5e1360144cab05357a79ee127ad', own='lab/verify/QNODELAY/round4';
const durable='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round4',scratch=path.join(durable,'source-attempt1');
if(fs.existsSync(scratch))throw Error('new source attempt required');
const sha=x=>createHash('sha256').update(x).digest('hex');
const report={id:randomUUID(),startedAt:new Date().toISOString(),classification:'OFFLINE READER QA; synthetic malformed cases and historical timings, no engine run',candidate,reviewHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,files:[],commands:[],parserCases:[],stored:[],defaultChecks:{}};
const names=execFileSync('git',['ls-tree','-r','--name-only',candidate],{encoding:'utf8'}).trim().split('\n').filter(p=>
  ((p.startsWith('lab/')||p.startsWith('packages/'))&&(/\.(?:[cm]?[jt]s|tsx|jsx|py|sh)$/.test(p)||p.endsWith('/package.json')||['lab/receipts/reader-inventory.json','lab/receipts/tsconfig.json'].includes(p)))||p==='qualification/devloop/compare.mjs'||/^tsconfig.*\.json$/.test(p)||p==='package.json');
for(const p of names){const bytes=execFileSync('git',['show',`${candidate}:${p}`],{maxBuffer:2e6});const dest=path.join(scratch,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes,{flag:'wx'});report.files.push({path:p,sha256:sha(bytes)});}
fs.symlinkSync('/Users/sam/projects/triplex-db-2/node_modules',path.join(scratch,'node_modules'),'dir');
const run=(label,args)=>{
  const r=spawnSync(process.execPath,args,{cwd:scratch,encoding:'utf8',maxBuffer:2e6,timeout:120000,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',TX2_QNODELAY_READER_AUDIT:path.join(scratch,'reader-audit.json')}});
  fs.writeFileSync(`${own}/${label}.stdout.log`,r.stdout??'',{flag:'wx'});fs.writeFileSync(`${own}/${label}.stderr.log`,r.stderr??'',{flag:'wx'});
  const result={label,args,status:r.status,signal:r.signal,error:r.error?.message};report.commands.push(result);return result;
};
assert.equal(run('builder-tests',['--test','lab/receipts/parser.test.mjs','lab/receipts/readers.test.mjs']).status,0);
assert.equal(run('declarations',['node_modules/typescript/bin/tsc','--noEmit','-p','lab/receipts/tsconfig.json']).status,0);
const record=(id,fn)=>{try{const out=fn();report.parserCases.push({id,outcome:'accepted',value:out});}catch(e){report.parserCases.push({id,outcome:'rejected',error:{name:e.name,message:e.message,tag:e._tag??null}});}};
const valid={lane:'qlever',qleverConnectionMode:'keep-alive',writer:'fixture',ms:42};
for(const [id,value]of [
  ['missing-mode',{lane:'qlever',seconds:.042}],['invalid-mode',{...valid,qleverConnectionMode:'no-delay'}],
  ['seconds-labeled',{lane:'qlever',qleverConnectionMode:'keep-alive',seconds:.042}],
  ['numeric-string',{...valid,ms:'42'}],['malformed-string',{...valid,ms:'not-a-duration'}],
  ['extra-field',{...valid,extra:{arbitrary:true}}],['missing-timing',{lane:'qlever',qleverConnectionMode:'keep-alive'}],
  ['unknown-writer',{...valid,writer:'unregistered-new-writer',format:'unregistered/v999'}],
  ['unknown-lane-null',{lane:'unregistered',qleverConnectionMode:null}],
  ['nested-missing-mode',{...valid,runs:[{lane:'qlever',ms:7}]}],
  ['nested-mixed-modes',{...valid,runs:[{lane:'qlever',qleverConnectionMode:'per-request',ms:1}]}],
])record(id,()=>parseLatencyReceipt(value,{lane:'qlever',source:id}));
record('valid-json-text',()=>parseLatencyReceipt(JSON.stringify(valid),{lane:'qlever'}));
record('mixed-array',()=>parseLatencyReceipts([valid,{...valid,qleverConnectionMode:'per-request',ms:1}],{lane:'qlever'}));
record('mixed-with-modeless',()=>parseLatencyReceipts([valid,{ms:1}],{lane:'qlever'}));
record('invalid-nested-mode',()=>parseLatencyReceipt({...valid,runs:[{qleverConnectionMode:'unknown'}]},{lane:'qlever'}));
// Exact real reader: valid mode metadata does not stop ill-typed timing values entering its summary.
const cell={qleverConnectionMode:'keep-alive',label:'N0',before:{baseTriples:1,deltaTriples:{total:0},rss:1},c8:{status:0},p4:{status:0,qleverConnectionMode:'per-request'},results:{base:[{qleverConnectionMode:'keep-alive',ms:'not-a-duration',rows:1},{qleverConnectionMode:'keep-alive',ms:1,rows:1}]}};
const child={qleverConnectionMode:'per-request',writer:'unregistered-writer',sample:[{contentEqual:true}],summary:{p50:'0.001',p99:'0.002'}};
record('actual-QG1-reader-string-timings',()=>summarizeGridCell('M',cell,child));
const priorMode=process.env.TRIPLEX_QLEVER_CONNECTION_MODE;
delete process.env.TRIPLEX_QLEVER_CONNECTION_MODE;
assert.equal(qleverConnectionModeOf(),'keep-alive');report.defaultChecks.absent='keep-alive';
process.env.TRIPLEX_QLEVER_CONNECTION_MODE='per-request';assert.equal(qleverConnectionModeOf(),'per-request');report.defaultChecks.optIn='per-request';
assert.equal(qleverConnectionModeOf('keep-alive'),'keep-alive');report.defaultChecks.explicitOverride='keep-alive';
assert.doesNotThrow(()=>makeQleverClient('http://127.0.0.1:0',{connectionMode:'per-request'}));
assert.throws(()=>makeQleverClient('http://127.0.0.1:0',{connectionMode:'no-delay'}),TypeError);
if(priorMode===undefined)delete process.env.TRIPLEX_QLEVER_CONNECTION_MODE;else process.env.TRIPLEX_QLEVER_CONNECTION_MODE=priorMode;
for(const [label,file]of [
  ['round2-labeled','/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QNODELAY/round2/live1/result.json'],
  ['round1-legacy','/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QNODELAY/attempt4/result.json'],
]){
  const bytes=fs.readFileSync(file),r=JSON.parse(bytes);let rows;
  try{rows=parseLatencyReceipts(r.samples,{lane:'qlever',source:file});}catch(e){report.stored.push({label,file,sha256:sha(bytes),outcome:'rejected',error:{name:e.name,message:e.message}});continue;}
  const summary={};
  for(const mode of ['keep-alive','per-request']){
    const samples=rows.filter(s=>!s.warmup&&s.qleverConnectionMode===mode),times=samples.map(s=>s.ms).sort((a,b)=>a-b);
    for(const s of samples){const nonce=`${r.attempt}:${s.round}:${s.size}:${s.i}`;assert.deepEqual(JSON.parse(s.decodedBindingBytes),[{nonce:{type:'literal',value:nonce},payload:{type:'literal',value:'x'.repeat(s.size)}}]);assert.equal(sha(s.decodedBindingBytes),s.decodedBindingsSha256);}
    summary[mode]={n:times.length,stalls:times.filter(ms=>ms>=35).length,p50:times[Math.ceil(times.length*.5)-1],p99:times[Math.ceil(times.length*.99)-1]};
  }
  assert.equal(summary['keep-alive'].n,240);assert.equal(summary['keep-alive'].stalls,120);assert.equal(summary['per-request'].n,240);assert.equal(summary['per-request'].stalls,0);
  report.stored.push({label,file,sha256:sha(bytes),outcome:'accepted-samples',parsed:rows.length,summary});
}
for(const {path:p,sha256:h}of report.files)assert.equal(sha(fs.readFileSync(path.join(scratch,p))),h,`candidate scratch changed: ${p}`);
report.sourcesUnchanged=true;report.runnerSha256=sha(fs.readFileSync(`${own}/review.mjs`));report.endedAt=new Date().toISOString();
fs.writeFileSync(`${own}/result.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,files:{count:report.files.length}},null,2));
