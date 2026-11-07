import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NativeEntityStore} from './native-entity.js';
import {openAuditedPort} from './native-test-fixture.js';
import type {EntityPut} from './native-entity.js';

const maximum=9223372036854775807n;
const str=(value:string)=>({tag:'str' as const,value});
const i64=(value:bigint)=>({tag:'i64' as const,value});
const bool=(value:boolean)=>({tag:'bool' as const,value});
const entity=(type:string,entityId:string,commandId:string,validFrom:bigint,fields:EntityPut['fields'],validTo=maximum):EntityPut=>({
  schema:'lookups',version:1,type,entityId,commandId,validFrom,validTo,fields,
});
const feature=(commandId:string,from:bigint,to:bigint,value:bigint)=>entity('Feature','customer',commandId,from,
  [{attribute:'balance',value:i64(value)}],to);
const prediction=(id:string,commandId:string,from:bigint,valid:bigint,known:bigint,label?:boolean,customer='customer')=>
  entity('Prediction',id,commandId,from,[
    {attribute:'customer',value:str(customer)},{attribute:'feature_valid',value:i64(valid)},
    {attribute:'feature_known',value:i64(known)},...(label===undefined?[]:[{attribute:'label',value:bool(label)}]),
  ]);
const driver="answer(?customer,?valid,?known,?prediction,?label) :- triple(?prediction,'customer',?customer),triple(?prediction,'feature_valid',?valid),triple(?prediction,'feature_known',?known),triple(?prediction,'label',?label).";

test('correlated lookup joins two feature cuts and independently visible labels',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  const outer={attribute:'balance',validAt:30n};
  try{
    await store.defineSchema('schema lookups version 1 {entity Feature {balance:int64;} entity Prediction {customer:text;feature_valid:int64;feature_known:int64;label:boolean;}}');
    assert.equal((await store.put(feature('ten',0n,10n,10n))).position,1n);
    assert.equal((await store.put(prediction('first','predict-first',10n,5n,1n))).position,2n);
    assert.equal((await store.patch(feature('twenty',0n,10n,20n))).position,3n);
    assert.equal((await store.patch(feature('future',10n,maximum,99n))).position,4n);
    assert.equal((await store.put(prediction('second','predict-second',12n,10n,4n,false))).position,5n);
    assert.equal((await store.patch(prediction('first','label-first',20n,5n,1n,true))).position,6n);
    assert.deepEqual((await store.queryLookupAt(driver,{...outer,knownAt:4n})).rows,[]);
    assert.deepEqual((await store.queryLookupAt(driver,{...outer,knownAt:5n})).rows,[[str('second'),bool(false),i64(99n)]]);
    const expected=[[str('first'),bool(true),i64(10n)],[str('second'),bool(false),i64(99n)]];
    const result=await store.queryLookupAt(driver,outer);
    assert.deepEqual(result,{position:6n,route:'sql',reason:'owned_temporal_lookup',counters:null,rows:expected});
    assert.deepEqual((await store.queryLookupAt(driver,{...outer,validAt:19n})).rows,expected.slice(1));
    assert.deepEqual((await store.queryScalable("answer(?v) :- triple('customer','balance',?v).",
      {validAt:5n,knownAt:6n})).rows,[[i64(20n)]]);
    await assert.rejects(store.queryLookupAt(driver,{...outer,maxCandidates:1}),/TD_E_QUERY_LOOKUP_LIMIT/);
    await assert.rejects(store.queryLookupAt(driver,{...outer,maxInputFacts:10}),/TD_E_QUERY_LOOKUP_LIMIT/);
    assert.deepEqual((await store.queryLookupAt(driver,outer)).rows,expected);
  }finally{await store.close();}
});

test('lookup admits relevant per-entity envelopes and keeps exact endpoint and fanout gates',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  const outer={attribute:'balance',validAt:30n};
  try{
    await store.defineSchema('schema lookups version 1 {entity Feature {balance:int64;} entity Prediction {customer:text;feature_valid:int64;feature_known:int64;label:boolean;}}');
    const other=await store.put({...feature('other-feature',100n,110n,101n),entityId:'other'});
    const oldest=await store.put(feature('oldest',5n,10n,10n));
    await store.patch(feature('old-20',5n,10n,20n));
    await store.patch(feature('old-30',5n,10n,30n));
    const left=await store.patch(feature('left',5n,10n,40n));
    await store.patch(feature('expires-at-min-valid',0n,5n,90n));
    const right=await store.patch(feature('right',10n,20n,60n));
    await store.patch(feature('starts-after-max-valid',20n,30n,91n));
    await store.patch(feature('starts-after-max-known',5n,10n,92n));
    await store.put(prediction('narrow-left','driver-left',30n,5n,left.position,false));
    await store.put(prediction('narrow-right','driver-right',30n,10n,right.position,true));
    const last=await store.put(prediction('other-prediction','driver-other',30n,100n,other.position,true,'other'));

    // Customer has two eligible versions for two drivers. The other
    // entity's earlier K and later V must not widen the customer's envelope.
    const expected=[[str('narrow-left'),bool(false),i64(40n)],
      [str('narrow-right'),bool(true),i64(60n)],[str('other-prediction'),bool(true),i64(101n)]];
    const narrow=await store.queryLookupAt(driver,{...outer,maxInputFacts:15,maxCandidates:5});
    assert.equal(narrow.position,last.position);
    assert.equal(narrow.reason,'owned_temporal_lookup');
    assert.deepEqual(narrow.rows,expected);
    await assert.rejects(store.queryLookupAt(driver,{...outer,maxInputFacts:14,maxCandidates:5}),/TD_E_QUERY_LOOKUP_LIMIT/);
    await assert.rejects(store.queryLookupAt(driver,{...outer,maxInputFacts:15,maxCandidates:4}),/TD_E_QUERY_LOOKUP_LIMIT/);

    // Widen only the customer's K envelope. Five versions by three drivers
    // plus one other pair still require admission for sixteen candidates.
    const widened=await store.put(prediction('early','driver-early',30n,5n,oldest.position,false));
    await assert.rejects(store.queryLookupAt(driver,{...outer,maxInputFacts:22,maxCandidates:5}),/TD_E_QUERY_LOOKUP_LIMIT/);
    await assert.rejects(store.queryLookupAt(driver,{...outer,maxInputFacts:22,maxCandidates:15}),/TD_E_QUERY_LOOKUP_LIMIT/);
    const full=await store.queryLookupAt(driver,{...outer,maxInputFacts:22,maxCandidates:16});
    assert.equal(full.position,widened.position);
    assert.deepEqual(full.rows,[[str('early'),bool(false),i64(10n)],...expected]);
    assert.deepEqual((await store.queryLookupAt(driver,{...outer,knownAt:last.position,
      maxInputFacts:15,maxCandidates:5})).rows,expected);
  }finally{await store.close();}
});

test('lookup validates every driver row even when feature history is absent',async()=>{
  const store=await NativeEntityStore.open({readers:1});
  const outer={attribute:"quoted'attribute",validAt:0n};
  try{
    await store.defineSchema('schema lookups version 1 {entity Feature {balance:int64;}}');
    await store.put(feature('ten',0n,10n,10n));
    const driver=(entity:string,valid:string,known:string)=>
      `answer(${entity},${valid},${known}) :- triple('customer','balance',?v).`;
    for(const [entity,valid,known] of [
      ['123','0','1'],["'absent'","'0'",'1'],["'absent'",'0','2'],["'absent'",'0','-1'],["'absent'",String(maximum),'1'],
    ]){
      await assert.rejects(store.queryLookupAt(driver(entity!,valid!,known!),outer),/TD_E_QUERY_INPUT/);
    }
    await assert.rejects(store.queryLookupAt("answer('customer',0,1).",outer),/TD_E_QUERY_LOOKUP_UNSUPPORTED/);
    assert.deepEqual((await store.queryLookupAt(driver("'absent'",'0','1'),outer)).rows,[]);
    const abort=new AbortController();abort.abort();
    await assert.rejects(store.queryLookupAt(driver("'customer'",'0','1'),{...outer,signal:abort.signal}),/TD_E_CANCELED/);
    assert.deepEqual((await store.queryLookupAt(driver("'customer'",'0','1'),{...outer,attribute:'balance'})).rows,[[i64(10n)]]);
    assert.deepEqual(store.readerStats(),{capacity:1,available:1,active:0,waiting:0});
  }finally{await store.close();}
});

test('opposing cuts count an envelope-only feature without returning it',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  const outer={attribute:'balance',validAt:30n};
  try{
    await store.defineSchema('schema lookups version 1 {entity Feature {balance:int64;} entity Prediction {customer:text;feature_valid:int64;feature_known:int64;label:boolean;}}');
    const high=await store.put(feature('high',10n,11n,20n));
    const middle=await store.patch(feature('middle',5n,10n,99n));
    const removed=await store.patch({...feature('remove-middle',5n,10n,99n),fields:[]});
    const low=await store.patch(feature('low',0n,1n,10n));
    await store.put(prediction('high-old','predict-high',30n,10n,high.position,false));
    const last=await store.put(prediction('low-new','predict-low',30n,0n,low.position,true));

    const ghost=(await store.history('customer')).find(row=>row.value.tag==='i64'&&row.value.value===99n);
    assert.ok(ghost);
    assert.deepEqual([ghost.validFrom,ghost.validTo,ghost.txFrom,ghost.txTo],
      [5n,10n,middle.position,removed.position]);
    assert.ok(ghost.validFrom<=10n && 0n<ghost.validTo &&
      ghost.txFrom<=low.position && high.position<ghost.txTo);
    for(const [valid,known] of [[0n,low.position],[10n,high.position]] as const){
      assert.ok(!(ghost.validFrom<=valid && valid<ghost.validTo && ghost.txFrom<=known && known<ghost.txTo));
    }

    // Eight driver facts plus three retained envelope features cost eleven
    // inputs. Three features times two drivers cost six possible pairs.
    const expected=[[str('high-old'),bool(false),i64(20n)],[str('low-new'),bool(true),i64(10n)]];
    const options={...outer,knownAt:last.position,maxInputFacts:11,maxCandidates:6};
    assert.deepEqual((await store.queryLookupAt(driver,options)).rows,expected);
    await assert.rejects(store.queryLookupAt(driver,{...options,maxInputFacts:10}),/TD_E_QUERY_LOOKUP_LIMIT/);
    await assert.rejects(store.queryLookupAt(driver,{...options,maxCandidates:5}),/TD_E_QUERY_LOOKUP_LIMIT/);
    assert.deepEqual((await store.queryLookupAt(driver,options)).rows,expected);

    // A visible driver can request K=0 even though every retained feature was
    // created later. Both the negative and zero valid points return empty.
    for(const valid of [-1n,0n]){
      const atZero=`answer('customer',${valid},0) :- triple('high-old','customer',?customer).`;
      assert.deepEqual((await store.query(atZero,{validAt:30n,knownAt:last.position})).rows,
        [[str('customer'),i64(valid),i64(0n)]]);
      assert.deepEqual((await store.queryLookupAt(atZero,{...outer,knownAt:last.position,
        maxInputFacts:1,maxCandidates:1})).rows,[]);
    }
  }finally{await store.close();}
});

test('empty temporal lookup still validates the outer cut and audited owner',async()=>{
  const port=await openAuditedPort();
  const query=(known:bigint)=>port.runNative({name:'lookup_owner_check',params:[],
    sql:"PRAGMA td_query_store_lookup_v1('answer(''absent'',0,0) :- triple(?e,''empty'',?v).','balance',0,"
      +known+",100,100,0)"});
  try{
    assert.deepEqual(await query(0n),[[0n,'sql','owned_temporal_lookup',null,null,null,null]]);
    await assert.rejects(query(1n),/TD_E_QUERY_INPUT/);
    await port.run({name:'invalidate_lookup_fixture',sql:'SELECT 1',params:[]});
    await assert.rejects(query(0n),/TD_E_OWNER/);
    await port.activateOwnership();
    assert.deepEqual(await query(0n),[[0n,'sql','owned_temporal_lookup',null,null,null,null]]);
  }finally{await port.close();}
});
