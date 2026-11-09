// [EXP-OBS01] Why: summarize frozen CLI verdicts and freshly inspected owned-resource cleanup separately.
// Rejected: converting collection exit zero or existence of a seal file into protocol acceptance.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {ENGINE_DIR,POOL_FILE,readJson,listTx2Containers} from '../bin/lib.mjs';import {sameResident} from '../bin/resident-observer.mjs';
const round=process.env.OBS01_ROUND??'4';if(!['4','5'].includes(round))throw new Error('unknown report round');
const cohort=process.env.OBS01_SCREEN_ID??(round==='5'?'final':'a03');if(!/^[a-z0-9_-]+$/.test(cohort))throw new Error('unsafe cohort');
const suffix=round==='5'&&cohort!=='final'?'-'+cohort:'';
const base=path.resolve('lab/experiments/EXP-OBS01/round'+round),rows=readJson(path.join(base,'cli-results-'+cohort+'.json')),selected=rows.filter(r=>r.mode==='selected'),negative=rows.filter(r=>r.mode!=='selected');
assert.equal(selected.length,round==='5'?10:14);assert.equal(negative.length,round==='5'?20:28);
for(const row of rows){
 const file=path.join(base,row.attempt,row.protocol.replace('OBS-',''),'cli-'+cohort,row.mode+'.stdout.json');
 const observed=readJson(file);assert.equal(observed.verdict,row.verdict);assert.deepEqual(observed.reasons,row.reasons);
 assert.equal(row.exit,{PASS:0,FAIL:1,REFUSED:2}[row.verdict]);
}
const attempts=[];
for(const name of fs.readdirSync(path.join(ENGINE_DIR,'observers')).filter(n=>n.startsWith('obs01-r'+round+'-'))){
 const root=path.join(ENGINE_DIR,'observers',name),before=readJson(path.join(root,'resident-before.json'),null),after=readJson(path.join(root,'resident-after.json'),null),stopped=readJson(path.join(root,'stopped.json'),null);
 const identityUnchanged=Boolean(before&&after&&sameResident(before,after));assert(identityUnchanged);assert(stopped?.absent);
 attempts.push({runId:name,sealFilePresent:fs.existsSync(path.join(root,'output/bundle/seal.json')),retentionPublished:fs.existsSync(path.join(root,'retention.json')),identityUnchanged,observerRemovalObserved:stopped.absent,terminalAuditFile:fs.existsSync(path.join(root,'integrity.stdout.json'))?'integrity.stdout.json':'container-stderr.txt',terminalAuditFileSha256:createHash('sha256').update(fs.readFileSync(fs.existsSync(path.join(root,'integrity.stdout.json'))?path.join(root,'integrity.stdout.json'):path.join(root,'container-stderr.txt'))).digest('hex')});
}
const ownReservations=readJson(POOL_FILE()).reservations.filter(r=>r.holder==='CX-OBS01-R'+round||r.container?.startsWith('tx2-obs-resident-obs01-r'+round+'-'));
const ownContainers=listTx2Containers({all:true}).filter(c=>c.name.startsWith('tx2-obs-resident-obs01-r'+round+'-'));
assert.equal(ownReservations.length,0);assert.equal(ownContainers.length,0);
const result={qualification:'screening-only; remaining source gaps are explicit in the report',cliInput:'cli-results-'+cohort+'.json',selectedCounts:Object.fromEntries(['PASS','FAIL','REFUSED'].map(v=>[v,selected.filter(r=>r.verdict===v).length])),guardNegatives:negative.length,guardRefusals:negative.filter(r=>r.verdict==='REFUSED'&&r.exit===2).length,ownReservations,ownContainers,attempts,protocols:selected};
fs.writeFileSync(path.join(base,'cleanup-final'+suffix+'.json'),JSON.stringify({ownReservations,ownContainers,attempts},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(base,'summary'+suffix+'.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,attempts:attempts.length,protocols:undefined}));
