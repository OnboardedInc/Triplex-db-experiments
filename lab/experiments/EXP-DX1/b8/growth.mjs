// [DX-B8] Why: isolate scope churn with eight one-row writers, then measure the complete trace command.
// Rejected: batched spans (logical head growth without physical replacement churn).
import fs from 'node:fs';
import {Worker} from 'node:worker_threads';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Effect,Layer,ManagedRuntime} from 'effect';
import {Triples} from '../../../../packages/core/dist/index.js';
import {Runtime,StorageAdapter,QueryExecutor,DatabaseScope,Capabilities} from '../../../../packages/core/dist/runtime/index.js';
import {DatomicClient,makeDatomicStorageAdapter,makeDatomicQueryExecutor} from '../../../../packages/datomic/dist/index.js';
import {ownFacts,sharedFacts,accountsFor,ids,SEED_VALID_FROM} from '../../../bench/lib/world.ts';
import {buildTraceCommand} from '../../../bench/lib/commands.ts';
const label=process.env.B8_LABEL??'before',newScope=DatabaseScope.test(`DX-B8-${label}-${randomUUID()}`);
const subjects=400,accounts=accountsFor(subjects),states=new Map(),handles=[],workers=[];
let scope=newScope;
const checkpoint=`/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B8/state-${label}.json`;
const prior=fs.existsSync(checkpoint)?JSON.parse(fs.readFileSync(checkpoint,'utf8')):null;
if(prior)scope=prior.report.scope;
const report=prior?.report??{diagnostic:true,label,scope,subjects,fill:[],measurements:[],indexRequested:false};
const save=()=>{fs.writeFileSync('/driver/growth.json',JSON.stringify(report));fs.writeFileSync(checkpoint,JSON.stringify({report,states:[...states],count,seq,fillSeq,latestInstant,readInstant,random}));};
const summary=a=>{const s=[...a].sort((x,y)=>x-y);return {n:s.length,p50:s[Math.floor(s.length*.5)],p99:s[Math.floor(s.length*.99)]}};
async function handle(url){const client=new DatomicClient(url,35000),adapter=makeDatomicStorageAdapter(client,scope,{layout:'lean'});const runtime=ManagedRuntime.make(Runtime.define({name:'DX-B8',storage:Layer.succeed(StorageAdapter,adapter),queries:Layer.succeed(QueryExecutor,makeDatomicQueryExecutor(client,scope))}).layer({scope,capabilities:Capabilities.none}));const triples=await runtime.runPromise(Triples);const h={client,runtime,triples};handles.push(h);return h;}
function remember(rows){for(const t of rows){if(t.attribute===':placement/stamp'){const i=Number(t.entityId.slice(3));states.set(i,{...states.get(i),stamp:Number(t.value.value),stampId:t.id,stampValidFrom:t.validFrom})}if(t.attribute===':worker/address'){const i=Number(t.entityId.slice(3));states.set(i,{...states.get(i),address:t.value.value,addressId:t.id,addressValidFrom:t.validFrom})}}}
let random=123456;const rng=()=>{random^=random<<13;random^=random>>>17;random^=random<<5;return (random>>>0)/4294967296};
let count=0,seq=0,fillSeq=0,latestInstant,readInstant=prior?.readInstant;
if(prior){for(const [k,v] of prior.states)states.set(k,v);({count,seq,fillSeq,latestInstant,random}=prior);}
const started=performance.now(),deadline=started+Number(process.env.B8_SECONDS??680)*1000;
const writer=await handle(process.env.DATOMIC_URL),{client,runtime,triples}=writer;
try{
 const db=(await client.create(scope,'lean')).db;
 report.db=db;report.health=await client.health();
 if(!prior){
 const shared=Array.from({length:accounts},(_,i)=>sharedFacts(i)).flat();
 for(let i=0;i<shared.length;i+=200){await runtime.runPromise(triples.assertBatch(shared.slice(i,i+200).map(f=>({entityId:f.e,attribute:f.a,value:f.v,validFrom:SEED_VALID_FROM}))));count++}
 for(let i=0;i<subjects;i++){const rows=await runtime.runPromise(triples.assertBatch(ownFacts(i,accounts).map(f=>({entityId:f.e,attribute:f.a,value:f.v,validFrom:SEED_VALID_FROM}))));remember(rows);count++;latestInstant=rows[0].recordedAt}
 }
 readInstant??=latestInstant;
 const fillers=Array.from({length:8},()=>new DatomicClient(process.env.DATOMIC_URL,35000));
 for(const c of fillers)await c.create(scope,'lean');
 handles.push(...fillers.map(client=>({client})));
 const rowBase={attribute:':b8/fill',value_type:'string',value_string:'x',value_number:null,value_boolean:null,value_datetime:null,value_json:null,valid_from:0,valid_to:null,created_by:null,retracted_at:null,retracted_position:null,retract_tx_id:null,entity_type:null,schema_version:0};
 const fill=async target=>{
  // [DX-B8] Why: concurrent fill order must not mark the scope record-time irregular and invalidate the read probe.
  // Rejected: each client's wall clock (arrival order can regress); one common instant per fill phase is exact.
  const start=performance.now(),initial=count,recordedAt=Date.now();let allocated=count,last=start,lastN=count;
  await Promise.all(fillers.map(async(c,worker)=>{while(allocated<target&&performance.now()<deadline){allocated++;const i=fillSeq++,id=`fill-${i}`,time=recordedAt;const result=await c.transact(db,{sourceK:null,scopeWide:false,entities:[],live:[],span:1,position:1,operationId:`fill-op-${i}`,attemptId:`fill-attempt-${i}`,rows:[{...rowBase,id,entity_id:id,recorded_at:time,recorded_position:1,tx_id:id}],newIds:[id],claims:[]});assert.equal(result.position.t,'long');count++;if(performance.now()-last>10000){const now=performance.now();const point={commits:count,wallMs:now-start,rate:(count-lastN)*1000/(now-last)};report.fill.push(point);console.log('fill',JSON.stringify(point));last=now;lastN=count;save()}}}));
  report.fill.push({target,actual:count,rate:(count-initial)*1000/(performance.now()-start),wallMs:performance.now()-start});save();return count>=target;
 };
 const once=worker=>new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject)});
 for(let i=0;i<3;i++){workers.push(new Worker(new URL('./pull-worker.mjs',import.meta.url),{workerData:{url:process.env.DATOMIC_READ_URLS.split(',')[0],scope,instant:readInstant,worker:i,subjects}}));}
 await Promise.all(workers.map(once));
 const cg=process.env.TX2_ENGINE_CGROUPS.split(',').find(v=>v.startsWith(process.env.DATOMIC_READ_URLS.split('//')[1].split(':')[0]+'='))?.split('=')[1];assert.ok(cg);
 const cpu=()=>Number(/usage_usec (\d+)/.exec(fs.readFileSync(cg+'/cpu.stat','utf8'))[1]);
 for(const target of (process.env.B8_HEADS??'1000,50000,250000,500000').split(',').map(Number)){
  if(report.measurements.some(m=>m.target===target))continue;
  if(!await fill(target)){report.incomplete={target,reason:'window deadline',count};break}
  const beforeBasis=await client.basis(db),samples=[],begin=performance.now();
  for(let i=0;i<400;i++){const subject=seq%subjects,p=rng(),facts=p<.6?5+Math.floor(rng()*6):p<.9?11+Math.floor(rng()*15):26+Math.floor(rng()*25);const command=buildTraceCommand({runTag:scope,event:{subject,seq:seq++,facts,kind:'person',stream:'background',correction:false},state:states.get(subject),scheduledAbsMs:Date.now()});const t=performance.now(),receipt=await runtime.runPromise(triples.transact(command.operations,{commandId:command.commandId,preconditions:command.preconditions}));samples.push(performance.now()-t);remember(receipt.triples);latestInstant=receipt.instant;count++}
  const commitWall=performance.now()-begin;
  const beforeCpu=cpu(),readStart=performance.now();
  const done=workers.map(once);workers.forEach((worker,i)=>worker.postMessage({readers:21+(i===0?1:0),durationMs:10000}));
  const results=await Promise.all(done),latencies=results.flatMap(r=>r.times);
  const cpuSeconds=(cpu()-beforeCpu)/1e6;
  const m={target,physicalCommitsBefore:count-400,beforeBasis,afterBasis:await client.basis(db),commit:summary(samples),commitsPerSecond:400*1000/commitWall,pulls:latencies.length,pull:summary(latencies),cpuSeconds,cpuPerPull:cpuSeconds/latencies.length,pullsPerSecond:latencies.length*1000/(performance.now()-readStart),samples};
  report.measurements.push(m);console.log('measurement',JSON.stringify({...m,samples:undefined}));save();
 }
 report.wallMs=performance.now()-started;save();
}finally{for(const w of workers)await w.terminate();for(const h of handles){if(h.runtime)await h.runtime.dispose();h.client.close()}}
