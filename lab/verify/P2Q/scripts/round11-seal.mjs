// [CX-VP2Q-11] Why: independently recount actual results and compare retained bytes before issuing a bounded verdict.
// Rejected: trusting accepted flags, old outputs, serialized symbol labels or exit zero alone.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {parse} from './round11-log-parser.mjs';
const base=process.argv[2],root=process.cwd(),started=Date.now();
assert(base?.startsWith('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2Q-11/round11/'));
const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const self=sha(fs.readFileSync(import.meta.filename));
const lockroot='/Users/sam/projects/triplex-db-2/lab/locks/heavy';
const own=fs.readdirSync(lockroot).map(n=>`${lockroot}/${n}/owner.json`).filter(f=>fs.existsSync(f)&&read(f).pid===process.ppid&&read(f).label==='CX-VP2Q-11-R11-seal');assert.equal(own.length,1);
const ownerFile=own[0],ownerBytes=fs.readFileSync(ownerFile);
const head=git('rev-parse','HEAD');assert.equal(head,'9820507c14f0560779bccf92df5941f19324389c');
const specs={
 'earlier-offline':[802,0,816],'new-offline':[37,0,43],'foundation-inspection-retry':[46,0,46],'package-inspection-retry':[224,0,250],core:[28,0,28],
 'core-tsc':null,'qlever-source-tsc':null,'earlier-live':[54,0,54],'new-live':[7,0,14],'catalog-negative':[121,1,122],
 'independent-extension-fixture-retry':[7,0,7],
 'native-foreign':[3,1,11],'native-symbol':[4,0,11],'native-hidden':[4,0,11],'native-string':[2,0,6],
 'inventory-baseline':[2,0,5],'inventory-direct-count-retry':[2,1,6],'inventory-inherited-count-retry':[2,1,6],'inventory-merged-count-retry':[2,1,6],
};
const rejectedReasons={foundation:'sandbox process-list denial',package:'sandbox process-list denial and explicitly recorded abort','independent-extension':'review fixture incorrectly used assignment over an inherited non-writable property','inventory-direct':'controller expected three passes; actual selected set has two passes and one intentional failure','inventory-inherited':'same expected-count error','inventory-merged':'same expected-count error'};
const gates={};
const sourceProofs=new Map();
for(const dir of fs.readdirSync(base).filter(n=>fs.existsSync(`${base}/${n}/receipt.json`))){
 const file=`${base}/${dir}/receipt.json`,r=read(file),log=`${base}/${dir}/command.log`;
 assert.equal(r.head,head);assert.equal(r.target,git('rev-parse','be588639'));assert(r.finished>=r.started&&r.finished<=started);
 assert(r.fresh&&r.sourceStillMatches&&r.heavySlotStillMatches);assert.equal(sha(fs.readFileSync(log)),r.logSha256);
 assert.equal(sha(JSON.stringify(r.heavySlot.owner,null,2)+'\n'),r.heavySlot.sha256);assert(r.heavySlot.owner.label.startsWith('CX-VP2Q-11-R11'));
 for(const p of r.preimages){
  if(sourceProofs.has(p.file+'|'+p.sha256))continue;
  const current=p.file,archived=path.join(base,'preimages',p.file);
  const from=fs.existsSync(current)&&sha(fs.readFileSync(current))===p.sha256?current:archived;
  assert.equal(sha(fs.readFileSync(from)),p.sha256,p.file);sourceProofs.set(p.file+'|'+p.sha256,from);
 }
 let tests=[],counts=null;
 if(typeof r.expected==='object'){
  const result=`${base}/${dir}/vitest.json`,d=read(result);assert.equal(sha(fs.readFileSync(result)),r.resultSha256);
  assert(d.startTime>=r.started&&d.startTime<=r.finished);assert(fs.statSync(result).mtimeMs>=r.started&&fs.statSync(result).mtimeMs<=r.finished);
  tests=d.testResults.flatMap(s=>s.assertionResults);counts=[tests.filter(t=>t.status==='passed').length,tests.filter(t=>t.status==='failed').length,tests.length];
  assert.equal(d.numPassedTests,counts[0]);assert.equal(d.numFailedTests,counts[1]);assert.equal(d.success,counts[1]===0);
  if(specs[dir]){assert.deepEqual(counts,specs[dir]);assert.equal(r.code,counts[1]?1:0);}
 }else {assert.equal(r.code,0);assert.equal(fs.readFileSync(log).length,0);}
 if(dir in specs){assert(r.accepted&&r.contentMatches,dir);assert.deepEqual(counts,specs[dir]);}
 else {assert(dir in rejectedReasons,dir);assert.equal(r.accepted,false);}
 if(dir==='catalog-negative')assert.match(tests.find(t=>t.status==='failed').failureMessages.join('\n'),/UND_ERR_QA_ADDED_TRANSPORT/);
 if(dir==='native-foreign')assert.match(tests.find(t=>t.status==='failed').failureMessages.join('\n'),/unconstructed read: Symbol\(round10NativeRead\)/);
 if(dir.startsWith('inventory-')&&dir!=='inventory-baseline')assert.match(tests.find(t=>t.status==='failed').fullName,/inventory requires/);
 if(dir==='foundation')assert.match(fs.readFileSync(log,'utf8'),/pgrep: Cannot get process list/);
 if(dir==='package')assert.match(fs.readFileSync(log,'utf8'),/pgrep: Cannot get process list/);
 gates[dir]={r,tests,file,counts,receiptSha256:sha(fs.readFileSync(file))};
}
for(const name of Object.keys(specs))assert(gates[name],name);
assert.equal(new Set(Object.values(gates).map(g=>g.r.attempt)).size,Object.keys(gates).length);
const observed=(name,file)=>{const p=`${base}/${name}/cases/${file}`,r=gates[name].r;assert(fs.statSync(p).mtimeMs>=r.started&&fs.statSync(p).mtimeMs<=r.finished);return read(p)};
const keys=observed('independent-extension-fixture-retry','round11-public-runtime-keys.json');
assert.equal(keys.length,4);for(const x of keys){assert.deepEqual(new Set(x.runtime),new Set(x.typed.filter(k=>!x.absentOptionalNonReads.includes(k))));assert.deepEqual(x.absentOptionalNonReads,x.name==='adapter'?['validateConstraints']:[]);}
const routes=observed('independent-extension-fixture-retry','round11-extension-routes.json');assert.equal(routes.length,80);assert(routes.every(x=>x.rejected));assert.equal(new Set(routes.map(x=>x.name+'/'+x.route)).size,80);
for(const kind of ['baseline','direct','inherited','merged','laundered']){const x=observed('independent-extension-fixture-retry',`round10-checker-${kind}.json`);if(['baseline','laundered'].includes(kind)){assert.deepEqual(x.implementationDiagnostics,[]);assert.deepEqual(x.coverageDiagnostics,[])}else{assert.match(JSON.stringify(x.implementationDiagnostics),/round10Read/);assert.match(JSON.stringify(x.coverageDiagnostics),/round10Read/);}}
const native=[];
for(const variant of ['foreign','symbol','hidden','string']){
 const d=observed(`native-${variant}`,'round10-native-mutation.json');assert.deepEqual(d.diagnostics,[]);assert.deepEqual(new Set(d.typedKeys),new Set(d.runtimeKeys));assert.equal(d.required,6144);assert.equal(d.replicaObserved,3071);
 if(variant==='foreign'){assert.equal(d.privateReadQualified,false);assert.match(d.guardError,/unconstructed read: Symbol\(round10NativeRead\)/);assert.deepEqual(d.outcome,{ok:true,value:{rows:[]}});assert.equal(d.gateCalls,0);assert.equal(d.maskCalls,0);}
 else {assert(d.privateReadQualified);assert.equal(d.guardError,null);assert.equal(d.outcome.ok,false);assert.equal(d.outcome.error.reason,'basis-not-reached');assert.equal(d.outcome.error.required,6144);assert.equal(d.outcome.error.observed,3071);assert.equal(d.outcome.error.replica,'the QLever replica');assert(d.gateCalls>0);}
 native.push(d);
}
for(const kind of ['direct','inherited','merged']){const x=observed(`inventory-${kind}-count-retry`,'round10-added-read-observation.json');assert(x.names.includes('round10Read')&&x.requested>x.observed);assert.deepEqual(x.value,[]);assert.equal(x.gateCalls,0);assert.equal(x.maskCalls,0);}
const coverage=observed('new-offline','round8-policy-coverage.json');assert.equal(coverage.length,48);assert(coverage.every(x=>x.checkedRequired===x.expectedRequired&&x.checkCalls>0));
let comparisons=0;
function bytes(g,file,count){const x=observed(g,file),rows=Array.isArray(x)?x:[x];assert.equal(rows.filter(r=>r.supported!==false).length,count);for(const r of rows){if(r.supported===false){assert.equal(r.error._tag,'DatalogValidationError');assert.equal(r.beforeError._tag,'DatalogValidationError');continue;}assert.equal(typeof r.before,'string');assert.equal(r.after,r.before);comparisons++;}}
for(const kind of ['overlay','log','replica'])bytes('new-offline',`round8-${kind}-immutable.json`,12);
bytes('new-offline','round8-model-implicit-pin.json',2);bytes('new-offline','round8-model-entity-page.json',1);
for(const kind of ['standard','fresh'])bytes('new-live',`round8-${kind}-immutable.json`,27);
bytes('new-live','round8-live-implicit-pin.json',2);bytes('new-live','round8-live-entity-page.json',1);
for(const [g,k,n] of [['new-offline','offline',6],['new-live','standard',10],['new-live','fresh',10]]){const rows=observed(g,`round8-${k}-public-future.json`);assert.equal(rows.length,n);for(const x of rows){assert.equal(x.ok,false);assert.equal(x.error.reason,'basis-not-reached');assert.equal(x.error.required,x.future);assert(x.error.observed<x.error.required);}}
const retirements=[];
for(const kind of ['standard','fresh']){
 const x=observed('new-live',`round8-${kind}-journal-immutable.json`),before=JSON.parse(x.before);assert.equal(before.transactions.length,1);assert.equal(before.snapshotPosition,x.first);
 for(const k of ['after','transaction','afterMetadata','transactionAfterMetadata']){assert.equal(x[k],x.before);comparisons++;}
 const tx=before.transactions[0].txId,state=gates['new-live'].r.inputs.state,matches=[];
 for(const entry of fs.readdirSync(state).filter(n=>n.startsWith('round8-journal-live-'))){const file=path.join(state,entry,'segment-000001.log'),b=fs.readFileSync(file),rows=parse(b).filter(r=>r.row.entity_id===tx&&r.row.attribute===':_tx/position');if(rows.length)matches.push({file,b,rows});}
 assert.equal(matches.length,1);const {file,b,rows}=matches[0];assert.equal(rows.length,2);const [initial,retired]=rows;assert(initial.lsn<retired.lsn);
 for(const k of ['retracted_at','retracted_position','retract_tx_id'])assert.equal(initial.row[k],null);
 assert.equal(initial.row.recorded_position,x.first);assert.equal(initial.row.value_number,x.first);assert.equal(retired.row.retract_tx_id,'internal-fixture-retirement');assert(retired.row.retracted_position>x.first&&retired.row.retracted_at>initial.row.recorded_at);
 for(const k of Object.keys(initial.row).filter(k=>!['retracted_at','retracted_position','retract_tx_id'].includes(k)))assert.deepEqual(retired.row[k],initial.row[k]);
 retirements.push({file,sha256:sha(b),initial,retired});
}
assert.equal(comparisons,104);
assert.equal(git('diff','be588639','--','packages/core/src','packages/qlever/src','.changeset'),'');assert.equal(git('diff','be588639','--','lab/acceptance'),'');
const changed=git('diff','--name-only','1096fb86','be588639','--','packages','.changeset').split('\n');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.isFile()?[path.join(d,e.name)]:[]);
const refs=walk('/Users/sam/projects/triplex-db-2/lab/acceptance');
const hashes=changed.map(file=>({file,oldSha256:sha(execFileSync('git',['show',`1096fb86:${file}`])),newSha256:sha(fs.readFileSync(file)),acceptanceReferences:refs.filter(f=>fs.readFileSync(f).includes(Buffer.from(file)))}));
assert.equal(hashes.length,7);assert(hashes.every(x=>x.acceptanceReferences.length===0));
fs.writeFileSync('lab/verify/P2Q/source-hashes-round11.json',JSON.stringify(hashes,null,2)+'\n',{flag:'wx'});
assert.equal(sha(fs.readFileSync(import.meta.filename)),self);assert.equal(sha(fs.readFileSync(ownerFile)),sha(ownerBytes));
const summary={verdict:'ACCEPT',scope:'default-off integration only; Q91a timings DIAGNOSTIC',head,builder:'be588639',started,finished:Date.now(),selfSha256:self,heavySlot:{file:ownerFile,sha256:sha(ownerBytes),owner:JSON.parse(ownerBytes)},gates:Object.fromEntries(Object.entries(gates).map(([n,g])=>[n,{accepted:n in specs,counts:g.counts,receiptSha256:g.receiptSha256,attempt:g.r.attempt,reason:rejectedReasons[n]??null}])),fullByteComparisons:comparisons,publicKeys:keys,extensionRoutes:80,nativeMutations:native,retirements,sourceHashes:hashes,sourceProofCount:sourceProofs.size};
fs.writeFileSync(`${base}/SUMMARY.json`,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({verdict:summary.verdict,adoptedGates:Object.keys(specs).length,preservedRejected:Object.keys(rejectedReasons).length,fullByteComparisons:comparisons,extensionRoutes:80}));
