import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NativeEntityStore} from './native-entity.js';
import type {EntityPut} from './native-entity.js';
import type {NativeQueryValue} from './native-schema.js';

const str=(value:string)=>({tag:'str' as const,value});
const ref=(value:string)=>({tag:'ref' as const,value});
const i64=(value:bigint)=>({tag:'i64' as const,value});
const bool=(value:boolean)=>({tag:'bool' as const,value});
const fields=(attribute:string,...values:EntityPut['fields'][number]['value'][])=>values.map(value=>({attribute,value}));
const command=(type:string,entityId:string,commandId:string,fields:EntityPut['fields'],validFrom=0n,validTo=10n):EntityPut=>
  ({schema:'absence',version:1,type,entityId,commandId,fields,validFrom,validTo});

async function exact(store:NativeEntityStore,program:string,knownAt:bigint,validAt:bigint,
  expected:readonly (readonly NativeQueryValue[])[]){
  const cut={knownAt,validAt,timeoutMs:10000};
  const native=await store.query(program,{...cut,forceNative:true});
  const bounded=await store.query(program,{...cut,forceNative:false});
  const scalable=await store.queryScalable(program,cut);
  assert.equal(native.reason,'forced_native');
  assert.equal(bounded.reason,'proved_edb_anti_join');
  assert.match(scalable.reason,/^owned_(?:allcut_unique_|unique_)?scalable_anti_join$/);
  for(const result of [native,bounded,scalable]){
    assert.equal(result.position,knownAt);
    assert.deepEqual(result.rows,expected);
  }
}

test('anti membership is exact across typed values and both correction cuts',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  try{
    await store.defineSchema('schema absence version 1 {entity TextRow {member:text many;}' +
      'entity NumberRow {member:int64;} entity Link {member:ref_value(TextRow);} entity Deny {ban:text many;}}');
    const composed='é',decomposed='e\u0301';
    const program="answer(?v) :- triple(?e,'member',?v), !triple('deny','ban',?v).";
    assert.equal((await store.put(command('TextRow','item','text',
      fields('member',str('1'),str(decomposed),str('item'),str(composed))))).position,1n);
    assert.equal((await store.put(command('NumberRow','number','number',fields('member',i64(1n))))).position,2n);
    assert.equal((await store.put(command('Link','link','link',fields('member',ref('item'))))).position,3n);
    assert.equal((await store.put(command('Deny','deny','deny',fields('ban',str('1'),str('item'),str(composed))))).position,4n);
    const unchanged=[[str(decomposed)],[i64(1n)],[ref('item')]];
    await exact(store,program,3n,5n,[[str('1')],[str(decomposed)],[str('item')],[str(composed)],[i64(1n)],[ref('item')]]);
    await exact(store,program,4n,5n,unchanged);
    const correction=command('Deny','deny','correct',fields('ban',str(decomposed)),4n,7n);
    const receipt=await store.patch(correction);
    assert.equal(receipt.position,5n);
    assert.deepEqual(await store.patch(correction),receipt);
    await exact(store,program,4n,5n,unchanged);
    await exact(store,program,5n,4n,[[str('1')],[str('item')],[str(composed)],[i64(1n)],[ref('item')]]);
    await exact(store,program,5n,7n,unchanged);
    await exact(store,program,5n,10n,[]);
    await exact(store,program,0n,5n,[]);
    const computed="answer([?v+1]) :- triple('number','member',?v), !triple('deny','ban',?v).";
    const result=await store.query(computed,{validAt:0n,forceNative:false});
    assert.equal(result.reason,'bounded_native_store');
    assert.deepEqual(result.rows,[[i64(2n)]]);
    await assert.rejects(store.queryScalable(computed,{validAt:0n}),/TD_E_QUERY_SCALE_UNSUPPORTED/);
  }finally{await store.close();}
});

test('blocking one positive support preserves the set answer until the final support is blocked',async()=>{
  const store=await NativeEntityStore.open({readers:1});
  try{
    await store.defineSchema('schema absence version 1 {entity Row {member:text;blocked:boolean;}}');
    const program="answer(?v) :- triple(?e,'member',?v), !triple(?e,'blocked',true).";
    for(const entityId of ['a','b'])
      await store.put(command('Row',entityId,'seed-'+entityId,fields('member',str('same'))));
    const shared=[[str('same')]];
    await exact(store,program,2n,0n,shared);
    for(const entityId of ['a','b'])
      await store.patch(command('Row',entityId,'block-'+entityId,
        [...fields('member',str('same')),...fields('blocked',bool(true))]));
    await exact(store,program,3n,0n,shared);
    await exact(store,program,4n,0n,[]);
    await store.patch(command('Row','a','unblock-a',[...fields('member',str('same')),...fields('blocked',bool(false))]));
    await exact(store,program,5n,0n,shared);
    await exact(store,program,4n,0n,[]);
  }finally{await store.close();}
});

test('repeated variables and ground negatives retain typed keys and preconstruction bounds',async()=>{
  const store=await NativeEntityStore.open({readers:1});
  const cut={validAt:0n,timeoutMs:10000};
  try{
    await store.defineSchema('schema absence version 1 {entity Row {identity:text;block:text;pause:boolean;}}');
    for(const [entityId,identity,block] of [['a','a','z'],['b','b','b'],['c','other','c']] as const)
      await store.put(command('Row',entityId,'seed-'+entityId,
        [...fields('identity',str(identity)),...fields('block',str(block))]));
    await store.put(command('Row','d','seed-d',fields('block',str('d'))));
    const body="triple(?x,'identity',?x), !triple(?x,'block',?x)";
    const program="answer(?x,'fixed',true) :- "+body+".";
    const expected=[[str('a'),str('fixed'),bool(true)]];
    await exact(store,program,4n,0n,expected);
    for(const limits of [{maxInputFacts:6},{maxOutputRows:1},{maxIntermediateBytes:512}])
      await assert.rejects(store.queryScalable(program,{...cut,...limits}),/TD_E_QUERY_SCALE_LIMIT/);
    assert.deepEqual((await store.queryScalable(program,{...cut,maxInputFacts:7,maxOutputRows:2})).rows,expected);
    const wide='w'.repeat(400),wideProgram="answer(?x,'"+wide+"') :- "+body+".";
    await assert.rejects(store.queryScalable(wideProgram,{...cut,maxIntermediateBytes:1000}),/TD_E_QUERY_SCALE_LIMIT/);
    assert.deepEqual((await store.queryScalable(wideProgram,{...cut,maxIntermediateBytes:1300})).rows,[[str('a'),str(wide)]]);
    const fallback=await store.query(program,{...cut,forceNative:false,maxWork:5});
    assert.equal(fallback.reason,'anti_join_budget_unproved');
    assert.deepEqual(fallback.rows,expected);
    await assert.rejects(store.query(program,{...cut,forceNative:false,maxWork:4}),/max_work exceeded/);

    const ground="answer(?x) :- triple(?x,'identity',?x), !triple('switch','pause',true).";
    await store.put(command('Row','switch','off',fields('pause',bool(false))));
    await exact(store,ground,5n,0n,[[str('a')],[str('b')]]);
    await store.patch(command('Row','switch','on',fields('pause',bool(true))));
    await exact(store,ground,6n,0n,[]);
    for(const unsupported of [
      "answer(?x) :- "+body+", !triple('switch','pause',false).",
      "answer(?x) :- "+body+", [?x != 'z'].",
    ]){
      assert.equal((await store.query(unsupported,{...cut,forceNative:false})).reason,'bounded_native_store');
      await assert.rejects(store.queryScalable(unsupported,cut),/TD_E_QUERY_SCALE_UNSUPPORTED/);
    }
    await assert.rejects(store.queryScalable("answer(?x) :- triple(?x,'identity',?x), !triple(?other,'block',?x).",cut),
      /TD_E_STRAT_UNSAFE/);
    await assert.rejects(store.queryScalable(program,{...cut,knownAt:7n,validAt:10n}),/TD_E_QUERY_INPUT/);
  }finally{await store.close();}
});
