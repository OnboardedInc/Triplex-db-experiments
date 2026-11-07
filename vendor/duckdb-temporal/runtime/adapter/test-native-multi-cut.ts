import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NativeEntityStore} from './native-entity.js';
import type {EntityPut} from './native-entity.js';

const definition='schema cuts version 1 {entity Row {value:int64;label:text;}}';
const program="answer(?v) :- triple('subject','value',?v).";
const i64=(value:bigint)=>({tag:'i64' as const,value});
const minimum=-9223372036854775808n;
const row=(entityId:string,validFrom:bigint,validTo:bigint,value:bigint,commandId=entityId):EntityPut=>({
  schema:'cuts',version:1,type:'Row',entityId,commandId,validFrom,validTo,
  fields:[{attribute:'value',value:i64(value)}],
});
const answer=(validAt:bigint,position:bigint,value?:bigint)=>({
  validAt,position,rows:value===undefined?[]:[[i64(value)]],
});

test('multi-cut preserves order, duplicate coordinates, empty groups and bitemporal corrections',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  try{
    await store.defineSchema(definition);
    await store.put(row('subject',minimum,10n,1n));
    await store.put(row('unrelated',minimum,10n,3n));
    await store.patch(row('subject',3n,7n,2n,'correction'));
    const cuts=[{validAt:4n},{validAt:minimum,knownAt:1n},{validAt:4n,knownAt:2n},
      {validAt:4n,knownAt:0n},{validAt:4n},{validAt:7n},{validAt:10n,knownAt:3n}];
    const actual=await store.queryCuts(program,{cuts});
    assert.deepEqual(actual,[answer(4n,3n,2n),answer(minimum,1n,1n),answer(4n,2n,1n),
      answer(4n,0n),answer(4n,3n,2n),answer(7n,3n,1n),answer(10n,3n)]);
    for(const {validAt,position,rows} of actual)
      assert.deepEqual((await store.query(program,{validAt,knownAt:position,forceNative:true})).rows,rows);
  }finally{await store.close();}
});

test('one multi-cut statement resolves every latest position under a concurrent correction',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  const counting="source(?e) :- triple(?e,'value',?v). answer(count()) :- source(?e).";
  const cuts=[{validAt:4n},{validAt:4n,knownAt:1n},{validAt:6n},{validAt:4n}];
  try{
    await store.defineSchema(definition);
    await store.put(row('subject',0n,5n,1n));
    const [observed,write]=await Promise.all([
      store.queryCuts(counting,{cuts}),
      store.put(row('second',4n,10n,2n)),
    ]);
    assert.equal(write.position,2n);
    const expected=[answer(4n,2n,2n),answer(4n,1n,1n),answer(6n,2n,1n),answer(4n,2n,2n)];
    assert.ok(observed[0]?.position===1n||observed[0]?.position===2n);
    assert.deepEqual(observed,observed[0]?.position===1n?
      [answer(4n,1n,1n),answer(4n,1n,1n),answer(6n,1n,0n),answer(4n,1n,1n)]:expected);
    assert.deepEqual(await store.queryCuts(counting,{cuts}),expected);
  }finally{await store.close();}
});

test('multi-cut validates every knowledge cut and leaves its lease healthy after limits or abort',async()=>{
  const store=await NativeEntityStore.open({readers:1});
  try{
    await store.defineSchema(definition);
    await store.put(row('subject',2n,5n,1n));
    const cuts=[{validAt:3n},{validAt:6n}];
    await assert.rejects(store.queryCuts(program,{cuts:[]}),/TD_E_QUERY_MULTI_LIMIT/);
    await assert.rejects(store.queryCuts(program,{cuts:Array.from({length:17},()=>cuts[0]!)}),/TD_E_QUERY_MULTI_LIMIT/);
    await assert.rejects(store.queryCuts(program,{cuts,maxWork:25000001}),/TD_E_QUERY_MULTI_LIMIT/);
    await assert.rejects(store.queryCuts(program,{cuts:[...cuts,{validAt:100n,knownAt:2n}]}),/TD_E_QUERY_INPUT/);
    await assert.rejects(store.queryCuts(program,{cuts:[{validAt:9223372036854775807n}]}),/TD_E_QUERY_INPUT/);
    const abort=new AbortController();
    abort.abort();
    await assert.rejects(store.queryCuts(program,{cuts,signal:abort.signal}),/TD_E_CANCELED/);
    assert.deepEqual(await store.queryCuts(program,{cuts}),[answer(3n,1n,1n),answer(6n,1n)]);
    assert.deepEqual(store.readerStats(),{capacity:1,available:1,active:0,waiting:0});
  }finally{await store.close();}
});

test('multi-cut retains all eight exact typed carriers and validates future cuts on empty history',async()=>{
  const store=await NativeEntityStore.open();
  const fields:EntityPut['fields']=[
    {attribute:'s',value:{tag:'str',value:'é🙂'}},{attribute:'b',value:{tag:'bool',value:false}},
    {attribute:'i',value:i64(minimum)},{attribute:'f',value:{tag:'f64',value:-Number.MIN_VALUE}},
    {attribute:'r',value:{tag:'ref',value:'anchor'}},{attribute:'d',value:{tag:'datetime',value:1234.5}},
    {attribute:'j',value:{tag:'json',value:'{ "emoji":"🙂","order":1 }'}},
    {attribute:'z',value:{tag:'blob',value:'opaque:é🙂',mimeType:'text/plain',size:10}},
  ];
  try{
    await store.defineSchema('schema cuts version 1 {entity Anchor {name:text required;} entity Row {s:text;b:boolean;i:int64;f:float64;r:ref_value(Anchor);d:datetime;j:json;z:blob;}}');
    await assert.rejects(store.queryCuts(program,{cuts:[{validAt:0n,knownAt:1n}]}),/TD_E_QUERY_INPUT/);
    await store.put({...row('anchor',0n,5n,0n),type:'Anchor',fields:[{attribute:'name',value:{tag:'str',value:'anchor'}}]});
    await store.put({...row('subject',0n,5n,0n),fields});
    const typed="answer(?s,?b,?i,?f,?r,?d,?j,?z) :- triple('subject','s',?s),triple('subject','b',?b),triple('subject','i',?i),triple('subject','f',?f),triple('subject','r',?r),triple('subject','d',?d),triple('subject','j',?j),triple('subject','z',?z).";
    const values=fields.map(({value})=>value.tag==='blob'?{tag:'blob',value:value.value}:value);
    assert.deepEqual(await store.queryCuts(typed,{cuts:[{validAt:0n},{validAt:5n}]}),[
      {validAt:0n,position:2n,rows:[values]},answer(5n,2n),
    ]);
  }finally{await store.close();}
});

test('wide escaped output is refused by the shared pre-encoding budget',async()=>{
  const store=await NativeEntityStore.open({readers:1});
  const escaped=JSON.stringify({value:'\\'.repeat(1740)});
  try{
    await store.defineSchema('schema cuts version 1 {entity Row {j:json;}}');
    for(let batch=0;batch<50;batch++){
      await store.batch({schema:'cuts',version:1,commandId:'seed-'+batch,members:Array.from({length:4},(_,index)=>({
        operation:'put',type:'Row',entityId:'row-'+batch+'-'+index,validFrom:0n,validTo:2n,
        fields:[{attribute:'j',value:{tag:'json',value:escaped}}],
      }))});
    }
    const wide="answer(?e,?v) :- triple(?e,'j',?v).";
    const cuts=Array.from({length:16},()=>({validAt:0n}));
    await assert.rejects(store.queryCuts(wide,{cuts,timeoutMs:10000}),/TD_E_QUERY_MULTI_LIMIT.*pre-encoding admission/);
    assert.equal((await store.queryCuts(wide,{cuts:[cuts[0]!]}))[0]?.rows.length,200);
    assert.deepEqual(store.readerStats(),{capacity:1,available:1,active:0,waiting:0});
  }finally{await store.close();}
});

test('an in-flight multi-cut abort retires its control and releases the reader',{timeout:8000},async()=>{
  const store=await NativeEntityStore.open({readers:1});
  try{
    await store.defineSchema('schema cuts version 1 {entity Row {n:int64 many;}}');
    await store.putRecord({schema:'cuts',version:1,type:'Row',entityId:'subject',commandId:'seed',
      record:'{'+Array.from({length:4096},(_,index)=>'n='+index+';').join('')+'}',validFrom:0n,validTo:5n});
    const abort=new AbortController();
    let active=0;
    const timer=setTimeout(()=>{active=store.readerStats().active;abort.abort();},30);
    try{
      const cross="answer('hit') :- triple('subject','n',?a),triple('subject','n',?b).";
      await assert.rejects(store.queryCuts(cross,{cuts:[{validAt:0n},{validAt:1n}],
        maxWork:25000000,signal:abort.signal}),/TD_E_CANCELED/);
    }finally{clearTimeout(timer);}
    assert.equal(active,1);
    assert.deepEqual(await store.queryCuts(program,{cuts:[{validAt:0n}]}),[answer(0n,1n)]);
    assert.deepEqual(store.readerStats(),{capacity:1,available:1,active:0,waiting:0});
  }finally{await store.close();}
});
