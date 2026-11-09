// [EXP-OBS01] Why: summarize frozen CLI verdicts and freshly inspected owned-resource cleanup separately.
// Rejected: converting collection exit zero or existence of a seal file into protocol acceptance.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {ENGINE_DIR,POOL_FILE,readJson,listTx2Containers} from '../bin/lib.mjs';import {sameResident} from '../bin/resident-observer.mjs';
const base=path.resolve('lab/experiments/EXP-OBS01/round4'),rows=readJson(path.join(base,'cli-results-a03.json')),selected=rows.filter(r=>r.mode==='selected'),negative=rows.filter(r=>r.mode!=='selected');
assert.equal(selected.length,14);assert.equal(negative.length,28);
for(const row of rows){
 const file=path.join(base,row.attempt,row.protocol.replace('OBS-',''),'cli-a03',row.mode+'.stdout.json');
 const observed=readJson(file);assert.equal(observed.verdict,row.verdict);assert.deepEqual(observed.reasons,row.reasons);
 assert.equal(row.exit,{PASS:0,FAIL:1,REFUSED:2}[row.verdict]);
}
const attempts=[];
for(const name of fs.readdirSync(path.join(ENGINE_DIR,'observers')).filter(n=>n.startsWith('obs01-r4-'))){
 const root=path.join(ENGINE_DIR,'observers',name),before=readJson(path.join(root,'resident-before.json'),null),after=readJson(path.join(root,'resident-after.json'),null),stopped=readJson(path.join(root,'stopped.json'),null);
 const identityUnchanged=Boolean(before&&after&&sameResident(before,after));assert(identityUnchanged);assert(stopped?.absent);
 attempts.push({runId:name,sealFilePresent:fs.existsSync(path.join(root,'output/bundle/seal.json')),retentionPublished:fs.existsSync(path.join(root,'retention.json')),identityUnchanged,observerRemovalObserved:stopped.absent,integrityFileSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'integrity.stdout.json'))).digest('hex')});
}
const ownReservations=readJson(POOL_FILE()).reservations.filter(r=>r.holder==='CX-OBS01-R4'||r.container?.startsWith('tx2-obs-resident-obs01-r4-'));
const ownContainers=listTx2Containers({all:true}).filter(c=>c.name.startsWith('tx2-obs-resident-obs01-r4-'));
assert.equal(ownReservations.length,0);assert.equal(ownContainers.length,0);
const result={qualification:'screening-only; ten original source gaps remain unresolved',cliInput:'cli-results-a03.json',selectedCounts:Object.fromEntries(['PASS','FAIL','REFUSED'].map(v=>[v,selected.filter(r=>r.verdict===v).length])),guardNegatives:negative.length,guardRefusals:negative.filter(r=>r.verdict==='REFUSED'&&r.exit===2).length,ownReservations,ownContainers,attempts,protocols:selected};
fs.writeFileSync(path.join(base,'cleanup-final.json'),JSON.stringify({ownReservations,ownContainers,attempts},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(base,'summary.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,attempts:attempts.length,protocols:undefined}));
