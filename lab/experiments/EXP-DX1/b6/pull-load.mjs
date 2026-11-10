// [DX-B6-2] Why: measure VM-local logical readers over the representative subject graph.
// Rejected: Mac tunnel goodput or a synthetic one-row pull.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {Effect,Layer,ManagedRuntime} from 'effect';
import {Triples} from '../../../../packages/core/dist/index.js';
import {Runtime,StorageAdapter,QueryExecutor,DatabaseScope,Capabilities} from '../../../../packages/core/dist/runtime/index.js';
import {DatomicClient,makeDatomicStorageAdapter,makeDatomicQueryExecutor} from '../../../../packages/datomic/dist/index.js';
import {ownFacts,sharedFacts,accountsFor,ids,SEED_VALID_FROM} from '../../../bench/lib/world.ts';
const subjects=2000,accounts=accountsFor(subjects);
const summary=a=>{const s=[...a].sort((x,y)=>x-y);return {n:s.length,p50:s[Math.floor(s.length*.5)],p99:s[Math.floor(s.length*.99)]}};
async function handle(url,scope){const client=new DatomicClient(url,35000),adapter=makeDatomicStorageAdapter(client,scope,{layout:'lean'});const runtime=ManagedRuntime.make(Runtime.define({name:'b6',storage:Layer.succeed(StorageAdapter,adapter),queries:Layer.succeed(QueryExecutor,makeDatomicQueryExecutor(client,scope))}).layer({scope,capabilities:Capabilities.none}));const triples=await runtime.runPromise(Triples);return {client,adapter,runtime,triples};}
if(!isMainThread){
 const h=await handle(workerData.url,workerData.scope);let seq=workerData.worker*171, random=workerData.worker*171+12345, mode="sequential";
 const randomSubject=()=>{random^=random<<13;random^=random>>>17;random^=random<<5;return (random>>>0)%subjects};
 const pull=()=>h.runtime.runPromise(h.triples.reach(ids.placement(mode==="random"?randomSubject():seq++%subjects),{validAt:Date.now(),recordedAt:workerData.instant}));
 for(let i=0;i<2000;i++)await pull();
 parentPort.postMessage({ready:true});
 parentPort.on('message',async({readers,durationMs,mode:nextMode})=>{
  mode=nextMode;
  let calls=0,bytes=0;const times=[];h.client.onRequest=s=>{calls++;bytes+=s.responseBytes};const end=performance.now()+durationMs,start=performance.now();
  await Promise.all(Array.from({length:readers},async()=>{while(performance.now()<end){const t=performance.now();await pull();times.push(performance.now()-t)}}));
  assert.deepEqual(h.client.reachDiagnostics.declines,{});assert.equal(h.client.reachDiagnostics.faults,0);assert.equal(h.client.reachDiagnostics.fullRetries,0);
  parentPort.postMessage({times,calls,bytes,wallMs:performance.now()-start,diagnostics:h.client.reachDiagnostics,cache:{entities:h.client.reachCache.bytes,rows:h.client.rowCache.bytes}});
 });
}else{
 const scope=DatabaseScope.test(`b6-pulls-${randomUUID()}`),w=await handle(process.env.DATOMIC_URL,scope),workers=[];
 const report={diagnostic:true,scope,subjects,phases:{}};
 const save=()=>fs.writeFileSync('/driver/pull-load.json',JSON.stringify(report));
 try{
  const shared=Array.from({length:accounts},(_,a)=>sharedFacts(a)).flat();
  for(let i=0;i<shared.length;i+=200)await w.runtime.runPromise(w.triples.assertBatch(shared.slice(i,i+200).map(f=>({entityId:f.e,attribute:f.a,value:f.v,validFrom:SEED_VALID_FROM}))));
  let instant;
  for(let i=0;i<subjects;i++){const rows=await w.runtime.runPromise(w.triples.assertBatch(ownFacts(i,accounts).map(f=>({entityId:f.e,attribute:f.a,value:f.v,validFrom:SEED_VALID_FROM}))));instant=rows[0].recordedAt}
  const once=(worker)=>new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject)});
  for(let i=0;i<3;i++){const worker=new Worker(new URL(import.meta.url),{workerData:{url:process.env.DATOMIC_READ_URLS.split(',')[0],scope,instant,worker:i}});workers.push(worker)}
  await Promise.all(workers.map(once));
  const cg=process.env.TX2_ENGINE_CGROUPS.split(',').find(v=>v.startsWith(process.env.DATOMIC_READ_URLS.split('//')[1].split(':')[0]+'='))?.split('=')[1];
  assert.ok(cg,'read gateway cgroup');const cpu=()=>Number(/usage_usec (\d+)/.exec(fs.readFileSync(cg+'/cpu.stat','utf8'))[1]);
  for(const [mode,readers] of [["sequential",64],["sequential",256],["random",64],["random",256]]){const before=cpu(),start=performance.now();const done=workers.map(once);workers.forEach((worker,i)=>worker.postMessage({mode,readers:Math.floor(readers/3)+(i<readers%3?1:0),durationMs:30000}));const samples=await Promise.all(done);const wallMs=performance.now()-start,times=samples.flatMap(s=>s.times),calls=samples.reduce((n,s)=>n+s.calls,0),bytes=samples.reduce((n,s)=>n+s.bytes,0),cpuSeconds=(cpu()-before)/1e6;report.phases[`${mode}-${readers}`]={readers,latency:summary(times),wallMs,pullsPerSecond:times.length/(wallMs/1000),requestsPerPull:calls/times.length,bytesPerPull:bytes/times.length,readGatewayCpuSeconds:cpuSeconds,readGatewayCores:cpuSeconds/(wallMs/1000),samples};save();console.log(readers,JSON.stringify({...report.phases[`${mode}-${readers}`],samples:undefined}));}
 }finally{for(const worker of workers)await worker.terminate();await w.runtime.dispose();await w.client.delete(scope);w.client.close()}
}
