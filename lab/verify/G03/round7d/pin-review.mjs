// [CX-VG03-7D] Why: bind review evidence to actual Git preimages and protected closure membership. Rejected: editing or re-pinning the acceptance contract while reviewing.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {EVALUATOR_FILES} from '../../../bin/claim.mjs';
const root=path.resolve(import.meta.dirname,'../../../..'),git=args=>execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024}),sha=b=>createHash('sha256').update(b).digest('hex');
const base='67844167',target='1432f79a',changes=git(['diff','--name-only',base,target]).toString().trim().split('\n');
assert.equal(git(['diff',target,'--','.',':!lab/verify/G03']).length,0);
for(const unchanged of ['lab/acceptance','lab/bench/ns-driver','lab/experiments/EXP-G03/ns/observer.py','lab/experiments/EXP-G03/ns/smoke.mjs','lab/experiments/EXP-G03/ns/exclusive.mjs'])assert.equal(git(['diff',base,target,'--',unchanged]).length,0,unchanged);
const pins=JSON.parse(fs.readFileSync(path.join(root,'lab/acceptance/obligations.json'))),changedDirectPins=changes.filter(p=>Object.hasOwn(pins.inputs,p));assert.deepEqual(changedDirectPins,[]);
const closure=EVALUATOR_FILES.map(p=>({path:p,oldSha256:sha(git(['show',base+':'+p])),newSha256:sha(fs.readFileSync(path.join(root,p)))}));
assert.deepEqual(closure.filter(p=>p.oldSha256!==p.newSha256).map(p=>p.path),['lab/bin/box.mjs']);
const expected={
 'lab/bin/box.mjs':['589028dca91ca8c90865994dd483df4694999360f9485520c9c963296b1dc906','a90715c708b6329bc8c07d12531aac4d88b0ce275fa1352bb46a3483e34fe481'],
 'lab/bin/ns-run.mjs':['aa99c4fae29d72f2558e47fb14e6abcf12748caf7f21fd45a9fbe4e87fcffd82','bb9105e18a321438d7b8c2594f9de975862d082acf225f1ea22fae7f3ca5720d']};
const sourceHashPairs=Object.entries(expected).map(([p,want])=>{const oldSha256=sha(git(['show',base+':'+p])),newSha256=sha(fs.readFileSync(path.join(root,p)));assert.deepEqual([oldSha256,newSha256],want);return {path:p,oldSha256,newSha256}});
const report=fs.readFileSync(path.join(root,'lab/experiments/EXP-G03/REPORT.md'),'utf8').split('## Round 7d:')[1];assert.match(report,/Contract 0\.4\.1 must re-pin `box.mjs`/);
// Historical receipts are checked for byte identity and declared totals, never promoted into a fresh reviewer execution.
const historical=[];
for(const name of ['ns-suites','evaluator','committed-suites']){
 const dir=path.join(root,'lab/experiments/EXP-G03/round7d'),tap=fs.readFileSync(path.join(dir,name+'.tap'),'utf8'),exit=Number(fs.readFileSync(path.join(dir,name+'.exit'),'utf8'));
 const sums=fs.readFileSync(path.join(dir,'SHA256SUMS'),'utf8'),line=sums.split('\n').find(s=>s.endsWith('  '+name+'.tap'));assert.ok(line);assert.equal(sha(Buffer.from(tap)),line.split('  ')[0]);assert.equal(exit,0);
 const total=Number(tap.match(/^# tests (\d+)$/m)[1]),pass=Number(tap.match(/^# pass (\d+)$/m)[1]);assert.equal(total,pass);
 historical.push({name,total,pass,exit,tapSha256:sha(Buffer.from(tap)),status:'historical builder execution; not fresh reviewer evidence'});
}
console.log(JSON.stringify({at:new Date().toISOString(),base,target,testedHead:git(['rev-parse','HEAD']).toString().trim(),reviewedSourceUnchanged:true,acceptanceUnchanged:true,changedDirectPins,closure,sourceHashPairs,reportRequires041Repin:true,historical,qualification:false},null,2));
