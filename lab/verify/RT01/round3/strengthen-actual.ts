// [CX-VRT01-R3] Why: overlap real adapter decisions, named reads, retries and aborts while comparing first-served bytes. Rejected: replacing emitted query execution with the reference fold or comparing changing trace metadata.
import {Effect,Fiber} from 'effect';
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Triples,EntityId,string,stampOf,instantOf} from '../../../../packages/core/dist/index.js';
import {TypeExpr} from '../../../../packages/core/dist/config/index.js';
import {DatabaseScope} from '../../../../packages/core/dist/runtime/index.js';
import {makeA0RecordTimeSuite} from '../../../../packages/testkit/dist/index.js';
import {canonicalRouteValue} from '../../../../packages/testkit/src/route.js';
import {makeXtdbStorageAdapter} from '../../../../packages/xtdb/src/XtdbStorageAdapter.js';
import {makeXtdbQueryExecutor} from '../../../../packages/xtdb/src/XtdbQueryExecutor.js';
import {makeXtdbNativeQueries} from '../../../../packages/xtdb/src/native/NativeQueries.js';
import {makeXtdbTemporalQueries} from '../../../../packages/xtdb/src/TemporalQueries.js';
import {makeXtdbMaintainedQueries} from '../../../../packages/xtdb/src/MaintainedQueries.js';
import {makeQleverStorageAdapter} from '../../../../packages/qlever/src/QleverStorageAdapter.js';
import {makeRecordTimeClient as qTransport} from '../../../../packages/qlever/test/fixtures/record-time-client.js';
import {sqlTransport} from './sql-transport.js';
const out=process.argv[2]??'lab/verify/RT01/round3/actual-property/';
const save=(n:string,v:any)=>writeFileSync(out+n,JSON.stringify(v,null,2)+'\n');
const digest=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const transportSource=digest('lab/verify/RT01/round3/sql-transport.ts');
const rounds=6,ids=['seed','aborted',...Array.from({length:rounds},(_,i)=>['a'+i,'b'+i]).flat()];
const results:any[]=[];
for(const lane of ['xtdb','qlever'])for(const commitEncoding of ['a0','compact'] as const){
 const scope=DatabaseScope.test('review-concurrent-'+lane+'-'+commitEncoding);
 const transport:any=lane==='xtdb'?sqlTransport():qTransport();
 let hold:any;
 const underlying=transport.client;
 const client:any={...underlying,[lane==='xtdb'?'submit':'update']:async(...args:any[])=>{
  if(hold&&(lane==='qlever'||args[0].some((s:any)=>s.sql.startsWith('INSERT INTO tx_meta')))){const value=hold;hold=undefined;value.enter();await value.wait;}
  return underlying[lane==='xtdb'?'submit':'update'](...args);
 }};
 const holdNext=()=>{let enter:any,release:any;const entered=new Promise(r=>enter=r),wait=new Promise(r=>release=r);hold={enter,wait};return{entered,release};};
 const adapter=lane==='xtdb'?makeXtdbStorageAdapter(client,scope,{commitEncoding,maxRetries:256}):makeQleverStorageAdapter(client,scope,{commitEncoding,maxRetries:256});
 const executor:any=lane==='xtdb'?makeXtdbQueryExecutor(client,scope):{};
 const suite=makeA0RecordTimeSuite(adapter,executor,scope,{loseNextAck:()=>{}});
 const observations:any[]=[],commands:any[]=[],receipts:any[]=[];
 try{
 const outcome=await Effect.runPromise(Effect.gen(function*(){
  const t=yield* Triples;suite.clock.set(1000);
  const assertion=(entityId:string,value:string)=>({op:'assert' as const,entityId:EntityId.make(entityId),attribute:':value',value:stringValue(value),entityType:'Subject'});
  function stringValue(v:string){return string(v);}
  const write=(operations:any[],race?:string)=>{const command=commands.length;commands.push({clock:1000,operations,...(race?{race}:{})});return t.transact(operations).pipe(Effect.tap(r=>Effect.sync(()=>{receipts[command]={command,outcome:'committed',txId:r.txId,position:r.position,instant:r.instant,stagedAt:r.stagedAt,assertionIds:operations.map(op=>op.op==='assert'?r.triples.find(row=>row.entityId===op.entityId)!.id:null)};})));};
  let seed=yield* write([assertion('seed','v0')]);let seedRow=seed.triples[0]!;const cuts=[seed.instant];
  const q={find:['?e','?v'],where:[['?e',':value','?v']]};const wrapped={inner:q,limit:100};
  const routes:any[]=[
   ['entity',(b:any)=>t.entity(EntityId.make('seed'),b)],
   ['entities',(b:any)=>t.entities(ids.map(EntityId.make),b)],
   ['entityPage',(b:any)=>t.entityPage({entityType:'Subject',limit:100,basis:b}).pipe(Effect.map(r=>r.entities))],
   ['match',(b:any)=>t.match({attribute:':value'},b)],
   ['storage-query',(b:any)=>adapter.query({attribute:':value'},b)],
   ['storage-entity',(b:any)=>adapter.getByEntity('seed',b)],
   ['storage-batch',(b:any)=>adapter.getByEntities(ids,b).pipe(Effect.map(r=>[...r.entries()]))]
  ];
  if(lane==='xtdb'){
   const native=makeXtdbNativeQueries(client,scope),temporal=makeXtdbTemporalQueries(client,scope),maintained=makeXtdbMaintainedQueries(client,scope);
   const contract={name:'review/r3',parameters:TypeExpr.any,row:TypeExpr.any};
   routes.push(
    ['queryAll',(b:any)=>t.queryAll(q as any,{basis:b}).pipe(Effect.map(r=>r.results))],
    ['queryAll-echo',(b:any)=>t.queryAll(q as any,{basis:b,includeBasis:true}).pipe(Effect.map(r=>r.results))],
    ['query',(b:any)=>t.query(q as any,{basis:b,pageSize:100}).pipe(Effect.map(r=>r.results))],
    ['queryPage',(b:any)=>t.queryPage(wrapped as any,{basis:b}).pipe(Effect.map(r=>r.results))],
    ['execute',(b:any)=>executor.execute(q,false,b).pipe(Effect.map((r:any)=>r.results))],
    ['executePage',(b:any)=>executor.executePage(wrapped,false,b).pipe(Effect.map((r:any)=>r.results))],
    ['native-facts',(b:any)=>native.selectSql(contract,{},c=>`SELECT * FROM ${c.facts()} WHERE attribute = ${c.bind(':value')}`,{basis:b}).pipe(Effect.map(r=>r.rows))],
    ['native-recorded',(b:any)=>native.selectSql(contract,{},c=>`SELECT * FROM ${c.recordedFacts()} WHERE attribute = ${c.bind(':value')}`,{basis:b}).pipe(Effect.map(r=>r.rows))],
    ['intervals',(b:any)=>temporal.queryIntervals(q as any,{from:1000,to:1001,recordedAt:b.recordedAt})],
    ['maintained',(b:any)=>maintained.query(q as any,b).pipe(Effect.map(r=>r.results))],
    ['dependency',(b:any)=>t.dependencyState([':value'],b)]
   );
  }
  const first=new Map<string,string>();const routeStats:any=Object.fromEntries(routes.map(([name])=>[name,{successes:0,pairs:0,refusals:0}]));const violations:any[]=[];
  const readAll=(T:number,mode:string)=>{
   const b={recordedAt:T,validAt:1000};
   const effect=Effect.all(routes.map(([route,read])=>read(b).pipe(Effect.match({onSuccess:(value:any)=>({route,value}),onFailure:(error:any)=>({route,error:{tag:error._tag,axis:error.axis,message:error.message}})}))),{concurrency:'unbounded'}).pipe(Effect.tap(rows=>Effect.sync(()=>{
    for(const r of rows as any[]){
     if(r.error){routeStats[r.route].refusals++;if(r.error.tag!=='BasisNotAvailable')violations.push({kind:'unexpected-error',T,mode,...r});continue;}
     const normalize=(v:any):any=>Array.isArray(v)?v.map(normalize).sort((a,b)=>canonicalRouteValue(a).localeCompare(canonicalRouteValue(b))):v;
     const bytes=canonicalRouteValue(normalize(r.value)),key=r.route+':'+T;routeStats[r.route].successes++;
     if(first.has(key)){routeStats[r.route].pairs++;if(first.get(key)!==bytes)violations.push({kind:'pair',route:r.route,T,mode,first:first.get(key),bytes});}else first.set(key,bytes);
     observations.push({route:r.route,T,mode,sha256:createHash('sha256').update(bytes).digest('hex')});
    }
   })));
   return mode.includes('pending')?adapter.withTransaction(effect,{replaySafe:false}):effect;
  };
  yield* readAll(seed.instant,'initial');
  assert.equal(violations.length,0,JSON.stringify(violations[0]));
  for(let round=0;round<rounds;round++){
   const old=cuts.at(-1)!,target=instantOf(stampOf(old)+1);const latch=holdNext();
   const a=yield* Effect.forkChild(write([{op:'retract',id:seedRow.id},assertion('seed','v'+(round+1)),assertion('a'+round,'A')],'race'+round));
   yield* Effect.gen(function*(){
   yield* Effect.promise(()=>latch.entered);
   const future=yield* Effect.forkChild(readAll(target,'pending-release'));
   yield* readAll(old,'while-staged');
   const b=yield* write([assertion('b'+round,'B')],'race'+round);assert.equal(b.instant,target);
   yield* Fiber.join(future);latch.release();const committed=yield* Fiber.join(a);seedRow=committed.triples.find(row=>row.entityId==='seed')!;
   cuts.push(b.instant,committed.instant);
   for(const T of cuts)yield* readAll(T,round%2?'pending-repeat':'committed-repeat');
   const aborted=yield* adapter.withTransaction(Effect.gen(function*(){
    yield* t.transact([{op:'retract',id:seedRow.id},assertion('aborted','never')]);
    yield* readAll(cuts.at(-1)!,'pending-abort');return yield* Effect.fail('abort-control');
   })).pipe(Effect.flip);assert.equal(aborted,'abort-control');
   yield* readAll(cuts.at(-1)!,'after-abort');
   assert.deepEqual(yield* t.entity(EntityId.make('aborted'),{validAt:1000}),[]);
   }).pipe(Effect.ensuring(Effect.sync(()=>latch.release())));
  }
  for(const T of cuts)yield* readAll(T,'final');
  const queried=[];for(const T of cuts)queried.push({T,rows:yield* t.entity(EntityId.make('seed'),{recordedAt:T,validAt:1000})});
  return{cuts,routeStats,violations,queried,head:yield* adapter.currentCut!()};
 }).pipe(Effect.provide(suite.layer)));
 const id=lane+'-'+commitEncoding;save(id+'-observed.json',{...outcome,observations,commands,receipts,transportSource});
 save(id+'.case.json',{format:'triplex-db-2/o-replay-case/1',caseId:'CX-VRT01-R3/concurrent/'+id,defaultScope:scope,adapter:{recordTime:'decided',clockDriven:true,schemaVersion:1},commands,receipts,queries:outcome.queried.map((q,i)=>({id:'cut-'+i,kind:'entityTriples',entityId:'seed',cut:{recordedAt:q.T,validAt:1000}}))});
 results.push({id,routes:outcome.routeStats,cuts:outcome.cuts.length,violations:outcome.violations});save('summary.json',results);console.log(id,outcome.violations.length);
 assert.equal(outcome.violations.length,0,JSON.stringify(outcome.violations[0]));assert.ok(Object.values(outcome.routeStats).every((v:any)=>v.pairs>0));
 }catch(error){save(lane+'-'+commitEncoding+'-failure.json',{error:String(error),stack:(error as any).stack,observations,commands,receipts});save(lane+'-'+commitEncoding+'-transport.json',transport.calls);throw error;}
}
assert.equal(transportSource,digest('lab/verify/RT01/round3/sql-transport.ts'));
