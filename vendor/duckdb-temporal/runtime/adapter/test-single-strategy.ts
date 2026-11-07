import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {test} from 'node:test';
import type {TestContext} from 'node:test';
import {fileURLToPath} from 'node:url';
import {DuckDBConnection,DuckDBInstance,DuckDBPreparedStatement,DuckDBResult} from '@duckdb/node-api';
import {NativeEntityStore} from './native-entity.js';

const schema='schema sole_owner version 1 {entity Row {n:int64;edge:text many;blocked:boolean;}}';
const scan="answer(?n) :- triple('a','n',?n).";
const emptyScan="answer(?n) :- triple('missing','n',?n).";
const graph="reachable(?a,?b) :- triple(?a,'edge',?b). "+
  "reachable(?a,?c) :- reachable(?a,?b),triple(?b,'edge',?c). "+
  "answer(?a,?b) :- reachable(?a,?b),!triple(?b,'blocked',true).";
const invalid=/TD_E_OWNER_PROBE_INVALID/;
const cut={validAt:3n};
const controlled={...cut,timeoutMs:10000};
const request=(commandId:string,entityId:string,record:string)=>({schema:'sole_owner',version:1,
  type:'Row',entityId,commandId,record,validFrom:0n,validTo:10n});
const first=request('first','a','{n=1;edge="b";}');
const patch={...request('patch','a','{n=2;edge="b";}'),validFrom:2n,validTo:8n};

function captureInstance(t:TestContext){
  let instance:DuckDBInstance|undefined;
  const create=DuckDBInstance.create;
  t.mock.method(DuckDBInstance,'create',async function(this:typeof DuckDBInstance,...args:Parameters<typeof DuckDBInstance.create>){
    instance=await create.apply(this,args);
    return instance;
  });
  return ()=>{assert.ok(instance);return instance;};
}

async function assertReadPaths(store:NativeEntityStore){
  for(const options of [cut,controlled]){
    const native=await store.query(scan,{...options,forceNative:true});
    const sql=await store.query(scan,{...options,forceNative:false});
    const scalable=await store.queryScalable(scan,options);
    assert.deepEqual([native.route,sql.route,scalable.route],['native','sql','sql']);
    for(const result of [native,sql,scalable]){
      assert.equal(result.position,4n);
      assert.deepEqual(result.rows,[[{tag:'i64',value:2n}]]);
    }
    assert.deepEqual((await store.query(emptyScan,{...options,forceNative:true})).rows,[]);
    assert.deepEqual((await store.query(emptyScan,{...options,forceNative:false})).rows,[]);
    assert.deepEqual((await store.queryScalable(emptyScan,options)).rows,[]);
  }
  const recursive=await store.query(graph,controlled);
  assert.equal(recursive.position,4n);
  assert.deepEqual(recursive.rows,[[{tag:'str',value:'a'},{tag:'str',value:'b'}]]);
  assert.deepEqual((await store.queryScalable(scan,{knownAt:1n,validAt:3n})).rows,[[{tag:'i64',value:1n}]]);
  assert.deepEqual((await store.queryScalable(scan,{validAt:8n})).rows,[[{tag:'i64',value:1n}]]);
}

async function assertRejected(store:NativeEntityStore){
  for(const options of [cut,controlled]) for(const program of [scan,emptyScan]){
    await assert.rejects(store.query(program,{...options,forceNative:true}),invalid,'bounded native');
    await assert.rejects(store.query(program,{...options,forceNative:false}),invalid,'bounded SQL');
    await assert.rejects(store.queryScalable(program,options),invalid,'scalable SQL');
  }
  for(const id of ['a','missing']){
    await assert.rejects(store.at(id,{knownAt:4n,...cut}),invalid,'point '+id);
    await assert.rejects(store.history(id),invalid,'history '+id);
  }
  for(const id of ['first','missing'])await assert.rejects(store.receipt(id),invalid,'receipt '+id);
  await assert.rejects(store.putRecord(first),invalid,'put replay');
  await assert.rejects(store.patchRecord(patch),invalid,'patch replay');
  await assert.rejects(store.putRecord(request('denied-put','new','{n=9;}')),invalid,'new put');
  await assert.rejects(store.patchRecord({...patch,commandId:'denied-patch',record:'{n=9;}'}),invalid,'new patch');
  await assert.rejects(store.defineSchema('schema sole_owner version 2 {entity Row {n:int64;}}'),invalid,'new schema');
}

test('the default store fences every public read and write after an unknown connection',async t=>{
  const instance=captureInstance(t);
  const directory=await mkdtemp(fileURLToPath(new URL('../sole-owner-',import.meta.url)));
  const options={database:resolve(directory,'history.duckdb'),readers:2};
  const store=await NativeEntityStore.open(options);
  let intruder:DuckDBConnection|undefined;
  let snapshot:Readonly<{
    old:Awaited<ReturnType<NativeEntityStore['putRecord']>>;
    corrected:Awaited<ReturnType<NativeEntityStore['patchRecord']>>;
    point:Awaited<ReturnType<NativeEntityStore['at']>>;
    history:Awaited<ReturnType<NativeEntityStore['history']>>;
  }>;
  try{
    assert.deepEqual(store.readerStats(),{capacity:2,available:2,active:0,waiting:0});
    await store.defineSchema(schema);
    const old=await store.putRecord(first);
    await store.putRecord(request('second','b','{edge="c";}'));
    await store.putRecord(request('third','c','{blocked=true;}'));
    const corrected=await store.patchRecord(patch);
    assert.equal(old.position,1n);
    assert.equal(corrected.position,4n);
    assert.deepEqual(await store.putRecord(first),old);
    assert.deepEqual(await store.patchRecord(patch),corrected);
    await assertReadPaths(store);
    const point=await store.at('a',{knownAt:4n,...cut}),history=await store.history('a');
    assert.deepEqual(point.map(row=>row.value.value).sort(),[2n,'b']);
    assert.equal(history.length,8);
    assert.deepEqual(await store.at('missing',{knownAt:4n,...cut}),[]);
    assert.deepEqual(await store.history('missing'),[]);
    assert.equal(await store.receipt('missing'),null);
    snapshot={old,corrected,point,history};

    // Opening a context is the invalidation event, before it runs any SQL.
    intruder=await instance().connect();
    await assertRejected(store);
    await assert.rejects(store.revalidate(),/TD_E_OWNER_PROBE_ENROLLMENT/);
    intruder.closeSync();intruder=undefined;
    await assertRejected(store);
    await store.revalidate();
    await assertReadPaths(store);
    assert.deepEqual(await store.history('a'),snapshot.history);
  }finally{intruder?.closeSync();await store.close();}

  const reopened=await NativeEntityStore.open(options);
  try{
    await assertReadPaths(reopened);
    assert.deepEqual(await reopened.at('a',{knownAt:4n,...cut}),snapshot.point);
    assert.deepEqual(await reopened.history('a'),snapshot.history);
    assert.deepEqual(await reopened.receipt('first'),snapshot.old);
    assert.deepEqual(await reopened.receipt('patch'),snapshot.corrected);
    assert.equal(await reopened.receipt('denied-put'),null);
    assert.equal(await reopened.receipt('denied-patch'),null);
    assert.deepEqual(await reopened.putRecord(first),snapshot.old);
    assert.equal((await reopened.defineSchema('schema sole_owner version 2 {entity Row {note:text;}}')).version,2);
    assert.equal((await reopened.putRecord(request('healthy','new','{n=9;}'))).position,5n);
  }finally{await reopened.close();}
});

function deferred(){
  let resolve!:()=>void;
  const promise=new Promise<void>(done=>{resolve=done;});
  return {promise,resolve};
}

async function waitFor(condition:Promise<void>){
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    await Promise.race([condition,new Promise<never>((_,reject)=>{
      timer=setTimeout(()=>reject(new Error('Timed out waiting for a real owned result chunk')),5000);
    })]);
  }finally{clearTimeout(timer);}
}

test('a queued controlled read rechecks ownership before executing its cached statement',async t=>{
  const instance=captureInstance(t);
  const store=await NativeEntityStore.open({readers:1,maxQueuedReads:1});
  const started=deferred(),release=deferred();
  let intruder:DuckDBConnection|undefined;
  const pending:Promise<unknown>[]=[];
  try{
    await store.defineSchema(schema);
    await store.putRecord(first);
    const results:DuckDBPreparedStatement[]=[];
    const stream=DuckDBPreparedStatement.prototype.stream;
    t.mock.method(DuckDBPreparedStatement.prototype,'stream',async function(this:DuckDBPreparedStatement){
      const result=await stream.call(this);
      if(result.columnNames().includes('tuple_json'))results.push(this);
      return result;
    });
    for(let index=0;index<2;index++){
      const result=await store.queryScalable(scan,controlled);
      assert.deepEqual(result.rows,[[{tag:'i64',value:1n}]]);
    }
    assert.equal(results.length,2);
    assert.equal(results[0],results[1],'the real controlled statement must be reused');

    const fetchChunk=DuckDBResult.prototype.fetchChunk;
    let held=false;
    t.mock.method(DuckDBResult.prototype,'fetchChunk',async function(this:DuckDBResult){
      const chunk=await fetchChunk.call(this);
      if(!held&&chunk&&chunk.rowCount>0&&this.columnNames().includes('tuple_json')){
        held=true;
        started.resolve();
        await release.promise;
      }
      return chunk;
    });
    const active=store.queryScalable(scan,controlled);
    pending.push(active);
    void active.catch(()=>{});
    await waitFor(started.promise);
    const queued=store.queryScalable(scan,controlled);
    pending.push(queued);
    const rejected=assert.rejects(queued,invalid);
    pending.push(rejected);
    void rejected.catch(()=>{});
    await Promise.resolve();
    assert.equal(store.readerStats().active,1);
    // SDK contract v2 waits in heavy admission before a physical reader lease.
    assert.equal(store.readerStats().waiting,0);
    assert.equal(results.length,3,'only two warmups and the active native statement have started');

    intruder=await instance().connect();
    release.resolve();
    assert.deepEqual((await active).rows,[[{tag:'i64',value:1n}]]);
    await rejected;
    assert.equal(store.readerStats().active,0);
    assert.equal(store.readerStats().waiting,0);
    intruder.closeSync();intruder=undefined;
    await assert.rejects(store.queryScalable(scan,controlled),invalid);
  }finally{
    release.resolve();
    await Promise.allSettled(pending);
    intruder?.closeSync();
    await store.close();
  }
});
