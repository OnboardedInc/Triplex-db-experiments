import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {test} from 'node:test';
import type {TestContext} from 'node:test';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {promisify} from 'node:util';
import {DuckDBConnection,DuckDBInstance} from '@duckdb/node-api';
import {NativeEntityStore} from './native-entity.js';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';

// Actual SDK/engine only. No frozen fixture mutations, fake receipts, copied
// hash formulas or SQL result substitutions. Every created DB is preserved.
const root=fileURLToPath(new URL('../..',import.meta.url));
const build=join(root,'build');
const bridge=createRequire(import.meta.url)(join(build,'owner_probe/temporal_writer.node')) as {
  snapshot():{liveHandles:number;pendingCompletions:number;asyncContexts:number;asyncResources:number;lifecycleOwners:number};
  claim(ticket:bigint,opaqueLifecycleOwner:object):unknown;
};
const schema='schema writer_proof version 1 {entity Row {i:int64 required;label:text required;}}';
const minimum=-9223372036854775808n,maximum=9223372036854775807n;
const entity="a-'é",other="b-e\u0301",label="quoted 'é / e\u0301 / 世界";
const values=(i:bigint,text:string)=>[{attribute:'i',value:{tag:'i64' as const,value:i}},
  {attribute:'label',value:{tag:'str' as const,value:text}}];
const command=(entityId:string,commandId:string,i:bigint,text:string,validFrom=0n,validTo=10n)=>({
  schema:'writer_proof',version:1,type:'Row',entityId,commandId,fields:values(i,text),validFrom,validTo,
});
async function owned(t:TestContext,name:string){
  const path=join(await mkdtemp(join(build,'native-writer-'+name+'-')),'facts.duckdb');
  t.diagnostic('Preserved owned fixture: '+path);return path;
}
async function actualRows(connection:DuckDBConnection,sql:string){
  const result=await connection.run(sql);try{return await result.getRows();}finally{result.closeSync();}
}
function capture(t:TestContext){
  let port:NativeDuckDBPort|undefined;
  const run=NativeDuckDBPort.prototype.runWriter;
  t.mock.method(NativeDuckDBPort.prototype,'runWriter',function(this:NativeDuckDBPort,...args:Parameters<typeof run>){
    port=this;return Reflect.apply(run,this,args) as ReturnType<typeof run>;
  });
  return ()=>{assert.ok(port);return port;};
}
async function at(store:NativeEntityStore,id:string,k:bigint,v:bigint){
  return (await store.at(id,{knownAt:k,validAt:v})).map(row=>[row.attribute,row.value]);
}
const expected=(i:bigint,text:string)=>values(i,text).map(field=>[field.attribute,field.value]);
async function drained(){
  // A callback scope can run promise continuations while closing. Observe its
  // async metadata only after returning to the loop; native bytes/join retire
  // before ACK delivery, and the remaining async context retires at scope exit.
  await new Promise<void>(done=>setImmediate(done));
  assert.deepEqual(bridge.snapshot(),{liveHandles:0,pendingCompletions:0,asyncContexts:0,asyncResources:0,lifecycleOwners:0});
}

test('native writer public put patch replay batch resources and reopen keep exact receipts cuts and one USER context',
  {timeout:60000},async t=>{
  const path=await owned(t,'public'),port=capture(t);
  let store:NativeEntityStore|undefined=await NativeEntityStore.open({database:path,readers:16,threads:1});
  try{
    const manifest=JSON.parse(await readFile(join(build,'owner_probe/artifact.json'),'utf8'));
    assert.equal(manifest.native_writer.abi,1);
    await store.defineSchema(schema);
    const first=await store.put(command(entity,'first',minimum,label));assert.equal(first.position,1n);
    const middle=await store.patch(command(entity,'middle',maximum,'corrected',2n,8n));
    assert.equal(middle.position,2n);assert.deepEqual(middle.retracted,first.asserted);assert.equal(middle.asserted.length,6);
    for(const v of [0n,2n,7n,8n,9n])assert.deepEqual(await at(store,entity,1n,v),expected(minimum,label));
    for(const [v,i,text]of [[0n,minimum,label],[2n,maximum,'corrected'],[7n,maximum,'corrected'],[8n,minimum,label]]as const)
      assert.deepEqual(await at(store,entity,2n,v),expected(i,text));
    assert.deepEqual(await at(store,entity,2n,10n),[]);
    const batch=await store.batch({schema:'writer_proof',version:1,commandId:'batch',members:[
      {operation:'put',type:'Row',entityId:other,fields:values(-7n,'second'),validFrom:0n,validTo:10n},
      {operation:'patch',type:'Row',entityId:entity,fields:values(0n,'batch'),validFrom:4n,validTo:6n},
    ]});
    assert.equal(batch.position,3n);assert.deepEqual(batch.members.map(member=>member.entityId),[entity,other]);
    assert.deepEqual(await at(store,entity,3n,4n),expected(0n,'batch'));
    assert.deepEqual(await at(store,entity,3n,6n),expected(maximum,'corrected'));
    assert.deepEqual(await at(store,other,2n,4n),[]);assert.deepEqual(await at(store,other,3n,4n),expected(-7n,'second'));
    assert.deepEqual(await store.put({...command(entity,'first',minimum,label),fields:[...values(minimum,label).reverse(),values(minimum,label)[0]!]}),first);
    assert.deepEqual(await store.patch(command(entity,'middle',maximum,'corrected',2n,8n)),middle);
    assert.deepEqual(await store.batchReceipt('batch'),batch);
    for(const [knownAt,validAt,i]of [[1n,4n,minimum],[2n,4n,maximum],[3n,4n,0n]]as const){
      const query='answer(?i) :- triple('+JSON.stringify(entity)+",'i',?i).";
      const native=await store.query(query,{knownAt,validAt,forceNative:true});
      const sql=await store.queryScalable(query,{knownAt,validAt});
      assert.deepEqual(native.rows,[[{tag:'i64',value:i}]]);assert.deepEqual(sql.rows,native.rows);
      assert.equal(native.position,knownAt);assert.equal(sql.position,knownAt);
    }
    const stats=await store.resourceStats();assert.ok(stats.memoryBytes>=0n);assert.ok(stats.temporaryStorageBytes>=0n);
    await store.revalidate();assert.deepEqual(await store.receipt('first'),first);
    const raw=await port().runNative({name:'writer_context_proof',sql:'SELECT system.main.td_owner_probe_status()',params:[]});
    assert.equal(typeof raw[0]?.[0],'string');const status=JSON.parse(raw[0]![0] as string);
    assert.equal(status.audited,true);assert.equal(status.live.length,18);assert.deepEqual(status.enrolled,status.live);
    const metrics=port().writerMetrics();assert.ok(metrics.length>=10);
    const ids=new Set(metrics.map((item:{connectionId:bigint})=>item.connectionId));assert.equal(ids.size,1);
    const workerId=metrics[0]!.connectionId;
    assert.notEqual(workerId,BigInt(status.connection));assert.ok(status.live.some((id:number)=>BigInt(id)===workerId));
    for(const metric of metrics){assert.ok(metric.sqlCallNs>=0n);assert.ok(metric.copyAndCleanupNs>=0n);
      assert.ok(metric.nativeQueueNs>=0n);assert.ok(metric.completionWaitNs>=0n);assert.ok(metric.portFullMs>=0);}
    t.diagnostic(JSON.stringify({phase:'public-source-spans',metrics},(_key,item:unknown)=>typeof item==='bigint'?item.toString():item));
    const history=await store.history(entity);await store.close();store=undefined;await drained();
    store=await NativeEntityStore.open({database:path,readers:0});
    assert.deepEqual(await store.history(entity),history);assert.deepEqual(await store.receipt('middle'),middle);
    assert.deepEqual(await store.batchReceipt('batch'),batch);
    const write=store.put(command(other,'after-reopen',9n,'next'));
    const read=store.query("answer(?i) :- triple(?e,'i',?i).",{validAt:4n,forceNative:true});
    assert.equal((await write).position,4n);assert.equal((await read).position,4n);
  }finally{await store?.close();await drained();}
});

test('native writer late unique-constraint error rolls back header retraction clock and permits same-session reuse',
  {timeout:30000},async t=>{
  const path=await owned(t,'rollback');
  let store:NativeEntityStore|undefined=await NativeEntityStore.open({database:path});
  await store.defineSchema('schema writer_proof version 1 {entity Row {i:int64 required;}}');
  const request=(id:string,i:bigint)=>({...command('e',id,i,''),fields:[{attribute:'i',value:{tag:'i64' as const,value:i}}]});
  const first=await store.put(request('first',1n));await store.close();store=undefined;
  const instance=await DuckDBInstance.create(path),connection=await instance.connect();
  try{await actualRows(connection,'CREATE UNIQUE INDEX writer_late_failure ON main.assertions(payload)');}
  finally{connection.closeSync();instance.closeSync();}
  store=await NativeEntityStore.open({database:path,readers:4});
  try{
    const before=await store.history('e');
    // Same payload conflicts with retained original only after command header
    // insertion and old-fact retraction. This is a real engine constraint.
    await assert.rejects(store.patch(request('failed',1n)),/duplicate key|unique constraint/i);
    assert.equal(await store.receipt('failed'),null);assert.deepEqual(await store.history('e'),before);
    assert.deepEqual(await store.receipt('first'),first);
    assert.equal((await store.query("answer(?i) :- triple('e','i',?i).",{validAt:0n,forceNative:true})).position,1n);
    const healthy=await store.patch(request('healthy',2n));assert.equal(healthy.position,2n);
    assert.deepEqual((await store.at('e',{knownAt:2n,validAt:0n})).map(row=>row.value),[{tag:'i64',value:2n}]);
  }finally{await store.close();await drained();}
});

test('native writer factory retires unclaimed and claimed anchors after actual bootstrap delivery and enrollment failures',
  {timeout:30000},async t=>{
  const path=await owned(t,'factory');let deliveryConsumed=false;
  const prepare=DuckDBConnection.prototype.prepare;
  t.mock.method(DuckDBConnection.prototype,'prepare',async function(this:DuckDBConnection,...args:Parameters<typeof prepare>){
    const prepared=await Reflect.apply(prepare,this,args) as Awaited<ReturnType<typeof prepare>>;
    if(args[0]==='SELECT system.main.td_native_writer_bootstrap()'){
      // SELECT follows the actual prepared path. Only stream delivery is
      // wrapped; production retains the same clear/bind/destroy lifecycle.
      const stream=prepared.stream;
      t.mock.method(prepared,'stream',async function(this:typeof prepared,...params:Parameters<typeof stream>){
        const result=await Reflect.apply(stream,this,params) as Awaited<ReturnType<typeof stream>>;
        if(!deliveryConsumed){
          try{await result.fetchChunk();}finally{result.closeSync();}
          deliveryConsumed=true;
          throw new Error('writer fixture delivery failed after real bootstrap');
        }
        return result;
      });
    }
    return prepared;
  });
  let unexpectedPreclaim:NativeEntityStore|undefined;
  try{
    await assert.rejects(NativeEntityStore.open({database:path,readers:1}).then(store=>{
      unexpectedPreclaim=store;return store;
    }),/writer fixture delivery failed/);
    assert.equal(deliveryConsumed,true,'actual bootstrap result must be consumed before delivery failure');
  }finally{await unexpectedPreclaim?.close();await drained();}
  let actualInstance:DuckDBInstance|undefined,unknown:DuckDBConnection|undefined,inject=true;
  const create=DuckDBInstance.create;
  t.mock.method(DuckDBInstance,'create',async(...args:Parameters<typeof create>)=>{
    actualInstance=await Reflect.apply(create,DuckDBInstance,args) as DuckDBInstance;return actualInstance;
  });
  const run=NativeDuckDBPort.prototype.runWriter;
  t.mock.method(NativeDuckDBPort.prototype,'runWriter',async function(this:NativeDuckDBPort,...args:Parameters<typeof run>){
    const result=await Reflect.apply(run,this,args) as Awaited<ReturnType<typeof run>>;
    if(inject&&args[0].name==='native_writer_enroll'){
      inject=false;assert.ok(actualInstance);unknown=await actualInstance.connect();
    }
    return result;
  });
  let unexpectedPostclaim:NativeEntityStore|undefined;
  try{
    await assert.rejects(NativeEntityStore.open({database:path,readers:1}).then(store=>{
      unexpectedPostclaim=store;return store;
    }),/TD_E_OWNER_PROBE_ENROLLMENT/);
    assert.equal(inject,false,'actual postclaim worker enrollment must trigger the unknown USER connection');
  }finally{unknown?.closeSync();await unexpectedPostclaim?.close();await drained();}
  const healthy=await NativeEntityStore.open({database:path,readers:1});
  try{await healthy.defineSchema(schema);assert.equal((await healthy.put(command('e','healthy',1n,'ok'))).position,1n);}
  finally{await healthy.close();await drained();}
  assert.throws(()=>bridge.claim(9223372036854775807n,{}),/stale or consumed writer ticket/);await drained();
});

test('native writer child environment teardown joins idle executor before releasing its database anchor',
  {timeout:30000},async t=>{
  const path=await owned(t,'environment');
  const module=pathToFileURL(join(build,'adapter/native-entity.js')).href;
  const source=`import {NativeEntityStore} from ${JSON.stringify(module)};
const store=await NativeEntityStore.open({database:process.argv[1],readers:1});
await store.defineSchema('schema teardown version 1 {entity Row {i:int64 required;}}');
const receipt=await store.putRecord({schema:'teardown',version:1,type:'Row',entityId:'e',commandId:'seed',record:'{i=7;}',validFrom:0n,validTo:10n});
console.log('ACK '+receipt.position);
// Deliberately omit close: natural environment cleanup must retire the thread.
`;
  const result=await promisify(execFile)(process.execPath,['--input-type=module','-e',source,path],{cwd:root,timeout:20000});
  assert.equal(result.stdout.trim(),'ACK 1');
  const store=await NativeEntityStore.open({database:path,readers:1});
  try{assert.equal((await store.receipt('seed'))?.position,1n);
    assert.deepEqual((await store.at('e',{knownAt:1n,validAt:0n})).map(row=>row.value),[{tag:'i64',value:7n}]);}
  finally{await store.close();await drained();}
});
