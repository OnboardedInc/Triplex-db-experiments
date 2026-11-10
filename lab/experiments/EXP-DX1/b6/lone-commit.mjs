// [DX-B6-1] Why: compare sparse and saturated application commits in VM network space.
// Rejected: host tunnel timings and tiny SPI-only writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { Effect, Layer, ManagedRuntime } from 'effect';
import { Triples } from '../../../../packages/core/dist/index.js';
import { Runtime, StorageAdapter, QueryExecutor, DatabaseScope, Capabilities } from '../../../../packages/core/dist/runtime/index.js';
import { DatomicClient, makeDatomicStorageAdapter, makeDatomicQueryExecutor } from '../../../../packages/datomic/dist/index.js';
import { ownFacts, sharedFacts, accountsFor, ids, SEED_VALID_FROM } from '../../../bench/lib/world.ts';
import { buildTraceCommand } from '../../../bench/lib/commands.ts';
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0,ms)));
const summary = a => {const s=[...a].sort((x,y)=>x-y);return {n:s.length,p50:s[Math.floor(s.length*.5)],p99:s[Math.floor(s.length*.99)]}};
const samples=[], phases={}, subjects=400, accounts=accountsFor(subjects), states=new Map();
const scope=DatabaseScope.test(`DX-B6-${randomUUID()}`), client=new DatomicClient(process.env.DATOMIC_URL,35000);
const adapter=makeDatomicStorageAdapter(client,scope,{layout:'lean'});
const runtime=ManagedRuntime.make(Runtime.define({name:'DX-B6',storage:Layer.succeed(StorageAdapter,adapter),queries:Layer.succeed(QueryExecutor,makeDatomicQueryExecutor(client,scope))}).layer({scope,capabilities:Capabilities.none}));
const triples=await runtime.runPromise(Triples);
const http=[], diagnostics=[];
client.onRequest=s=>http.push(s);
client.onCommit=s=>diagnostics.push(s);
let seq=0, seed=123456;
const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
function remember(rows){for(const t of rows){if(t.attribute===':placement/stamp')states.set(Number(t.entityId.slice(3)),{stamp:Number(t.value.value),stampId:t.id,stampValidFrom:t.validFrom});if(t.attribute===':worker/address')Object.assign(states.get(Number(t.entityId.slice(3))),{address:t.value.value,addressId:t.id,addressValidFrom:t.validFrom})}}
async function commit(){const subject=seq%subjects;const event={subject,seq:seq++,facts: (()=>{const p=random();return p<.6?5+Math.floor(random()*6):p<.9?11+Math.floor(random()*15):26+Math.floor(random()*25)})(),kind:'person',stream:'background',correction:false};const command=buildTraceCommand({runTag:scope,event,state:states.get(subject),scheduledAbsMs:Date.now()});const before=http.length,start=performance.now();const r=await runtime.runPromise(triples.transact(command.operations,{commandId:command.commandId,preconditions:command.preconditions}));remember(r.triples);return {ms:performance.now()-start,http:http.slice(before),diagnostic:diagnostics.at(-1),instant:r.instant,position:r.position}}
async function phase(name,n,arrival){const rows=[],start=performance.now();let due=start;for(let i=0;i<n;i++){if(arrival){due+=arrival();await sleep(due-performance.now())}rows.push(await commit())}phases[name]={latency:summary(rows.map(r=>r.ms)),httpCalls:summary(rows.map(r=>r.http.length)),gatewayMicros:summary(rows.flatMap(r=>r.http.filter(h=>h.path.endsWith('/transact')).map(h=>h.gatewayMicros))),transactMicros:summary(rows.flatMap(r=>r.http.filter(h=>h.path.endsWith('/transact')).map(h=>h.transactMicros))),breakdownMedianMs: (()=>{const a=rows.filter(r=>r.diagnostic&&r.http.some(h=>h.path.endsWith('/transact'))); const values=a.map(r=>{const h=r.http.findLast(h=>h.path.endsWith('/transact')), d=r.diagnostic, attempt=d.attempts.at(-1), t=h.gatewayTimeline;return {stage:attempt.ready-d.started,queue:attempt.released-attempt.ready,encodeAndWrite:h.written-attempt.released,transportAndGateway:h.headers-h.written,parseAndReturn:d.returned-h.headers,gatewayPrepare:(t?.payloadPrepared??0)/1000,gatewayQueue:((t?.predecessorReady??0)-(t?.payloadPrepared??0))/1000,native:((t?.completed??0)-(t?.submitted??0))/1000,reusedSocket:h.reusedSocket}});return Object.fromEntries(['stage','queue','encodeAndWrite','transportAndGateway','parseAndReturn','gatewayPrepare','gatewayQueue','native'].map(k=>[k,summary(values.map(v=>v[k])).p50]))})(),wallMs:performance.now()-start};samples.push({name,rows});console.log(name,JSON.stringify(phases[name]));fs.writeFileSync('/driver/lone-commit.json',JSON.stringify({scope,phases,samples,diagnostic:true}));}
try{
 const shared=Array.from({length:accounts},(_,i)=>sharedFacts(i)).flat();
 for(let i=0;i<shared.length;i+=200)await runtime.runPromise(triples.assertBatch(shared.slice(i,i+200).map(f=>({entityId:f.e,attribute:f.a,value:f.v,validFrom:SEED_VALID_FROM}))));
 for(let i=0;i<subjects;i++)remember(await runtime.runPromise(triples.assertBatch(ownFacts(i,accounts).map(f=>({entityId:f.e,attribute:f.a,value:f.v,validFrom:SEED_VALID_FROM})))));
 assert.equal(states.size,subjects);
 await phase('coldSparse',Number(process.env.B6_COLD_COUNT??120),()=>1000);
 await phase('backToBack',2000);
 await phase('sparse',120,()=>1000);
 await phase('poisson',900,()=>-Math.log(1-random())*1000/15);
}finally{await runtime.dispose();await client.delete(scope);client.close()}
// Run the read matrix in the same bounded stack hold after the write-only phases.
if (process.env.B6_COMMIT_ONLY !== '1') await import('./pull-load.mjs');
