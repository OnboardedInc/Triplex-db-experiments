import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {getEventListeners} from 'node:events';
import {createReadStream} from 'node:fs';
import {lstat,mkdtemp} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {test} from 'node:test';
import type {TestContext} from 'node:test';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {DuckDBConnection,DuckDBPreparedStatement} from '@duckdb/node-api';
import {NativeCommandError,NativeEntityStore} from './native-entity.js';
import type {EntityReceipt,NativeQueryResult} from './native-entity.js';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';
import type {NativeQueryControl} from './native-duckdb-port.mjs';

// Independent SDK query contract v2 acceptance. No benchmark timing or mock DB
// acknowledgments. The large case explicitly requires the approved closed100k
// source and recipe, and owns a new Darwin CoW clone. Never open the source DB.
// TD_SDK_ADMISSION_SOURCE=... TD_SDK_ADMISSION_RECIPE=... node --test \
//   build/adapter/test-sdk-admission-independent.js
const maximum=9223372036854775807n;
const scan="answer(?n) :- triple('e','n',?n).";
const anti="answer(?target) :- triple(?target,'probe_member',?measure), !triple(?target,'i',?measure).";
const sourceSha='7117a98ed30d0fbe24479cf962ea0b5857851cb49bf42b82efe81419e10700f1';
const recipeSha='335cb983dc1a30c81dd2a8cd0fc0a863f03c547923a8b3af668c0459fa7af0c4';
const sourceK=577n;
const execute=promisify(execFile);
const numberRows=(n:bigint)=>[[{tag:'i64' as const,value:n}]];
const code=(expected:string)=>(error:unknown)=>error instanceof NativeCommandError&&error.code===expected;

function deferred(){
  let resolve!:()=>void;
  const promise=new Promise<void>(done=>{resolve=done;});
  return {promise,resolve};
}

async function bounded<T>(promise:Promise<T>,label:string):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([promise,new Promise<never>((_,reject)=>{
    timer=setTimeout(()=>reject(new Error('SDK acceptance condition missing: '+label)),5000);
  })]);}finally{clearTimeout(timer);}
}

async function digest(path:string){
  const hash=createHash('sha256');
  for await(const bytes of createReadStream(path))hash.update(bytes);
  return hash.digest('hex');
}

async function ownedPath(t:TestContext){
  const path=join(await mkdtemp(fileURLToPath(new URL('../sdk-admission-independent-',import.meta.url))),'facts.duckdb');
  t.diagnostic('Preserved owned fixture: '+path);
  return path;
}

const put=(commandId:string,n:number)=>({schema:'admission_qa',version:1,type:'Row',entityId:'e',commandId,
  record:'{n='+n+';}',validFrom:0n,validTo:maximum});

async function smallStore(readers:number,maxQueuedReads=0,memoryLimit?:string){
  const store=await NativeEntityStore.open({readers,maxQueuedReads,...(memoryLimit===undefined?{}:{memoryLimit})});
  try{
    await store.defineSchema('schema admission_qa version 1 {entity Row {n:int64 required;}}');
    const receipt=await store.putRecord(put('seed',0));assert.equal(receipt.position,1n);
    return store;
  }catch(error){await store.close();throw error;}
}

/** Hold actual materialized SDK streams, after native work and before fetching. */
function holdRealResults(t:TestContext,limit:number){
  const started=deferred(),release=deferred();
  const owners=new Map<DuckDBPreparedStatement,{connection:DuckDBConnection;controlled:boolean}>();
  const connections=new Set<DuckDBConnection>(),controlledConnections=new Set<DuckDBConnection>();
  const prepare=DuckDBConnection.prototype.prepare,stream=DuckDBPreparedStatement.prototype.stream;
  const prepared=t.mock.method(DuckDBConnection.prototype,'prepare',async function(this:DuckDBConnection,sql:string){
    const statement=await prepare.call(this,sql);
    const controlled=sql.includes('td_control_check_v1(');
    if(/^PRAGMA td_query_store/.test(sql)||controlled)owners.set(statement,{connection:this,controlled});
    return statement;
  });
  let entered=0;
  const streaming=t.mock.method(DuckDBPreparedStatement.prototype,'stream',async function(this:DuckDBPreparedStatement){
    const result=await stream.call(this),owner=owners.get(this);
    if(owner){
      connections.add(owner.connection);if(owner.controlled)controlledConnections.add(owner.connection);
      if(++entered<=limit){if(entered===limit)started.resolve();await release.promise;}
    }
    return result;
  });
  return {started:started.promise,release:release.resolve,connections,controlledConnections,entered:()=>entered,
    restore:()=>{streaming.mock.restore();prepared.mock.restore();}};
}

function holdWrites(t:TestContext,firstId:string,secondId:string){
  const first=deferred(),second=deferred(),releaseFirst=deferred(),releaseSecond=deferred();
  const run=NativeDuckDBPort.prototype.runWriter;
  const mock=t.mock.method(NativeDuckDBPort.prototype,'runWriter',async function(this:NativeDuckDBPort,plan:Parameters<NativeDuckDBPort['runWriter']>[0]){
    if('sql'in plan&&plan.sql.startsWith('PRAGMA td_put_entity')){
      if(plan.sql.includes("'"+firstId+"'")){first.resolve();await releaseFirst.promise;}
      if(plan.sql.includes("'"+secondId+"'")){second.resolve();await releaseSecond.promise;}
    }
    return run.call(this,plan);
  });
  return {first:first.promise,second:second.promise,releaseFirst:releaseFirst.resolve,releaseSecond:releaseSecond.resolve,
    restore:()=>mock.mock.restore()};
}

test('independent full512 native patch trace retains every returned cut and restores all256 entities',
  {timeout:240000},async t=>{
  const source=process.env.TD_SDK_ADMISSION_SOURCE,recipe=process.env.TD_SDK_ADMISSION_RECIPE;
  assert.ok(source&&recipe,'Set TD_SDK_ADMISSION_SOURCE and TD_SDK_ADMISSION_RECIPE to the approved closed100k inputs; this test never skips missing conditions');
  assert.equal(await digest(source),sourceSha);assert.equal(await digest(recipe),recipeSha);
  await assert.rejects(lstat(source+'.wal'),error=>(error as NodeJS.ErrnoException).code==='ENOENT');
  const database=await ownedPath(t);assert.notEqual(resolve(database),resolve(source));
  const helper=fileURLToPath(new URL('../../adapter/clone-benchmark-fixture.py',import.meta.url));
  const cloned=await execute('python3',[helper,source,database]);
  assert.deepEqual(JSON.parse(cloned.stdout),{mode:'darwin_clonefile',status:'cloned'});
  const openOptions={database,readers:16,threads:4,memoryLimit:'2GB',maxTempDirectorySize:'4GB',maxQueuedReads:32,
    retainedLimits:{maxFacts:200000,maxBytes:1073741824}};
  let store=await NativeEntityStore.open(openOptions);
  const prefix='sdk-independent-'+randomUUID()+'-';
  const entity=(index:number)=>'probe-'+String(index).padStart(3,'0');
  const initial=new Map<string,bigint>(Array.from({length:256},(_,index)=>[entity(index),1n]));
  const events:Readonly<{position:bigint;entity:string;value:bigint}>[]=[];
  const receipts:EntityReceipt[]=[];
  const controllers=Array.from({length:16},()=>new AbortController());
  let stop=false,probeK=0n;
  const errors:unknown[]=[],reads=Array<number>(16).fill(0);
  const workers:Promise<void>[]=[];
  const queryOptions={validAt:0n,timeoutMs:60000,maxInputFacts:200000,maxIntermediateRows:200000,
    maxIntermediateBytes:536870912,maxOutputRows:256};
  const expected=(position:bigint)=>{
    assert.ok(position>=probeK&&position<=probeK+BigInt(events.length),'Query cut is within the issued immutable trace');
    const state=new Map(initial);
    for(const event of events){if(event.position>position)break;state.set(event.entity,event.value);}
    return [...state].filter(([,value])=>value!==0n).map(([id])=>[{tag:'str' as const,value:id}]);
  };
  const check=(answer:NativeQueryResult,knownAt?:bigint)=>{
    assert.equal(answer.route,'sql');assert.match(answer.reason,/^owned_.*scalable_anti_join$/);
    assert.equal(answer.counters,null);
    if(knownAt!==undefined)assert.equal(answer.position,knownAt);
    assert.deepEqual(answer.rows,expected(answer.position));
  };
  const atCut=async(knownAt:bigint)=>{
    const answer=await store.queryScalable(anti,{...queryOptions,knownAt});check(answer,knownAt);return answer;
  };
  const patch=(index:number)=>({schema:'anti_probe',version:1,type:'Probe',entityId:entity(index%256),
    commandId:prefix+'patch-'+index,record:'{probe_member=0;i='+(index<256?'0':'1')+';}',validFrom:0n,validTo:maximum});
  try{
    const absent=await store.queryScalable(anti,{...queryOptions,knownAt:sourceK});
    assert.equal(absent.position,sourceK);assert.deepEqual(absent.rows,[]);
    await store.defineSchema('schema anti_probe version 1 {entity Probe {probe_member:int64 required;i:int64 required;}}');
    for(let batch=0;batch<8;batch++){
      const receipt=await store.batchRecords({schema:'anti_probe',version:1,commandId:prefix+'seed-'+batch,
        members:Array.from({length:32},(_,index)=>({operation:'put',type:'Probe',entityId:entity(batch*32+index),
          record:'{probe_member=0;i=1;}',validFrom:0n,validTo:maximum}))});
      assert.equal(receipt.position,sourceK+BigInt(batch+1));assert.equal(receipt.members.length,32);
      for(const member of receipt.members){assert.equal(member.asserted.length,2);assert.equal(member.retracted.length,0);}
    }
    probeK=sourceK+8n;assert.equal((await atCut(probeK)).rows.length,256);
    for(let client=0;client<16;client++)workers.push((async()=>{
      let iteration=0;
      while(!stop){
        const knownAt=iteration++%4===0?probeK:undefined;
        const answer=await store.queryScalable(anti,{...queryOptions,signal:controllers[client]!.signal,
          ...(knownAt===undefined?{}:{knownAt})});
        check(answer,knownAt);reads[client]=(reads[client]??0)+1;await new Promise<void>(done=>setImmediate(done));
      }
    })().catch(error=>{errors.push(error);stop=true;}));
    for(let index=0;index<512;index++){
      assert.equal(errors.length,0,'No reader oracle or native failures during ingestion');
      const request=patch(index),position=probeK+BigInt(index+1);
      // Publish the issued event before dispatch: a read may observe committed K
      // before the receipt promise resumes. No answer is inferred from an ACK.
      events.push(Object.freeze({position,entity:request.entityId,value:index<256?0n:1n}));
      const receipt=await store.patchRecord(request);receipts.push(receipt);
      assert.equal(receipt.position,position);assert.equal(receipt.asserted.length,2);assert.equal(receipt.retracted.length,2);
      if(index===255)assert.deepEqual((await atCut(position)).rows,[]);
      await new Promise<void>(done=>setImmediate(done));
    }
    stop=true;await Promise.all(workers);assert.deepEqual(errors,[]);
    assert.ok(reads.every(count=>count>0),'Every one of16 actual clients completed an exact answer');
    t.diagnostic('Exact reads per client: '+reads.join(',')+'; actual native patch ACKs: '+receipts.length);
    const finalK=probeK+512n;
    assert.equal((await store.queryScalable(anti,queryOptions)).position,finalK);
    for(const cut of [probeK,probeK+256n,finalK])await atCut(cut);
    for(const index of [0,255,256,511]){
      assert.deepEqual(await store.patchRecord(patch(index)),receipts[index]);
      assert.deepEqual(await store.receipt(patch(index).commandId),receipts[index]);
    }
    assert.equal((await store.queryScalable(anti,queryOptions)).position,finalK,'Replay must not advance K');
    assert.equal((await store.history(entity(0))).length,6);
    for(const [knownAt,value] of [[probeK,1n],[probeK+256n,0n],[finalK,1n]]as const){
      assert.deepEqual((await store.at(entity(0),{knownAt,validAt:0n})).map(row=>[row.attribute,row.value]),
        [['i',{tag:'i64',value}],['probe_member',{tag:'i64',value:0n}]]);
      // Probe is intentionally unmanaged (no live declaration): attributes do
      // not imply authored presence, even when the record is nonempty.
      assert.equal(await store.presenceAt(entity(0),{knownAt,validAt:0n}),null);
    }
    await store.revalidate();for(const cut of [probeK,probeK+256n,finalK])await atCut(cut);
    assert.deepEqual(store.readerStats(),{capacity:16,available:16,active:0,waiting:0});
    await store.close();store=await NativeEntityStore.open(openOptions);
    for(const cut of [probeK,probeK+256n,finalK])await atCut(cut);
    assert.equal((await store.queryScalable(anti,queryOptions)).position,finalK);
    assert.deepEqual(await store.receipt(patch(511).commandId),receipts[511]);
    assert.equal((await store.history(entity(0))).length,6);
  }finally{
    stop=true;controllers.forEach(controller=>controller.abort());await Promise.all(workers);
    await store.close();assert.equal(await digest(source),sourceSha);assert.equal(await digest(recipe),recipeSha);
  }
});

test('sixteen held real scopes isolate queued abort/deadline and recycle all16 physical ports',{timeout:20000},async t=>{
  // A held-result condition, not a new application default or capacity claim.
  const store=await smallStore(16,1,'512MB'),held=holdRealResults(t,16);
  const runControl=NativeDuckDBPort.prototype.withNativeQueryControl;
  let controls=0,interrupts=0;
  const interrupted=new Set<DuckDBConnection>();
  const controlMock=t.mock.method(NativeDuckDBPort.prototype,'withNativeQueryControl',function<T>(this:NativeDuckDBPort,
    options:Parameters<NativeDuckDBPort['withNativeQueryControl']>[0],work:(control:NativeQueryControl)=>Promise<T>):Promise<T>{
    controls++;return runControl.call(this,options,work) as Promise<T>;
  });
  const interrupt=DuckDBConnection.prototype.interrupt;
  t.mock.method(DuckDBConnection.prototype,'interrupt',function(this:DuckDBConnection){interrupts++;interrupted.add(this);return interrupt.call(this);});
  const activeController=new AbortController(),queuedController=new AbortController();
  const pending:Promise<unknown>[]=[];
  const first=store.query(scan,{validAt:0n,signal:activeController.signal});
  let activeSettled=false;first.then(()=>{activeSettled=true;},()=>{activeSettled=true;});
  const canceledActive=assert.rejects(first,code('TD_E_CANCELED'));pending.push(canceledActive);
  const healthy=Array.from({length:15},()=>store.query(scan,{validAt:0n}));pending.push(...healthy);
  try{
    await bounded(held.started,'sixteen actual result scopes');
    assert.deepEqual(store.readerStats(),{capacity:16,available:0,active:16,waiting:0});
    assert.equal(held.controlledConnections.size,1,'The held active control has an actual distinct transport owner');
    const canceled=assert.rejects(store.query(scan,{validAt:0n,signal:queuedController.signal}),code('TD_E_CANCELED'));
    pending.push(canceled);
    await assert.rejects(store.query(scan,{validAt:0n}),code('TD_E_QUERY_BUSY'));
    queuedController.abort();await bounded(canceled,'queued abort without releasing real active scopes');
    await new Promise<void>(done=>setImmediate(done));
    const expired=assert.rejects(store.query(scan,{validAt:0n,timeoutMs:30}),code('TD_E_DEADLINE'));
    pending.push(expired);
    await assert.rejects(store.query(scan,{validAt:0n}),code('TD_E_QUERY_BUSY'));
    await bounded(expired,'queued deadline without releasing real active scopes');
    await new Promise<void>(done=>setImmediate(done));
    assert.equal(held.entered(),16);assert.equal(controls,1);assert.equal(interrupts,0);
    assert.equal(getEventListeners(queuedController.signal,'abort').length,0);
    const replacement=store.query(scan,{validAt:0n});pending.push(replacement);
    await assert.rejects(store.query(scan,{validAt:0n}),code('TD_E_QUERY_BUSY'));
    // A real active cancellation must not release its slot/lease ahead of
    // result/control cleanup, even if its user-facing promise settles early.
    activeController.abort();await new Promise<void>(done=>setImmediate(done));
    assert.equal(held.entered(),16);assert.equal(store.readerStats().active,16);
    await assert.rejects(store.query(scan,{validAt:0n}),code('TD_E_QUERY_BUSY'));
    assert.equal((await store.resourceStats()).memoryBytes>=0n,true);
    held.release();await canceledActive;
    for(const answer of await Promise.all([...healthy,replacement]))assert.deepEqual(answer.rows,numberRows(0n));
    assert.equal(activeSettled,true);assert.equal(getEventListeners(activeController.signal,'abort').length,0);
    assert.ok(interrupted.size<=1,'Only the canceled invocation may interrupt a physical reader');
    for(const connection of interrupted)assert.ok(held.controlledConnections.has(connection));
    assert.deepEqual((await store.at('e',{knownAt:1n,validAt:0n})).map(row=>row.value.value),[0n],
      'The light read remains exact once the saturated physical reader pool has drained');
    for(let index=0;index<32;index++)assert.deepEqual((await store.query(scan,{validAt:0n})).rows,numberRows(0n));
    assert.equal(held.connections.size,16,'FIFO scheduling must retain actual round-robin physical reader reuse');
    await assert.rejects(store.queryScalable(scan,{validAt:0n,maxOutputBytes:1}),code('TD_E_QUERY_SCALE_LIMIT'));
    assert.deepEqual((await store.query(scan,{validAt:0n})).rows,numberRows(0n));
    assert.deepEqual(store.readerStats(),{capacity:16,available:16,active:0,waiting:0});
  }finally{held.release();await Promise.allSettled(pending);controlMock.mock.restore();held.restore();await store.close();}
});

test('close and revalidate drain sixteen actual scopes plus one accepted queued call',{timeout:20000},async t=>{
  for(const operation of ['revalidate','close']as const){
    const store=await smallStore(16,1,'512MB'),held=holdRealResults(t,16);
    const pending=Array.from({length:17},()=>store.query(scan,{validAt:0n}));
    let drained=false;
    try{
      await bounded(held.started,operation+' active scopes');
      const maintenance=store[operation]().then(()=>{drained=true;});
      await assert.rejects(store.query(scan,{validAt:0n}),operation==='close'?/closed/:code('TD_E_QUERY_BUSY'));
      await new Promise<void>(done=>setImmediate(done));assert.equal(drained,false);
      assert.deepEqual(store.readerStats(),{capacity:16,available:0,active:16,waiting:0});
      held.release();
      for(const answer of await bounded(Promise.all(pending),operation+' already accepted calls'))assert.deepEqual(answer.rows,numberRows(0n));
      await bounded(maintenance,operation+' after accepted drain');assert.equal(drained,true);
      if(operation==='revalidate'){
        assert.deepEqual((await store.query(scan,{validAt:0n})).rows,numberRows(0n));
        assert.deepEqual(store.readerStats(),{capacity:16,available:16,active:0,waiting:0});
      }else assert.deepEqual(store.readerStats(),{capacity:16,available:0,active:0,waiting:0});
    }finally{held.release();await Promise.allSettled(pending);held.restore();await store.close();}
  }
});

test('pooled original writer barrier is not recaptured after heavy admission',{timeout:15000},async t=>{
  const store=await smallStore(16),writes=holdWrites(t,'prior','later');
  const first=store.putRecord(put('prior',1));
  let reading:ReturnType<NativeEntityStore['query']>|undefined,later:Promise<EntityReceipt>|undefined;
  try{
    await bounded(writes.first,'prior writer held before real dispatch');
    reading=store.query(scan,{validAt:0n,timeoutMs:5000});
    later=store.putRecord(put('later',2));
    writes.releaseFirst();const prior=await first;assert.equal(prior.position,2n);
    await bounded(writes.second,'later writer held before real dispatch');
    const answer=await bounded(reading,'read must not wait for a writer submitted later');
    assert.equal(answer.position,prior.position);assert.deepEqual(answer.rows,numberRows(1n));
    writes.releaseSecond();const final=await later;assert.equal(final.position,3n);
    assert.deepEqual((await store.query(scan,{validAt:0n})).rows,numberRows(2n));
    assert.deepEqual((await store.query(scan,{validAt:0n,knownAt:2n})).rows,numberRows(1n));
  }finally{
    writes.releaseFirst();writes.releaseSecond();await Promise.allSettled([first,...(reading?[reading]:[]),...(later?[later]:[])]);
    writes.restore();await store.close();
  }
});

test('readers zero queued full-call deadline cannot advance the real writer tail',{timeout:15000},async t=>{
  const store=await smallStore(0),writes=holdWrites(t,'zero-prior','zero-later');
  const first=store.putRecord(put('zero-prior',1));
  let expired:Promise<void>|undefined,later:Promise<EntityReceipt>|undefined,secondStarted=false;
  writes.second.then(()=>{secondStarted=true;});
  try{
    await bounded(writes.first,'serialized prior writer');
    expired=assert.rejects(store.query(scan,{validAt:0n,timeoutMs:30}),code('TD_E_DEADLINE'));
    later=store.putRecord(put('zero-later',2));
    await bounded(expired,'v2 timeout includes prior writer barrier');
    assert.equal(secondStarted,false,'early canceled reader notification must not let a later writer overtake the prior writer');
    assert.deepEqual(store.readerStats(),{capacity:0,available:0,active:0,waiting:0});
    writes.releaseFirst();assert.equal((await first).position,2n);
    await bounded(writes.second,'later writer after prior ACK and retired canceled read');
    writes.releaseSecond();assert.equal((await later).position,3n);
    assert.deepEqual((await store.query(scan,{validAt:0n})).rows,numberRows(2n));
    assert.deepEqual((await store.query(scan,{validAt:0n,knownAt:2n})).rows,numberRows(1n));
  }finally{
    writes.releaseFirst();writes.releaseSecond();await Promise.allSettled([first,...(expired?[expired]:[]),...(later?[later]:[])]);
    writes.restore();await store.close();
  }
});
