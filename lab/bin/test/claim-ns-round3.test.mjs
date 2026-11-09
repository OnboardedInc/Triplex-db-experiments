// [EXP-CRNS-R3] Why: keep valid controls and require a finding-specific refusal on unchanged independent pins.
// Rejected: a generic REFUSED assertion caused by an unrelated schema, storage or companion mismatch.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture,run,codes,h,clone,ladder,p4Sequential} from '../../verify/CRNS/fixture.mjs';
import {recomputeNS,canonText,nsP1Ladder,nsP5Traffic} from '../claim.mjs';
import {positiveP5,traffic,sweepPlan,firstSecondOnly} from '../../verify/CRNS/round2/fixtures.mjs';
import {completeFixture,attachIndependentCrash,reseal,calibration} from './ns-round2-fixture.mjs';
const refuse=(f,code)=>{const r=run(f);assert.equal(r.status,'REFUSED');assert.ok(codes(r).includes(code),canonText(r));assert.notEqual(r.bars.P3?.met,true);return r;};
function mutantCrash(f,mutate) {const c=f.trusted.crashRun,raw=JSON.parse(c.bundle.payload);mutate(raw.events);f.trusted.crashRun=reseal(raw,c.trusted);}

test('NF1 every reader counted as P3/P2 load must answer correctly at its requested basis',()=>{
 for(const priorities of [['P3'],['P3','P2']]) {
  const f=fixture();f.trusted.priorities=priorities;attachIndependentCrash(f);
  // P2 band coverage is separately tested; this mutation requires the answer-specific refusal in any priority set.
  f.raw.events.reads[0].answerSha256=h('garbage');refuse(f,'NS-P1-VIOLATIONS-MAX');
 }
});
test('NF2 witness times and injection ids must identify distinct planned in-traffic crashes',()=>{
 for(const mutate of [e=>{e.faults[0].events[0].t='0';},e=>{e.faults[1].events[0].t=e.faults[0].events[0].t;},e=>{e.faults[1].injectionId=e.faults[0].injectionId;}]) {
  const f=fixture();mutantCrash(f,e=>{mutate(e);for(const w of e.faults)w.eventsSha256=h(canonText(w.events));});refuse(f,'P3-RESUME-MISSING');
  const c=f.trusted.crashRun;assert.ok(recomputeNS(c.bundle,c.trusted).reasons.some(r=>r.code==='FAULT-WITNESS-INVALID'));
 }
});
test('NF2 checkpoint/recovery brackets and decoded fault-point snapshots bind each crash',()=>{
 for(const mutate of [e=>{e.faults[0].events[0].t=e.consumerBrackets[1].U;},e=>{const w=e.faults[3],s=JSON.parse(Buffer.from(w.snapshotHex,'hex').toString());s.effectState='committed';w.snapshotHex=Buffer.from(canonText(s)).toString('hex');}]) {
  const f=fixture();mutantCrash(f,e=>{mutate(e);for(const w of e.faults)w.eventsSha256=h(canonText(w.events));});const c=f.trusted.crashRun;assert.ok(recomputeNS(c.bundle,c.trusted).reasons.some(r=>r.code==='FAULT-WITNESS-INVALID'));refuse(f,'P3-RESUME-MISSING');
 }
});
test('NF3 pre-applied frozen commands refuse publication before the first offer',()=>{const f=fixture(),e=f.raw.events;e.sourceBrackets[0].L='999000000';e.sourceBrackets[0].U='999100000';e.crossChecks.find(c=>c.role==='source'&&c.position==='1').atNs='999000000';refuse(f,'PUBLISHED-BEFORE-OFFER');});
test('NF4 oracle-invalid published commands refuse even with an otherwise valid receipt',()=>{const f=fixture();f.trusted.commandValid=o=>o.commandId!=='cmd1';attachIndependentCrash(f);refuse(f,'INVALID-COMMAND-PUBLISHED');});
test('NF5 lag population is frozen schedule membership; delayed publication remains infinite lag',()=>{
 const f=fixture(),e=f.raw.events;Object.assign(e.sourceBrackets[1],{L:'3100000000',U:'3101000000'});Object.assign(e.consumerBrackets[1],{L:'3110000000',U:'3111000000'});e.offers[1].ackAtNs='3102000000';e.crossChecks.filter(c=>c.position==='2').forEach(c=>{c.atNs=c.role==='source'?'3100000000':'3111000000';});
 const r=refuse(f,'LAG-SAMPLES-SHORT');assert.equal(r.measurements.P3.lag.pooled.count,2);assert.equal(r.measurements.P3.lag.pooled.p99Ms,Infinity);
 f.trusted.minimumSamples.lag[f.raw.binding.attemptId]=1;refuse(f,'LAG-POPULATION-UNBOUND');
});
test('NF6 candidate baselines cannot inflate the independent calibration budget up to the absolute bar',()=>{
 const windows=ladder();for(const w of windows)w.offers[0].ackAtNs=String(BigInt(w.offers[0].scheduledAtNs)+BigInt(w.level===0?48:60)*1000000n);
 assert.equal(nsP1Ladder(windows,()=>h('correct'),[],calibration()).met,false);
 const s=traffic();s.baseline.offers.forEach(o=>o.ackAtNs=String(BigInt(o.scheduledAtNs)+49000000n));s.sweep.offers.forEach(o=>o.ackAtNs=String(BigInt(o.scheduledAtNs)+73000000n));const r=nsP5Traffic(s,sweepPlan,()=>h('correct'),[],calibration(1,'P5',{traceSegment:'frozen-traffic',offerScheduleSha256:h('frozen-traffic-schedule')}));assert.equal(r.met,false);assert.equal(r.reason,'BASELINE-INFLATED');
});
test('NF7 crash-only status cannot be read as a whole-P3 grant',()=>{const c=fixture().trusted.crashRun,r=recomputeNS(c.bundle,c.trusted);assert.equal(r.status,'CRASH-RECOMPUTED');assert.equal(r.bars.P3.resume,true);assert.equal(r.bars.P3.met,false);assert.equal(r.bars.P3.lag,null);});
test('NF8 regenerating observed synthetic bytes after a forgery never regenerates fixture pins',()=>{
 const f=fixture(),before=canonText({commands:f.trusted.commands,epochs:f.trusted.epochs,consumer:f.trusted.consumerId,minimum:f.trusted.minimumSamples,trace:f.trusted.frozenTrace});f.raw.events.source.entries[0].transactions[0].changes[0].entity='wrong';completeFixture(f);
 assert.equal(canonText({commands:f.trusted.commands,epochs:f.trusted.epochs,consumer:f.trusted.consumerId,minimum:f.trusted.minimumSamples,trace:f.trusted.frozenTrace}),before);refuse(f,'SOURCE-CONTENT-MISMATCH');
});
test('NF9 every companion setting and its exact attempt identity is pinned',()=>{
 for(const mutate of [c=>{c.readerLevel=1;},c=>{c.consumerId='weak';},c=>{c.minimumSamples.lag['CX-CRNS-fixture-crash']=1;},c=>{c.commands.cmd1.commandSha256=h('wrong');},c=>{c.replayRead=()=>h('garbage');},c=>{c.binding.attemptId='other-crash';}]) {
  const f=fixture();mutate(f.trusted.crashRun.trusted);refuse(f,'COMPANION-UNBOUND');
 }
});
test('NF10 a duplicate or lost-ACK retry must name an earlier attempt of the same command',()=>{for(const kind of ['duplicate','lost-ACK retry']){const f=fixture();f.raw.events.offers[0].kind=kind;refuse(f,'RETRY-ORIGIN-MISSING');}});
test('NF11 per-subject source order cannot reverse first-offer order',()=>{const f=fixture();f.raw.events.offers[0].scheduledAtNs=f.raw.events.offers[0].sentAtNs='2001000000';f.raw.events.offers[0].ackAtNs='2004000000';refuse(f,'SUBJECT-OFFER-ORDER-MISMATCH');});
test('N01 full-sweep traffic coverage is required at every declared one-second sample period',()=>{
 for(const partial of [s=>firstSecondOnly(s.sweep),s=>{s.sweep.reads=s.sweep.reads.filter(r=>BigInt(r.receivedAtNs)<101000000000n);s.sweep.readers=s.sweep.readers.filter(r=>r.second!==99);},s=>{s.sweep.offers.pop();}]) {
  const f=positiveP5();partial(f.raw.events.sweepTraffic);const r=refuse(f,'P5-LIVE-TRAFFIC-BAR');assert.equal(r.measurements.P5.traffic.met,false);
 }
});

test('NF6 P4 history baseline cannot inflate below its absolute bars to hide depth cost',()=>{
 const f=p4Sequential();assert.equal(run(f).status,'RECOMPUTED',canonText(run(f)));
 f.raw.events.historyResources.forEach(r=>r.endNs='5000000');f.raw.events.historyPulls.forEach(p=>p.receivedAtNs=p.depth===1?'4000000':'4400000');
 const r=refuse(f,'P4-HISTORY-BAR');assert.equal(r.measurements.P4.history.reason,'BASELINE-INFLATED');
});
