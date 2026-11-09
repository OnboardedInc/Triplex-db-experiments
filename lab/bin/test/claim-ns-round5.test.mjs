// [EXP-CRNS-R5] Why: Q103d/e need independent expected plans and property-specific refusal codes. Rejected: choosing a race winner or rate from judged observations.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture,run,codes,h,clone} from '../../verify/CRNS/fixture.mjs';
import {recomputeNS,canonText,nsFeedEntryBytes,nsNearestRank} from '../claim.mjs';
import {completeFixture,attachIndependentCrash,reseal,readerRows} from './ns-round2-fixture.mjs';
const refuse=(f,code)=>{const r=run(f);assert.equal(r.status,'REFUSED',canonText(r));assert.ok(codes(r).includes(code),canonText(r));assert.notEqual(r.bars.P3?.met,true);return r;};
function changeTrace(f,change) {
 const trace=clone(f.trusted.frozenTrace);change(trace);f.trusted.frozenTrace=trace;
 f.raw.binding.traceSha256=h(canonText(trace));f.trusted.binding=clone(f.raw.binding);attachIndependentCrash(f);return f;
}
function changeCrash(f,change) {const c=f.trusted.crashRun,raw=JSON.parse(c.bundle.payload);change(raw,c.trusted);f.trusted.crashRun=reseal(raw,c.trusted);return recomputeNS(f.trusted.crashRun.bundle,f.trusted.crashRun.trusted);}
function raceFixture(winners=['cmd1']) {
 const f=fixture({race:true}),e=f.raw.events,plan=f.trusted.frozenTrace.attempts[f.raw.binding.attemptId];
 const entries=[...winners,'cmd3'].map((id,i)=>{
  const n=Number(id.slice(3)),position=String(i+1);
  return {stream:'s',epoch:'0',offset:position,kind:'commit',transactions:[{stamp:n,positions:[position],txIds:[`tx${n}`],operationId:`op${n}`,commandIds:[id],changes:[{op:'assert',entity:'jur:ny',attribute:'stateMinWageCents',validFrom:0,validTo:null,position,assertionId:`a${n}`}]}]};
 });
 const rows=position=>['pl:a','pl:b'].map(subject=>({consumer:'c',epoch:'0',position,subject}));
 const transactions=entries.map((en,i)=>({committed:true,frontierBefore:String(i),frontierAfter:en.offset,effects:rows(en.offset),affected:rows(en.offset),deliveries:[{offset:en.offset,digest:h(nsFeedEntryBytes(en))}],deleted:{effects:[],affected:[],deliveries:[]}}));
 e.source={origin:'observer-source-store',firstOffset:'1',finalOffset:String(entries.length),entries};
 e.consumer={initialFrontier:'0',walComplete:true,transactions,effects:transactions.flatMap(t=>t.effects),affected:transactions.flatMap(t=>t.affected),deliveries:transactions.flatMap(t=>t.deliveries)};
 e.sourceBrackets=entries.map(en=>{const id=en.transactions[0].commandIds[0],at=BigInt(plan.offers.find(o=>o.commandId===id).scheduledAtNs);return {position:en.offset,L:String(at),U:String(at+2000000n)};});
 e.consumerBrackets=e.sourceBrackets.map(b=>({position:b.position,L:String(BigInt(b.L)+9000000n),U:String(BigInt(b.L)+10000000n)}));
 e.offers=plan.offers.map((o,i)=>{
  const en=entries.find(en=>en.transactions[0].commandIds.includes(o.commandId)),tx=en?.transactions[0];
  return {...o,kind:'normal',subject:'pl:a',sizeBand:['5-10','11-25','26-50'][i],sentAtNs:o.scheduledAtNs,ackAtNs:String(BigInt(o.scheduledAtNs)+3000000n),...(tx?{receipt:{position:en.offset,txId:tx.txIds[0],stamp:tx.stamp,commandIds:tx.commandIds}}:{typedConflict:{code:'COMPARE-AND-SET'}})};
 });
 return completeFixture(f);
}

test('Q103d every 100 ms bin is necessary, including a single missing final bin',()=>{
 for(const bin of [0,7,19]) {const f=fixture();f.raw.events.reads=f.raw.events.reads.filter(r=>Number((BigInt(r.receivedAtNs)-1000000000n)/100000000n)!==bin);f.raw.events.readers=readerRows(f.raw.events.reads,f.raw.events.window);refuse(f,'READER-RATE-SHORT');}
});
test('Q103d counts the same loops across all bins; rotating populations cannot qualify',()=>{
 const f=fixture();for(const r of f.raw.events.reads)if(BigInt(r.receivedAtNs)>=2000000000n)r.loop+=256;
 f.raw.events.readers=readerRows(f.raw.events.reads,f.raw.events.window);refuse(f,'READER-RATE-SHORT');
});
test('Q103d a >1 s read disqualifies its loop even though pooled p99 remains fast',()=>{
 const f=fixture();{
  const e=f.raw.events;e.reads=e.reads.filter(r=>r.loop!==0 || BigInt(r.sentAtNs)>=2100000000n);
  e.reads.push({readId:'long-read',loop:0,subject:'s0',shape:'pull',requestedBasis:'1',echoedBasis:'1',sentAtNs:'1000000000',receivedAtNs:'2000000001',answerSha256:h('correct')});
  e.readers=readerRows(e.reads,e.window);
  assert.ok(Number(nsNearestRank(e.reads.map(r=>BigInt(r.receivedAtNs)-BigInt(r.sentAtNs)),99))<=100000000);
 }
 refuse(f,'READER-RATE-SHORT');
});
test('Q103d frozen rate is scaled with exact ceil per bin, not replaced by one completion',()=>{
 const f=fixture();changeTrace(f,t=>{t.attempts[t.primaryAttemptId].minimumCompletionsPerLoopSecond=11;});refuse(f,'READER-RATE-SHORT');
 const g=fixture();changeTrace(g,t=>{t.attempts[t.primaryAttemptId].minimumCompletionsPerLoopSecond=10;});assert.equal(run(g).status,'RECOMPUTED',canonText(run(g)));
});
test('crash target is exact and mandatory; wrong, absent, and stale process identities refuse',()=>{
 for(const mutate of [ev=>{ev.cgroup='/fixture/sidecar';},ev=>{delete ev.cgroup;},ev=>{ev.process='boot:pid:start-old';delete ev.cgroup;}]) {
  const f=fixture(),r=changeCrash(f,raw=>{const fault=raw.events.faults[0];mutate(fault.events[0]);fault.eventsSha256=h(canonText(fault.events));});
  assert.equal(r.status,'REFUSED');assert.ok(codes(r).includes('CRASH-TARGET-MISMATCH'));assert.equal(r.bars.P3?.resume===true,false);refuse(f,'P3-RESUME-MISSING');
 }
 const f=fixture();changeTrace(f,t=>{t.attempts[t.crashAttemptId].crashTarget={kind:'process',identity:'boot:pid:start-current'};});assert.equal(run(f).status,'RECOMPUTED');
 const r=changeCrash(f,raw=>{const fault=raw.events.faults[0];fault.events[0].process='boot:pid:start-old';fault.eventsSha256=h(canonText(fault.events));});assert.ok(codes(r).includes('CRASH-TARGET-MISMATCH'));
});
test('Q103e either race winner is valid and lag has one sample per pair plus ordinary commits',()=>{
 for(const winner of ['cmd1','cmd2']) {const f=raceFixture([winner]);f.trusted.priorities=['P2','P3'];attachIndependentCrash(f);const r=run(f);assert.equal(r.status,'RECOMPUTED',canonText(r));assert.equal(r.bars.P3.met,true);assert.equal(r.measurements.P3.lag.pooled.count,2);}
});
test('Q103e static race flags may be absent or opposite; other commands retain static validation',()=>{
 const f=raceFixture(['cmd2']);changeTrace(f,t=>{delete t.commands.cmd1.valid;delete t.commands.cmd2.valid;});delete f.trusted.commands.cmd1.valid;delete f.trusted.commands.cmd2.valid;attachIndependentCrash(f);assert.equal(run(f).status,'RECOMPUTED',canonText(run(f)));
 const g=raceFixture();g.trusted.commandValid=cmd=>cmd.commandId!=='cmd3';attachIndependentCrash(g);refuse(g,'COMMAND-VALIDITY-PIN-MISMATCH');refuse(g,'INVALID-COMMAND-PUBLISHED');
});
test('Q103e zero or two race commits refuse rather than falling out of lag population',()=>{
 for(const winners of [[],['cmd1','cmd2']])refuse(raceFixture(winners),'RACE-OUTCOME-INVALID');
});
test('Q103e loser must receive a typed conflict; typed errors, silence, or an untyped label refuse',()=>{
 for(const mutate of [o=>{delete o.typedConflict;o.typedError={code:'INVALID'};},o=>{delete o.typedConflict;},o=>{o.typedConflict=true;},o=>{o.typedConflict={};},o=>{delete o.ackAtNs;o.censoredAtNs='1500000000';}]) {const f=raceFixture();mutate(f.raw.events.offers.find(o=>o.commandId==='cmd2'));refuse(f,'RACE-CONFLICT-MISSING');}
});
test('Q103e malformed, unknown, overlapping, and window-straddling frozen race pairs refuse',()=>{
 for(const change of [p=>{p.racePairs=[{commands:['cmd1','cmd1']}];},p=>{p.racePairs=[{commands:['cmd1','absent']}];},p=>{p.racePairs.push({commands:['cmd2','cmd3']});},p=>{p.offers.find(o=>o.commandId==='cmd2').scheduledAtNs='3000000000';}]) {
  const f=raceFixture();changeTrace(f,t=>change(t.attempts[t.primaryAttemptId]));refuse(f,'RACE-PLAN-INVALID');
 }
});

test('Q103d trailing partial 100 ms bin uses an exact ceil of the frozen rate',()=>{
 const f=fixture();changeTrace(f,t=>{const p=t.attempts[t.primaryAttemptId];p.window.endNs='2950000000';p.minimumCompletionsPerLoopSecond=11;});
 f.raw.events.window=clone(f.trusted.frozenTrace.attempts[f.raw.binding.attemptId].window);
 for(const r of [...f.raw.events.reads]) if(BigInt(r.receivedAtNs)<2900000000n) f.raw.events.reads.push({...r,readId:r.readId+'-extra',sentAtNs:String(BigInt(r.sentAtNs)+10000000n),receivedAtNs:String(BigInt(r.receivedAtNs)+10000000n)});
 f.raw.events.readers=readerRows(f.raw.events.reads,f.raw.events.window);
 assert.equal(run(f).status,'RECOMPUTED',canonText(run(f)));
 f.raw.events.reads=f.raw.events.reads.filter(r=>!(r.loop===0&&BigInt(r.receivedAtNs)>=2900000000n));refuse(f,'READER-RATE-SHORT');
});
test('a frozen crash plan without a target refuses even when every other witness field is valid',()=>{
 const f=fixture(),c=f.trusted.crashRun,raw=JSON.parse(c.bundle.payload),trace=clone(c.trusted.frozenTrace);
 delete trace.attempts[raw.binding.attemptId].crashTarget;raw.binding.traceSha256=h(canonText(trace));
 for(const fault of raw.events.faults)fault.binding=raw.binding;
 const sealed=reseal(raw,{...c.trusted,frozenTrace:trace,binding:raw.binding});
 const r=recomputeNS(sealed.bundle,sealed.trusted);assert.equal(r.status,'REFUSED');assert.ok(codes(r).includes('CRASH-TARGET-MISMATCH'));
});
