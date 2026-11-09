// [CX-VQNODELAY-R2] Why: recompute new diagnostics from raw bytes and independently scan acceptance pins.
// Rejected: importing the builder's rounded numbers or treating retained results as fresh execution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { start,finish,sha } from './common.mjs';
const prefix='lab/verify/QNODELAY/round2';
const report={...start([`${prefix}/evidence-audit.mjs`,'pnpm-lock.yaml','packages/qlever/package.json']),classification:'BYTE AND ARITHMETIC AUDIT; historical builder diagnostic kept separate from fresh reviewer attempt',checksums:0,sourceCopies:0,timings:[],pinReferences:[]};
for(const line of fs.readFileSync('lab/experiments/EXP-QNODELAY/round2/SHA256SUMS','utf8').trim().split('\n')) {
  const [,h,p]=/^(\w{64})\s+(.+)$/.exec(line);
  assert.equal(sha(fs.readFileSync(p)),h,p); report.checksums++;
}
const builderEvidence='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QNODELAY/round2';
const sourceManifest=JSON.parse(fs.readFileSync(path.join(builderEvidence,'source-manifest.json')));
for(const {path:p,sha256:h} of sourceManifest) {
  assert.equal(sha(fs.readFileSync(path.join(builderEvidence,'source',p))),h,p);
  assert.equal(sha(fs.readFileSync(p)),h,p);report.sourceCopies++;
}
const quantiles=xs=>{xs.sort((a,b)=>a-b);return{n:xs.length,p50:xs[Math.ceil(xs.length*.5)-1],p99:xs[Math.ceil(xs.length*.99)-1],stalls:xs.filter(x=>x>=35).length};};
for(const [kind,file] of [
  ['historical-builder-round2',path.join(builderEvidence,'live1/result.json')],
  ['fresh-reviewer-round2','/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round2/attempt1/result.json'],
]) {
  const raw=fs.readFileSync(file),r=JSON.parse(raw),groups={};
  for(const s of r.samples) {
    const decoded=JSON.parse(s.decodedBindingBytes);
    const nonce=kind.startsWith('historical')?`${r.attempt}:${s.round}:${s.size}:${s.i}`:s.nonce;
    assert.deepEqual(decoded,[{nonce:{type:'literal',value:nonce},payload:{type:'literal',value:(kind.startsWith('historical')?'x':'v').repeat(s.size)}}]);
    assert.equal(sha(s.decodedBindingBytes),s.decodedBindingsSha256??s.sha256);
    if(s.warmup || s.cell?.startsWith('4/'))continue;
    const mode=s.qleverConnectionMode??s.mode;
    (groups[mode]??=[]).push(s.ms);
  }
  report.timings.push({kind,file,rawSha256:sha(raw),samples:r.samples.length,summary:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,quantiles(v)]))});
}
const contractFiles=execFileSync('git',['ls-files','lab/acceptance'],{encoding:'utf8'}).trim().split('\n');
const changed=JSON.parse(fs.readFileSync('lab/experiments/EXP-QNODELAY/round2/changed-source-hashes.json'));
for(const file of contractFiles) {
  const raw=fs.readFileSync(file,'utf8');
  for(const c of changed) if(raw.includes(c.path)) {
    for(const [i,line] of raw.split('\n').entries())if(line.includes(c.path))report.pinReferences.push({file,line:i+1,path:c.path,old:c.oldSha256,new:c.newSha256});
  }
}
const tree='/Users/sam/projects/triplex-db-2/node_modules/.pnpm/undici@7.29.1/node_modules/undici';
report.undiciPreimages=Object.fromEntries(fs.readdirSync(tree,{recursive:true}).filter(p=>fs.statSync(path.join(tree,p)).isFile()).sort().map(p=>[p,sha(fs.readFileSync(path.join(tree,p)))]));
const matrix=JSON.parse(fs.readFileSync(`${prefix}/builder-matrix-native.json`));
assert.equal(matrix.numPassedTests,42);assert.equal(matrix.numFailedTests,0);assert.equal(matrix.success,true);
report.matrix={passed:matrix.numPassedTests,failed:matrix.numFailedTests,sha256:sha(fs.readFileSync(`${prefix}/builder-matrix-native.json`))};
const catalog=JSON.parse(fs.readFileSync(`${prefix}/transport-result.json`)).catalog;
for(let i=0;i<catalog.length;i+=2){assert.equal(catalog[i].actual,catalog[i+1].actual);assert.deepEqual(catalog[i].chain,catalog[i+1].chain);}
report.catalogModePairsEqual=catalog.length/2;
finish(`${prefix}/evidence-audit.json`,report);
console.log(JSON.stringify({...report,undiciPreimages:{files:Object.keys(report.undiciPreimages).length}},null,2));
