// [EXP-CRNS-R4] Why: required regressions distinguish the new evidence floors from unrelated refusals. Rejected: status-only negative tests.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture,run,codes,h,ladder} from '../../verify/CRNS/fixture.mjs';
import {recomputeNS,canonText,nsP1Ladder,nsP5Traffic} from '../claim.mjs';
import {attachIndependentCrash,reseal,readerRows,calibration} from './ns-round2-fixture.mjs';
import {positiveP1,traffic,sweepPlan} from '../../verify/CRNS/round2/fixtures.mjs';
const refuse=(f,code)=>{const r=run(f);assert.equal(r.status,'REFUSED',canonText(r));assert.ok(codes(r).includes(code),canonText(r));assert.notEqual(r.bars.P3?.met,true);return r;};
function frozenChange(f,change) {
 const trace=structuredClone(f.trusted.frozenTrace);change(trace);f.trusted.frozenTrace=trace;
 f.raw.binding.traceSha256=h(canonText(trace));f.trusted.binding=structuredClone(f.raw.binding);attachIndependentCrash(f);
}
test('R4 floor: a correct fast but idle loop cannot count as P3/P2 load',()=>{
 for(const priorities of [['P3'],['P2']]) {
  const f=fixture({extraInvalid:priorities.includes('P2')});f.trusted.priorities=priorities;
  if(priorities.includes('P2')) {f.raw.events.offers[1].sizeBand='11-25';f.raw.events.offers.push({eventId:'invalid-offer',kind:'invalid',commandId:'invalid',commandSha256:h('invalid'),subject:'bad',sizeBand:'26-50',scheduledAtNs:'2500000000',sentAtNs:'2500000000',ackAtNs:'2501000000',typedError:{code:'OUT-OF-RANGE'}});}
  attachIndependentCrash(f);assert.equal(run(f).status,'RECOMPUTED',canonText(run(f)));
  f.raw.events.reads=f.raw.events.reads.filter(r=>r.readId.endsWith('-0'));f.raw.events.readers=readerRows(f.raw.events.reads,f.raw.events.window);
  f.raw.events.minimumCompletionsPerLoopSecond=1;
  refuse(f,'READER-RATE-SHORT');
 }
});
test('R4 floor: rates are per loop and second; population averages do not hide one idle loop',()=>{
 const f=fixture();f.raw.events.reads=f.raw.events.reads.filter(r=>!(r.loop===7&&r.readId.endsWith('-1')));
 refuse(f,'READER-RATE-SHORT');
});
test('R4 floor: absent frozen rate refuses; overlapping requests cannot fake closed loops',()=>{
 const f=fixture();frozenChange(f,t=>{delete t.attempts[t.primaryAttemptId].minimumCompletionsPerLoopSecond;});refuse(f,'READER-RATE-UNBOUND');
 const g=fixture(),reads=g.raw.events.reads.filter(r=>r.loop===0);reads[1].sentAtNs=reads[0].sentAtNs;reads[1].receivedAtNs=reads[0].receivedAtNs;refuse(g,'READER-LOOP-OVERLAP');
});
test('R4 validity oracle cannot inspect a judged typedError, receipt, or ACK',()=>{
 for(const key of ['typedError','receipt','ackAtNs']) {const f=fixture();f.trusted.commandValid=o=>!o[key];attachIndependentCrash(f);refuse(f,'O-REPLAY-INPUT-UNBOUND');}
});
test('R4 validity must agree with frozen flags for committed and rejected commands',()=>{
 const f=fixture();f.trusted.commandValid=()=>false;attachIndependentCrash(f);refuse(f,'COMMAND-VALIDITY-PIN-MISMATCH');
 const g=fixture({extraInvalid:true});g.raw.events.offers.push({eventId:'invalid-offer',kind:'invalid',commandId:'invalid',commandSha256:h('invalid'),subject:'bad',sizeBand:'26-50',scheduledAtNs:'2500000000',sentAtNs:'2500000000',ackAtNs:'2501000000',typedError:{code:'OUT-OF-RANGE'}});
 attachIndependentCrash(g);assert.equal(run(g).status,'RECOMPUTED');g.trusted.commandValid=()=>true;attachIndependentCrash(g);refuse(g,'COMMAND-VALIDITY-PIN-MISMATCH');
});
test('R4 extra trusted command pin absent from frozen trace refuses',()=>{const f=fixture();f.trusted.commands.extra={commandSha256:h('extra'),valid:true};attachIndependentCrash(f);refuse(f,'TRACE-COMMAND-PIN-MISMATCH');});
test('R4 calibration refuses the same candidate, missing authority, and a substituted identity for all priorities',()=>{
 for(const kind of ['P1','P4','P5'])for(const mutate of [p=>{p.candidateId='fixture-candidate';},p=>{delete p.candidateId;},p=>{delete p.authority;}]) {
  const f=fixture(),record=f.trusted['calibration'+kind];mutate(record.payload);record.pinSha256=h(canonText(record.payload));attachIndependentCrash(f);refuse(f,'CALIBRATION-CANDIDATE-MISMATCH');
 }
 const g=fixture();g.trusted.calibrationP1.payload.binding.attemptId=g.raw.binding.attemptId;g.trusted.calibrationP1.pinSha256=h(canonText(g.trusted.calibrationP1.payload));attachIndependentCrash(g);refuse(g,'BASELINE-UNBOUND');
 const f=fixture();f.trusted.calibrationP1.candidateUnderTest='different-candidate';attachIndependentCrash(f);refuse(f,'CALIBRATION-CANDIDATE-MISMATCH');
});
test('R4 P1 exposes BASELINE-INFLATED directly and through recompute',()=>{
 const windows=ladder();windows.find(w=>w.level===0).offers.forEach(o=>o.ackAtNs=String(BigInt(o.scheduledAtNs)+48000000n));
 const r=nsP1Ladder(windows,()=>h('correct'),[],calibration());assert.equal(r.met,false);assert.equal(r.reason,'BASELINE-INFLATED');
 const f=positiveP1();f.raw.events.ladder.find(w=>w.level===0).offers.forEach(o=>o.ackAtNs=String(BigInt(o.scheduledAtNs)+48000000n));const rr=refuse(f,'P1-LADDER-BAR');assert.equal(rr.measurements.P1.ladder.reason,'BASELINE-INFLATED');
});
test('R4 companion runs enforce P2 timing as well as read load',()=>{
 const f=fixture();f.trusted.priorities=['P2'];attachIndependentCrash(f);const c=f.trusted.crashRun;const raw=JSON.parse(c.bundle.payload);
 raw.events.offers[0].ackAtNs=String(BigInt(raw.events.offers[0].scheduledAtNs)+101000000n);
 const changed=reseal(raw,c.trusted),r=recomputeNS(changed.bundle,changed.trusted);assert.equal(r.status,'REFUSED');assert.ok(codes(r).includes('NS-P2-LATENCY'));assert.equal(r.bars.P3.resume,false);
});
test('R4 P5 and auxiliary ladder also require a frozen per-loop rate',()=>{
 const s=traffic();s.sweep.reads=s.sweep.reads.filter(r=>r.readId.endsWith('-0'));s.sweep.readers=readerRows(s.sweep.reads,s.sweep);
 const r=nsP5Traffic(s,sweepPlan,()=>h('correct'),[],calibration(1,'P5',{traceSegment:'frozen-traffic',offerScheduleSha256:h('frozen-traffic-schedule')}));assert.equal(r.met,false);assert.equal(r.reason,'READER-RATE-SHORT');
 const windows=ladder(),w=windows.find(w=>w.level===64);w.reads=w.reads.filter(r=>r.readId.endsWith('-0'));w.readers=readerRows(w.reads,w);
 assert.throws(()=>nsP1Ladder(windows,()=>h('correct'),[],calibration()),e=>e.code==='READER-RATE-SHORT');
});
