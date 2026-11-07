import assert from 'node:assert/strict';
import {getEventListeners} from 'node:events';
import {test} from 'node:test';
import type {TestContext} from 'node:test';
import {DuckDBConnection,DuckDBPreparedStatement} from '@duckdb/node-api';
import {NativeCommandError,NativeEntityStore} from './native-entity.js';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';
import type {NativeQueryControl} from './native-duckdb-port.mjs';

const scan="answer(?n) :- triple('e','n',?n).";
const lookup="answer('e',0,1) :- triple('e','n',?n).";
const rows=[[{tag:'i64',value:1n}]];
const code=(expected:string)=>(error:unknown)=>error instanceof NativeCommandError&&error.code===expected;
type Controls={readonly timeoutMs?:number;readonly signal?:AbortSignal};

function deferred(){
  let resolve!:()=>void;
  const promise=new Promise<void>(done=>{resolve=done;});
  return {promise,resolve};
}
async function bounded<T>(promise:Promise<T>):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([promise,new Promise<never>((_,reject)=>{
    timer=setTimeout(()=>reject(new Error('SDK admission condition did not occur')),5000);
  })]);}finally{clearTimeout(timer);}
}
async function fixture(readers:number,maxQueuedReads=1024,memoryLimit?:string){
  const store=await NativeEntityStore.open({readers,maxQueuedReads,...(memoryLimit===undefined?{}:{memoryLimit})});
  try{
    await store.defineSchema('schema sdk_admission version 1 {entity Row {n:int64 required;}}');
    await store.putRecord({schema:'sdk_admission',version:1,type:'Row',entityId:'e',commandId:'seed',
      record:'{n=1;}',validFrom:0n,validTo:9223372036854775807n});
    return store;
  }catch(error){await store.close();throw error;}
}

/** Cover cached prepare/stream and the pinned SDK's uncached runUntilLast path. */
function holdResults(t:TestContext,limit:number,accept=(sql:string)=>/^PRAGMA td_query_store/.test(sql)||sql.includes('td_control_check_v1(')){
  const preparedOwners=new Map<DuckDBPreparedStatement,{connection:DuckDBConnection;sql:string}>();
  const entered:{connection:DuckDBConnection;sql:string}[]=[];
  const held:{release:()=>void}[]=[];
  let releasedAll=false;
  const conditions=new Map<number,ReturnType<typeof deferred>>();
  const prepare=DuckDBConnection.prototype.prepare,stream=DuckDBPreparedStatement.prototype.stream;
  const connectionStream=DuckDBConnection.prototype.stream;
  const hold=async()=>{
    if(!releasedAll&&held.length<limit){
      const gate=deferred();held.push({release:gate.resolve});conditions.get(held.length)?.resolve();
      await gate.promise;
    }
  };
  t.mock.method(DuckDBConnection.prototype,'prepare',async function(this:DuckDBConnection,sql:string){
    const statement=await prepare.call(this,sql);
    if(accept(sql))preparedOwners.set(statement,{connection:this,sql});
    return statement;
  });
  t.mock.method(DuckDBPreparedStatement.prototype,'stream',async function(this:DuckDBPreparedStatement){
    const owner=preparedOwners.get(this);
    if(owner)entered.push(owner);
    const result=await stream.call(this);
    if(owner)await hold();
    return result;
  });
  t.mock.method(DuckDBConnection.prototype,'stream',async function(this:DuckDBConnection,...args:Parameters<DuckDBConnection['stream']>){
    const selected=accept(args[0]);
    if(selected)entered.push({connection:this,sql:args[0]});
    const result=await connectionStream.apply(this,args);
    if(selected)await hold();
    return result;
  });
  return {entered,
    wait:(count:number)=>{
      if(held.length>=count)return Promise.resolve();
      const condition=conditions.get(count)??deferred();conditions.set(count,condition);
      return bounded(condition.promise);
    },
    release:(index:number)=>held[index]?.release(),
    releaseAll:()=>{releasedAll=true;for(const gate of held)gate.release();},
  };
}

const families:readonly {name:string;run:(store:NativeEntityStore,controls?:Controls)=>Promise<void>}[]=[
  {name:'values_v2',run:async(store,controls={})=>{
    const answer=await store.query(scan,{validAt:0n,forceNative:true,...controls});
    assert.equal(answer.position,1n);assert.deepEqual(answer.rows,rows);
  }},
  {name:'scalable_v2',run:async(store,controls={})=>{
    const answer=await store.queryScalable(scan,{validAt:0n,...controls});
    assert.equal(answer.position,1n);assert.deepEqual(answer.rows,rows);
  }},
  {name:'intervals_v1',run:async(store,controls={})=>{
    assert.deepEqual(await store.queryIntervals(scan,{validFrom:0n,validTo:1n,...controls}),
      {position:1n,intervals:[{validFrom:0n,validTo:1n,values:rows[0]}]});
  }},
  {name:'cuts_v1',run:async(store,controls={})=>{
    assert.deepEqual(await store.queryCuts(scan,{cuts:[{validAt:0n,knownAt:1n}],...controls}),
      [{validAt:0n,position:1n,rows}]);
  }},
  {name:'lookup_v1',run:async(store,controls={})=>{
    const answer=await store.queryLookupAt(lookup,{attribute:'n',validAt:0n,...controls});
    assert.equal(answer.position,1n);assert.deepEqual(answer.rows,rows);
  }},
];

test('all five heavy APIs share one FIFO while retaining all16 physical readers',{timeout:30000},async t=>{
  // Hold sixteen completed SDK results to create reader-wide saturation. This
  // explicit fixture memory profile does not change the128MB public default.
  const store=await fixture(16,1024,'512MB'),gate=holdResults(t,20);
  const pending:Promise<void>[]=[];
  try{
    pending.push(...Array.from({length:16},()=>families[0]!.run(store)));
    await gate.wait(16);
    for(const family of families.slice(1))pending.push(family.run(store));
    await new Promise<void>(done=>setImmediate(done));
    assert.equal(gate.entered.length,16);
    assert.deepEqual(store.readerStats(),{capacity:16,available:0,active:16,waiting:0});
    for(let index=0;index<4;index++){
      gate.release(index);await gate.wait(index+17);
      assert.match(gate.entered[index+16]!.sql,new RegExp('^PRAGMA td_query_store_'+families[index+1]!.name+'\\('));
      assert.equal(store.readerStats().active,16);
    }
    gate.releaseAll();await Promise.all(pending);
    for(let index=0;index<32;index++)await families[0]!.run(store);
    assert.equal(new Set(gate.entered.map(entry=>entry.connection)).size,16);
    assert.deepEqual(store.readerStats(),{capacity:16,available:16,active:0,waiting:0});
  }finally{gate.releaseAll();await Promise.allSettled(pending);await store.close();}
});

test('heavy capacity follows configured one/two reader pools without changing admission limits',{timeout:20000},async t=>{
  for(const readers of [1,2]){
    const store=await fixture(readers,1),gate=holdResults(t,readers+1);
    const pending=Array.from({length:readers},()=>families[0]!.run(store));
    try{
      await gate.wait(readers);pending.push(families[0]!.run(store));
      await assert.rejects(families[0]!.run(store),code('TD_E_QUERY_BUSY'));
      assert.deepEqual(store.readerStats(),{capacity:readers,available:0,active:readers,waiting:0});
      gate.release(0);await gate.wait(readers+1);
      assert.equal(store.readerStats().active,readers);
      gate.releaseAll();await Promise.all(pending);await families[0]!.run(store);
    }finally{gate.releaseAll();await Promise.allSettled(pending);await store.close();}
  }
});

test('canceling a heavy lease waiter cannot consume or interrupt a light-read connection',{timeout:20000},async t=>{
  // Intentionally hold16 light results outside the heavy gate. The unchanged
  // baseline exhausts128MB here;512MB creates the lease-wait condition itself.
  // Normal non-held/default-profile cases continue to use128MB.
  const store=await fixture(16,1,'512MB'),gate=holdResults(t,16,sql=>/^PRAGMA td_entity_at_v2\(/.test(sql));
  const lights=Array.from({length:16},()=>store.at('e',{validAt:0n,knownAt:1n}));
  const controller=new AbortController();let interrupts=0,controls=0;
  const interrupt=DuckDBConnection.prototype.interrupt,control=NativeDuckDBPort.prototype.withNativeQueryControl;
  t.mock.method(DuckDBConnection.prototype,'interrupt',function(this:DuckDBConnection){interrupts++;return interrupt.call(this);});
  t.mock.method(NativeDuckDBPort.prototype,'withNativeQueryControl',function<T>(this:NativeDuckDBPort,
    options:Controls,work:(scope:NativeQueryControl)=>Promise<T>):Promise<T>{
    controls++;return control.call(this,options,work) as Promise<T>;
  });
  try{
    await gate.wait(16);
    const canceled=assert.rejects(families[0]!.run(store,{signal:controller.signal}),code('TD_E_CANCELED'));
    await new Promise<void>(done=>setImmediate(done));assert.equal(store.readerStats().waiting,1);
    controller.abort();await bounded(canceled);
    assert.equal(store.readerStats().waiting,0);assert.equal(getEventListeners(controller.signal,'abort').length,0);
    const expired=assert.rejects(families[1]!.run(store,{timeoutMs:30}),code('TD_E_DEADLINE'));
    await new Promise<void>(done=>setImmediate(done));assert.equal(store.readerStats().waiting,1);
    await bounded(expired);assert.equal(store.readerStats().waiting,0);
    assert.equal(interrupts,0);assert.equal(controls,0);
    gate.releaseAll();for(const answer of await Promise.all(lights))assert.deepEqual(answer.map(row=>row.value),rows[0]);
    for(const family of families)await family.run(store);
    assert.deepEqual(store.readerStats(),{capacity:16,available:16,active:0,waiting:0});
  }finally{gate.releaseAll();await Promise.allSettled(lights);await store.close();}
});

test('all heavy controls validate before queuing and invocation deadlines own no queued token',{timeout:20000},async t=>{
  const store=await fixture(16,1024,'512MB'),gate=holdResults(t,16);
  const pending=Array.from({length:16},()=>families[0]!.run(store));
  const captured:Controls[]=[];
  const control=NativeDuckDBPort.prototype.withNativeQueryControl;
  t.mock.method(NativeDuckDBPort.prototype,'withNativeQueryControl',function<T>(this:NativeDuckDBPort,
    options:Controls,work:(scope:NativeQueryControl)=>Promise<T>):Promise<T>{
    captured.push(options);return control.call(this,options,work) as Promise<T>;
  });
  try{
    await gate.wait(16);
    for(const family of families){
      for(const timeoutMs of [0,60001,1.5,NaN])await assert.rejects(family.run(store,{timeoutMs}),TypeError);
      await assert.rejects(family.run(store,{signal:{} as AbortSignal}),TypeError);
      const stopped=new AbortController();stopped.abort();
      await assert.rejects(family.run(store,{signal:stopped.signal}),code('TD_E_CANCELED'));
    }
    await Promise.all(families.map(family=>assert.rejects(family.run(store,{timeoutMs:30}),code('TD_E_DEADLINE'))));
    assert.equal(captured.length,0);assert.equal(gate.entered.length,16);
    gate.releaseAll();await Promise.all(pending);
    await families[0]!.run(store);await families[1]!.run(store);
    assert.equal(captured.length,0,'No signal/timeout must retain the uncontrolled transport');
    for(const family of families.slice(2))await family.run(store);
    assert.equal(captured.length,3);
    assert.ok(captured.every(options=>options.timeoutMs!==undefined&&options.timeoutMs>=1&&options.timeoutMs<=5000));
    const signalOnly=new AbortController();await families[0]!.run(store,{signal:signalOnly.signal});
    assert.equal(captured.at(-1)?.timeoutMs,undefined);
    assert.equal(getEventListeners(signalOnly.signal,'abort').length,0);
  }finally{gate.releaseAll();await Promise.allSettled(pending);await store.close();}
});

test('native query failures release heavy admission before healthy mixed-family reuse',{timeout:20000},async()=>{
  const store=await fixture(16);
  try{
    const failed=Array.from({length:16},()=>assert.rejects(store.queryScalable(scan,{validAt:0n,maxOutputBytes:1}),code('TD_E_QUERY_SCALE_LIMIT')));
    const healthy=families.map(family=>family.run(store));
    await Promise.all([...failed,...healthy]);
    for(const family of families)await family.run(store);
    assert.deepEqual(store.readerStats(),{capacity:16,available:16,active:0,waiting:0});
  }finally{await store.close();}
});
