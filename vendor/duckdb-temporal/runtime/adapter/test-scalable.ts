import assert from 'node:assert/strict';
import {getEventListeners} from 'node:events';
import {test} from 'node:test';
import {DuckDBConnection,DuckDBPreparedStatement} from '@duckdb/node-api';
import {NativeEntityStore,NativeCommandError} from './native-entity.js';
import type {NativeScalableQueryOptions} from './native-entity.js';

const INF=9223372036854775807n;
const schema='schema scalable version 1 {entity Row {n:int64 many;s:text many;f:float64 many;b:boolean;}}';
const scan="answer(?n) :- triple(?e,'n',?n).";
const aggregate=(operation:string)=>"source(?e,?n) :- triple(?e,'n',?n). answer("+operation+") :- source(?e,?n).";
const put=(commandId:string,record:string,entityId='e')=>({schema:'scalable',version:1,type:'Row',entityId,
  commandId,record,validFrom:0n,validTo:INF});
const code=(expected:string)=>(error:unknown)=>error instanceof NativeCommandError&&error.code===expected;

async function fixture(record='{n=1;n=2;n=3;}',readers=2){
  const store=await NativeEntityStore.open({readers});
  await store.defineSchema(schema);await store.putRecord(put('first',record));
  return store;
}

async function same(store:NativeEntityStore,program:string,options:NativeScalableQueryOptions={validAt:0n}){
  const scalable=await store.queryScalable(program,options);
  const native=await store.query(program,{validAt:options.validAt,
    ...(options.knownAt===undefined?{}:{knownAt:options.knownAt}),forceNative:true});
  assert.equal(scalable.route,'sql');assert.ok(/^owned_(?:allcut_unique_|unique_)?scalable_/.test(scalable.reason));
  assert.equal(scalable.counters,null);assert.deepEqual(scalable.rows,native.rows);
  assert.equal(scalable.position,native.position);
  return scalable;
}

function deferred(){
  let resolve!:()=>void;
  const promise=new Promise<void>(done=>{resolve=done;});
  return {promise,resolve};
}

async function waitFor(promise:Promise<unknown>){
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error('Scalable reader condition did not occur')),2000);
    })]);
  }finally{clearTimeout(timer);}
}

test('scalable public reads use SQL and retain native typed scan, join and aggregate answers',async()=>{
  const store=await fixture('{n=-1;n=2;s="é🙂";f=f64("0000000000000001");b=false;}');
  try{
    await store.putRecord(put('second','{n=2;n=3;s="other";f=f64("3ff0000000000000");b=true;}','other'));
    const programs=[
      "answer(?a,?v) :- triple('e',?a,?v).",
      "answer(?n,?s) :- triple(?e,'n',?n),triple(?e,'s',?s).",
      'answer(count()) :- triple(?e,?a,?v).',
      'answer(?a,count()) :- triple(?e,?a,?v).',
      aggregate('sum_i64(?n)'),aggregate('min(?n)'),aggregate('max(?n)'),
      "source(?v) :- triple(?e,'n',?v). answer(count()) :- source(?v).",
      "source(?e,?v) :- triple(?e,'f',?v). answer(min(?v)) :- source(?e,?v).",
    ];
    for(const program of programs)await same(store,program);
    assert.deepEqual((await same(store,aggregate('sum_i64(?n)'))).rows,[[{tag:'i64',value:6n}]]);
    await assert.rejects(store.queryScalable(
      "path(?a,?b) :- triple(?a,'s',?b). path(?a,?c) :- path(?a,?b),path(?b,?c). answer(?a,?b) :- path(?a,?b).",
      {validAt:0n}),code('TD_E_QUERY_SCALE_UNSUPPORTED'));
    assert.match((await store.queryScalable(scan,{validAt:0n})).reason,/^owned_(?:allcut_unique_|unique_)?scalable_single_atom$/);
  }finally{await store.close();}
});

test('scalable public input, intermediate and output budgets admit exact boundaries and reject one below',async()=>{
  const store=await fixture();
  // Three one-character entity/attribute integer tuples cost 3*(120+1+1)
  // logical input bytes. This profile reserves 256*arity+128 output bytes per tuple.
  const exact:NativeScalableQueryOptions={validAt:0n,maxInputFacts:3,maxIntermediateRows:3,
    maxIntermediateBytes:366,maxOutputRows:3,maxOutputBytes:1152};
  try{
    assert.equal((await store.queryScalable(scan,exact)).rows.length,3);
    for(const [key,boundary] of [
      ['maxInputFacts',3],['maxIntermediateRows',3],['maxIntermediateBytes',366],
      ['maxOutputRows',3],['maxOutputBytes',1152],
    ] as const){
      await assert.rejects(store.queryScalable(scan,{...exact,[key]:boundary-1}),code('TD_E_QUERY_SCALE_LIMIT'));
      assert.equal((await store.queryScalable(scan,{...exact,[key]:boundary+1})).rows.length,3);
    }
    for(const invalid of [0,-1,1.5,Number.NaN,Number.MAX_SAFE_INTEGER+1]){
      await assert.rejects(store.queryScalable(scan,{validAt:0n,maxInputFacts:invalid}),
        error=>error instanceof TypeError||code('TD_E_QUERY_SCALE_LIMIT')(error));
    }
    assert.equal((await store.queryScalable(aggregate('count()'),{validAt:0n,maxOutputRows:1})).rows.length,1);
  }finally{await store.close();}
});

test('scalable stage gates reject wide projections and explosive joins with reusable reader cleanup',async()=>{
  const store=await fixture('{'+Array.from({length:256},(_,n)=>'n='+n+';').join('')+'}');
  const wide="source(?n,'"+'x'.repeat(16384)+"') :- triple(?e,'n',?n). answer(count()) :- source(?n,?text).";
  const fanout="answer('present') :- "+['a','b','c','d'].map(v=>"triple('e','n',?"+v+')').join(',')+'.';
  try{
    await assert.rejects(store.queryScalable(wide,{validAt:0n,maxIntermediateBytes:131072,timeoutMs:5000}),
      code('TD_E_QUERY_SCALE_LIMIT'));
    await assert.rejects(store.queryScalable(fanout,{validAt:0n,maxIntermediateRows:1024,timeoutMs:5000}),
      code('TD_E_QUERY_SCALE_LIMIT'));
    assert.deepEqual((await store.queryScalable(aggregate('count()'),{validAt:0n,timeoutMs:5000})).rows,
      [[{tag:'i64',value:256n}]]);
    assert.equal((await store.putRecord(put('healthy','{n=7;}'))).position,2n);
    assert.deepEqual((await store.queryScalable(scan,{validAt:0n})).rows,[[{tag:'i64',value:7n}]]);
  }finally{await store.close();}
});

test('scalable extrema support heterogeneous groups and preserve canonical invalid-group errors',async()=>{
  const store=await fixture('{n=1;n=9;}');
  const grouped="source(?e,?v) :- triple(?e,'n',?v). answer(?e,min(?v)) :- source(?e,?v).";
  try{
    await store.defineSchema('schema scalable version 2 {entity Row {n:text many;}}');
    await store.putRecord({...put('text','{n="z";n="a";}','text'),version:2});
    assert.deepEqual((await same(store,grouped)).rows,
      [[{tag:'str',value:'e'},{tag:'i64',value:1n}],[{tag:'str',value:'text'},{tag:'str',value:'a'}]]);
    await assert.rejects(store.queryScalable(aggregate('min(?n)'),{validAt:0n}),/TD_E_AGG_MIXED_TAGS/);
    await store.putRecord(put('boolean','{b=true;}','bool'));
    const all="source(?e,?a,?v) :- triple(?e,?a,?v). answer(?e,min(?v)) :- source(?e,?a,?v).";
    await assert.rejects(store.queryScalable(all,{validAt:0n}),/TD_E_AGG_MEASURE_TAG/);
    assert.deepEqual((await same(store,grouped,{validAt:0n,knownAt:1n})).rows,
      [[{tag:'str',value:'e'},{tag:'i64',value:1n}]]);
  }finally{await store.close();}
});

test('scalable correction reads pin valid and knowledge cuts across pooled public calls',async()=>{
  const store=await fixture();
  try{
    const before=await same(store,aggregate('sum_i64(?n)'));
    await store.putRecord({...put('correction','{n=9;}'),validFrom:2n,validTo:8n});
    const [historical,current,outside]=await Promise.all([
      store.queryScalable(aggregate('sum_i64(?n)'),{validAt:3n,knownAt:1n,timeoutMs:5000}),
      store.queryScalable(scan,{validAt:3n,timeoutMs:5000}),
      store.queryScalable(scan,{validAt:0n,timeoutMs:5000}),
    ]);
    assert.equal(historical.position,1n);assert.deepEqual(historical.rows,before.rows);
    assert.equal(current.position,2n);assert.deepEqual(current.rows,[[{tag:'i64',value:9n}]]);
    assert.equal(outside.position,2n);assert.deepEqual(outside.rows,[]);
    await assert.rejects(store.queryScalable(scan,{validAt:3n,knownAt:3n}),code('TD_E_QUERY_INPUT'));
    await same(store,scan,{validAt:3n,knownAt:1n});
    assert.equal((await store.history('e')).length,4);
  }finally{await store.close();}
});

test('scalable prepared reads refresh data and cancel only the owning pooled connection',async t=>{
  const store=await fixture(),controller=new AbortController();
  const started=deferred(),released=deferred();
  const preparedOwners=new Map<DuckDBPreparedStatement,DuckDBConnection>();
  const interrupted=new Set<DuckDBConnection>();
  let preparations=0,uncontrolledPreparations=0,holdNext=false,heldOwner:DuckDBConnection|undefined;
  const prepare=DuckDBConnection.prototype.prepare,stream=DuckDBPreparedStatement.prototype.stream,
    interrupt=DuckDBConnection.prototype.interrupt;
  t.mock.method(DuckDBConnection.prototype,'prepare',async function(this:DuckDBConnection,sql:string){
    const statement=await prepare.call(this,sql);
    if(/^PRAGMA td_query_store_scalable_v2\(/.test(sql))uncontrolledPreparations++;
    if(/'owned_(?:allcut_unique_|unique_)?scalable_/.test(sql)&&sql.includes('td_control_check_v1(')){
      preparations++;preparedOwners.set(statement,this);
    }
    return statement;
  });
  t.mock.method(DuckDBPreparedStatement.prototype,'stream',async function(this:DuckDBPreparedStatement){
    const result=await stream.call(this),owner=preparedOwners.get(this);
    if(holdNext&&owner){holdNext=false;heldOwner=owner;started.resolve();await released.promise;}
    return result;
  });
  t.mock.method(DuckDBConnection.prototype,'interrupt',function(this:DuckDBConnection){
    interrupted.add(this);return interrupt.call(this);
  });
  let canceled:Promise<unknown>|undefined;
  try{
    const plain=await store.queryScalable(scan,{validAt:0n});
    for(let i=0;i<4;i++)assert.deepEqual((await store.queryScalable(scan,{validAt:0n})).rows,plain.rows);
    assert.equal(uncontrolledPreparations,2);
    for(let i=0;i<6;i++)assert.deepEqual((await store.queryScalable(scan,{validAt:0n,timeoutMs:5000})).rows,plain.rows);
    assert.equal(preparations,2);
    await store.putRecord(put('fresh','{n=7;}'));
    for(let i=0;i<2;i++)assert.deepEqual((await store.queryScalable(scan,{validAt:0n})).rows,[[{tag:'i64',value:7n}]]);
    assert.equal(uncontrolledPreparations,2);
    assert.deepEqual((await store.queryScalable(scan,{validAt:0n,knownAt:1n})).rows,plain.rows);
    assert.deepEqual((await store.queryScalable(scan,{validAt:0n,timeoutMs:5000})).rows,[[{tag:'i64',value:7n}]]);
    holdNext=true;
    canceled=assert.rejects(store.queryScalable(scan,{validAt:0n,signal:controller.signal}),code('TD_E_CANCELED'));
    canceled.catch(()=>{});
    await waitFor(started.promise);
    assert.deepEqual((await store.queryScalable(scan,{validAt:0n,timeoutMs:5000})).rows,[[{tag:'i64',value:7n}]]);
    controller.abort();released.resolve();await canceled;
    assert.ok(heldOwner);assert.deepEqual(interrupted,new Set([heldOwner]));
    assert.equal(getEventListeners(controller.signal,'abort').length,0);
    assert.deepEqual((await store.queryScalable(scan,{validAt:0n,timeoutMs:5000})).rows,[[{tag:'i64',value:7n}]]);
    assert.equal(store.readerStats().active,0);
  }finally{released.resolve();await canceled?.catch(()=>{});await store.close();}
});

test('public retained budgets are immutable and enforce exact row and byte capacity atomically',async()=>{
  const limits={maxFacts:2,maxBytes:10};
  const store=await NativeEntityStore.open({readers:1,retainedLimits:limits});
  try{
    await store.defineSchema(schema);
    const first=await store.putRecord(put('one','{n=7;}'));
    await store.putRecord(put('two','{n=8;}','f'));
    // Each one-character entity/attribute and quoted integer payload uses five bytes.
    limits.maxFacts=3;limits.maxBytes=100;
    assert.deepEqual(await store.putRecord(put('one','{n=7;}')),first);
    await assert.rejects(store.putRecord(put('three','{n=9;}','g')),code('TD_E_COMMAND_LIMIT'));
    assert.equal(await store.receipt('three'),null);
    const answer=await store.queryScalable(scan,{validAt:0n});
    assert.equal(answer.position,2n);assert.deepEqual(answer.rows,[[{tag:'i64',value:7n}],[{tag:'i64',value:8n}]]);
    assert.equal((await store.history('e')).length,1);
  }finally{await store.close();}
  for(const maxBytes of [9,10,11]){
    const bounded=await NativeEntityStore.open({retainedLimits:{maxFacts:3,maxBytes}});
    try{
      await bounded.defineSchema(schema);await bounded.putRecord(put('one','{n=7;}'));
      const second=bounded.putRecord(put('two','{n=8;}','f'));
      if(maxBytes===9){await assert.rejects(second,code('TD_E_COMMAND_LIMIT'));assert.equal(await bounded.receipt('two'),null);}
      else assert.equal((await second).position,2n);
    }finally{await bounded.close();}
  }
});
