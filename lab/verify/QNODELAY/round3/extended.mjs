// [CX-VQNODELAY-R3] Why: compare ordinary field and serializer spellings against the same exact guard.
// Rejected: claiming a finite hand-picked positive matrix proves every timing source is discovered.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createHash,randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round3/source-attempt2';
const {discoverSources,auditSources,digest}=await import(pathToFileURL(path.join(root,'lab/receipts/coverage.mjs')));
const inventory=JSON.parse(fs.readFileSync(path.join(root,'lab/receipts/source-inventory.json')));
const baseline=discoverSources(root);assert.deepEqual(auditSources(baseline,inventory),[]);
const report={id:randomUUID(),startedAt:new Date().toISOString(),classification:'STATIC GUARD QA with synthetic output fixtures; no engine timings',baseline:baseline.length,fields:[],extra:[],standalone:[]};
for(const field of ['queryMs','elapsedMsDiagnostic','p99','duration_s','elapsed_s','seconds','time','milliseconds','microseconds','ns','us','execution_time','queryLatency','wall_s']){
  const file='lab/field-probe.sh',code=`printf '%s\\n' '${JSON.stringify({lane:'qlever',[field]:0.042})}'\n`;
  fs.writeFileSync(path.join(root,file),code,{flag:'wx'});
  const sources=discoverSources(root),errors=auditSources(sources,inventory);
  report.fields.push({field,file,code,sha256:digest(code),discovered:sources.some(s=>s.path===file),errors:errors.filter(e=>e.includes(file))});
  fs.rmSync(path.join(root,file));
}
const more=[
  {file:'packages/alias-writer.py',code:'import json as j\nwith open("fixture-timing.json", "w") as output:\n    output.write(j.dumps({"lane":"qlever","seconds":0.042}))\n'},
  {file:'lab/alternate-writer.mjs',code:'process.stderr.write(\'{"lane":"qlever","seconds":0.042}\\n\');\n'},
];
for(const probe of more){
  fs.writeFileSync(path.join(root,probe.file),probe.code,{flag:'wx'});
  const sources=discoverSources(root),errors=auditSources(sources,inventory);
  const command=probe.file.endsWith('.py')?'python3':process.execPath;
  const observed=spawnSync(command,[probe.file],{cwd:root,encoding:'utf8'});assert.equal(observed.status,0,observed.stderr);
  const output=probe.file.endsWith('.py')?fs.readFileSync(path.join(root,'fixture-timing.json'),'utf8'):observed.stderr;
  assert.deepEqual(JSON.parse(output),{lane:'qlever',seconds:0.042});
  report.extra.push({...probe,sha256:digest(probe.code),discovered:sources.some(s=>s.path===probe.file),errors:errors.filter(e=>e.includes(probe.file)),observedOutput:output});
  fs.rmSync(path.join(root,probe.file));
  if(probe.file.endsWith('.py'))fs.rmSync(path.join(root,'fixture-timing.json'));
}
// A checked boundary elsewhere in a reviewed labeled file does not make this second output labeled.
for(const field of ['p99','"p99"','queryLatency','seconds','"elapsedMs"']){
  const text=`latencyReceipt({qleverConnectionMode:"keep-alive"}); console.log(JSON.stringify({${field}:42}));`;
  const source={path:'packages/standalone-fixture.mjs',text,sha256:digest(text)};
  const errors=auditSources([source],[{path:source.path,sha256:source.sha256,role:'labeled',reason:'Synthetic QLever timing writer structural check'}]);
  report.standalone.push({field,text,errors});
}
assert.deepEqual(auditSources(discoverSources(root),inventory),[]);
report.endedAt=new Date().toISOString();
report.bindings=Object.fromEntries(['lab/receipts/coverage.mjs','lab/receipts/source-inventory.json','lab/receipts/check-writers.mjs'].map(p=>[p,digest(fs.readFileSync(path.join(root,p)))]));
report.runnerSha256=createHash('sha256').update(fs.readFileSync('lab/verify/QNODELAY/round3/extended.mjs')).digest('hex');
fs.writeFileSync('lab/verify/QNODELAY/round3/extended-result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report,null,2));
