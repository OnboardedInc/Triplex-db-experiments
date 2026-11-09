// [CX-VQNODELAY] Why: invoke the exact QG1 timing writer with an in-memory HTTP fixture.
// Rejected: running its engine-mutating grid merely to demonstrate a metadata omission.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { sha, start, finish } from './common.mjs';
const grid='lab/experiments/EXP-QG1-qlever-generations/grid.mjs';
const report={...start(['lab/verify/QNODELAY/receipt-coverage.mjs',grid,'lab/experiments/EXP-QG1-qlever-generations/summarize.mjs','lab/scenarios/legacy.mjs','packages/qlever/experiments/string-order-probe.ts']),classification:'SOURCE-EXACT WRITER FIXTURE; no engine calls',writers:[],pinHashes:[]};
const text=fs.readFileSync(grid,'utf8');
const functionText=text.slice(text.indexOf('async function req('),text.indexOf('\nconst seed ='));
const emitted=[], fakeCalls=[];
const req=new Function('fetch','fs','path','out','hash','save',`let serial=0; ${functionText}; return req;`)(
  async (url,init)=>{fakeCalls.push({url,method:init.method});return{status:200,text:async()=>'{"fixture":true}'};},
  {writeFileSync:(file,bytes)=>emitted.push({file,bytes})},path,'fixture-only',sha,
  (file,value)=>emitted.push({file,value}),
);
await req({query:'SELECT ?x WHERE {}'});
assert.equal(fakeCalls.length,1);
const receipt=emitted.find(x=>x.file==='1.request.json').value;
assert.equal(receipt.status,200);
assert.equal(receipt.sha256,sha('{"fixture":true}'));
assert.equal(typeof receipt.ms,'number');
assert(!Object.hasOwn(receipt,'connectionMode') && !Object.hasOwn(receipt,'qleverConnectionMode'));
report.writers.push({path:grid,line:60,sourceFunctionSha256:sha(functionText),fakeCalls,receipt,missingMode:true});
const changed=JSON.parse(fs.readFileSync('lab/experiments/EXP-QNODELAY/changed-source-hashes.json'));
const contractFiles=execFileSync('git',['ls-files','lab/acceptance'],{encoding:'utf8'}).trim().split('\n');
for(const file of contractFiles) {
  const bytes=fs.readFileSync(file,'utf8');
  for(const c of changed) {
    for(const [label,h] of [['old',c.oldSha256],['new',c.newSha256]]) if(bytes.includes(h)) report.pinHashes.push({file,path:c.path,label,sha256:h});
  }
}
report.catalogSnapshots={head:'1096fb8639903395593954e44be6872118fe4c68',files:Object.fromEntries(['errors.ts','transport-codes.ts','QleverClient.ts'].map((p,i)=>{
  const local=['p2q-errors.ts','transport-codes.ts','p2q-client.ts'][i],snapshot=fs.readFileSync(`lab/verify/QNODELAY/reference/${local}`);
  const original=execFileSync('git',['show',`1096fb8639903395593954e44be6872118fe4c68:packages/qlever/src/${p==='QleverClient.ts'?'':'broker/'}${p}`]);
  assert.equal(sha(snapshot),sha(original));return[local,sha(snapshot)];
}))};
finish('lab/verify/QNODELAY/receipt-coverage.json',report);
console.log(JSON.stringify(report,null,2));
