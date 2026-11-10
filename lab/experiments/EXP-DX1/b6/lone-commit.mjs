// [DX-B6-1] Why: measure the complete SDK commit with real offered times and operation-bound observations.
// Rejected: a completion-paced Poisson loop and last-callback attribution under overlapping arrivals.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Effect,Layer,ManagedRuntime} from 'effect';
import {Triples} from '../../../../packages/core/dist/index.js';
import {Runtime,StorageAdapter,QueryExecutor,DatabaseScope,Capabilities} from '../../../../packages/core/dist/runtime/index.js';
import {DatomicClient,makeDatomicStorageAdapter,makeDatomicQueryExecutor} from '../../../../packages/datomic/dist/index.js';
import {ownFacts,sharedFacts,accountsFor,SEED_VALID_FROM} from '../../../bench/lib/world.ts';
import {buildTraceCommand} from '../../../bench/lib/commands.ts';
const sleep=ms=>new Promise(r=>setTimeout(r,Math.max(0,ms)));
const summary=a=>{const s=[...a].sort((x,y)=>x-y);return {n:s.length,p50:s[Math.floor(s.length*.5)],p99:s[Math.floor(s.length*.99)]}};
const rng=initial=>{let seed=initial;return()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296}};
const random=rng(123456), arrivals=rng(0x19870219), subjects=400,accounts=accountsFor(subjects);
const states=new Map(),diagnostics=new Map(),http=[],pendingSubjects=new Map(),phases={},samples=[];
const scope=DatabaseScope.test(`DX-B6-${randomUUID()}`),client=new DatomicClient(process.env.DATOMIC_URL,35000);
const adapter=makeDatomicStorageAdapter(client,scope,{layout:'lean'});
const runtime=ManagedRuntime.make(Runtime.define({name:'DX-B6',storage:Layer.succeed(StorageAdapter,adapter),queries:Layer.succeed(QueryExecutor,makeDatomicQueryExecutor(client,scope))}).layer({scope,capabilities:Capabilities.none}));
const triples=await runtime.runPromise(Triples);
client.onRequest=s=>http.push(s);
client.onCommit=s=>{for(const txId of s.transactionIds)diagnostics.set(txId,s)};
let seq=0;
function remember(rows){for(const t of rows){
 if(t.attribute===':placement/stamp'){const i=Number(t.entityId.slice(3));states.set(i,{...states.get(i),stamp:Number(t.value.value),stampId:t.id,stampValidFrom:t.validFrom})}
 if(t.attribute===':worker/address'){const i=Number(t.entityId.slice(3));states.set(i,{...states.get(i),address:t.value.value,addressId:t.id,addressValidFrom:t.validFrom})}
}}
function commit(offeredAt=performance.now()){
 const commandSeq=seq++,subject=commandSeq%subjects,p=random();
 const facts=p<.6?5+Math.floor(random()*6):p<.9?11+Math.floor(random()*15):26+Math.floor(random()*25);
 const event={subject,seq:commandSeq,facts,kind:'person',stream:'background',correction:false};
 const predecessor=pendingSubjects.get(subject)??Promise.resolve();
 const done=(async()=>{
  await predecessor;
  const started=performance.now(),command=buildTraceCommand({runTag:scope,event,state:states.get(subject),scheduledAbsMs:Date.now()});
  const receipt=await runtime.runPromise(triples.transact(command.operations,{commandId:command.commandId,preconditions:command.preconditions}));
  const returnedAt=performance.now();
  remember(receipt.triples);
  const diagnostic=diagnostics.get(receipt.txId);
  assert.ok(diagnostic,'a successful receipt must have its own diagnostic');
  const requests=diagnostic.attempts.flatMap(a=>a.requests);
  assert.equal(requests.filter(s=>s.path.endsWith('/transact')&&s.status===200).at(-1)?.operationId,diagnostic.operationId);
  return {offeredAt,started,returnedAt,ms:returnedAt-offeredAt,http:requests,diagnostic,instant:receipt.instant,position:receipt.position};
 })();
 pendingSubjects.set(subject,done);
 return done;
}
function breakdown(rows){
 const values=rows.map(r=>{const h=r.http.filter(s=>s.path.endsWith('/transact')&&s.status===200).at(-1),d=r.diagnostic,a=d.attempts.at(-1),t=h.gatewayTimeline;return {offerToAdapter:d.started-r.offeredAt,stage:a.ready-d.started,queue:a.released-a.ready,encodeAndWrite:h.written-a.released,transportAndGateway:h.headers-h.written,parseAndReturn:d.returned-h.headers,gatewayPrepare:t.payloadPrepared/1000,gatewayQueue:(t.predecessorReady-t.payloadPrepared)/1000,native:(t.completed-t.submitted)/1000}});
 return Object.fromEntries(Object.keys(values[0]).map(k=>[k,summary(values.map(v=>v[k])).p50]));
}
async function phase(name,n,interval,openLoop=false){
 const start=performance.now(),jobs=[];let due=start,failure;
 const offer=offeredAt=>{const job=commit(offeredAt);job.catch(error=>{failure??=error});jobs.push(job)};
 if(openLoop){
  const offers=[];while(true){due+=interval();if(due>start+60000)break;offers.push(due)}
  for(const offeredAt of offers){await sleep(offeredAt-performance.now());if(failure)break;offer(offeredAt)}
 }else for(let i=0;i<n;i++){if(interval){due+=interval();await sleep(due-performance.now())}const value=await commit(interval?due:performance.now());jobs.push(Promise.resolve(value))}
 const outcomes=await Promise.allSettled(jobs);
 if(failure){fs.writeFileSync('/driver/lone-commit-failure.json',JSON.stringify({scope,name,phases,observations:outcomes.map(o=>o.status==='fulfilled'?{status:o.status,value:o.value}:{status:o.status,error:String(o.reason)})}));throw failure}
 const rows=outcomes.map(o=>{assert.equal(o.status,'fulfilled');return o.value});
 phases[name]={openLoop,latency:summary(rows.map(r=>r.ms)),offerDelay:summary(rows.map(r=>r.started-r.offeredAt)),httpCalls:summary(rows.map(r=>r.diagnostic.httpCalls)),gatewayMicros:summary(rows.flatMap(r=>r.http.filter(h=>h.path.endsWith('/transact')&&h.status===200).map(h=>h.gatewayMicros))),transactMicros:summary(rows.flatMap(r=>r.http.filter(h=>h.path.endsWith('/transact')&&h.status===200).map(h=>h.transactMicros))),breakdownMedianMs:breakdown(rows),wallMs:performance.now()-start};
 samples.push({name,rows});console.log(name,JSON.stringify(phases[name]));
 fs.writeFileSync('/driver/lone-commit.json',JSON.stringify({scope,phases,samples,diagnostic:true,poisson:'independent open-loop offered times; per-subject predecessor safety'}));
}
try{
 const shared=Array.from({length:accounts},(_,i)=>sharedFacts(i)).flat();
 for(let i=0;i<shared.length;i+=200)await runtime.runPromise(triples.assertBatch(shared.slice(i,i+200).map(f=>({entityId:f.e,attribute:f.a,value:f.v,validFrom:SEED_VALID_FROM}))));
 for(let i=0;i<subjects;i++)remember(await runtime.runPromise(triples.assertBatch(ownFacts(i,accounts).map(f=>({entityId:f.e,attribute:f.a,value:f.v,validFrom:SEED_VALID_FROM})))));
 assert.equal(states.size,subjects);
 const db=http.findLast(h=>h.path.endsWith('/transact')).path.split('/')[3];
 console.log('seed-cache',JSON.stringify({bytes:client.rowCache.bytes,entries:client.rowCache.size,evictions:client.rowCache.evictions,missingStamps:[...states.values()].filter(s=>!client.rowCache.has(`${db}\0${s.stampId}`)).length}));
 await phase('coldSparse',120,()=>1000);
 await phase('backToBack',2000);
 await phase('sparse',120,()=>1000);
 await phase('poisson',0,()=>-Math.log(1-arrivals())*1000/15,true);
}finally{await runtime.dispose();await client.delete(scope);client.close()}
if(process.env.B6_WRITES_ONLY!=='1')await import('./pull-load.mjs');
