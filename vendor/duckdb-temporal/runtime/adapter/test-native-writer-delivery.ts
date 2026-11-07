import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {DuckDBConnection,DuckDBPreparedStatement} from '@duckdb/node-api';
import {NativeEntityStore} from './native-entity.js';
import {NativeDuckDBPort,NativePortError} from './native-duckdb-port.mjs';
import type {SqlRows} from './owned-duckdb-port.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const query="answer(?n) :- triple('e','n',?n).";
const put=(commandId:string,n:number)=>({schema:'writer_delivery',version:1,type:'Row',entityId:'e',commandId,
  record:'{n='+n+';}',validFrom:0n,validTo:10n});
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};}
async function condition<T>(promise:Promise<T>,name:string):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([promise,new Promise<never>((_,reject)=>{
    timer=setTimeout(()=>reject(new Error('Missing actual native delivery condition: '+name)),5000);
  })]);}finally{clearTimeout(timer);}
}
function hasCause(value:unknown,target:Error):boolean{
  const seen=new Set<unknown>();let current=value;
  while(current instanceof Error&&!seen.has(current)){if(current===target)return true;seen.add(current);current=current.cause;}
  return false;
}

test('native committed receipt decoder failure fences peers and reconciles exact canonical state after reopen',{timeout:25000},async t=>{
  const database=join(await mkdtemp(join(root,'build/native-writer-delivery-')),'facts.duckdb');
  t.diagnostic('Preserved owned fixture: '+database);
  let store:NativeEntityStore|undefined=await NativeEntityStore.open({database,readers:2,maxQueuedReads:1,threads:1,memoryLimit:'512MB'});
  await store.defineSchema('schema writer_delivery version 1 {entity Row {n:int64 required;}}');
  const seed=await store.putRecord(put('seed',0));
  const fault=new Error('injected property access after actual committed native rows');
  const restart=(error:unknown)=>error instanceof NativePortError&&error.code==='RESTART_REQUIRED'&&hasCause(error,fault);
  const owners=new WeakSet<DuckDBPreparedStatement>(),entered=[deferred(),deferred()],release=deferred();
  let held=0,released=false;
  const prepare=DuckDBConnection.prototype.prepare,stream=DuckDBPreparedStatement.prototype.stream;
  t.mock.method(DuckDBConnection.prototype,'prepare',async function(this:DuckDBConnection,...args:Parameters<typeof prepare>){
    const prepared=await Reflect.apply(prepare,this,args) as Awaited<ReturnType<typeof prepare>>;
    if(/^PRAGMA td_query_store/.test(args[0])||args[0].includes('td_control_check_v1('))owners.add(prepared);return prepared;
  });
  const heldStream=t.mock.method(DuckDBPreparedStatement.prototype,'stream',async function(this:DuckDBPreparedStatement,...args:Parameters<typeof stream>){
    const result=await Reflect.apply(stream,this,args) as Awaited<ReturnType<typeof stream>>;
    if(owners.has(this)&&!released){const own=entered[held++];assert.ok(own);own.resolve();await release.promise;}
    return result;
  });
  const run=NativeDuckDBPort.prototype.runWriter;let actualRows:SqlRows|undefined,consumed=false,dispatches=0;
  const delivery=t.mock.method(NativeDuckDBPort.prototype,'runWriter',async function(this:NativeDuckDBPort,...args:Parameters<typeof run>){
    const rows=await Reflect.apply(run,this,args) as SqlRows;
    if(args[0].sql.startsWith('PRAGMA td_put_entity_v2(')&&args[0].sql.includes("'commit-before-decode'")){
      dispatches++;actualRows=rows;
      // These are the unmodified rows from the completed native command. The
      // decoder's first access fails; no result/SQL/receipt value is fabricated.
      return new Proxy(rows,{get(target,key,receiver){
        if(!consumed&&key==='length'){consumed=true;throw fault;}
        return Reflect.get(target,key,receiver);
      }});
    }
    return rows;
  });
  const pending:Promise<unknown>[]=[];
  try{
    const first=assert.rejects(store.query(query,{validAt:0n,forceNative:true}),restart);pending.push(first);
    await condition(entered[0]!.promise,'first actual peer result');
    const second=assert.rejects(store.query(query,{validAt:0n,forceNative:true}),restart);pending.push(second);
    await condition(entered[1]!.promise,'second actual peer result');
    const queued=assert.rejects(store.query(query,{validAt:0n,forceNative:true}),restart);pending.push(queued);
    assert.deepEqual(store.readerStats(),{capacity:2,available:0,active:2,waiting:0});
    const writing=assert.rejects(store.putRecord(put('commit-before-decode',7)),restart);pending.push(writing);
    const later=assert.rejects(store.putRecord(put('must-not-commit',9)),restart);pending.push(later);
    await condition(writing,'shared fence after actual commit and failed typed receipt delivery');
    assert.equal(consumed,true);assert.equal(dispatches,1);assert.ok(actualRows);assert.equal(actualRows[0]?.[1],2n);
    for(const operation of [()=>store!.query(query,{validAt:0n}),()=>store!.receipt('seed'),()=>store!.history('e'),
      ()=>store!.putRecord(put('commit-before-decode',7)),()=>store!.defineSchema('schema blocked version 1 {entity Row {n:int64;}}')])
      await assert.rejects(operation(),restart);
    released=true;release.resolve();await condition(Promise.all([first,second,queued,later]),'all peer calls reject without a healthy answer or later ACK');
    assert.equal(dispatches,1,'the uncertain command is never retried');
    await store.close();store=undefined;heldStream.mock.restore();delivery.mock.restore();
    store=await NativeEntityStore.open({database,readers:2,threads:1,memoryLimit:'512MB'});
    assert.deepEqual(await store.receipt('seed'),seed);
    const receipt=await store.receipt('commit-before-decode');assert.ok(receipt);const wire=actualRows[0];assert.ok(wire);
    // Compare opaque native IDs/hash bytes, without recomputing canonical hashes.
    assert.equal(receipt.commandId,wire[0]);assert.equal(receipt.position,wire[1]);
    assert.ok(typeof wire[2]==='string'&&typeof wire[3]==='string');
    assert.deepEqual(receipt.asserted,JSON.parse(wire[2]));assert.deepEqual(receipt.retracted,JSON.parse(wire[3]));
    assert.equal(receipt.schemaHash,wire[8]);assert.equal(receipt.requestHash,wire[9]);assert.equal(receipt.entityId,'e');
    assert.equal(await store.receipt('must-not-commit'),null);
    assert.deepEqual((await store.at('e',{validAt:0n,knownAt:1n})).map(row=>row.value),[{tag:'i64',value:0n}]);
    assert.deepEqual((await store.at('e',{validAt:0n,knownAt:2n})).map(row=>row.value),[{tag:'i64',value:7n}]);
    const history=await store.history('e');assert.equal(history.length,2);
    assert.deepEqual(history.map(row=>row.commandId).sort(),['commit-before-decode','seed']);
    const before=history.find(row=>row.commandId==='seed'),after=history.find(row=>row.commandId==='commit-before-decode');
    assert.ok(before&&after);assert.equal(before.txFrom,1n);assert.equal(before.txTo,2n);
    assert.equal(before.correctedBy,'commit-before-decode');assert.equal(after.txFrom,2n);
    assert.equal(before.assertionId,seed.asserted[0]);assert.equal(after.assertionId,receipt.asserted[0]);
    assert.deepEqual(await store.putRecord(put('commit-before-decode',7)),receipt);
    assert.equal((await store.putRecord(put('healthy-after-reconcile',8))).position,3n);
    assert.deepEqual((await store.query(query,{validAt:0n})).rows,[[{tag:'i64',value:8n}]]);
  }finally{released=true;release.resolve();await Promise.allSettled(pending);await store?.close();}
});
