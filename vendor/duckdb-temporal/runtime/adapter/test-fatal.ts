import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DuckDBAppender,DuckDBConnection,DuckDBInstance,DuckDBResult} from '@duckdb/node-api';
import {NativeDuckDBPort,NativePortError} from './native-duckdb-port.mjs';
import {NativeEntityStore} from './native-entity.js';
import {nativeWriterRunFault} from './native-writer-test-fault.js';

// First line of the actual SDK error retained in scale-10m-native-20261105-01.json.
const fatalMessage='FATAL Error: Failed to create checkpoint because of error: could not allocate block of size 256.0 KiB (953.5 MiB/953.6 MiB used)';
const query="answer(?n) :- triple('e','n',?n).";
const request=(commandId:string)=>({schema:'fatal',version:1,type:'Row',entityId:'e',commandId,
  record:'{n=1;}',validFrom:0n,validTo:9223372036854775807n});
const restart=(cause:Error)=>(error:unknown)=>error instanceof NativePortError&&error.code==='RESTART_REQUIRED'&&error.cause===cause;
const run=(port:NativeDuckDBPort,sql:string)=>port.run({name:'fatal_test',sql,params:[]});

function deferred(){
  let resolve!:()=>void;
  const promise=new Promise<void>(done=>{resolve=done;});
  return {promise,resolve};
}

async function fixture(){
  const store=await NativeEntityStore.open({readers:2});
  await store.defineSchema('schema fatal version 1 {entity Row {n:int64;}}');
  await store.putRecord(request('first'));
  return store;
}

test('a native writer transport fatal fences writer, active readers and queued readers with its original cause',async t=>{
  const fatal=new Error(fatalMessage);
  const fault=nativeWriterRunFault(t,sql=>sql.startsWith("PRAGMA td_put_entity_v2('fatal',1,'Row','e','fatal',"),[fatal]);
  const store=await fixture(),started=deferred(),release=deferred(),queuedControl=new AbortController();
  const fetch=DuckDBResult.prototype.fetchChunk;
  let held=0;
  t.mock.method(DuckDBResult.prototype,'fetchChunk',async function(this:DuckDBResult){
    const chunk=await fetch.call(this);
    if(held<2){held++;if(held===2)started.resolve();await release.promise;}
    return chunk;
  });
  const first=assert.rejects(store.query(query,{validAt:0n,forceNative:true}),restart(fatal));
  const second=assert.rejects(store.query(query,{validAt:0n,forceNative:true}),restart(fatal));
  first.catch(()=>{});second.catch(()=>{});
  let queued:Promise<void>|undefined;
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    await Promise.race([started.promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Reader overlap missing')),2000);})]);
    queued=assert.rejects(store.query(query,{validAt:0n,forceNative:true,signal:queuedControl.signal}),restart(fatal));queued.catch(()=>{});
    await assert.rejects(store.putRecord(request('fatal')),error=>error===fatal);
    assert.equal(fault.consumed(),1,'The original runWriter classifier must receive the injected fatal');
    queuedControl.abort(); // A queued cancellation must preserve the shared fatal cause.
    release.resolve();await Promise.all([first,second,queued]);
    await assert.rejects(store.query(query,{validAt:0n}),restart(fatal));
    await assert.rejects(store.receipt('first'),restart(fatal));
    await assert.rejects(store.putRecord(request('after-fatal')),restart(fatal));
    assert.equal(store.readerStats().active,0);
  }finally{
    clearTimeout(timer);release.resolve();await Promise.allSettled([first,second,...(queued?[queued]:[])]);await store.close();
  }
  const healthy=await NativeDuckDBPort.open();
  try{assert.deepEqual(await run(healthy,'SELECT 42'),[[42n]]);}finally{await healthy.close();}
});

test('ordinary writer transport OOM and an embedded fatal phrase preserve healthy instance reuse',async t=>{
  const failures=[new Error('Out of Memory Error: failed to allocate data of size 256.0 KiB'),
    new Error('Invalid Input Error: literal contains FATAL Error: text')];
  const fault=nativeWriterRunFault(t,sql=>/^PRAGMA td_put_entity_v2\('fatal',1,'Row','e','recoverable-[01]',/.test(sql),failures);
  const store=await fixture();
  try{
    for(let i=0;i<2;i++){
      const expected=failures[i];await assert.rejects(store.putRecord(request('recoverable-'+i)),error=>error===expected);
      assert.equal(fault.consumed(),i+1);
      assert.equal((await store.query(query,{validAt:0n})).rows.length,1);
    }
    assert.equal((await store.putRecord(request('healthy'))).position,2n);
  }finally{await store.close();}
});

test('fatal primary survives cleanup errors and close still attempts connection and instance',async t=>{
  const port=await NativeDuckDBPort.open(),fatal=new Error(fatalMessage),cleanup=new Error('injected result close');
  const resultClose=DuckDBResult.prototype.closeSync,instanceClose=DuckDBInstance.prototype.closeSync;
  const fetch=t.mock.method(DuckDBResult.prototype,'fetchChunk',async function(){throw fatal;});
  const close=t.mock.method(DuckDBResult.prototype,'closeSync',function(this:DuckDBResult){resultClose.call(this);throw cleanup;});
  try{
    await assert.rejects(run(port,'SELECT 1'),error=>error instanceof AggregateError&&error.cause===fatal&&error.errors.includes(fatal)&&error.errors.includes(cleanup));
    await assert.rejects(run(port,'SELECT 2'),restart(fatal));
  }finally{fetch.mock.restore();close.mock.restore();}
  let connections=0,instances=0;
  const failClose=t.mock.method(DuckDBConnection.prototype,'closeSync',function(this:DuckDBConnection){
    connections++;throw new Error('injected connection close');
  });
  t.mock.method(DuckDBInstance.prototype,'closeSync',function(this:DuckDBInstance){instances++;return instanceClose.call(this);});
  try{await assert.rejects(port.close(),AggregateError);assert.equal(connections,1);assert.equal(instances,1);}
  finally{failClose.mock.restore();await port.close();}
  assert.equal(port.status(),'closed');
});

test('fatal native appender failures fence every connection sharing the instance',async t=>{
  const writer=await NativeDuckDBPort.open(),reader=await writer.forkReader(),fatal=new Error(fatalMessage);
  await run(writer,'CREATE TABLE main.fatal_append(value BIGINT)');
  const flush=t.mock.method(DuckDBAppender.prototype,'flushSync',function(){throw fatal;});
  try{
    await assert.rejects(writer.run({kind:'append',name:'fatal_append',schema:'main',table:'fatal_append',rows:[[1n]]}),error=>error===fatal);
    await assert.rejects(run(reader,'SELECT 1'),restart(fatal));
    assert.equal(writer.status(),'fenced');assert.equal(reader.status(),'fenced');
  }finally{flush.mock.restore();await reader.close();await writer.close();}
});
