// [CX-VQNODELAY-R3] Why: independently validate source and evidence bindings for this metadata-only change.
// Rejected: adopting the builder's successful log without checking its input bytes or the contract pin boundary.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const sha=x=>createHash('sha256').update(x).digest('hex');
const report={startedAt:new Date().toISOString(),classification:'OFFLINE BYTE/PIN AUDIT ONLY',manifestEntries:0,reviewedSources:0,pins:[],changes:[]};
for(const line of fs.readFileSync('lab/experiments/EXP-QNODELAY/round3/SHA256SUMS','utf8').trim().split('\n')){
  const [,h,p]=/^(\w{64})\s+(.+)$/.exec(line);assert.equal(sha(fs.readFileSync(p)),h,p);report.manifestEntries++;
}
const inventory=JSON.parse(fs.readFileSync('lab/receipts/source-inventory.json'));
for(const s of inventory){assert.equal(sha(fs.readFileSync(s.path)),s.sha256,s.path);report.reviewedSources++;}
const changed=JSON.parse(fs.readFileSync('lab/experiments/EXP-QNODELAY/round3/changed-source-hashes.json'));
for(const c of changed){assert.equal(sha(fs.readFileSync(c.path)),c.newSha256,c.path);report.changes.push(c);}
const paths=new Set(changed.map(c=>c.path));
function walk(v,trail,file){
  if(v&&typeof v==='object'){
    if(paths.has(v.path)&&typeof v.sha256==='string')report.pins.push({file,trail,path:v.path,pinnedSha256:v.sha256,currentSha256:sha(fs.readFileSync(v.path))});
    for(const [k,value]of Object.entries(v))walk(value,`${trail}/${k}`,file);
  }
}
for(const file of execFileSync('git',['ls-files','lab/acceptance'],{encoding:'utf8'}).trim().split('\n').filter(p=>p.endsWith('.json')))walk(JSON.parse(fs.readFileSync(file)),'',file);
report.acceptanceDiff=execFileSync('git',['diff','b7aec0f7^','b7aec0f7','--','lab/acceptance'],{encoding:'utf8'});
assert.equal(report.acceptanceDiff,'');
report.transportDiff=execFileSync('git',['diff','80d16039','b7aec0f7','--','packages/qlever/src/QleverClient.ts','packages/qlever/src/index.ts','pnpm-lock.yaml'],{encoding:'utf8'});
assert.equal(report.transportDiff,'');
report.sourceHashes=Object.fromEntries(['lab/verify/QNODELAY/round3/audit.mjs','lab/receipts/coverage.mjs','lab/receipts/check-writers.mjs','lab/receipts/source-inventory.json'].map(p=>[p,sha(fs.readFileSync(p))]));
report.endedAt=new Date().toISOString();
fs.writeFileSync('lab/verify/QNODELAY/round3/audit-result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({manifestEntries:report.manifestEntries,reviewedSources:report.reviewedSources,changedFiles:report.changes.length,pins:report.pins,acceptanceChanged:!!report.acceptanceDiff,transportChanged:!!report.transportDiff},null,2));
