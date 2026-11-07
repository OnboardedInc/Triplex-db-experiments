import assert from 'node:assert/strict';
import {getEventListeners} from 'node:events';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {DuckDBResult,DuckDBPreparedStatement,DuckDBConnection,DuckDBInstance} from '@duckdb/node-api';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';
import {NativeEntityStore} from './native-entity.js';
const root=fileURLToPath(new URL('../..',import.meta.url));
const bridge=createRequire(import.meta.url)(root+'/build/temporal_control.node') as {
  initialize(path:string,hash:string):void;create(millis:number|undefined):bigint;cancel(token:bigint):void;status(token:bigint):number;release(token:bigint):void;
};
const run=(port:NativeDuckDBPort,sql='SELECT 42')=>port.run({name:'cleanup_fixture',sql,params:[]});
const aggregate=(error:unknown):error is AggregateError=>error instanceof AggregateError;

test('result/binding/destruction faults all run, preserve errors, fence and defer failed releases',async t=>{
 for(const faultAt of [1,2]){
  const port=await NativeDuckDBPort.open();
  const closeFault=new Error('injected result close'),bindingFault=new Error('injected binding clear'),destroyFault=new Error('injected statement destroy');
  const events:string[]=[];let clears=0;
  const clear=DuckDBPreparedStatement.prototype.clearBindings;
  const a=t.mock.method(DuckDBResult.prototype,'closeSync',function(){events.push('result');throw closeFault;});
  const b=t.mock.method(DuckDBPreparedStatement.prototype,'clearBindings',function(this:DuckDBPreparedStatement){
    events.push('bindings');if(++clears===faultAt)throw bindingFault;return clear.call(this);
  });
  const c=t.mock.method(DuckDBPreparedStatement.prototype,'destroySync',function(){events.push('destroy');throw destroyFault;});
  try{
    await assert.rejects(run(port),error=>aggregate(error)&&(faultAt===1||error.errors.includes(closeFault))&&error.errors.includes(bindingFault)&&error.errors.includes(destroyFault));
    assert.deepEqual(events,faultAt===1?['bindings','bindings','destroy']:['bindings','result','bindings','destroy']);
    assert.equal(port.status(),'fenced');assert.equal(port.cacheStats().entries,0);
    assert.equal(port.trace().at(-1)?.error,'CLEANUP_FAILED');
    await assert.rejects(run(port),/not ready/);
  }finally{a.mock.restore();b.mock.restore();c.mock.restore();await port.close();}
  assert.equal(port.status(),'closed');
 }
});

test('primary fetch errors remain the cause when completed result cleanup also throws',async t=>{
  const port=await NativeDuckDBPort.open();const primary=new Error('injected fetch acknowledgement'),cleanup=new Error('injected close acknowledgement');
  const fetch=DuckDBResult.prototype.fetchChunk,close=DuckDBResult.prototype.closeSync,destroy=DuckDBPreparedStatement.prototype.destroySync;
  let destroyed=0;
  const a=t.mock.method(DuckDBResult.prototype,'fetchChunk',async function(this:DuckDBResult){await fetch.call(this);throw primary;});
  const b=t.mock.method(DuckDBResult.prototype,'closeSync',function(this:DuckDBResult){close.call(this);throw cleanup;});
  const c=t.mock.method(DuckDBPreparedStatement.prototype,'destroySync',function(this:DuckDBPreparedStatement){destroyed++;return destroy.call(this);});
  try{
    await assert.rejects(run(port),error=>aggregate(error)&&error.cause===primary&&error.errors[0]===primary&&error.errors.includes(cleanup));
    assert.equal(destroyed,1);assert.equal(port.status(),'fenced');assert.equal(port.trace().at(-1)?.ok,false);
  }finally{a.mock.restore();b.mock.restore();c.mock.restore();await port.close();}
});

test('cancellation cannot hide uncertain cleanup; token/listener retirement still runs',async t=>{
  const port=await NativeDuckDBPort.open();const controller=new AbortController(),fault=new Error('injected close during abort');let token=0n;
  const a=t.mock.method(DuckDBResult.prototype,'closeSync',function(){controller.abort();throw fault;});
  try{
    await assert.rejects(port.withQueryControl({signal:controller.signal},async control=>{
      token=control.token;return control.run({name:'aborted_cleanup',sql:'SELECT 42',params:[]});
    }),error=>aggregate(error)&&error.errors.includes(fault));
    assert.equal(port.status(),'fenced');assert.equal(bridge.status(token),3);
    assert.equal(getEventListeners(controller.signal,'abort').length,0);
    await assert.rejects(run(port),/not ready/);
  }finally{a.mock.restore();await port.close();}
});

test('close attempts every statement, connection and instance despite failures, then permits close-only retry',async t=>{
  const port=await NativeDuckDBPort.open();await run(port,'SELECT 1');await run(port,'SELECT 2');
  const events:string[]=[];let statements=0;
  const destroy=DuckDBPreparedStatement.prototype.destroySync;
  const a=t.mock.method(DuckDBPreparedStatement.prototype,'destroySync',function(this:DuckDBPreparedStatement){
    events.push('statement');if(++statements===1)throw new Error('injected close statement');return destroy.call(this);
  });
  const b=t.mock.method(DuckDBConnection.prototype,'closeSync',function(){events.push('connection');throw new Error('injected close connection');});
  const c=t.mock.method(DuckDBInstance.prototype,'closeSync',function(){events.push('instance');throw new Error('injected close instance');});
  try{
    await assert.rejects(port.close(),error=>aggregate(error)&&error.errors.length===3);
    assert.deepEqual(events,['statement','statement','connection','instance']);
    assert.equal(port.status(),'fenced');assert.equal(port.cacheStats().entries,0);
    await assert.rejects(run(port),/not ready/);
  }finally{a.mock.restore();b.mock.restore();c.mock.restore();await port.close();}
  assert.equal(port.status(),'closed');await port.close();
  const store=await NativeEntityStore.open();
  const closeStore=t.mock.method(DuckDBInstance.prototype,'closeSync',function(){throw new Error('injected store close');});
  try{
    await assert.rejects(store.close(),AggregateError);
    await assert.rejects(store.query('answer(1).',{validAt:0n}),/closed/);
  }finally{closeStore.mock.restore();await store.close();}
});

test('eviction destruction failure fences the port and still releases the new statement',async t=>{
  const port=await NativeDuckDBPort.open();for(let i=0;i<32;i++)await run(port,'SELECT '+i);
  const destroy=DuckDBPreparedStatement.prototype.destroySync,fault=new Error('injected eviction destroy');let attempts=0;
  const a=t.mock.method(DuckDBPreparedStatement.prototype,'destroySync',function(this:DuckDBPreparedStatement){
    if(++attempts===1)throw fault;return destroy.call(this);
  });
  try{
    await assert.rejects(run(port,'SELECT 99'),error=>aggregate(error)&&error.errors.includes(fault));
    assert.equal(attempts,2);assert.equal(port.status(),'fenced');assert.ok(port.cacheStats().entries<=32);
    await assert.rejects(run(port),/not ready/);
  }finally{a.mock.restore();await port.close();}
});

test('scope listener and control-release faults are independent, fence reuse and retain explicit cleanup',async t=>{
  const instance=await DuckDBInstance.create(':memory:',{allow_unsigned_extensions:'true',threads:'1',memory_limit:'128MB'}),connection=await instance.connect();
  const manifest=JSON.parse(await readFile(root+'/build/artifact.json','utf8'));
  const binary=root+'/build/temporal_datalog.duckdb_extension';await connection.run("LOAD '"+binary.replaceAll("'","''")+"'");
  await connection.run('PRAGMA td_initialize');bridge.initialize(binary,manifest.extension_sha256);
  const controller=new AbortController();let releaseFails=true,releases=0,token=0n;
  const control={create:bridge.create,cancel:bridge.cancel,status:bridge.status,release:(value:bigint)=>{
    releases++;if(releaseFails)throw new Error('injected control release');bridge.release(value);
  }};
  const port=Reflect.construct(NativeDuckDBPort,[instance,connection,control])as NativeDuckDBPort;
  const remove=controller.signal.removeEventListener;
  const a=t.mock.method(controller.signal,'removeEventListener',function(this:AbortSignal,...args:Parameters<AbortSignal['removeEventListener']>){
    remove.apply(this,args);throw new Error('injected listener removal acknowledgement');
  });
  try{
    await assert.rejects(port.withQueryControl({signal:controller.signal},async scope=>{
      token=scope.token;return scope.run({name:'scope_cleanup',sql:'SELECT 42',params:[]});
    }),error=>aggregate(error)&&error.errors.length===2);
    assert.equal(releases,1);assert.equal(bridge.status(token),0);assert.equal(port.status(),'fenced');
    assert.equal(getEventListeners(controller.signal,'abort').length,0);
  }finally{a.mock.restore();releaseFails=false;await port.close();}
  assert.equal(bridge.status(token),3);assert.equal(port.status(),'closed');
});
