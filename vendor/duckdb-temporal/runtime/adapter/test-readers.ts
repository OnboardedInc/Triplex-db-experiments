import assert from 'node:assert/strict';
import {getEventListeners} from 'node:events';
import {test} from 'node:test';
import type {TestContext} from 'node:test';
import {DuckDBConnection,DuckDBInstance,DuckDBPreparedStatement,DuckDBResult} from '@duckdb/node-api';
import {NativeEntityStore,NativeCommandError} from './native-entity.js';
import type {NativeEntityStoreOptions} from './native-entity.js';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';

const query="answer(?n) :- triple('e','n',?n).";
const request=(commandId:string,n:number)=>({schema:'readers',version:1,type:'Row',entityId:'e',commandId,
  record:'{n='+n+';}',validFrom:0n,validTo:9223372036854775807n});

function deferred(){
  let resolve!:()=>void;
  const promise=new Promise<void>(done=>{resolve=done;});
  return {promise,resolve};
}

async function waitFor(promise:Promise<unknown>){
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error('Reader condition did not occur')),2000);
    })]);
  }finally{clearTimeout(timer);}
}

async function fixture(readers:number,options:Omit<NativeEntityStoreOptions,'readers'>={}){
  const store=await NativeEntityStore.open({...options,readers});
  await store.defineSchema('schema readers version 1 {entity Row {n:int64 required;}}');
  await store.putRecord(request('first',1));
  return store;
}

/** Hold real query results before transport consumption to observe owned leases. */
function holdReads(t:TestContext,count:number){
  const started=deferred(),release=deferred();
  const owners=new Map<DuckDBPreparedStatement,DuckDBConnection>();
  const connections=new Set<DuckDBConnection>();
  const prepare=DuckDBConnection.prototype.prepare,stream=DuckDBPreparedStatement.prototype.stream;
  t.mock.method(DuckDBConnection.prototype,'prepare',async function(this:DuckDBConnection,sql:string){
    const prepared=await prepare.call(this,sql);
    if(/^PRAGMA td_query_store/.test(sql)||sql.includes('td_control_check_v1('))owners.set(prepared,this);
    return prepared;
  });
  let held=0;
  t.mock.method(DuckDBPreparedStatement.prototype,'stream',async function(this:DuckDBPreparedStatement){
    const result=await stream.call(this);
    const owner=owners.get(this);
    if(owner&&held<count){
      held++;connections.add(owner);
      if(held===count)started.resolve();
      await release.promise;
    }
    return result;
  });
  return {started:started.promise,release:release.resolve,connections};
}

test('reader configuration validates bounds and keeps legacy defaults',async t=>{
  for(const options of [
    {readers:-1},{readers:33},{readers:1.5},{threads:0},{threads:65},{threads:NaN},
    {memoryLimit:'1B'},{memoryLimit:'2PB'},{memoryLimit:'InfinityGB'},{memoryLimit:'1.5GB'},
    {memoryLimit:'2TiB'},{maxTempDirectorySize:'-1MB'},{maxTempDirectorySize:'2TiB'},
    {maxQueuedReads:-1},{maxQueuedReads:100001},{maxQueuedReads:1.5},{maxQueuedReads:NaN},
  ])await assert.rejects(NativeEntityStore.open(options),TypeError);
  let observed:Record<string,string>|undefined;
  const create=DuckDBInstance.create;
  t.mock.method(DuckDBInstance,'create',async function(this:typeof DuckDBInstance,path?:string,options?:Record<string,string>){
    observed=options;return create.call(this,path,options);
  });
  const defaults=await NativeEntityStore.open();
  assert.deepEqual(defaults.readerStats(),{capacity:0,available:0,active:0,waiting:0});
  assert.equal(observed?.threads,'1');assert.equal(observed?.memory_limit,'128MB');
  assert.equal(observed?.max_temp_directory_size,'64MB');
  await defaults.close();
  const configured=await NativeEntityStore.open({readers:2,threads:2,memoryLimit:'256MiB',maxTempDirectorySize:'0B'});
  try{
    assert.deepEqual(configured.readerStats(),{capacity:2,available:2,active:0,waiting:0});
    assert.equal(observed?.threads,'2');assert.equal(observed?.memory_limit,'268435456B');
    assert.equal(observed?.max_temp_directory_size,'0B');
    const stats=await configured.resourceStats();
    assert.ok(stats.memoryBytes>=0n);assert.equal(stats.temporaryStorageBytes,0n);
  }finally{await configured.close();}
});

test('independent reader connections overlap, retain their cuts and observe later writer commits',async t=>{
  const instanceOwners=new Set<DuckDBInstance>();
  const connect=DuckDBInstance.prototype.connect;
  let connectionCount=0;
  t.mock.method(DuckDBInstance.prototype,'connect',async function(this:DuckDBInstance){
    instanceOwners.add(this);connectionCount++;return connect.call(this);
  });
  const store=await fixture(2),held=holdReads(t,2);
  const first=store.query(query,{validAt:0n,forceNative:true});
  const second=store.query(query,{validAt:0n,forceNative:true});
  try{
    await waitFor(held.started);
    assert.equal(instanceOwners.size,1);assert.equal(connectionCount,3);assert.equal(held.connections.size,2);
    assert.deepEqual(store.readerStats(),{capacity:2,available:0,active:2,waiting:0});
    const changed=await store.putRecord(request('second',2));assert.equal(changed.position,2n);
    held.release();
    for(const answer of await Promise.all([first,second])){
      assert.equal(answer.position,1n);assert.deepEqual(answer.rows,[[{tag:'i64',value:1n}]]);
    }
    const write=store.putRecord(request('third',3));
    const read=store.query(query,{validAt:0n,forceNative:true});
    await write;
    assert.deepEqual((await read).rows,[[{tag:'i64',value:3n}]]);
    assert.equal((await store.receipt('third'))?.position,3n);
    assert.equal((await store.history('e')).length,3);
    assert.deepEqual((await store.at('e',{knownAt:1n,validAt:0n})).map(row=>row.value.value),[1n]);
  }finally{held.release();await Promise.allSettled([first,second]);await store.close();}
});

test('a canceled queued reader owns no control and cannot interrupt the active reader',async t=>{
  const store=await fixture(1),held=holdReads(t,1),controller=new AbortController();
  let interrupts=0;
  const interrupt=DuckDBConnection.prototype.interrupt;
  t.mock.method(DuckDBConnection.prototype,'interrupt',function(this:DuckDBConnection){interrupts++;return interrupt.call(this);});
  const first=store.query(query,{validAt:0n,forceNative:true});
  try{
    await waitFor(held.started);
    const canceled=store.query(query,{validAt:0n,forceNative:true,signal:controller.signal});
    const rejected=assert.rejects(canceled,error=>error instanceof NativeCommandError&&error.code==='TD_E_CANCELED');
    await Promise.resolve();controller.abort();
    // SDK contract v2 queues at heavy admission, before a connection lease.
    assert.equal(store.readerStats().waiting,0);assert.equal(interrupts,0);
    assert.equal(getEventListeners(controller.signal,'abort').length,0);
    held.release();assert.deepEqual((await first).rows,[[{tag:'i64',value:1n}]]);await rejected;
    assert.equal(interrupts,0);assert.equal((await store.query(query,{validAt:0n})).rows.length,1);
  }finally{held.release();await first.catch(()=>{});await store.close();}
});

test('active reader cancellation interrupts only its connection and releases the lease',async t=>{
  const store=await fixture(2),held=holdReads(t,1),controller=new AbortController();
  const interrupted=new Set<DuckDBConnection>();
  const interrupt=DuckDBConnection.prototype.interrupt;
  t.mock.method(DuckDBConnection.prototype,'interrupt',function(this:DuckDBConnection){interrupted.add(this);return interrupt.call(this);});
  const pending=store.query(query,{validAt:0n,forceNative:true,signal:controller.signal});
  const rejected=assert.rejects(pending,error=>error instanceof NativeCommandError&&error.code==='TD_E_CANCELED');
  rejected.catch(()=>{});
  try{
    await waitFor(held.started);
    const healthy=await store.query(query,{validAt:0n,forceNative:true});
    assert.deepEqual(healthy.rows,[[{tag:'i64',value:1n}]]);
    controller.abort();held.release();await rejected;
    assert.deepEqual(interrupted,held.connections);
    assert.equal(getEventListeners(controller.signal,'abort').length,0);
    assert.deepEqual(store.readerStats(),{capacity:2,available:2,active:0,waiting:0});
    assert.equal((await store.query(query,{validAt:0n,timeoutMs:5000})).rows.length,1);
  }finally{held.release();await rejected;await store.close();}
});

test('close drains active and queued readers before closing all connections and the shared instance',async t=>{
  const store=await fixture(1,{maxQueuedReads:1}),held=holdReads(t,1);
  const events:string[]=[];
  const closeConnection=DuckDBConnection.prototype.closeSync,closeInstance=DuckDBInstance.prototype.closeSync;
  t.mock.method(DuckDBConnection.prototype,'closeSync',function(this:DuckDBConnection){events.push('connection');return closeConnection.call(this);});
  t.mock.method(DuckDBInstance.prototype,'closeSync',function(this:DuckDBInstance){events.push('instance');return closeInstance.call(this);});
  const first=store.query(query,{validAt:0n,forceNative:true});
  let closed=false;
  try{
    await waitFor(held.started);
    const second=store.query(query,{validAt:0n,forceNative:true});
    await assert.rejects(store.query(query,{validAt:0n}),error=>error instanceof NativeCommandError&&error.code==='TD_E_QUERY_BUSY');
    const closing=store.close().then(()=>{closed=true;});
    await assert.rejects(store.query(query,{validAt:0n}),/closed/);
    assert.equal(closed,false);assert.deepEqual(events,[]);
    held.release();assert.equal((await first).rows.length,1);assert.equal((await second).rows.length,1);
    await closing;assert.deepEqual(events,['connection','connection','instance']);
    assert.deepEqual(store.readerStats(),{capacity:1,available:0,active:0,waiting:0});
  }finally{held.release();await first.catch(()=>{});await store.close();}
});

test('pooled read admission bounds active and queued work and recycles settled capacity',async t=>{
  for(const maxQueuedReads of [0,1]){
    const store=await fixture(1,{maxQueuedReads}),held=holdReads(t,1),controller=new AbortController();
    const first=store.query(query,{validAt:0n,forceNative:true});
    let queued:ReturnType<NativeEntityStore['query']>|undefined;
    try{
      await waitFor(held.started);
      if(maxQueuedReads===1)queued=store.query(query,{validAt:0n,forceNative:true});
      await assert.rejects(store.query(query,{validAt:0n,signal:controller.signal}),
        error=>error instanceof NativeCommandError&&error.code==='TD_E_QUERY_BUSY');
      assert.equal(getEventListeners(controller.signal,'abort').length,0);
      assert.equal(store.readerStats().waiting,0,'Heavy FIFO waiters are not physical lease waiters');
      held.release();assert.equal((await first).rows.length,1);
      if(queued)assert.equal((await queued).rows.length,1);
      assert.equal((await store.query(query,{validAt:0n})).rows.length,1);
    }finally{held.release();await Promise.allSettled([first,...(queued?[queued]:[])]);await store.close();}
  }
  const legacy=await fixture(0,{maxQueuedReads:0});
  try{
    const reads=await Promise.all(Array.from({length:3},()=>legacy.query(query,{validAt:0n})));
    assert.ok(reads.every(result=>result.rows.length===1));
  }finally{await legacy.close();}
});

test('pooled admission includes reads awaiting the writer barrier',async t=>{
  const store=await fixture(1,{maxQueuedReads:0}),started=deferred(),released=deferred();
  const run=NativeDuckDBPort.prototype.runWriter;
  const mock=t.mock.method(NativeDuckDBPort.prototype,'runWriter',async function(this:NativeDuckDBPort,plan:Parameters<NativeDuckDBPort['runWriter']>[0]){
    if(plan.sql.startsWith('PRAGMA td_put_entity_v2(')&&plan.sql.includes(",'barrier',")){started.resolve();await released.promise;}
    return run.call(this,plan);
  });
  const write=store.putRecord(request('barrier',2));
  let first:ReturnType<NativeEntityStore['query']>|undefined;
  try{
    await waitFor(started.promise);
    first=store.query(query,{validAt:0n,forceNative:true});
    await assert.rejects(store.query(query,{validAt:0n}),error=>error instanceof NativeCommandError&&error.code==='TD_E_QUERY_BUSY');
    assert.equal(store.readerStats().active,0);assert.equal(store.readerStats().waiting,0);
    released.resolve();await write;
    assert.deepEqual((await first).rows,[[{tag:'i64',value:2n}]]);
    assert.equal((await store.query(query,{validAt:0n})).rows.length,1);
  }finally{released.resolve();await Promise.allSettled([write,...(first?[first]:[])]);mock.mock.restore();await store.close();}
});

test('reader initialization failure closes every opened connection and its instance',async t=>{
  const connect=DuckDBInstance.prototype.connect,closeConnection=DuckDBConnection.prototype.closeSync,closeInstance=DuckDBInstance.prototype.closeSync;
  let connects=0,connectionsClosed=0,instancesClosed=0;
  t.mock.method(DuckDBInstance.prototype,'connect',async function(this:DuckDBInstance){
    if(++connects===3)throw new Error('injected reader initialization');return connect.call(this);
  });
  t.mock.method(DuckDBConnection.prototype,'closeSync',function(this:DuckDBConnection){connectionsClosed++;return closeConnection.call(this);});
  t.mock.method(DuckDBInstance.prototype,'closeSync',function(this:DuckDBInstance){instancesClosed++;return closeInstance.call(this);});
  await assert.rejects(NativeEntityStore.open({readers:3}),/injected reader initialization/);
  assert.equal(connectionsClosed,2);assert.equal(instancesClosed,1);
});

test('uncertain reader cleanup retires the lease and fails queued work without disabling the writer',async t=>{
  const store=await fixture(1),fault=new Error('injected reader result close');
  const close=DuckDBResult.prototype.closeSync;
  let injected=false;
  const mock=t.mock.method(DuckDBResult.prototype,'closeSync',function(this:DuckDBResult){
    if(!injected){injected=true;throw fault;}return close.call(this);
  });
  try{
    const first=store.query(query,{validAt:0n,forceNative:true});
    const second=store.query(query,{validAt:0n,forceNative:true});
    await Promise.all([assert.rejects(first,AggregateError),assert.rejects(second,/reader pool is fenced/)]);
    assert.deepEqual(store.readerStats(),{capacity:1,available:0,active:0,waiting:0});
    assert.equal((await store.putRecord(request('writer-healthy',2))).position,2n);
  }finally{mock.mock.restore();await store.close();}
});

test('close attempts all reader connections and permits teardown retry after a failure',async t=>{
  const store=await fixture(2),close=DuckDBConnection.prototype.closeSync;
  let attempts=0;
  const mock=t.mock.method(DuckDBConnection.prototype,'closeSync',function(this:DuckDBConnection){
    if(++attempts===1)throw new Error('injected reader close');return close.call(this);
  });
  try{
    await assert.rejects(store.close(),AggregateError);assert.equal(attempts,3);
    await assert.rejects(store.query(query,{validAt:0n}),/closed/);
  }finally{mock.mock.restore();await store.close();}
});
