// [EXP-G03-R6] Why: reviewers must recompute receipt links and TAP counts from retained bytes. Rejected: trusting an index's PASS label or declared repetition count.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {faultWitnessOk} from '../../../bin/claim.mjs';
const root=import.meta.dirname,read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const index=json('INDEX.json');
for(const name of ['fullCommittedSuite','finalNSComponents']){const row=index.results[name],tap=read(row.receipt).toString();for(const [label,key]of [['pass','passed'],['fail','failed'],['skipped','skipped']])assert.equal(Number(tap.match(new RegExp('^# '+label+' (\\d+)$','m'))?.[1]),row[key]);assert.match(tap,/^# cancelled 0$/m);}
// [EXP-G03-R6] Why: an old receipt must use its exact authority's schema. Rejected: reading a moving main ref or a later working-tree contract.
assert.match(index.mergeMain,/^[a-f0-9]{40}$/);
const n=json('fault-objects-v2/nine-injections.json'),schemas=JSON.parse(execFileSync('git',['--no-replace-objects','show',index.mergeMain+':lab/acceptance/obligations.json'],{cwd:path.resolve(root,'../../../..'),maxBuffer:128*1024*1024})).evidenceSchemas;
assert.equal(n.binding.slot,'OFFLINE-SYNTHETIC');assert.equal(n.qualification,false);assert.equal(n.witnesses.length,9);
const attempts=new Set(),nonces=new Set(),counts={},reps=new Map();let snapshots=0;
function object(h){assert.match(h,/^[a-f0-9]{64}$/);const b=read('fault-objects-v2/'+h+'.json');assert.equal(sha(b),h);return JSON.parse(b)}
for(const w of n.witnesses){assert.ok(faultWitnessOk(w,{id:w.obligation},{id:w.case},w.mode,w.rep,{schemas}));object(sha(Buffer.from(JSON.stringify(w))));const e=object(w.eventsSha256);assert.deepEqual(e.binding,n.binding);assert.equal(e.caseId,w.case);assert.equal(e.qualification,false);assert.equal(e.target.role,'consumer');assert.ok(!attempts.has(e.attempt));attempts.add(e.attempt);assert.ok(!nonces.has(e.hook.nonce));nonces.add(e.hook.nonce);counts[e.hook.point]=(counts[e.hook.point]??0)+1;
 const pair=e.transitionEvents.filter(t=>t.durableEvidenceObject).map(t=>{const d=object(t.durableEvidenceObject);assert.equal(d.attempt,e.attempt);assert.deepEqual(d.binding,n.binding);assert.equal(d.targetId,e.target.id);assert.equal(d.volume,e.target.volume);assert.equal(d.rowCount,d.effects.length);assert.equal(sha(Buffer.from(d.walBase64,'base64')),d.walSha256);snapshots++;return d});
 assert.equal(pair.length,2);assert.equal(pair[0].phase,'paused');assert.equal(pair[1].phase,'recovered');assert.equal(w.injectedAt,Number(pair[0].observedAtNs));assert.equal(e.replay.actualSha256,sha(Buffer.from(JSON.stringify(pair[1].effects))));assert.equal(e.replay.equal,e.replay.actualSha256===e.replay.expectedSha256);
 const proof=e.transitionEvents.find(t=>t.transition==='cgroup-gone').proof;assert.equal(proof.cgroupGone,true);assert.equal(proof.attempt,e.attempt);assert.equal(proof.id,e.target.id);assert.equal(proof.removed,e.target.name);assert.equal(proof.signal,'SIGKILL');const restart=e.transitionEvents.find(t=>t.transition==='recovered').restarted;assert.notEqual(restart.id,e.target.id);assert.equal(restart.volume,e.target.volume);assert.equal(restart.role,'consumer');assert.equal(e.callerOutcome,'hook-acknowledged; target-killed-before-release');
 const rs=reps.get(e.hook.point)??[];rs.push(w.rep);reps.set(e.hook.point,rs);
}
assert.deepEqual(counts,n.counts);for(const point of ['before-effect','after-effect','after-checkpoint']){assert.equal(counts[point],3);assert.deepEqual(reps.get(point),[1,2,3])}assert.equal(snapshots,18);
for(const line of read('SHA256SUMS').toString().trim().split('\n')){const [,h,p]=line.match(/^([a-f0-9]{64})  (.+)$/)??[];assert.ok(p&&!p.split('/').includes('..')&&!path.isAbsolute(p));assert.equal(sha(read(p)),h,p)}
console.log(JSON.stringify({status:'DIAGNOSTIC',qualification:false,fullSuite:index.results.fullCommittedSuite.passed,finalNS:index.results.finalNSComponents.passed,witnesses:n.witnesses.length,snapshots,counts,checksumManifest:'verified'}));
