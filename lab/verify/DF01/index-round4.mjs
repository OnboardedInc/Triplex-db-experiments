import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// [CX-VDF01-R4] Why: publish only complete source-bound observations with independently expected mixed-fact content.
// Rejected: promoting exit zero alone or silently adopting earlier fixture/results after a failed attempt.
const review=import.meta.dirname,root=path.resolve(review,'../../..');
const name=process.argv[2]; assert.match(name??'',/^attempt-[0-9]+$/);
const out=path.join(review,'round4',name);
const read=file=>JSON.parse(fs.readFileSync(path.join(out,file),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const identity=read('inputs.json'),result=read('result.json');
assert.ok(result.coreOK&&result.tsOK&&result.cljOK);
assert.equal(identity.slot,null);assert.equal(identity.offline,true);
assert.ok(Date.parse(result.finishedAt)>=Date.parse(identity.startedAt));
assert.ok(identity.parentGrant.pid>0&&identity.availableDiskBytes>5*1024**3);
for(const [file,hash] of Object.entries(result.outputs))assert.equal(sha(fs.readFileSync(path.join(out,file))),hash);
for(const [file,hash] of Object.entries(identity.inputs))assert.equal(sha(fs.readFileSync(path.resolve(root,file))),hash);
const bindings=JSON.parse(fs.readFileSync(path.join(review,'round4/source-bindings.json')));
for(const b of bindings.bindings){
 const bytes=fs.readFileSync(path.join(review,b.copy));assert.equal(sha(bytes),b.sha256);
 assert.equal(sha(execFileSync('git',['show',`${b.commit}:${b.file}`],{cwd:root})),b.sha256);
}
for(const [file,hash] of Object.entries(bindings.coreInputs)){
 assert.equal(sha(fs.readFileSync(path.join(root,file))),hash);
 assert.equal(sha(execFileSync('git',['show',`302a7a63:${file}`],{cwd:root})),hash);
}
const core=read('core.json'),feeds=read('feeds.json');
assert.equal(core.numPassedTests,2);assert.equal(core.numFailedTests,0);
assert.equal(feeds.numPassedTests,1);assert.equal(feeds.numFailedTests,0);
assert.match(fs.readFileSync(path.join(out,'datomic.stdout.log'),'utf8'),/Ran 1 tests containing 88 assertions\.\s+0 failures, 0 errors\./);
const fixture=read('fixture.json'),ts=read('typescript-results.json'),datomic=read('datomic-results.json');
assert.equal(fixture.length,11);assert.equal(ts.length,fixture.length);assert.equal(datomic.length,fixture.length);
const sorted=xs=>[...xs].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
for(const c of fixture){
 const t=ts.find(r=>r.name===c.name),d=datomic.find(r=>r.name===c.name);assert.ok(t&&d);
 const tx=d.page.rows[0].transaction;
 const common=sorted(tx.changes.map(r=>[r.op,r.entity,r.attribute,r.validFrom,r.validTo,Number(r.position)]));
 assert.deepEqual(common,t.expected);assert.deepEqual(t.normalized,t.expected);
 assert.deepEqual(sorted(tx.changes.map(r=>r.assertionId)),sorted(c.expectedIds));
 assert.deepEqual(tx.positions,c.positions.map(String));assert.deepEqual(sorted(tx.txIds),sorted(c.txIds));
 assert.deepEqual(sorted(t.broker.txIds),sorted(c.txIds));assert.deepEqual(sorted(JSON.parse(t.carrier[8])),sorted(c.txIds));
 assert.equal(tx.stamp,'4000');assert.equal(d.page.rows[0].kind,'commit');
 assert.deepEqual(t.p2x.resolutions[0].transacts.map(r=>r.ordinal),c.positions.map((_,i)=>i));
}
const summary={verdict:'ACCEPT-OFFLINE',scope:'R47-c journal predicate only; no live engine qualification or pending-ruling approval',attempt:name,startedAt:identity.startedAt,finishedAt:result.finishedAt,slot:null,coreTests:2,sharedFixtures:11,datomicAssertions:88,sources:identity.sources,outputs:result.outputs};
const summaryPath=path.join(review,'round4/summary.json');
if(fs.existsSync(summaryPath))assert.deepEqual(JSON.parse(fs.readFileSync(summaryPath,'utf8')),summary);
else fs.writeFileSync(summaryPath,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
const entries=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isSymbolicLink())continue;if(e.isDirectory())walk(file);else if(!file.endsWith('/SHA256SUMS'))entries.push(file);}}
walk(path.join(review,'round4'));
entries.push(...['prepare-round4.mjs','run-round4.mjs','round4_verify.clj','round4-core.test.ts','round4-feeds.test.ts','round4-feeds.config.ts','index-round4.mjs','seal-round4.mjs','VERIFY-round4.md'].map(p=>path.join(review,p)));
const records=entries.sort().map(file=>({file,hash:sha(fs.readFileSync(file))}));
fs.writeFileSync(path.join(review,'round4/SHA256SUMS'),records.map(r=>`${r.hash}  ${path.relative(root,r.file)}`).join('\n')+'\n');
for(const record of records)assert.equal(sha(fs.readFileSync(record.file)),record.hash);
console.log(JSON.stringify({...summary,checksumFiles:records.length,manifestVerified:true}));
