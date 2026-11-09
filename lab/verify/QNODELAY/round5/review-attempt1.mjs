// [CX-VQNODELAY-R5] Why: rerun the three concrete R4 failures on exact R5 paths and source bytes.
// Rejected: substituting source inspection for actual consumers or relabeling old performance evidence.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readLatencyRun, LatencyRefusal } from '../../../receipts/parse.ts';
import { qleverLatencyReceipt } from '../../../receipts/latency.mjs';
import { summarizeGridCell } from '../../../experiments/EXP-QG1-qlever-generations/summary-cell.mjs';
import { makeQleverClient, qleverConnectionModeOf } from '../../../../packages/qlever/src/QleverClient.ts';

const own='lab/verify/QNODELAY/round5', candidate='9b1a9a59ad223fd0fb3e8ff0de4d0d15fed4dafc';
const durable='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round5/attempt1';
if(fs.existsSync(durable))throw Error('retain previous attempt; choose a fresh path');
const disk=fs.statfsSync(process.cwd());assert(disk.bavail*disk.bsize>=5*1024**3,'disk below admission floor');
const sha=b=>createHash('sha256').update(b).digest('hex');
const snapshot=path.join(durable,'source'),fixtures=path.join(durable,'fixtures');
fs.mkdirSync(fixtures,{recursive:true});
const report={id:randomUUID(),startedAt:new Date().toISOString(),candidate,reviewHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,classification:'OFFLINE QA of R4-F1/F2/F3; no real controller/engine attempt',sources:[],commands:[],qg1:[],parser:[],independent:[],load:[],replay:[],enforcement:[],checks:{}};
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});return file;};
const names=execFileSync('git',['ls-tree','-r','--name-only',candidate],{encoding:'utf8'}).trim().split('\n').filter(p=>
  ((p.startsWith('lab/')||p.startsWith('packages/')||p.startsWith('qualification/'))&&(/\.(?:[cm]?[jt]s|tsx|jsx|py|sh)$/.test(p)||p.endsWith('/package.json')||['lab/receipts/reader-inventory.json','lab/receipts/tsconfig.json'].includes(p)))||/^tsconfig.*\.json$/.test(p)||p==='package.json');
for(const p of names){const b=execFileSync('git',['show',`${candidate}:${p}`],{maxBuffer:2e6});write(path.join(snapshot,p),b.toString());report.sources.push({path:p,sha256:sha(b)});}
fs.symlinkSync('/Users/sam/projects/triplex-db-2/node_modules',path.join(snapshot,'node_modules'),'dir');
const child=(label,args,cwd=snapshot,extraEnv={})=>{
  const result=spawnSync(process.execPath,args,{cwd,encoding:'utf8',timeout:120000,maxBuffer:2e6,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',...extraEnv}});
  write(path.join(durable,`${label}.stdout.log`),result.stdout??'');write(path.join(durable,`${label}.stderr.log`),result.stderr??'');
  report.commands.push({label,args,cwd,status:result.status,signal:result.signal,error:result.error?.message});return result;
};
assert.equal(child('builder-tests',['--test','lab/receipts/parser.test.mjs','lab/receipts/readers.test.mjs'],snapshot,{TX2_QNODELAY_READER_AUDIT:path.join(durable,'reader-audit.json')}).status,0);
assert.equal(child('declarations',['node_modules/typescript/bin/tsc','--noEmit','-p','lab/receipts/tsconfig.json']).status,0);
const readCase=(label,file,options,code)=>{
  const result=readLatencyRun(file,options);
  if(code){assert.equal(result.ok,false,label);assert(result.refusal instanceof LatencyRefusal);assert.equal(result.refusal.code,code,label);assert.throws(()=>result.unwrap(),e=>e===result.refusal);}
  else assert.equal(result.ok,true,label);
  report.parser.push({label,file,options,expectedCode:code??null,outcome:result.ok?'accepted':'refused',refusal:result.ok?null:{name:result.refusal.name,tag:result.refusal._tag,code:result.refusal.code,message:result.refusal.message},sourceSha256:sha(fs.readFileSync(file))});
  return result;
};
const meta=(writer,payload,mode='keep-alive')=>qleverLatencyReceipt({latencyWriter:writer,qleverConnectionMode:mode,...payload});
const sample=(ms=7,mode='keep-alive')=>meta('qg1-sample/1',{ms,rows:1},mode);
const cell=(mode='keep-alive')=>meta('qg1-cell/1',{label:'N0',before:{baseTriples:1,deltaTriples:{total:0,inserted:0,deleted:0},rss:1},c8:{status:0},p4:{status:0,connectionMode:mode},results:Object.fromEntries(['base','delta','predicate','join'].map(q=>[q,[sample(7,mode),sample(5,mode)]]))},mode);
const p4=(mode='keep-alive')=>meta('qg1-p4/1',{summary:{p50:7,p99:10},sample:[{ms:7,contentEqual:true}]},mode);
const qgCases=[
  ['positive-keep-alive',null,null],['positive-per-request',null,null],
  ['cold-string',c=>c.results.base[0].ms='not-a-duration','TIMING'],
  ['cold-numeric-string',c=>c.results.base[0].ms='7','TIMING'],
  ['cold-missing',c=>delete c.results.base[0].ms,'TIMING'],
  ['cold-seconds',c=>c.results.base[0].units='seconds','WRITER'],
  ['cold-negative',c=>c.results.base[0].ms=-1,'TIMING'],
  ['p4-string',(_c,p)=>p.summary.p99='0.002','TIMING'],
  ['p4-writer',(_c,p)=>p.latencyWriter='unregistered/v999','WRITER'],
  ['nested-modeless',c=>delete c.results.base[0].qleverConnectionMode,'MIXED_MODE'],
  ['nested-mixed',c=>c.results.base[0].qleverConnectionMode='per-request','MIXED_MODE'],
  ['p4-mixed',(_c,p)=>p.qleverConnectionMode='per-request','MIXED_MODE'],
];
for(const[label,mutate,code]of qgCases){
  const mode=label==='positive-per-request'?'per-request':'keep-alive',c=cell(mode),p=p4(mode);mutate?.(c,p);
  const dir=path.join(fixtures,'qg1',label,'grid-M-attempt2'),cFile=write(path.join(dir,'summary.json'),[c]),pFile=write(path.join(dir,'N0-p4.json'),p),out=path.join(path.dirname(dir),'output.json');
  let actual,error;
  try{actual=summarizeGridCell('M',cFile,pFile,0);}catch(e){error={name:e.name,tag:e._tag,code:e.code,message:e.message};}
  if(code){assert.equal(error?.code,code,label);assert.equal(actual,undefined);}
  else{assert.equal(actual.queries.base.coldMs,7);assert.equal(actual.queries.base.warmMs,5);assert.equal(actual.p4Summary.p99,10);assert.equal(actual.qleverConnectionMode,mode);}
  const result=child(`qg1-${label}`,['--experimental-transform-types','lab/experiments/EXP-QG1-qlever-generations/summarize.mjs',path.dirname(dir),out],process.cwd());
  if(code){assert.notEqual(result.status,0,label);assert.equal(fs.existsSync(out),false,label);}
  else{assert.equal(result.status,0,result.stderr);const summary=JSON.parse(fs.readFileSync(out));assert.equal(summary.cells[0].queries.base.coldMs,7);assert.equal(summary.qleverConnectionMode,mode);}
  report.qg1.push({label,code:code??null,cellFile:cFile,p4File:pFile,cellSha256:sha(fs.readFileSync(cFile)),p4Sha256:sha(fs.readFileSync(pFile)),actual,error,subprocessStatus:result.status,outputExists:fs.existsSync(out)});
}
// [CX-VQNODELAY-R5] Why: retain the old exact payload failure as well as versioned counterparts.
// Rejected: accepting a version refusal alone as proof of numeric payload validation.
const oldCase=JSON.parse(fs.readFileSync('lab/verify/QNODELAY/round4/result.json')).parserCases.find(c=>c.id==='actual-QG1-reader-string-timings');
assert.equal(oldCase.value.queries.base.coldMs,'not-a-duration');
const legacyCell={qleverConnectionMode:'keep-alive',label:'N0',before:{baseTriples:1,deltaTriples:{total:0},rss:1},c8:{status:0},p4:{status:0,qleverConnectionMode:'per-request'},results:{base:[{qleverConnectionMode:'keep-alive',ms:'not-a-duration',rows:1},{qleverConnectionMode:'keep-alive',ms:1,rows:1}]}};
readCase('literal-R4-payload',write(path.join(fixtures,'literal-r4.json'),legacyCell),{lane:'qlever'},'VERSION');
for(const[label,mutation,code]of [
  ['seconds',r=>r.units='seconds','UNITS'],['numeric-string',r=>r.ms='42','TIMING'],['bad-string',r=>r.ms='not-a-duration','TIMING'],['missing-timing',r=>delete r.ms,'TIMING'],['unknown-writer',r=>r.latencyWriter='unregistered-new-writer','WRITER'],['extra-field',r=>r.extra={arbitrary:true},null],['missing-mode',r=>delete r.qleverConnectionMode,'MODE'],['unknown-format',r=>r.format='unregistered/v999','VERSION'],
]){const r=sample();mutation(r);readCase(label,write(path.join(fixtures,`parser-${label}.json`),r),{lane:'qlever'},code);}
const events=[sample(10),sample(2,'per-request')],mixedFile=write(path.join(fixtures,'mixed.json'),events);
readCase('mixed-ordinary',mixedFile,{lane:'qlever'},'MIXED_MODE');
const treatment=readCase('mixed-explicit-treatment',mixedFile,{lane:'qlever',variedTreatment:'connection-mode'},null).unwrap();
assert(!('records'in treatment));assert(!('timings'in treatment));
for(const mode of ['keep-alive','per-request']){const pop=treatment.populations[mode];assert.equal(pop.transportMode,mode);assert.equal(pop.records.length,1);assert(pop.records.every(r=>r.qleverConnectionMode===mode));assert.equal(pop.source.sha256,sha(fs.readFileSync(mixedFile)));}
report.checks.treatment={populationModes:Object.keys(treatment.populations),pooledRecords:false,pooledTimings:false};
readCase('expected-mode-mismatch',write(path.join(fixtures,'homogeneous.json'),[sample()]),{lane:'qlever',expectedMode:'per-request'},'MIXED_MODE');
const event=(mode='keep-alive')=>meta('triplex-public-load-event/1',{type:'read',startedMs:0,finishedMs:10},mode);
// [CX-VQNODELAY-R5] Why: execute the old entire independent-report reproduction using real receipt paths.
// Rejected: stubbing the new path reader or manufacturing a verified controller receipt.
const reader='qualification/reviews/load-observations-independent.mjs',source=fs.readFileSync(reader,'utf8'),fixtureRoot=path.join(fixtures,'independent');
const canonical=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const rows=[['fixture:name:0:v0']],basis={scope:'fixture',knownPosition:'1',validAt:1},paramsSha256=sha(canonical({entity:'fixture:entity:0'}));
const inputs={'spec.json':{id:'fixture',entities:1,factsPerEntity:1,probeEntities:11,maximumWriterCommands:0,validAt:1},'fixture.json':{instances:[{index:0,baselinePosition:1,scope:'fixture',recordedAt:1}]},'oracle.json':{entries:{fixture:{expectedSha256:sha(canonical(rows)),paramsSha256,basis}}}};
for(const[f,v]of Object.entries(inputs))write(path.join(fixtureRoot,f),v);
const eventFile=path.join(fixtureRoot,'.devloop/jobs/fixture/attempts/0001/events.ndjson');fs.mkdirSync(path.dirname(eventFile),{recursive:true});
const manifest={queryPath:'qlever-native',command:{argv:['node','fixture','--spec','spec.json','--fixture','fixture.json','--oracle','oracle.json','--instance','0']},inputs:Object.keys(inputs).map(f=>({path:f,sha256:sha(fs.readFileSync(path.join(fixtureRoot,f)))})),evidence:{events:'events.ndjson'},profile:{startMilliseconds:0,endMilliseconds:1000,requiredClasses:['point-current'],clients:1}};
const read={...event(),ok:true,probe:0,knownPosition:'1',taskClass:'point-current',paramsSha256,basis,resultJson:JSON.stringify(rows),resultSha256:sha(JSON.stringify(rows)),oracleKey:'fixture'};
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const body=source.replace(/^import .*;\s*$/gm,'').replaceAll('import.meta.dirname',JSON.stringify(path.join(fixtureRoot,'qualification/reviews')));
const execute=new AsyncFunction('assert','createHash','readFile','writeFile','resolve','loadJobManifest','openContext','readState','verifyAttempt','process','console','readLatencyRun','latencyReceipt',body);
const {latencyReceipt}=await import('../../../receipts/latency.mjs');
for(const[label,records,code]of [
  ['literal-R4-modeless',[Object.fromEntries(Object.entries(read).filter(([k])=>!['receiptVersion','latencyWriter','units','qleverConnectionMode'].includes(k)))],'VERSION'],
  ['versioned-modeless',[{...read,qleverConnectionMode:undefined}],'MODE'],
  ['mixed',[read,{...read,qleverConnectionMode:'per-request',finishedMs:2}],'MIXED_MODE'],
  ['keep-alive',[read],null],['per-request',[{...read,qleverConnectionMode:'per-request'}],null],
]){
  fs.writeFileSync(eventFile,records.map(JSON.stringify).join('\n')+'\n');
  const retained=write(path.join(fixtures,'independent-inputs',`${label}.ndjson`),fs.readFileSync(eventFile,'utf8'));
  let output,error;
  try{await execute(assert,createHash,fs.promises.readFile,async(_p,b,opts)=>{assert.equal(opts.flag,'wx');output=JSON.parse(b);},path.resolve,async()=>manifest,async()=>({root:fixtureRoot}),async()=>({jobs:{fixture:{}}}),async()=>({terminal:{status:'SYNTHETIC-FIXTURE-NOT-VERIFIED'},terminalSha256:sha('fixture-only')}),{argv:['node',reader,'fixture/0001',`qualification/reviews/${label}.json`]},{log(){}},readLatencyRun,latencyReceipt);}catch(e){error={name:e.name,code:e.code,tag:e._tag,message:e.message};}
  if(code){assert.equal(error?.code,code,label);assert.equal(output,undefined,label);}
  else{assert.equal(error,undefined);assert.equal(output.terminalStatus,'SYNTHETIC-FIXTURE-NOT-VERIFIED');assert.equal(output.qleverConnectionMode,records[0].qleverConnectionMode);assert.equal(output.timedMetrics.classes['point-current'].p99Ms,10);assert.equal(output.rawEventsSha256,sha(fs.readFileSync(eventFile)));}
  report.independent.push({label,retained,inputSha256:sha(fs.readFileSync(retained)),error,output});
}
assert.equal(sha(fs.readFileSync(reader)),sha(source));report.checks.independentReader={path:reader,sha256:sha(source),controller:'SYNTHETIC-FIXTURE-NOT-VERIFIED',completeBody:true};
// [CX-VQNODELAY-R5] Why: test pooling at the actual loadRun loop and its compatibility identity.
// Rejected: treating an in-memory parser result as proof that the consumer retains its mode.
const compareFile='qualification/devloop/compare.mjs',compareSource=fs.readFileSync(compareFile,'utf8');
const loadBody=compareSource.slice(compareSource.indexOf('export async function loadRun('),compareSource.indexOf('\nfunction compatibility(')).replace('export async function','async function');
const loadDir=path.join(fixtures,'load'),loadFile=path.join(loadDir,'events.ndjson');fs.mkdirSync(loadDir,{recursive:true});
const loadManifest={queryPath:'qlever-native',evidence:{events:'events.ndjson'},profile:{format:'triplex-devloop-load-profile/1',id:'fixture',clients:1,startMilliseconds:0,endMilliseconds:1000,requiredClasses:['lookup'],fixtureIdentity:'fixture',cohortIdentity:'fixture',resourceIdentity:'fixture'}};
const runLoad=new AsyncFunction('readLatencyRun','assert','verifyAttempt','readState','ownedPath','loadJobManifest','readJson','join','readOracle','checkReadOracle','finite','percentile','executionResourceIdentity','inputFingerprint','meanGeometry',loadBody+'; return loadRun({test:false,root:"fixture"},"fixture/0001");');
const invoke=()=>runLoad(readLatencyRun,(ok,code,detail)=>assert(ok,`${code}:${detail}`),async()=>({terminal:{status:'completed_verified_bytes'},terminalSha256:'SYNTHETIC-FIXTURE-NOT-VERIFIED'}),async()=>({jobs:{fixture:{attempts:[{id:'0001',directory:loadDir}]}}}),async(_root,p)=>p===loadDir?p:path.join(loadDir,p),async()=>loadManifest,async()=>({controllerPins:[]}),path.join,async()=>({}),()=>{},Number.isFinite,(a,p)=>[...a].sort((a,b)=>a-b)[Math.ceil(a.length*p)-1],()=>'SYNTHETIC',()=>'SYNTHETIC',a=>Math.exp(a.reduce((s,n)=>s+Math.log(n),0)/a.length));
const loadRead={...event(),taskClass:'lookup',clientId:0,ok:true,knownPosition:'1'};
const loadResults=[];
for(const[label,records,code]of [['modeless',[{...loadRead,qleverConnectionMode:undefined}],'MODE'],['mixed',[loadRead,{...loadRead,qleverConnectionMode:'per-request',finishedMs:2}],'MIXED_MODE'],['keep-alive',[loadRead],null],['per-request',[{...loadRead,qleverConnectionMode:'per-request'}],null]]){
  fs.writeFileSync(loadFile,records.map(JSON.stringify).join('\n')+'\n');const retained=write(path.join(fixtures,'load-inputs',`${label}.ndjson`),fs.readFileSync(loadFile,'utf8'));
  let result,error;try{result=await invoke();}catch(e){error={name:e.name,code:e.code,tag:e._tag,message:e.message};}
  if(code){assert.equal(error?.code,code,label);assert.equal(result,undefined);}
  else{assert.equal(error,undefined);assert.equal(result.qleverConnectionMode,label);assert.equal(result.classes.lookup.p99Ms,10);assert.equal(result.eventsSha256,sha(fs.readFileSync(loadFile)));assert.equal(result.terminalSha256,'SYNTHETIC-FIXTURE-NOT-VERIFIED');loadResults.push(result);}
  report.load.push({label,retained,error,result});
}
const compatSource=compareSource.slice(compareSource.indexOf('function compatibility('),compareSource.indexOf('\nexport async function calibrate'));
const compatibility=new Function('json',compatSource+'; return compatibility;')(JSON.stringify);
assert.notEqual(compatibility(loadResults[0]),compatibility(loadResults[1]));report.checks.loadCompatibility={different:true,values:loadResults.map(r=>compatibility(r)),sourceSha256:sha(compareSource),controllerAndOracle:'MOCKED; not a verified attempt'};
// [CX-VQNODELAY-R5] Why: execute the real guard after planting a direct read, then restore candidate bytes.
// Rejected: only calling the guard's candidate regex or leaving a reviewer mutation in the candidate snapshot.
const plantRelative='qualification/reviews/qa-planted-direct.mjs',plant=path.join(snapshot,plantRelative);
const plantText='import {readFileSync as load} from "node:fs"; const r=JSON.parse(load("qualification/evidence/qlever/receipt.json")); console.log(r.p99Ms);\n';
write(plant,plantText);write(path.join(durable,'mutation-preimages','qa-planted-direct.mjs'),plantText);
const guard=child('planted-guard',['--test','--test-name-pattern=every reviewed QLever','lab/receipts/readers.test.mjs']);
assert.notEqual(guard.status,0);assert.match(guard.stdout,/qa-planted-direct\.mjs: unreviewed input boundary/);
const guardCode=`import fs from 'node:fs';import {readerSources,auditReaders,hashSource} from './lab/receipts/readers.mjs';const inv=JSON.parse(fs.readFileSync('lab/receipts/reader-inventory.json'));inv.sources.push({path:${JSON.stringify(plantRelative)},sha256:hashSource(fs.readFileSync(${JSON.stringify(plantRelative)})),role:'non-reader',reason:'intentionally incorrect classification'});const result=auditReaders(readerSources(process.cwd()),inv);fs.writeFileSync(${JSON.stringify(path.join(durable,'misclassified-guard.json'))},JSON.stringify(result,null,2)+'\n',{flag:'wx'});if(!result.failures.some(x=>x.includes('qa-planted-direct.mjs: QLever receipt path/JSON-key reader requires readLatencyRun')))process.exit(2);`;
assert.equal(child('misclassified-guard',['--input-type=module','-e',guardCode]).status,0);
report.enforcement.push({plantRelative,text:plantText,sha256:sha(plantText),guardStatus:guard.status,misclassifiedResult:path.join(durable,'misclassified-guard.json')});fs.unlinkSync(plant);
const saved=process.env.TRIPLEX_QLEVER_CONNECTION_MODE;delete process.env.TRIPLEX_QLEVER_CONNECTION_MODE;
assert.equal(qleverConnectionModeOf(),'keep-alive');process.env.TRIPLEX_QLEVER_CONNECTION_MODE='per-request';assert.equal(qleverConnectionModeOf(),'per-request');assert.equal(qleverConnectionModeOf('keep-alive'),'keep-alive');assert.doesNotThrow(()=>makeQleverClient('http://127.0.0.1:0',{connectionMode:'per-request'}));
if(saved===undefined)delete process.env.TRIPLEX_QLEVER_CONNECTION_MODE;else process.env.TRIPLEX_QLEVER_CONNECTION_MODE=saved;
report.checks.default={absent:'keep-alive',optIn:'per-request',explicitOverride:'keep-alive',requestsSent:0};
// [CX-VQNODELAY-R5] Why: recompute historical arithmetic from unchanged retained bytes without fabricating new metadata.
// Rejected: passing a synthetic schema projection off as a newly accepted original receipt or fresh engine measurement.
const historical='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QNODELAY/round2/live1/result.json',raw=fs.readFileSync(historical),old=JSON.parse(raw),oldRefusal=readLatencyRun(historical,{lane:'qlever'});
assert.equal(sha(raw),'0f0394502270a9cd05fa5bf39b2e53c0d3be13dff387156234f2c640f7c115de');assert.equal(oldRefusal.refusal.code,'VERSION');
for(const mode of ['keep-alive','per-request']){
  const samples=old.samples.filter(s=>!s.warmup&&s.qleverConnectionMode===mode);
  for(const s of samples){assert(Number.isFinite(s.ms)&&s.ms>=0);const nonce=`${old.attempt}:${s.round}:${s.size}:${s.i}`;assert.deepEqual(JSON.parse(s.decodedBindingBytes),[{nonce:{type:'literal',value:nonce},payload:{type:'literal',value:'x'.repeat(s.size)}}]);assert.equal(sha(s.decodedBindingBytes),s.decodedBindingsSha256);}
  const times=samples.map(s=>s.ms).sort((a,b)=>a-b),stalls=times.filter(ms=>ms>=35).length;
  assert.equal(times.length,240);assert.equal(stalls,mode==='keep-alive'?120:0);
  report.replay.push({mode,n:times.length,stalls,p50:times[Math.ceil(times.length*.5)-1],p99:times[Math.ceil(times.length*.99)-1]});
}
report.checks.replay={file:historical,sha256:sha(raw),newReaderRefusal:oldRefusal.refusal.code,measurementStatus:'historical diagnostic; arithmetic-only replay, no schema migration',warmupsExcluded:40};
for(const s of report.sources)assert.equal(sha(fs.readFileSync(path.join(snapshot,s.path))),s.sha256,s.path);
report.checks.snapshotUnchanged=true;
const manifestFiles=fs.readFileSync('lab/experiments/EXP-QNODELAY/round5/SHA256SUMS','utf8').trim().split('\n');let checked=0;
for(const line of manifestFiles){const [,h,p]=/^([a-f0-9]{64})\s+(.+)$/.exec(line);assert.equal(sha(fs.readFileSync(p)),h,p);checked++;}
report.checks.builderManifestFiles=checked;
report.checks.transportDiff=execFileSync('git',['diff','4e235a1','9b1a9a59','--','packages/qlever/src/QleverClient.ts','pnpm-lock.yaml'],{encoding:'utf8'});assert.equal(report.checks.transportDiff,'');
report.checks.acceptanceDiff=execFileSync('git',['diff','4e235a1','9b1a9a59','--','lab/acceptance'],{encoding:'utf8'});assert.equal(report.checks.acceptanceDiff,'');
report.runnerSha256=sha(fs.readFileSync(`${own}/review.mjs`));report.endedAt=new Date().toISOString();
write(path.join(durable,'result.json'),report);write(`${own}/result.json`,{...report,sources:{count:report.sources.length,retained:path.join(durable,'result.json')}});
console.log(JSON.stringify({id:report.id,commands:report.commands.map(({label,status})=>({label,status})),qg1:report.qg1.map(({label,error,actual})=>({label,error,coldMs:actual?.queries.base.coldMs})),independent:report.independent.map(({label,error,output})=>({label,error,mode:output?.qleverConnectionMode})),load:report.load.map(({label,error,result})=>({label,error,mode:result?.qleverConnectionMode})),checks:report.checks,replay:report.replay},null,2));
