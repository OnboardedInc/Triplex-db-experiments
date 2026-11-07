import assert from 'node:assert/strict';
import {AsyncLocalStorage} from 'node:async_hooks';
import {getEventListeners} from 'node:events';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import type {TestContext} from 'node:test';
import {fileURLToPath} from 'node:url';
import {DuckDBConnection,DuckDBPreparedStatement} from '@duckdb/node-api';
import {NativeCommandError,NativeEntityStore} from './native-entity.js';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';

// Actual C++ writer transport and actual SDK reads. Latches delay dispatch or
// delivery, never replace SQL, native results, receipts or acknowledgments.
const root=fileURLToPath(new URL('../..',import.meta.url));
const query="answer(?n) :- triple('e','n',?n).";
const rows=(n:bigint)=>[[{tag:'i64' as const,value:n}]];
const request=(commandId:string,n:number)=>({schema:'writer_controls',version:1,type:'Row',entityId:'e',commandId,
  record:'{n='+n+';}',validFrom:0n,validTo:10n});
const code=(expected:string)=>(error:unknown)=>error instanceof NativeCommandError&&error.code===expected;
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};}
async function condition<T>(promise:Promise<T>,name:string):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([promise,new Promise<never>((_,reject)=>{
    timer=setTimeout(()=>reject(new Error('Missing actual native writer condition: '+name)),5000);
  })]);}finally{clearTimeout(timer);}
}
async function fixture(t:TestContext,readers=16){
  const database=join(await mkdtemp(join(root,'build/native-writer-controls-')),'facts.duckdb');
  t.diagnostic('Preserved owned fixture: '+database);
  // Explicit held-result profile; the public default memory limit is unchanged.
  const store=await NativeEntityStore.open({database,readers,maxQueuedReads:1,threads:1,memoryLimit:'512MB'});
  try{
    await store.defineSchema('schema writer_controls version 1 {entity Row {n:int64 required;}}');
    assert.equal((await store.putRecord(request('seed',0))).position,1n);return store;
  }catch(error){await store.close();throw error;}
}
function holdWrites(t:TestContext,ids:readonly string[]){
  const gates=new Map(ids.map(id=>[id,{entered:deferred(),release:deferred(),count:0}]));let released=false;
  const run=NativeDuckDBPort.prototype.runWriter;
  t.mock.method(NativeDuckDBPort.prototype,'runWriter',async function(this:NativeDuckDBPort,...args:Parameters<typeof run>){
    const [plan]=args;
    if(/^PRAGMA td_put_entity/.test(plan.sql))for(const [id,gate]of gates){
      if(plan.sql.includes("'"+id+"'")){gate.count++;gate.entered.resolve();if(!released)await gate.release.promise;}
    }
    return Reflect.apply(run,this,args) as ReturnType<typeof run>;
  });
  const get=(id:string)=>{const gate=gates.get(id);assert.ok(gate);return gate;};
  return {wait:(id:string)=>condition(get(id).entered.promise,'writer '+id+' before actual native dispatch'),
    count:(id:string)=>get(id).count,release:(id:string)=>get(id).release.resolve(),
    releaseAll:()=>{released=true;for(const gate of gates.values())gate.release.resolve();}};
}
const invocation=new AsyncLocalStorage<string>();
function holdReads(t:TestContext,names:readonly string[]){
  const gates=new Map(names.map(name=>[name,{entered:deferred(),release:deferred(),connections:new Set<DuckDBConnection>()}]));
  const owners=new WeakMap<DuckDBPreparedStatement,DuckDBConnection>();let released=false;
  const prepare=DuckDBConnection.prototype.prepare,stream=DuckDBPreparedStatement.prototype.stream;
  t.mock.method(DuckDBConnection.prototype,'prepare',async function(this:DuckDBConnection,...args:Parameters<typeof prepare>){
    const prepared=await Reflect.apply(prepare,this,args) as Awaited<ReturnType<typeof prepare>>;
    if(/^PRAGMA td_query_store/.test(args[0])||args[0].includes('td_control_check_v1('))owners.set(prepared,this);
    return prepared;
  });
  t.mock.method(DuckDBPreparedStatement.prototype,'stream',async function(this:DuckDBPreparedStatement,...args:Parameters<typeof stream>){
    const result=await Reflect.apply(stream,this,args) as Awaited<ReturnType<typeof stream>>;
    const label=invocation.getStore(),owner=owners.get(this),gate=label===undefined?undefined:gates.get(label);
    if(gate&&owner){gate.connections.add(owner);gate.entered.resolve();if(!released)await gate.release.promise;}
    return result;
  });
  const get=(name:string)=>{const gate=gates.get(name);assert.ok(gate);return gate;};
  return {run:<T>(name:string,work:()=>T)=>invocation.run(name,work),
    wait:(name:string)=>condition(get(name).entered.promise,'read '+name+' in its actual prepared scope'),
    connections:(name:string)=>get(name).connections,release:(name:string)=>get(name).release.resolve(),
    releaseAll:()=>{released=true;for(const gate of gates.values())gate.release.resolve();}};
}

test('native writer v2 pooled read keeps its original writer barrier and historical cut',{timeout:20000},async t=>{
  const store=await fixture(t),gate=holdWrites(t,['prior','later']);const first=store.putRecord(request('prior',1));
  const pending:Promise<unknown>[]=[first];
  try{
    await gate.wait('prior');
    const reading=store.query(query,{validAt:0n,forceNative:true,timeoutMs:5000});pending.push(reading);
    const later=store.putRecord(request('later',2));pending.push(later);
    gate.release('prior');assert.equal((await first).position,2n);await gate.wait('later');
    const answer=await condition(reading,'read bypasses later, not earlier, writer');
    assert.equal(answer.position,2n);assert.deepEqual(answer.rows,rows(1n));
    gate.release('later');assert.equal((await later).position,3n);
    assert.deepEqual((await store.query(query,{validAt:0n})).rows,rows(2n));
    assert.deepEqual((await store.query(query,{validAt:0n,knownAt:2n})).rows,rows(1n));
    assert.equal(gate.count('prior'),1);assert.equal(gate.count('later'),1);
  }finally{gate.releaseAll();await Promise.allSettled(pending);await store.close();}
});

test('native writer readers zero deadline cannot advance an earlier real writer tail',{timeout:20000},async t=>{
  const store=await fixture(t,0),gate=holdWrites(t,['zero-prior','zero-later']);
  const first=store.putRecord(request('zero-prior',1));const pending:Promise<unknown>[]=[first];
  try{
    await gate.wait('zero-prior');
    const expired=assert.rejects(store.query(query,{validAt:0n,timeoutMs:30}),code('TD_E_DEADLINE'));pending.push(expired);
    const later=store.putRecord(request('zero-later',2));pending.push(later);
    await condition(expired,'full-call deadline while prior writer has not dispatched');
    assert.equal(gate.count('zero-later'),0);assert.deepEqual(store.readerStats(),{capacity:0,available:0,active:0,waiting:0});
    gate.release('zero-prior');assert.equal((await first).position,2n);await gate.wait('zero-later');
    gate.release('zero-later');assert.equal((await later).position,3n);
    assert.deepEqual((await store.query(query,{validAt:0n})).rows,rows(2n));
    assert.deepEqual((await store.query(query,{validAt:0n,knownAt:2n})).rows,rows(1n));
  }finally{gate.releaseAll();await Promise.allSettled(pending);await store.close();}
});

test('native writer commits while16 real read scopes isolate queued and active cancellation',{timeout:30000},async t=>{
  const store=await fixture(t),labels=['cancel-active',...Array.from({length:15},(_,i)=>'healthy-'+i)],gate=holdReads(t,labels);
  const activeController=new AbortController(),queuedController=new AbortController(),interrupted=new Set<DuckDBConnection>();
  const interrupt=DuckDBConnection.prototype.interrupt;
  t.mock.method(DuckDBConnection.prototype,'interrupt',function(this:DuckDBConnection){interrupted.add(this);return interrupt.call(this);});
  let activeSettled=false;
  const active=gate.run('cancel-active',()=>assert.rejects(store.query(query,{validAt:0n,forceNative:true,signal:activeController.signal}),code('TD_E_CANCELED')))
    .finally(()=>{activeSettled=true;});const pending:Promise<unknown>[]=[active];
  try{
    await gate.wait('cancel-active');
    const healthy=labels.slice(1).map(label=>gate.run(label,()=>store.query(query,{validAt:0n,forceNative:true})));pending.push(...healthy);
    await Promise.all(labels.slice(1).map(label=>gate.wait(label)));
    assert.deepEqual(store.readerStats(),{capacity:16,available:0,active:16,waiting:0});
    const queued=assert.rejects(store.query(query,{validAt:0n,signal:queuedController.signal}),code('TD_E_CANCELED'));pending.push(queued);
    await assert.rejects(store.query(query,{validAt:0n}),code('TD_E_QUERY_BUSY'));
    queuedController.abort();await condition(queued,'seventeenth queued call detaches without owning a native reader');
    assert.equal(interrupted.size,0);
    const receipt=await store.putRecord(request('during-held-reads',1));assert.equal(receipt.position,2n);
    activeController.abort();await new Promise<void>(done=>setImmediate(done));
    assert.equal(activeSettled,false,'active lease/slot persists until its actual SDK result is released');
    assert.equal(store.readerStats().active,16);
    gate.release('cancel-active');await condition(active,'only canceled active scope retires');
    assert.equal(interrupted.size,1);
    for(const connection of interrupted)assert.ok(gate.connections('cancel-active').has(connection));
    assert.deepEqual((await store.query(query,{validAt:0n})).rows,rows(1n));
    gate.releaseAll();
    for(const answer of await Promise.all(healthy)){assert.equal(answer.position,1n);assert.deepEqual(answer.rows,rows(0n));}
    const physical=new Set(labels.flatMap(label=>[...gate.connections(label)]));assert.equal(physical.size,16);
    assert.equal(getEventListeners(activeController.signal,'abort').length,0);assert.equal(getEventListeners(queuedController.signal,'abort').length,0);
    assert.deepEqual(store.readerStats(),{capacity:16,available:16,active:0,waiting:0});
    assert.equal((await store.resourceStats()).memoryBytes>=0n,true);
  }finally{gate.releaseAll();await Promise.allSettled(pending);await store.close();}
});

test('native writer close drains accepted writes and named read scopes before native and SDK retirement',{timeout:25000},async t=>{
  const store=await fixture(t),reads=holdReads(t,['old','after-write']),writes=holdWrites(t,['close-write']);
  const events:string[]=[],retire=NativeDuckDBPort.prototype.closeWriter,close=DuckDBConnection.prototype.closeSync;
  t.mock.method(NativeDuckDBPort.prototype,'closeWriter',async function(this:NativeDuckDBPort){
    const live=!this.writerRetired();await retire.call(this);if(live){assert.equal(this.writerRetired(),true);events.push('native-joined');}
  });
  t.mock.method(DuckDBConnection.prototype,'closeSync',function(this:DuckDBConnection){events.push('sdk-close');return close.call(this);});
  const old=reads.run('old',()=>store.query(query,{validAt:0n,forceNative:true}));const pending:Promise<unknown>[]=[old];
  try{
    await reads.wait('old');const write=store.putRecord(request('close-write',1));pending.push(write);await writes.wait('close-write');
    const after=reads.run('after-write',()=>store.query(query,{validAt:0n,forceNative:true}));pending.push(after);
    let closed=false;const closing=store.close().then(()=>{closed=true;});pending.push(closing);
    await assert.rejects(store.query(query,{validAt:0n}),/closed/);await assert.rejects(store.putRecord(request('too-late',2)),/closed/);
    assert.equal(closed,false);assert.deepEqual(events,[]);
    writes.release('close-write');assert.equal((await write).position,2n);await reads.wait('after-write');
    assert.equal(closed,false);assert.deepEqual(events,[]);
    reads.releaseAll();assert.deepEqual((await old).rows,rows(0n));assert.deepEqual((await after).rows,rows(1n));
    await condition(closing,'close after all accepted scopes and actual native ACK');
    assert.equal(events[0],'native-joined');assert.equal(events.filter(event=>event==='sdk-close').length,17);
    assert.deepEqual(store.readerStats(),{capacity:16,available:0,active:0,waiting:0});
  }finally{reads.releaseAll();writes.releaseAll();await Promise.allSettled(pending);await store.close();}
});

test('native writer revalidate drains accepted work then enrolls the same18 USER contexts',{timeout:25000},async t=>{
  const store=await fixture(t),reads=holdReads(t,['old','after-write']),writes=holdWrites(t,['revalidate-write']);
  let writer:NativeDuckDBPort|undefined;const run=NativeDuckDBPort.prototype.runWriter;
  t.mock.method(NativeDuckDBPort.prototype,'runWriter',function(this:NativeDuckDBPort,...args:Parameters<typeof run>){
    writer=this;return Reflect.apply(run,this,args) as ReturnType<typeof run>;
  });
  const old=reads.run('old',()=>store.query(query,{validAt:0n,forceNative:true}));const pending:Promise<unknown>[]=[old];
  try{
    await reads.wait('old');const write=store.putRecord(request('revalidate-write',1));pending.push(write);await writes.wait('revalidate-write');
    const after=reads.run('after-write',()=>store.query(query,{validAt:0n,forceNative:true}));pending.push(after);
    let validated=false;const validating=store.revalidate().then(()=>{validated=true;});pending.push(validating);
    await assert.rejects(store.query(query,{validAt:0n}),code('TD_E_QUERY_BUSY'));
    await assert.rejects(store.putRecord(request('during-revalidate',2)),code('TD_E_QUERY_BUSY'));
    writes.release('revalidate-write');assert.equal((await write).position,2n);await reads.wait('after-write');assert.equal(validated,false);
    reads.releaseAll();assert.deepEqual((await old).rows,rows(0n));assert.deepEqual((await after).rows,rows(1n));
    await condition(validating,'revalidation after every accepted read and writer');assert.ok(writer);
    const raw=await writer.runNative({name:'writer_revalidation_context_proof',sql:'SELECT system.main.td_owner_probe_status()',params:[]});
    const wire=raw[0]?.[0];assert.ok(typeof wire==='string');const status=JSON.parse(wire);
    assert.equal(status.audited,true);assert.equal(status.live.length,18);assert.deepEqual(status.enrolled,status.live);
    const ids=new Set(writer.writerMetrics().map(metric=>metric.connectionId));assert.equal(ids.size,1);
    assert.deepEqual((await store.query(query,{validAt:0n})).rows,rows(1n));
    assert.deepEqual((await store.query(query,{validAt:0n,knownAt:1n})).rows,rows(0n));
    assert.equal(await store.receipt('during-revalidate'),null);
  }finally{reads.releaseAll();writes.releaseAll();await Promise.allSettled(pending);await store.close();}
});
