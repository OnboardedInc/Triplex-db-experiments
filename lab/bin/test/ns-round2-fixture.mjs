// [EXP-CRNS-R2] Why: positive fixtures must supply the same independent input floors as production adapters.
// Rejected: auto-repairing candidate mutations at seal time (would erase the reviewers' planted defects).
import { createHmac } from 'node:crypto';
import { canonText, nsCommandSha256, nsFeedEntryBytes, nsCrc32c } from '../claim.mjs';
import { sha256 as h } from '../lib.mjs';
export function readsFor(window, level, answer = h('correct')) {
  const start = BigInt(window.startNs), end = BigInt(window.endNs), reads = [];
  const n = Number((end - start + 999999999n) / 1000000000n);
  for (let second = 0; second < n; second++) for (let loop = 0; loop < Math.max(1, level); loop++) {
    const at = start + BigInt(second) * 1000000000n + 20000000n + BigInt(loop) * 1000n;
    if (at + 100000n >= end) continue;
    reads.push({ readId: `${window.id ?? 'main'}-${second}-${loop}`, loop, subject: `s${loop}`, shape: 'pull', requestedBasis: '1', echoedBasis: '1', sentAtNs: String(at), receivedAtNs: String(at + 100000n), answerSha256: answer, hot: true });
  }
  return reads;
}
export function readerRows(reads, window) {
  const map = new Map();
  for (const r of reads) {
    const s = Number((BigInt(r.receivedAtNs) - BigInt(window.startNs)) / 1000000000n);
    if (!map.has(s)) map.set(s, new Set()); map.get(s).add(r.loop);
  }
  return [...map].map(([second, ids]) => ({ second, loops: [...ids], relayConcurrent: ids.size }));
}
export function completeSegment(s, answer = h('correct')) {
  s.reads = readsFor(s, s.level, answer); s.readers = readerRows(s.reads, s);
  s.offers.forEach((o,i) => { o.eventId = `${s.id}-offer-${i}`; o.sizeBand ??= '5-10'; }); return s;
}
export function historyFixture(pulls) {
  pulls.forEach((p,i) => Object.assign(p, { readId: `history-${i}`, shape: 'pull-current', requestedBasis: '1', echoedBasis: '1', answerSha256: h('correct') }));
  return [1,3,10].map(depth => ({ depth, startNs: '0', endNs: '2000000', ioReadStartBytes: '0', ioReadEndBytes: String(pulls.filter(p => p.depth === depth).reduce((sum,p) => sum + Number(p.bytesRead ?? 100),0)) }));
}
export function reseal(raw, trusted) {
  const payload = canonText(raw), previousSha256 = '0'.repeat(64), bytes = canonText({previousSha256,payload});
  const chunk = { payload, previousSha256, sha256: h(bytes), hmac: createHmac('sha256', trusted.key).update(bytes).digest('hex') };
  return { bundle: { payload, chunks:[chunk], hmac: createHmac('sha256', trusted.key).update(payload).digest('hex') }, trusted: {...trusted,headSha256:chunk.sha256} };
}
// [EXP-CRNS-R3] Why: expected commands, identities and schedules are authored before any judged payload.
// Rejected: extracting a pin from a candidate entry, even in a test (NF fixture finding).
const freeze = value => { if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value; };
const normalizeSource = source => JSON.parse(Buffer.from(source.rawHex,'hex').toString());
const normalizeWal = c => JSON.parse(Buffer.from(c.finalWalHex,'hex').toString());
const normalizeFault = f => JSON.parse(Buffer.from(f.snapshotHex,'hex').toString());
function change(profile,id,index,position) {
  return profile==='builder' ? {op:'assert',entity:'jur:ny',attribute:'stateMinWageCents',validFrom:0,validTo:null,position,assertionId:`a${index+1}`} : {op:'assert',entity:`s${index}`,attribute:'a',validFrom:'0',validTo:'9',position,assertionId:`as${index}.0`};
}
export function frozenFixtureTrace(profile='builder', options={}) {
  const count=profile==='builder'?2:3, attemptId=options.attemptId??(profile==='builder'?'CX-CRNS-fixture':'att'), crashId=attemptId+'-crash';
  const commands={}, offers=[];
  for(let i=0;i<count;i++) {
    const commandId=profile==='builder'?`cmd${i+1}`:`c${i}`, ch=change(profile,commandId,i,String(i+1));
    commands[commandId]={commandSha256:nsCommandSha256([ch]),changesSha256:nsCommandSha256([ch]),valid:true,...(profile==='builder'&&i===0?{releaseSha256:options.releaseSha256??h('release')}:{})};
    offers.push({eventId:`offer-${i}`,commandId,commandSha256:commands[commandId].commandSha256,scheduledAtNs:String(profile==='builder'?1000000000+i*1000000000:1010000000+i*100000000)});
  }
  if(options.extraInvalid) {commands.invalid={commandSha256:h('invalid'),valid:false};offers.push({eventId:'invalid-offer',commandId:'invalid',commandSha256:h('invalid'),scheduledAtNs:'2500000000'});}
  if(options.lostAck) offers.push({eventId:'retry',commandId:'cmd1',commandSha256:commands.cmd1.commandSha256,scheduledAtNs:'1100000000'});
  const injections=[],crashOffers=[];
  for(let i=0;i<10;i++) {
    const commandId=`crash-${i}`,ch=change(profile,commandId,i,String(i+1));
    commands[commandId]={commandSha256:nsCommandSha256([ch]),changesSha256:nsCommandSha256([ch]),valid:true};
    crashOffers.push({eventId:`crash-offer-${i}`,commandId,commandSha256:commands[commandId].commandSha256,scheduledAtNs:String(1005000000+i*80000000)});
    if(i<9) { const point=['before-effect','after-effect','after-checkpoint'][Math.floor(i/3)];injections.push({injectionId:`injection-${i}`,faultPointId:point,pageFrontier:String(point==='after-checkpoint'?i+1:i+2)}); }
  }
  return freeze({profile,primaryAttemptId:attemptId,crashAttemptId:crashId,stream:profile==='builder'?'s':'feed',epoch:profile==='builder'?'0':'1',consumerId:profile==='builder'?'c':'k1',commands,attempts:{
    [attemptId]:{offers,window:{startNs:'1000000000',endNs:profile==='builder'?'3000000000':'2000000000',drainEndNs:options.drainEndNs??(profile==='builder'?'4000000000':'3000000000'),bursts:profile==='builder'?[{startNs:'2000000000',endNs:'2500000000'}]:[]}},
    [crashId]:{offers:crashOffers,window:{startNs:'1000000000',endNs:'2000000000',drainEndNs:'3000000000',bursts:[]},injections}
  }});
}
export function calibration(writerMs=1,kind='P1',overrides={}) {
  const binding={attemptId:'prior-calibration',sourceSha256:h('source'),slot:'offline',inputsSha256:h('inputs')};
  const segment={id:'calibration',level:0,phase:'steady',traceSegment:'segment-1',offerScheduleSha256:h('same schedule'),startNs:'0',endNs:'1000000000',reads:[],offers:[{eventId:'cal-offer',scheduledAtNs:'0',ackAtNs:String(writerMs*1000000)}],...overrides};
  const payload={binding,kind,grade:'GREEN',segments:[segment]};return {format:'ns-calibration/1',payload,pinSha256:h(canonText(payload)),expectedBinding:binding,samplingPeriodNs:'1000000000'};
}
export function attachIndependentCrash(f) {
  const tr=f.trusted, trace=tr.frozenTrace, plan=trace.attempts[tr.binding.crashAttemptId], epoch=trace.epoch;
  const entries=[],transactions=[],sourceBrackets=[],consumerBrackets=[],offers=[];
  for(const [i,o] of plan.offers.entries()) {
    const position=String(i+1), ch=change(trace.profile,o.commandId,i,position),at=BigInt(o.scheduledAtNs);
    entries.push({stream:trace.stream,epoch,offset:position,kind:'commit',transactions:[{stamp:i+1,positions:[position],txIds:[`crash-tx-${i}`],operationId:`crash-op-${i}`,commandIds:[o.commandId],changes:[ch]}]});
    const subjects=trace.profile==='builder'?['pl:a','pl:b']:[`s${i}`],rows=subjects.map(subject=>({consumer:trace.consumerId,epoch,position,subject}));
    transactions.push({committed:true,frontierBefore:String(i),frontierAfter:position,effects:rows,affected:structuredClone(rows),deliveries:[{offset:position,digest:h(nsFeedEntryBytes(entries[i]))}],deleted:{effects:[],affected:[],deliveries:[]}});
    sourceBrackets.push({position,L:String(at+1000000n),U:String(at+2000000n)});consumerBrackets.push({position,L:String(at+15000000n),U:String(at+16000000n)});
    offers.push({...o,kind:'normal',subject:subjects[0],sizeBand:['5-10','11-25','26-50'][i%3],sentAtNs:o.scheduledAtNs,ackAtNs:String(at+3000000n),receipt:{position,txId:`crash-tx-${i}`,commandIds:[o.commandId],stamp:i+1}});
  }
  const consumer={initialFrontier:'0',walComplete:true,transactions,effects:transactions.flatMap(t=>t.effects),affected:transactions.flatMap(t=>t.affected),deliveries:transactions.flatMap(t=>t.deliveries)};
  consumer.finalWalHex=Buffer.from(canonText({transactions,effects:consumer.effects,affected:consumer.affected,deliveries:consumer.deliveries})).toString('hex');consumer.tailedWalHex=consumer.finalWalHex;
  const source={origin:'observer-source-store',storage:'fixture-json/1',firstOffset:'1',finalOffset:'10',entries,commandDigests:Object.fromEntries(plan.offers.map(o=>[o.commandId,o.commandSha256]))};source.rawHex=Buffer.from(canonText({entries,commandDigests:source.commandDigests})).toString('hex');
  if(tr.sourceStorage==='broker-frame/2') sourceFrames(source);
  const binding={...tr.binding,attemptId:tr.binding.crashAttemptId},faults=plan.injections.map((inj,i)=>{
    const t=String(BigInt(plan.offers[i].scheduledAtNs)+50000000n),events=[{transition:'cgroup-gone',injectionId:inj.injectionId,t}];
    const snapshot={injectionId:inj.injectionId,checkpoint:String(i+1),pageFrontier:inj.pageFrontier,effectState:{'before-effect':'absent','after-effect':'uncommitted','after-checkpoint':'committed'}[inj.faultPointId]};
    return {format:'fault-witness/1',binding,...inj,events,eventsSha256:h(canonText(events)),snapshotHex:Buffer.from(canonText(snapshot)).toString('hex'),beforeTransaction:i,recoveryTransaction:i+1,checkpointOffset:String(i+1),recoveryOffset:String(i+2),replay:structuredClone(transactions[i+1].deliveries)};
  });
  const reads=readsFor(plan.window,tr.readerLevel),ct=Object.fromEntries(Object.entries(tr).filter(([k])=>k!=='crashRun').map(([k,v])=>[k,typeof v==='function'?v:structuredClone(v)]));ct.binding=binding;
  const raw={format:'ns-events/1',binding,driver:tr.driver,events:{clockDomain:tr.clockDomain,clockDomains:tr.roles.map(role=>({role,domain:tr.clockDomain})),lagStart:'observer-bracket',window:plan.window,source,sourceBrackets,consumerBrackets,consumer,offers,reads,readers:readerRows(reads,plan.window),faults,noise:{grade:'GREEN'},crossChecks:sourceBrackets.flatMap((b,i)=>[{role:'source',position:b.position,atNs:b.L},{role:'consumer',position:b.position,atNs:consumerBrackets[i].U}])}};
  tr.crashRun=reseal(raw,ct);return f;
}
export function completeFixture(f, frozen) {
  const {raw,trusted:tr}=f,e=raw.events;
  tr.frozenTrace ??= frozen;
  if(!tr.frozenTrace) throw Error('fixture requires an independently authored frozen trace');
  const trace=tr.frozenTrace;
  raw.binding={...raw.binding,attemptId:trace.primaryAttemptId,traceSha256:h(canonText(trace)),crashAttemptId:trace.crashAttemptId};tr.binding=structuredClone(raw.binding);
  tr.roles ??= ['driver','observer'];e.clockDomains=tr.roles.map(role=>({role,domain:structuredClone(e.clockDomain)}));
  tr.sourceStream ??= trace.stream;tr.sourceStorage ??= 'fixture-json/1';e.source.storage='fixture-json/1';
  e.source.commandDigests=Object.fromEntries(e.source.entries.flatMap(e=>(e.transactions??[]).flatMap(tx=>tx.commandIds.map(id=>[id,nsCommandSha256(tx.changes)]))));
  e.source.rawHex=Buffer.from(canonText({entries:e.source.entries,commandDigests:e.source.commandDigests})).toString('hex');
  const c=e.consumer;c.finalWalHex=Buffer.from(canonText({transactions:c.transactions,effects:c.effects,affected:c.affected,deliveries:c.deliveries})).toString('hex');c.tailedWalHex=c.finalWalHex;
  tr.normalizeSource ??= normalizeSource;tr.normalizeWal ??= normalizeWal;tr.normalizeFault ??= normalizeFault;
  tr.initialFrontier ??= '0';tr.maxBracketWidthNs ??= '10000000';tr.consumerId ??= trace.consumerId;
  tr.epochs ??= Object.fromEntries(Array.from({length:10},(_,i)=>[canonText(String(i+1)),trace.epoch]));
  tr.commands ??= structuredClone(trace.commands);tr.commandValid ??= o=>tr.commands[o.commandId]?.valid===true;tr.ryow ??= ()=>true;tr.replayRead ??= ()=>h('correct');tr.steadyRate ??=100;
  e.offers.forEach((o,i)=>{o.eventId??=`offer-${i}`;o.kind??='normal';o.commandSha256??=trace.commands[o.commandId]?.commandSha256??h('unknown');});
  tr.minimumSamples ??= {lag:Object.fromEntries(Object.entries(trace.attempts).map(([id,p])=>[id,new Set(p.offers.filter(o=>trace.commands[o.commandId]?.valid).map(o=>o.commandId)).size])),bands:{'5-10':1,'11-25':1,'26-50':1}};
  tr.p4LargestBucketP99Ms ??=50;tr.calibrationP4 ??=historyCalibration();tr.calibrationP1 ??=calibration();tr.calibrationP5 ??=calibration(1,'P5');
  e.crossChecks=e.sourceBrackets.flatMap(s=>[{role:'source',position:s.position,atNs:s.L},...e.consumerBrackets.filter(c=>canonText(c.position)===canonText(s.position)).map(c=>({role:'consumer',position:c.position,atNs:c.U}))]);
  e.reads=readsFor(e.window,tr.readerLevel);e.readers=readerRows(e.reads,e.window);
  return attachIndependentCrash(f);
}
export function shiftFrozenFixture(f,delta) {
 const shift=value=>Array.isArray(value)?value.map(shift):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,typeof v==='string'&&k.endsWith('Ns')?String(BigInt(v)+delta):shift(v)])):value;
 f.trusted.frozenTrace=freeze(shift(f.trusted.frozenTrace));f.raw.binding.traceSha256=h(canonText(f.trusted.frozenTrace));f.trusted.binding=structuredClone(f.raw.binding);return attachIndependentCrash(f);
}

function sourceFrames(source) {
 let prev=7;source.storage='broker-frame/2';source.initialCrc=prev;source.frames=source.entries.map(entry=>{
  const payload=Buffer.from(canonText({entry,commandDigests:Object.fromEntries((entry.transactions??[]).flatMap(tx=>tx.commandIds.map(id=>[id,source.commandDigests[id]])))})),bytes=Buffer.alloc(payload.length+36);
  bytes.writeUInt32LE(0x464c5854);bytes.writeUInt32LE(payload.length,4);bytes.writeBigUInt64LE(BigInt(entry.offset),8);bytes.writeUInt32LE(Number(entry.epoch),16);bytes.writeUInt32LE(prev,20);const hc=nsCrc32c(bytes.subarray(0,28),prev);bytes.writeUInt32LE(hc,28);payload.copy(bytes,32);prev=nsCrc32c(payload,hc);bytes.writeUInt32LE(prev,bytes.length-4);return {offset:entry.offset,hex:bytes.toString('hex')};
 });source.finalCrc=prev;
}
const normalizeBroker = source => {
 const decoded=source.frames.map(f=>{const b=Buffer.from(f.hex,'hex');return JSON.parse(b.subarray(32,b.length-4).toString());});
 return {entries:decoded.map(x=>x.entry),commandDigests:Object.assign({},...decoded.map(x=>x.commandDigests))};
};
export function brokerFixture(f) {f.trusted.sourceStorage='broker-frame/2';f.trusted.normalizeSource=normalizeBroker;sourceFrames(f.raw.events.source);return attachIndependentCrash(f);}

export function historyCalibration() {
 const binding={attemptId:'prior-history-calibration',sourceSha256:h('source'),slot:'offline',inputsSha256:h('inputs')};
 const payload={binding,kind:'P4',grade:'GREEN',historyPulls:Array.from({length:1000},(_,i)=>({subject:`s${i}`,sentAtNs:'0',receivedAtNs:'1000000'})),resources:{ioReadStartBytes:'0',ioReadEndBytes:'100000'}};
 return {format:'ns-calibration/1',payload,pinSha256:h(canonText(payload)),expectedBinding:binding};
}
