import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NativeEntityStore} from './native-entity.js';
const schema='schema counts version 1 {entity Row {n:int64 many;s:text many;b:boolean;f:float64 many;}}';
const put=(commandId:string,entityId:string,record:string)=>({schema:'counts',version:1,type:'Row',entityId,commandId,record,validFrom:0n,validTo:9223372036854775807n});
async function same(store:NativeEntityStore,program:string,knownAt?:bigint){
  const options={validAt:0n,...(knownAt===undefined?{}:{knownAt})};
  const sql=await store.query(program,{...options,forceNative:false});
  const native=await store.query(program,{...options,forceNative:true});
  assert.equal(sql.route,'sql',program);assert.equal(sql.reason,'proved_count');assert.equal(sql.counters,null);
  assert.deepEqual(sql.rows,native.rows,program);assert.equal(sql.position,native.position);return sql;
}
test('native SQL count preserves complete source sets, typed grouping, projection and rule order',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    await store.putRecord(put('a','a','{n=1;n=1;n=2;s="a";s="é🙂";b=false;f=f64("0000000000000001");}'));
    await store.putRecord(put('b','b','{n=1;s="b";b=true;f=f64("3ff0000000000000");}'));
    const programs=[
      'answer(count()) :- triple(?e,?a,?v).',
      'answer(?a,count()) :- triple(?e,?a,?v).',
      'answer(?v,count()) :- triple(?e,?a,?v).',
      'answer(?v,?e,count()) :- triple(?e,?a,?v).',
      "source(?e,?v) :- triple(?e,'n',?v). answer(count()) :- source(?e,?v).",
      "source(?e,?v) :- triple(?e,'n',?v). answer(?v,count()) :- source(?e,?v).",
      "source(?v) :- triple(?e,'n',?v). answer(count()) :- source(?v).",
      "answer(?value,count()) :- source(?entity,?value). source(?e,?v) :- triple(?e,'n',?v).",
      "source(?v,?v,'fixed') :- triple(?e,'n',?v). answer(?fixed,?a,count()) :- source(?a,?b,?fixed).",
      "source('one') :- triple(?e,'n',?v). answer(count()) :- source(?x).",
      "source(?v) :- triple(?v,'s',?v). answer(count()) :- source(?v).",
      "source(?v) :- triple(?e,'n',1). answer(count()) :- source(?v).",
    ];
    // The final source has an unbound head variable and must be rejected by the
    // authoritative compiler rather than silently accepted by SQL lowering.
    await assert.rejects(store.query(programs.pop()!,{validAt:0n,forceNative:false}));
    for(const p of programs)await same(store,p);
    assert.deepEqual((await same(store,programs[4]!)).rows,[[{tag:'i64',value:3n}]]);
    assert.deepEqual((await same(store,programs[6]!)).rows,[[{tag:'i64',value:2n}]]);
    assert.deepEqual((await same(store,programs[9]!)).rows,[[{tag:'i64',value:1n}]]);
  }finally{await store.close();}
});

test('empty global/grouped counts, literal rejection and original temporal/schema meaning remain native-equivalent',async()=>{
  const store=await NativeEntityStore.open();
  const p="source(?e,?v) :- triple(?e,'n',?v). answer(?v,count()) :- source(?e,?v).";
  try{
    await store.defineSchema(schema);
    assert.deepEqual((await same(store,'answer(count()) :- triple(?e,?a,?v).')).rows,[[{tag:'i64',value:0n}]]);
    assert.deepEqual((await same(store,p)).rows,[]);
    assert.deepEqual((await same(store,"source('x') :- triple(?e,'n',?v). answer(count()) :- source(?x).")).rows,[[{tag:'i64',value:0n}]]);
    await store.putRecord(put('one','e','{n=1;n=2;}'));await same(store,p);
    await store.defineSchema('schema counts version 2 {entity Row {n:text many;}}');
    await store.putRecord({...put('two','e','{n="new";}'),version:2});
    assert.deepEqual((await same(store,p)).rows,[[{tag:'str',value:'new'},{tag:'i64',value:1n}]]);
    assert.deepEqual((await same(store,p,1n)).rows,[[{tag:'i64',value:1n},{tag:'i64',value:1n}],[{tag:'i64',value:2n},{tag:'i64',value:1n}]]);
    await assert.rejects(store.query("answer(count()) :- triple(?e,'n',?v).",{validAt:0n,forceNative:false}),/TD_E_AGG_BODY/);
  }finally{await store.close();}
});

test('count proof includes source/answer facts and work, with conservative round fallback and healthy reuse',async()=>{
  const store=await NativeEntityStore.open();
  const p="source(?e,?v) :- triple(?e,'n',?v). answer(count()) :- source(?e,?v).";
  try{
    await store.defineSchema(schema);await store.putRecord(put('one','e','{n=1;n=2;n=3;}'));
    for(const limits of [{maxFacts:6},{maxFacts:7},{maxWork:6},{maxWork:7},{maxRounds:1},{maxRounds:2}]){
      const attempt=async(forceNative:boolean)=>{try{return {value:await store.query(p,{validAt:0n,...limits,forceNative})};}
        catch(error){assert.match(String(error),/max_(facts|work|rounds)/);return {error:true};}};
      const sql=await attempt(false),native=await attempt(true);assert.equal('error'in sql,'error'in native,JSON.stringify(limits));
      if('value'in sql&&'value'in native)assert.deepEqual(sql.value!.rows,native.value!.rows);
    }
    const direct='answer(count()) :- triple(?e,?a,?v).';
    const conservative=await store.query(direct,{validAt:0n,forceNative:false,maxRounds:1});
    assert.equal(conservative.reason,'count_budget_unproved');assert.deepEqual(conservative.rows,[[{tag:'i64',value:3n}]]);
    await same(store,p);
  }finally{await store.close();}
});

test('wide unproved source projection gates before construction, then falls back to the bounded native evaluator',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);await store.putRecord(put('many','e','{'+Array.from({length:4096},(_,i)=>'n='+i+';').join('')+'}'));
    const p="source(?v,'"+'x'.repeat(16384)+"') :- triple(?e,'n',?v). answer(count()) :- source(?v,?text).";
    const result=await store.query(p,{validAt:0n,forceNative:false,timeoutMs:5000});
    assert.equal(result.route,'native');assert.equal(result.reason,'count_budget_unproved');assert.deepEqual(result.rows,[[{tag:'i64',value:4096n}]]);
    assert.deepEqual(result.rows,(await store.query(p,{validAt:0n,forceNative:true})).rows);
    assert.equal((await store.putRecord(put('healthy','e','{n=7;}'))).position,2n);
  }finally{await store.close();}
});
