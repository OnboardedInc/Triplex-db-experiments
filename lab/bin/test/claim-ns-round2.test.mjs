// [EXP-CRNS-R2] Why: isolate every remaining review finding with a valid control and a named required refusal.
// Rejected: green TODO tests or negatives that only fail because a different prerequisite is missing.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture, run, codes, h, ladder, p4Sequential, refreshWal} from '../../verify/CRNS/fixture.mjs';
import {canonText, nsP1Ladder, nsP4History, nsP5Traffic, nsFeedEntryBytes} from '../claim.mjs';
import {completeSegment, readerRows, historyFixture} from './ns-round2-fixture.mjs';
const refusedWith=(f,code)=>{const r=run(f);assert.equal(r.status,'REFUSED');assert.ok(codes(r).includes(code),canonText(r));return r;};
function positiveP1() {
  const f=fixture(),e=f.raw.events; f.trusted.priorities=['P3','P1'];
  e.reads.forEach(r=>{r.subject='pl:a';});
  for(const [i,r] of e.reads.slice(0,30).entries()) {
    Object.assign(r,{sentAtNs:'1001000000',receivedAtNs:'1001100000',splitGroup:`g${i}`,straddledCommandId:'cmd1'});
    e.reads.push({...r,readId:`split-after-${i}`,sentAtNs:'1004000000',receivedAtNs:'1004100000'});
  }
  e.readers=readerRows(e.reads,e.window); e.mainSegmentId='L256'; e.ladder=ladder();
  Object.assign(e.ladder.find(w=>w.id===e.mainSegmentId),{startNs:e.window.startNs,endNs:e.window.endNs,reads:structuredClone(e.reads),readers:structuredClone(e.readers)});
  e.maintenance=[{atNs:'1500000000'}];return f;
}
test('R01/O27 positive P1 has main segment, hot-set and straddle evidence; removing any floor refuses',()=>{
  const f=positiveP1();assert.equal(run(f).status,'RECOMPUTED',canonText(run(f)));
  for(const [code,change] of [['P1-MAIN-SEGMENT-MISMATCH',e=>{e.mainSegmentId='other';}],['P1-HOT-SET-SHORT',e=>{e.reads.forEach(r=>{r.hot=false;});e.ladder.find(x=>x.id==='L256').reads=structuredClone(e.reads);}],['P1-STRADDLE-SHORT',e=>{e.reads.forEach(r=>{delete r.splitGroup;});e.ladder.find(x=>x.id==='L256').reads=structuredClone(e.reads);}]]){const g=positiveP1();change(g.raw.events);refusedWith(g,code);}
});
test('O19 source-normalized consumer rows must equal a new decode of retained WAL bytes',()=>{const f=fixture();f.raw.events.consumer.transactions[0].effects.pop();f.raw.events.consumer.effects.shift();refusedWith(f,'WAL-NOT-ESTIMABLE');});
test('R06/O20 each committed position needs source and consumer CR records',()=>{for(const role of ['source','consumer']){const f=fixture();f.raw.events.crossChecks=f.raw.events.crossChecks.filter(r=>!(r.role===role&&r.position==='1'));refusedWith(f,'CR-CROSSCHECK-MISSING');}});
test('O21 sample minima come from trusted frozen schedule; no missing P3/P2 floor can pass',()=>{const f=fixture();f.trusted.minimumSamples.lag=3;refusedWith(f,'LAG-SAMPLES-SHORT');const g=fixture();delete g.trusted.minimumSamples;refusedWith(g,'SAMPLE-FLOOR-UNBOUND');const p=fixture();p.trusted.priorities=['P3','P2'];p.trusted.minimumSamples.bands['5-10']=3;refusedWith(p,'P2-BAND-MISSING');});
test('O23 repeated offer or read event id refuses on P3-only too',()=>{for(const name of ['offers','reads']){const f=fixture();f.raw.events[name].push(structuredClone(f.raw.events[name][0]));refusedWith(f,'EVENT-ID-DUPLICATE');}});
test('O26 fixed consumer/epoch identities cannot split the correct affected set',()=>{const f=fixture();for(const rows of [f.raw.events.consumer.effects,f.raw.events.consumer.affected,...f.raw.events.consumer.transactions.flatMap(t=>[t.effects,t.affected])])rows[0].consumer='other';refreshWal(f);const r=refusedWith(f,'CONSUMER-IDENTITY-MISMATCH');assert.notEqual(r.bars.P3?.counts,true);});
test('O28 every pinned role must record its clock domain; omitted or duplicated roles refuse',()=>{for(const mutate of [e=>{e.clockDomains.pop();},e=>{e.clockDomains[1].role=e.clockDomains[0].role;}]){const f=fixture();mutate(f.raw.events);refusedWith(f,'CLOCK-DOMAIN-MISMATCH');}});
test('O18/O25 broker storage never bypasses the evaluator source decoder or source storage pin',()=>{const f=fixture();f.raw.events.source.storage='broker-frame/2';refusedWith(f,'SOURCE-STORAGE-MISMATCH');const g=fixture();g.trusted.verifySource=()=>false;refusedWith(g,'SOURCE-NOT-VERIFIED');});
test('O17 a consistently rewritten source+delivery+WAL still mismatches the frozen command digest',()=>{const f=fixture(),e=f.raw.events;e.source.entries[0].transactions[0].changes[0].entity='wrong';e.source.rawHex=Buffer.from(canonText({entries:e.source.entries,commandDigests:e.source.commandDigests})).toString('hex');const digest=h(nsFeedEntryBytes(e.source.entries[0]));e.consumer.deliveries[0].digest=digest;e.consumer.transactions[0].deliveries[0].digest=digest;refreshWal(f);refusedWith(f,'SOURCE-CONTENT-MISMATCH');});
test('lost ACK is resolved by a later original receipt without copying a receipt onto the original attempt',()=>{
 const f=fixture(),e=f.raw.events,original=e.offers[0];const retry={...original,eventId:'retry',kind:'lost-ACK retry',sentAtNs:'1100000000',scheduledAtNs:'1100000000',ackAtNs:'1101000000',receipt:structuredClone(original.receipt)};
 original.kind='lost-ACK';delete original.receipt;delete original.ackAtNs;original.censoredAtNs='1050000000';e.offers.push(retry);
 const r=run(f);assert.equal(r.status,'RECOMPUTED',canonText(r));assert.equal(r.measurements.P2.unaccounted,0);assert.equal(r.measurements.P2.latency['5-10'].p99Ms,101);
 delete retry.receipt;retry.typedError={code:'DUPLICATE'};refusedWith(f,'IDEMPOTENCY-RECEIPT-MISMATCH');
});
test('O29 P4 baseline and P5 baseline have absolute latency floors as well as ratios',()=>{
 const pulls=[1,3,10].flatMap(depth=>Array.from({length:1000},(_,i)=>({depth,subject:`s${i}`,sentAtNs:'0',receivedAtNs:'1000000',bytesRead:'100'})));const resources=historyFixture(pulls);
 for(const p of pulls)p.receivedAtNs='100000000';resources.forEach(r=>r.endNs='200000000');assert.equal(nsP4History(pulls,()=>h('correct'),[],resources).met,false);
 const base=completeSegment({id:'base',level:64,phase:'steady',traceSegment:'s',offerScheduleSha256:h('s'),startNs:'0',endNs:'1000000000',offers:[{scheduledAtNs:'0',ackAtNs:'100000000'}]});
 const during=completeSegment({...base,id:'during',startNs:'1000000000',endNs:'2000000000',offers:[{scheduledAtNs:'1000000000',ackAtNs:'1120000000'}]});
 assert.equal(nsP5Traffic({baseline:base,sweep:during},{startNs:'1000000000',endNs:'2000000000'},()=>h('correct'),[]).met,false);
});
test('O13 history correctness refuses a wrong answer even with matching latency and independent IO counters',()=>{const f=p4Sequential();f.raw.events.historyPulls[0].answerSha256=h('wrong');refusedWith(f,'P4-HISTORY-ANSWER-MISMATCH');});
test('O27 largest P4 bucket bar is pinned and enforced',()=>{const f=p4Sequential();f.trusted.p4LargestBucketP99Ms=.01;refusedWith(f,'P4-LARGE-BUCKET-BAR');});

test('O15 activation position, release hash and output durability are required before sweep arithmetic',()=>{
 for(const field of ['basis','release','durable']) {
  const f=fixture(),e=f.raw.events,t=f.trusted,subjects=Array.from({length:100000},(_,i)=>`s${i}`);
  t.priorities=['P3','P5']; t.activationCommandId='cmd1';t.releaseSha256=h('release');t.commands.cmd1.releaseSha256=t.releaseSha256;t.subjectListSha256=h(canonText(subjects));t.verifySweepDurability=()=>field!=='durable';
  e.sweep={activationReceipt:{basis:field==='basis'?'2':'1',releaseSha256:field==='release'?h('wrong'):t.releaseSha256},subjects,outputs:subjects.map(subject=>({subject})),outbox:[],startNs:'2000000000',endNs:'3000000000',durableBracket:{L:'2999999999',U:'3000000000'}};
  refusedWith(f,field==='durable'?'P5-DURABILITY-UNBOUND':'P5-ACTIVATION-UNBOUND');
 }
});
test('O17 full command digests, distinct from identity-only change digests, must match retained decoded command bytes',()=>{
 const f=fixture();f.raw.events.source.commandDigests.cmd1=h('wrong full value');f.raw.events.source.rawHex=Buffer.from(canonText({entries:f.raw.events.source.entries,commandDigests:f.raw.events.source.commandDigests})).toString('hex');refusedWith(f,'SOURCE-CONTENT-MISMATCH');
});

test('R02 resolved abort/seal frontiers are legal; only mapped prefix checkpoints may advance',()=>{
 const f=fixture(),e=f.raw.events,c=e.consumer;
 e.source.entries.push({stream:'s',epoch:'0',offset:'3',kind:'seal'});e.source.finalOffset='3';
 f.trusted.resolveFrontier=entry=>entry.offset;
 const delivery={offset:'3',digest:h(nsFeedEntryBytes(e.source.entries[2]))};c.deliveries.push(delivery);c.transactions.push({committed:true,frontierBefore:'2',frontierAfter:'3',effects:[],affected:[],deliveries:[delivery],deleted:{effects:[],affected:[],deliveries:[]}});
 e.source.rawHex=Buffer.from(canonText({entries:e.source.entries,commandDigests:e.source.commandDigests})).toString('hex');refreshWal(f);
 assert.equal(run(f).status,'RECOMPUTED',canonText(run(f)));
 c.transactions.at(-1).frontierAfter='999';refusedWith(f,'NS-P3-ORDER-VIOLATIONS-MAX');
});
