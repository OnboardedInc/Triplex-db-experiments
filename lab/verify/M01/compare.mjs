// [CX-VM01R] Why: compare stable observations, and retain elapsed times as measurements rather than requiring equality on a shared host. Rejected: comparing whole timestamped JSON byte for byte.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const here=import.meta.dirname, hash=b=>createHash('sha256').update(b).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(path.join(here,file),'utf8'));
const out={reviewed:'f45d479a313f2679db892ea8e773f0c6c0a27d76',main:'1a83095c97885e3865c88b3985ecddb036276881',config:[],dryRuns:[],drivers:[]};
const a=read('main-harness.json'),b=read('reviewed-harness.json');assert.deepEqual(a,b);
out.config={equal:true,slots:Object.keys(a.slots).length,followers:Object.keys(a.followers).length,verdictFixtures:Object.keys(a.verdicts).length,admissionFixtures:a.admission.length,normalized:'Only absolute generated config directory; no effective hashes or Docker arguments removed'};
const da=read('main-dry-runs.json'),db=read('reviewed-dry-runs.json');
for(let i=0;i<da.length;i++){
 const x=da[i],y=db[i];assert.deepEqual(x.args,y.args);assert.equal(x.code,y.code);
 assert.equal(x.stdout,y.stdout);assert.equal(x.stderr.replaceAll('|PAIR',''),y.stderr.replaceAll('|PAIR',''));
 out.dryRuns.push({args:x.args,code:x.code,equal:true,usageNormalization:x.code===0?null:'Additive |PAIR in usage text'});
}
const invariant=x=>({
 format:x.format,semantics:x.semantics,status:x.status,
 config:Object.fromEntries(Object.entries(x.config).filter(([k])=>!['arm','roundPlan','barrierDir','startAtAbsMs'].includes(k))),
 generator:x.generator,trace:x.trace,
 seed:Object.fromEntries(['plannedSubjects','seededSubjects','complete','commands','assertions','expectedAssertions','assertionsMatchClosedForm','failureCount','failures'].map(k=>[k,x.seed[k]])),
 phases:x.phases.map(p=>({idx:p.idx,name:p.name,readers:p.readers,mode:p.mode,measured:p.measured,...(p.history?{history:Object.fromEntries(Object.entries(p.history).filter(([k])=>k!=='wallS'))}:{})})),
 correctness:{violations:x.correctness.violations,errors:x.correctness.errors,violationKinds:x.correctness.violationKinds},
 feed:{gaps:x.priorities.P3.gaps,visibleDuplicateEffects:x.priorities.P3.visibleDuplicateEffects,replayExact:x.priorities.P3.replay.exact,replayMismatches:x.priorities.P3.replay.mismatches,crashes:x.priorities.P3.crashes.map(c=>({point:c.point,fired:c.fired})),unreached:x.priorities.P3.notReachedAtStop.count,orderViolations:x.priorities.P3.counts.orderViolations,affectedMismatches:x.priorities.P3.counts.affectedMismatches},
 oracle:x.oracle,
 histograms:Object.keys(x.histograms).sort(),priorities:Object.keys(x.priorities),pair:x.pair??null,
});
for(const profile of ['baseline','readers']){
 const file=role=>`runtime/${role}/runs/${profile}-2/report.json`;
 const xa=read(file('main')),xb=read(file('reviewed'));
 const ia=invariant(xa),ib=invariant(xb);
 assert.deepEqual(ia,ib);
 for(const x of [xa,xb]){
  assert.equal(x.status,'DONE');assert.equal(x.correctness.violations,0);assert.equal(x.correctness.errors,0);
  assert.equal(x.priorities.P3.gaps,0);assert.equal(x.priorities.P3.notReachedAtStop.count,0);assert.equal(x.priorities.P3.replay.exact,true);
  assert.equal(x.priorities.P3.notReachedAtStop.wind.target,x.priorities.P3.notReachedAtStop.wind.checkpointAtStop);
 }
 const writes=role=>fs.readFileSync(path.join(here,`runtime/${role}/runs/${profile}-2/ns-writes.jsonl`),'utf8').trim().split('\n').filter(Boolean).map(s=>{const {latencyMs,offsetMs,...rest}=JSON.parse(s);return rest.stream==='background'?{...rest,offsetMs}:rest;});
 const wa=writes('main'),wb=writes('reviewed');assert.deepEqual(wa,wb);
 out.drivers.push({profile,equal:true,sourceHashes:{main:xa.benchSources,reviewed:xb.benchSources},reportHashes:Object.fromEntries(['main','reviewed'].map(role=>[role,hash(fs.readFileSync(path.join(here,file(role))))])),invariants:ia,writerCommands:wa,observations:{main:{reads:xa.correctness.reads,writer:xa.writer,feed:xa.priorities.P3.notReachedAtStop.wind},reviewed:{reads:xb.correctness.reads,writer:xb.writer,feed:xb.priorities.P3.notReachedAtStop.wind}},excludedFromEquality:['wall timestamps and random scope/run IDs','new PAIR config fields (null)','source manifest additions and changed hashes','latency, goodput, CPU, ELU and histograms of real execution times','read sample totals and timing-dependent feed polling/retry counts','P5 overlay start offsets (triggered by phase entry, not frozen background trace)']});
}
console.log(JSON.stringify(out,null,2));
