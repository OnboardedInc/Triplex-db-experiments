// [DX-B8] Why: reproduce B6's three-worker logical-reader layout and seeded random subject choice.
// Rejected: a single load-generator event loop as the only saturation source.
import {parentPort,workerData} from 'node:worker_threads';
import assert from 'node:assert/strict';
import {Layer,ManagedRuntime} from 'effect';
import {Triples} from '../../../../packages/core/dist/index.js';
import {Runtime,StorageAdapter,QueryExecutor,Capabilities} from '../../../../packages/core/dist/runtime/index.js';
import {DatomicClient,makeDatomicStorageAdapter,makeDatomicQueryExecutor} from '../../../../packages/datomic/dist/index.js';
import {ids} from '../../../bench/lib/world.ts';
const {url,scope,instant,worker,subjects}=workerData;
const client=new DatomicClient(url,35000),adapter=makeDatomicStorageAdapter(client,scope,{layout:'lean'});
const runtime=ManagedRuntime.make(Runtime.define({name:'DX-B8-read',storage:Layer.succeed(StorageAdapter,adapter),queries:Layer.succeed(QueryExecutor,makeDatomicQueryExecutor(client,scope))}).layer({scope,capabilities:Capabilities.none}));
const triples=await runtime.runPromise(Triples);
let random=worker*171+12345;
const subject=()=>{random^=random<<13;random^=random>>>17;random^=random<<5;return(random>>>0)%subjects};
const pull=()=>runtime.runPromise(triples.reach(ids.placement(subject()),{validAt:Date.now(),recordedAt:instant}));
for(let i=0;i<800;i++)await pull();
parentPort.postMessage({ready:true});
parentPort.on('message',async({readers,durationMs})=>{
 const times=[],end=performance.now()+durationMs;
 await Promise.all(Array.from({length:readers},async()=>{while(performance.now()<end){const t=performance.now();await pull();times.push(performance.now()-t)}}));
 assert.deepEqual(client.reachDiagnostics.declines,{});assert.equal(client.reachDiagnostics.faults,0);assert.equal(client.reachDiagnostics.fullRetries,0);
 parentPort.postMessage({times,diagnostics:client.reachDiagnostics});
});
