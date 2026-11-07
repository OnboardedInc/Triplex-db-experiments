import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NativeEntityStore} from './native-entity.js';
import type {EntityPut} from './native-entity.js';

const str=(value:string)=>({tag:'str' as const,value});
const i64=(value:bigint)=>({tag:'i64' as const,value});
const schema='schema rules version 1 {entity Row {left:text;right:text;amount:int64;}}';
const put=(entityId:string,left:string,right:string,amount?:bigint):EntityPut=>({
  schema:'rules',version:1,type:'Row',entityId,commandId:entityId,validFrom:0n,validTo:10n,
  fields:[{attribute:'left',value:str(left)},{attribute:'right',value:str(right)},
    ...(amount===undefined?[]:[{attribute:'amount',value:i64(amount)}])],
});
const left="answer(?v) :- triple(?e,'left',?v).";
const right="answer(?v) :- triple(?e,'right',?v).";
const amount="answer(?v) :- triple(?e,'amount',?v).";

test('two to four EAV branches preserve complete typed set identity at exact cuts',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  try{
    await store.defineSchema(schema);
    await store.put(put('a','x','x',7n));
    await store.put(put('b','x','y',8n));
    await store.patch({...put('b','x','y',8n),commandId:'clear-middle',validFrom:2n,validTo:4n,fields:[]});
    const program=[left,right,amount,"answer(?v) :- triple('a','left',?v)."].join(' ');
    for(const [knownAt,validAt,values] of [
      [0n,2n,[]],[1n,2n,[str('x'),i64(7n)]],[2n,2n,[str('x'),str('y'),i64(7n),i64(8n)]],
      [3n,2n,[str('x'),i64(7n)]],[3n,4n,[str('x'),str('y'),i64(7n),i64(8n)]],
    ] as const){
      const options={knownAt,validAt};
      const native=await store.query(program,{...options,forceNative:true});
      const sql=await store.query(program,{...options,forceNative:false});
      const scalable=await store.queryScalable(program,options);
      assert.equal(sql.reason,'proved_edb_union');
      assert.match(scalable.reason,/owned_.*scalable_edb_union/);
      assert.deepEqual(native.rows,values.map(value=>[value]));
      for(const candidate of [sql,scalable]){
        assert.equal(candidate.position,knownAt);
        assert.deepEqual(candidate.rows,native.rows);
      }
    }
  }finally{await store.close();}
});

test('union admits possible branch rows before set reduction and retains bounded native fallback',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    await store.put(put('a','x','x'));
    const program=left+right,validAt=0n;
    await assert.rejects(store.queryScalable(program,{validAt,maxOutputRows:1}),/TD_E_QUERY_SCALE_LIMIT/);
    await assert.rejects(store.queryScalable(program,{validAt,maxIntermediateBytes:300}),/TD_E_QUERY_SCALE_LIMIT/);
    const small=await store.query(program,{validAt,maxFacts:3,forceNative:false});
    assert.equal(small.reason,'edb_union_budget_unproved');
    assert.deepEqual(small.rows,[[str('x')]]);
    assert.deepEqual((await store.queryScalable(program,{validAt,maxOutputRows:2})).rows,small.rows);
  }finally{await store.close();}
});

test('opaque filters, negation and recursive rules remain authoritative native execution',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    await store.put(put('a','x','x'));
    for(const rule of [
      "answer(?v) :- triple(?e,'right',?v),[?v='x'].",
      "answer(?v) :- triple(?e,'right',?v),!triple(?e,'left','y').",
      "answer(?v) :- answer(?v),triple('a','right',?v).",
    ]){
      await assert.rejects(store.queryScalable(left+rule,{validAt:0n}),/TD_E_QUERY_SCALE_UNSUPPORTED/);
      const result=await store.query(left+rule,{validAt:0n,forceNative:false});
      assert.equal(result.reason,'bounded_native_store');
      assert.deepEqual(result.rows,[[str('x')]]);
    }
  }finally{await store.close();}
});
