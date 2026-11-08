// [CX-VJ01] Why: source-built lane runtimes, independent exact boundary/cut/recovery assertions, fresh scopes. Rejected: replaying builder equivalence as independent qualification.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Effect,Layer,ManagedRuntime} from 'effect';
import * as core from '../../../packages/core/dist/index.js';
import * as api from '../../../packages/core/dist/runtime/index.js';
import * as x from '../../../packages/xtdb/dist/index.js';
import * as q from '../../../packages/qlever/dist/index.js';
const exact=v=>JSON.stringify(v,(_k,v)=>typeof v==='number'&&Object.is(v,-0)?{$number:'-0'}:v);
const lane=process.argv[2];
const file=`lab/verify/J01/live-${lane}.json`;
const out={lane,startedAt:new Date().toISOString(),arms:[],failures:[],limits:['No engine lifecycle/crash injection: transport failure injection only.','No decimal or erasure API in reviewed core; no semantic qualification of those features.','Not full G1 or a concurrency/performance qualification.']};
const save=()=>fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');
const entity=core.EntityId.make('verify:subject');
const deterministic={seed:'cx-vj01-independent',startTime:1762560000000};
const make=async(encoding,scope=api.DatabaseScope.test('cx-vj01-'+randomUUID()),generation=0)=>{
 const inner=lane==='xtdb'?x.makeXtdbClient('postgres://xtdb:xtdb@127.0.0.1:5470/xtdb',{maxConnections:2,transactionTimeoutMs:15000}):q.makeQleverClient('http://127.0.0.1:7070');
 let injection=null,resolutionBlocked=false;const events=[];
 const mutate=async(method,args)=>{
  const mode=injection;injection=null;
  if(mode==='before'){events.push('failed-before-send');throw new Error('CX-VJ01 before send');}
  const r=await inner[method](...args);
  if(mode==='after'||mode==='unresolved'){events.push('durable-write-then-ACK-loss');resolutionBlocked=mode==='unresolved';throw new Error('CX-VJ01 lost ACK');}
  return r;
 };
 const client={...inner,query:async(...args)=>{
  if(resolutionBlocked)throw new Error('CX-VJ01 receipt channel unavailable');
  return inner.query(...args);
 },...(lane==='xtdb'?{submit:(...args)=>mutate('submit',args)}:{update:(...args)=>mutate('update',args)})};
 const adapter=lane==='xtdb'?x.makeXtdbStorageAdapter(client,scope,{commitEncoding:encoding,resolutionTimeoutMs:20000}):q.makeQleverStorageAdapter(client,scope,{commitEncoding:encoding,resolutionTimeoutMs:20000});
 const executor=lane==='xtdb'?x.makeXtdbQueryExecutor(client,scope,{timeoutMs:15000}):q.makeQleverQueryExecutor(client,scope,{sourceView:adapter.sourceView,timeoutMs:15000});
 const runtime=ManagedRuntime.make(api.Runtime.define({name:'cx-vj01',storage:Layer.succeed(api.StorageAdapter,adapter),queries:Layer.succeed(api.QueryExecutor,executor)}).layer({scope,capabilities:api.Capabilities.none,deterministic:{...deterministic,seed:deterministic.seed+'-'+generation,startTime:deterministic.startTime+generation*1000}}));
 const triples=await runtime.runPromise(Effect.gen(function*(){return yield* core.Triples;}));
 return {scope,adapter,executor,triples,events,run:e=>runtime.runPromise(e),inject:mode=>{injection=mode;},close:async()=>{resolutionBlocked=false;await runtime.dispose();await inner.close();}};
};
const ops=()=>{
 const vals=[core.integer('-9223372036854775808'),core.integer('9223372036854775807'),core.integer('9007199254740993'),core.integer('-9007199254740993'),core.integer('-576460752303423488'),core.integer('576460752303423487'),core.number(Number.MAX_SAFE_INTEGER),core.number(2**53),core.number(-0),core.number(Number.MIN_VALUE),core.number(0.1),core.number(1.0000000000000002),core.string('12345678901234567890.123456789012345678'),core.string('x'.repeat(8192)+'\n"\\𝄞'),core.boolean(false),core.datetime(-8640000000000000),core.datetime(8640000000000000),core.ref(core.EntityId.make('verify:other')),core.json({money:'0.1000000000000000001',n:9007199254740991}),core.blob('sha256:synthetic','text/plain',3,'test.txt')];
 return vals.map((value,i)=>({op:'assert',entityId:entity,attribute:`:verify/value${i}`,value,entityType:'Verify',validFrom:1,validTo:100}));
};
for(const encoding of ['a0','compact']){
 const arm={encoding,checks:[],reads:{},events:[]};out.arms.push(arm);save();
 let rt;
 try{
  rt=await make(encoding);arm.scope=rt.scope;
  const t=rt.triples,run=rt.run;
  const check=(name)=>{arm.checks.push(name);save();console.log(`${lane}/${encoding}: ${name}`);};
  const receipt=await run(t.transact(ops(),{commandId:'base,"\\\nNULL{}𝄞',actor:'synthetic',correlationId:'v:corr'}));
  arm.reads.first=receipt;
  for(let i=0;i<ops().length;i++)assert.equal(exact(receipt.triples[i].value),exact(ops()[i].value));
  check('20 exact boundary/decimal-string/long-text values at commit');
  const at=await run(t.entity(entity,{validAt:50,recordedAt:receipt.instant}));
  assert.equal(at.length,20);for(const triple of at){const i=Number(triple.attribute.replace(':verify/value',''));assert.equal(exact(triple.value),exact(ops()[i].value));}
  arm.reads.initialCut=at;check('read-your-own-write at exact valid/recorded cut');
  const changed=receipt.triples[8];
  const second=await run(t.transact([{op:'retract',id:changed.id},{op:'assert',entityId:entity,attribute:':verify/value8',value:core.number(42),validFrom:1,validTo:100}],{commandId:'correction',preconditions:[{_tag:'TripleLive',id:changed.id}]}));
  arm.reads.second=second;
  arm.reads.oldCut=await run(rt.adapter.getByEntity(entity,{validAt:50,recordedPosition:receipt.position}));
  assert.deepEqual(arm.reads.oldCut.map(x=>x.id).sort(),at.map(x=>x.id).sort());
  assert.ok(Object.is(arm.reads.oldCut.find(x=>x.attribute===':verify/value8').value_number,-0));
  arm.reads.beforeRecorded=await run(t.entity(entity,{validAt:50,recordedAt:receipt.instant-1}));assert.equal(arm.reads.beforeRecorded.length,0);
  arm.reads.current=await run(t.entity(entity,{validAt:50}));
  assert.equal(arm.reads.current.find(x=>x.attribute===':verify/value8').value.value,42);
  arm.reads.validTo=await run(t.entity(entity,{validAt:100}));assert.equal(arm.reads.validTo.length,0);
  arm.reads.beforeValid=await run(t.entity(entity,{validAt:0}));assert.equal(arm.reads.beforeValid.length,0);
  arm.reads.history=await run(t.history(entity));assert.equal(arm.reads.history.length,21);
  check('retract/replacement, old cut stability, half-open valid interval, history');
  const conflict=await run(t.transact([{op:'retract',id:changed.id}],{preconditions:[{_tag:'TripleLive',id:changed.id}]}).pipe(Effect.match({onSuccess:()=>null,onFailure:e=>e._tag})));
  assert.equal(conflict,'TransactionConflictError');arm.reads.casConflict=conflict;
  const duplicate=await run(t.transact(ops(),{commandId:'base,"\\\nNULL{}𝄞'}).pipe(Effect.match({onSuccess:()=>null,onFailure:e=>({tag:e._tag,transactionId:e.transactionId})})));
  assert.equal(duplicate.tag,'CommandAlreadyCommittedError');arm.reads.duplicate=duplicate;
  arm.reads.original=await run(t.transactionByCommand('base,"\\\nNULL{}𝄞'));check('typed stale precondition and duplicate command preserves original receipt');
  arm.reads.journal=await run(t.transactions({after:0,limit:100}));
  assert.equal(arm.reads.journal.transactions.length,2);assert.equal(arm.reads.journal.transactions[0].changes.length,20);assert.equal(arm.reads.journal.transactions[1].changes.length,2);
  arm.reads.feedResume=await run(t.transactions({after:receipt.position,limit:100}));assert.equal(arm.reads.feedResume.transactions.length,1);
  arm.reads.journalFacts=await run(t.match({attribute:':_tx/change'}));
  arm.reads.dependency=await run(t.dependencyState([':verify/value8'],{validAt:50,recordedAt:receipt.instant}));
  arm.reads.query=await run(rt.executor.execute({find:['?v'],where:[[entity,':verify/value8','?v']]},false,{validAt:50,recordedPosition:receipt.position}));
  assert.equal(arm.reads.query.results.length,1);assert.ok(Object.values(arm.reads.query.results[0]).some(v=>v===0));check('journal exact changes, resumable feed, dependency and Datalog at old cut');
  rt.inject('after');const lost=await run(t.transact([{op:'assert',entityId:entity,attribute:':verify/ack',value:core.string('ack')}],{commandId:'lost-ack'}));
  arm.reads.lostAck={position:lost.position};check('lost ACK after durable write resolves through operation receipt');
  // Explicitly unknown outcomes exercise reopen/command resolution without restarting the shared engine.
  rt.inject('unresolved');const unresolved=await run(t.transact([{op:'assert',entityId:entity,attribute:':verify/reopen',value:core.string('durable')}],{commandId:'after-crash'}).pipe(Effect.match({onSuccess:()=>null,onFailure:e=>e._tag})));
  assert.equal(unresolved,'TransactionOutcomeUnknown');arm.reads.unresolved=unresolved;arm.events.push(...rt.events);
  const scope=rt.scope;await rt.close();rt=await make(encoding,scope,1);
  const prior=await rt.run(rt.triples.transactionByCommand('after-crash'));assert.ok(prior);
  const after=await rt.run(rt.triples.transact([{op:'assert',entityId:entity,attribute:':verify/reopen',value:core.string('durable')}],{commandId:'after-crash'}).pipe(Effect.match({onSuccess:()=>null,onFailure:e=>e._tag})));
  assert.equal(after,'CommandAlreadyCommittedError');check('durable ACK+resolution loss then client reopen resolves duplicate');
  // Deliberate before-send failure must not publish and retry must publish once.
  rt.inject('before');const before=await rt.run(rt.triples.transact([{op:'assert',entityId:entity,attribute:':verify/before',value:core.string('retry')}],{commandId:'before-crash'}).pipe(Effect.match({onSuccess:()=>null,onFailure:e=>e._tag})));
  assert.equal(before,'TransactionOutcomeUnknown');
  const retry=await rt.run(rt.triples.transact([{op:'assert',entityId:entity,attribute:':verify/before',value:core.string('retry')}],{commandId:'before-crash'}));arm.reads.beforeRetry={position:retry.position};arm.events.push(...rt.events);check('before-send loss leaves no claim and explicit retry publishes');
  const raceEntity=core.EntityId.make('verify:race');
  const raced=await rt.run(Effect.all(['left','right'].map(side=>rt.triples.transact([{op:'assert',entityId:raceEntity,attribute:':verify/race',value:core.string(side)}],{commandId:'race-claim,\\\nNULL{}𝄞'}).pipe(Effect.match({onSuccess:r=>({kind:'committed',txId:r.txId}),onFailure:e=>({kind:e._tag,txId:e.transactionId})}))),{concurrency:'unbounded'}));
  assert.deepEqual(raced.map(x=>x.kind).sort(),['CommandAlreadyCommittedError','committed'].sort());assert.equal(raced[0].txId,raced[1].txId);
  arm.reads.racedClaim=raced.map(x=>x.kind).sort();check('racing duplicate command has one publication and original receipt');
  const casEntity=core.EntityId.make('verify:cas-race');
  const cas=await rt.run(Effect.all(['left','right'].map(side=>rt.triples.transact([{op:'assert',entityId:casEntity,attribute:':verify/cas',value:core.string(side)}],{preconditions:[{_tag:'EntityState',entityId:casEntity,tripleIds:[]}]}).pipe(Effect.match({onSuccess:()=> 'committed',onFailure:e=>e._tag}))),{concurrency:'unbounded'}));
  assert.deepEqual(cas.sort(),['TransactionConflictError','committed'].sort());assert.equal((await rt.run(rt.triples.entity(casEntity))).length,1);
  arm.reads.racedCas=cas;check('racing source cuts/entity CAS cannot both publish');

 }catch(e){arm.error={message:e.message,stack:e.stack};out.failures.push({encoding,error:e.message});console.error(e);save();}
 finally{if(rt)await rt.close();save();}
}
if(out.arms.length===2&&!out.failures.length){
 const clean=arm=>exact(arm.reads).split(JSON.stringify(arm.scope).slice(1,-1)).join('<scope>');
 out.equivalent=clean(out.arms[0])===clean(out.arms[1]);
 if(!out.equivalent)out.failures.push({error:'exact A0/compact read comparison differs; inspect saved surfaces'});
}
out.endedAt=new Date().toISOString();save();console.log(JSON.stringify({lane,checks:out.arms.map(a=>a.checks),failures:out.failures,equivalent:out.equivalent},null,2));process.exitCode=out.failures.length?1:0;
