import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {NativeEntityStore} from './native-entity.js';
import type {EntityPut} from './native-entity.js';
import type {NativeQueryValue} from './native-schema.js';

const program="answer(?v) :- triple(?e,'value',?v).";
const definition='schema intervals version 1 {entity Row {value:int64;}}';
const field=(value:bigint)=>({attribute:'value',value:{tag:'i64' as const,value}});
const row=(entityId:string,validFrom:bigint,validTo:bigint,value:bigint):EntityPut=>({
  schema:'intervals',version:1,type:'Row',entityId,commandId:entityId,validFrom,validTo,fields:[field(value)],
});
const interval=(value:NativeQueryValue,validFrom:bigint,validTo:bigint)=>({values:[value],validFrom,validTo});
const i64=(value:bigint)=>({tag:'i64' as const,value});
const str=(value:string)=>({tag:'str' as const,value});
const window={validFrom:-2n,validTo:12n};
const infinity=9223372036854775807n;
const minimum=-9223372036854775808n;

test('interval answers coalesce distinct supports and preserve correction gaps and old knowledge across reopen',async()=>{
  const directory=await mkdtemp(fileURLToPath(new URL('../native-interval-query-',import.meta.url)));
  const options={database:join(directory,'facts.duckdb'),readers:2};
  const store=await NativeEntityStore.open(options);
  const primary=row('primary',0n,10n,1n);
  const alternate=row('alternate',2n,5n,1n);
  const patch={...primary,commandId:'remove-middle',validFrom:4n,validTo:7n,fields:[]};
  const expected=[[],[interval(i64(1n),0n,10n)],[interval(i64(1n),0n,10n)],
    [interval(i64(1n),0n,5n),interval(i64(1n),7n,10n)]];
  try{
    await store.defineSchema(definition);
    assert.equal((await store.put(primary)).position,1n);
    assert.equal((await store.put(alternate)).position,2n);
    const receipt=await store.patch(patch);
    assert.equal(receipt.position,3n);
    assert.deepEqual(await store.patch(patch),receipt);
    for(const [index,intervals] of expected.entries()){
      const knownAt=BigInt(index);
      const result=await store.queryIntervals(program,{...window,knownAt});
      assert.deepEqual(result,{position:knownAt,intervals});
      for(let validAt=window.validFrom;validAt<window.validTo;validAt++){
        const point=await store.query(program,{knownAt,validAt,forceNative:true});
        assert.deepEqual(result.intervals.filter(item=>item.validFrom<=validAt&&validAt<item.validTo).map(item=>item.values),point.rows);
      }
    }
    assert.deepEqual(await store.queryIntervals(program,{validFrom:3n,validTo:8n}),
      {position:3n,intervals:[interval(i64(1n),3n,5n),interval(i64(1n),7n,8n)]});
  }finally{await store.close();}
  const reopened=await NativeEntityStore.open(options);
  try{
    assert.deepEqual(await reopened.queryIntervals(program,window),{position:3n,intervals:expected[3]});
    assert.equal((await reopened.receipt(patch.commandId))?.position,3n);
  }finally{await reopened.close();}
});

test('interval queries retain exact scalar carriers, blob identities and int64 endpoints',async()=>{
  const store=await NativeEntityStore.open();
  const fields:EntityPut['fields']=[
    {attribute:'s',value:str('é🙂')},{attribute:'b',value:{tag:'bool',value:false}},
    {attribute:'i',value:i64(minimum)},{attribute:'f',value:{tag:'f64',value:-Number.MIN_VALUE}},
    {attribute:'r',value:{tag:'ref',value:'target'}},{attribute:'d',value:{tag:'datetime',value:1234.5}},
    {attribute:'j',value:{tag:'json',value:'{ "order":1,"emoji":"🙂" }'}},
    {attribute:'z',value:{tag:'blob',value:'opaque:é🙂',mimeType:'text/plain',size:10}},
  ];
  try{
    await store.defineSchema('schema intervals version 1 {entity Anchor {name:text required;} entity Row {s:text;b:boolean;i:int64;f:float64;r:ref_value(Anchor);d:datetime;j:json;z:blob;}}');
    await store.put({...row('target',minimum,infinity,0n),type:'Anchor',fields:[{attribute:'name',value:str('target')}]});
    await store.put({...row('subject',minimum,infinity,0n),fields});
    const typed="answer(?a,?v) :- triple('subject',?a,?v).";
    const result=await store.queryIntervals(typed,{validFrom:minimum,validTo:infinity});
    assert.equal(result.position,2n);
    assert.equal(result.intervals.length,8);
    for(const [index,item] of [...result.intervals].sort((left,right)=>String(left.values[0]?.value).localeCompare(String(right.values[0]?.value))).entries()){
      const expected=[...fields].sort((left,right)=>left.attribute.localeCompare(right.attribute))[index]!;
      assert.deepEqual(item,{validFrom:minimum,validTo:infinity,
        values:[str(expected.attribute),expected.value.tag==='blob'?{tag:'blob',value:expected.value.value}:expected.value]});
    }
  }finally{await store.close();}
});

test('absence and empty completed aggregates change at the exact endpoints',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  try{
    await store.defineSchema(definition);
    await store.put(row('present',2n,5n,1n));
    const options={validFrom:0n,validTo:7n};
    const counting="source(?e,?v) :- triple(?e,'value',?v). answer(count()) :- source(?e,?v).";
    const [missing,count,write]=await Promise.all([
      store.queryIntervals("answer('missing') :- !triple('present','value',1).",{...options,knownAt:1n}),
      store.queryIntervals(counting,options),
      store.put(row('adjacent',5n,7n,2n)),
    ]);
    assert.deepEqual(missing,{position:1n,intervals:[interval(str('missing'),0n,2n),interval(str('missing'),5n,7n)]});
    assert.equal(write.position,2n);
    const before=[interval(i64(0n),0n,2n),interval(i64(1n),2n,5n),interval(i64(0n),5n,7n)];
    const after=[interval(i64(0n),0n,2n),interval(i64(1n),2n,7n)];
    assert.ok(count.position===1n||count.position===2n);
    assert.deepEqual(count.intervals,count.position===1n?before:after);
    assert.deepEqual(await store.queryIntervals(counting,options),{position:2n,intervals:after});
  }finally{await store.close();}
});

test('invalid cuts, segment and whole-work budgets, and cancellation leave the same reader healthy',async()=>{
  const store=await NativeEntityStore.open({readers:1});
  try{
    await store.defineSchema(definition);
    await store.put(row('bounded',2n,5n,1n));
    await assert.rejects(store.queryIntervals(program,{...window,maxSegments:2}),/TD_E_QUERY_TIMELINE_LIMIT/);
    await assert.rejects(store.queryIntervals(program,{...window,maxWork:25000000}),/TD_E_QUERY_TIMELINE_LIMIT/);
    await assert.rejects(store.queryIntervals(program,{...window,knownAt:2n}),/TD_E_QUERY_INPUT/);
    await assert.rejects(store.queryIntervals(program,{validFrom:2n,validTo:2n}),/TD_E_QUERY_INPUT/);
    const aborted=new AbortController();
    aborted.abort();
    await assert.rejects(store.queryIntervals(program,{...window,signal:aborted.signal}),/TD_E_CANCELED/);
    assert.deepEqual(await store.queryIntervals(program,window),{position:1n,intervals:[interval(i64(1n),2n,5n)]});
    assert.deepEqual(store.readerStats(),{capacity:1,available:1,active:0,waiting:0});
  }finally{await store.close();}
});
