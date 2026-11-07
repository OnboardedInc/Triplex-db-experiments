import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NativeEntityStore } from './native-entity.js';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
const INF=9223372036854775807n;
const schema='schema joins version 1 {entity Row {n:int64 many; name:text; edge:text many; b:boolean; f:float64;}}';
const put=(commandId:string,entityId:string,record:string)=>({schema:'joins',version:1,type:'Row',entityId,commandId,record,validFrom:0n,validTo:INF});
async function fixture(){
  const store=await NativeEntityStore.open();await store.defineSchema(schema);
  await store.putRecord(put('a','a','{n=1;n=2;name="a";edge="b";edge="c";b=false;f=f64("0000000000000001");}'));
  await store.putRecord(put('b','b','{n=2;name="β";edge="c";b=true;f=f64("3ff0000000000000");}'));
  await store.putRecord(put('c','c','{n=3;name="c";edge="a";}'));
  return store;
}
async function same(store:NativeEntityStore,program:string,options:{knownAt?:bigint;validAt?:bigint}={}){
  const sql=await store.query(program,{validAt:0n,...options,forceNative:false});
  const native=await store.query(program,{validAt:0n,...options,forceNative:true});
  assert.equal(sql.route,'sql',program);assert.equal(sql.reason,'proved_edb_join');assert.equal(sql.counters,null);
  assert.deepEqual(sql.rows,native.rows,program);assert.equal(sql.position,native.position);
  return sql;
}

test('native SQL EAV joins preserve typed bindings, repeated variables, empty/cartesian/path joins and projection sets',async()=>{
  const store=await fixture();
  try{
    const programs=[
      "answer(?e,?n) :- triple(?e,'n',?n),triple(?e,'name',?s).",
      "answer(?s) :- triple(?e,'name',?s),triple(?e,'n',?n).",
      "answer(?b,?v) :- triple(?a,'edge',?b),triple(?b,'n',?v).",
      "answer(?a,?c) :- triple(?a,'edge',?b),triple(?b,'edge',?c),triple(?c,'name',?s).",
      "answer(?a,?b,?c) :- triple(?a,'edge',?b),triple(?b,'edge',?c),triple(?c,'edge',?a).",
      "answer(?e) :- triple(?e,'name',?e),triple(?e,'n',?n).",
      "answer(?e,?v) :- triple(?e,'n',2),triple(?e,'f',?v).",
      "answer(?e) :- triple(?e,'b',false),triple(?e,'n',?n).",
      "answer(?e) :- triple(?e,'n',2.0),triple(?e,'name',?s).",
      "answer(?a,?b) :- triple('a','n',?a),triple('b','n',?b).",
      "answer('one') :- triple(?e,'n',?n),triple(?e,'name',?s).",
      "answer(?e,?e) :- triple(?e,'n',?n),triple(?e,'n',?n).",
      "answer(?e,?a) :- triple(?e,?a,?v),triple(?e,'n',?n).",
      "answer(?v) :- triple('a','name','a'),triple('c','n',?v).",
      "answer('yes') :- triple('a','name','a'),triple('c','name','c').",
      "answer(?a,?d) :- triple(?a,'edge',?b),triple(?b,'edge',?c),triple(?c,'edge',?d),triple(?d,'name',?s).",
    ];
    for(const program of programs)await same(store,program);
  }finally{await store.close();}
});

test('all reorderings of a three-atom conjunction agree with native shared-variable/index choice',async()=>{
  const store=await fixture();
  const atoms=["triple(?e,'n',?n)","triple(?e,'name',?s)","triple(?e,'b',true)"];
  try{
    for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]])
      assert.deepEqual((await same(store,'answer(?e,?s) :- '+order.map(i=>atoms[i]).join(',')+'.')).rows,
        [[{tag:'str',value:'b'},{tag:'str',value:'β'}]]);
  }finally{await store.close();}
});

test('join proof includes rejected indexed candidates and never widens native fact/work/round budgets',async()=>{
  const store=await NativeEntityStore.open();
  const program="answer(?e) :- triple(?e,'n',1),triple(?e,'name','Y').";
  try{
    await store.defineSchema(schema);
    await store.putRecord(put('a','a','{n=1;name="X";}'));
    await store.putRecord(put('b','b','{n=2;name="Y";}'));
    await store.putRecord(put('c','c','{n=1;name="Y";}'));
    for(const maxWork of [1,3,5,6,20,21,1000]){
      const attempt=async(forceNative:boolean)=>{
        try{return {value:await store.query(program,{validAt:0n,maxWork,forceNative})};}
        catch(error){assert.match(String(error),/max_work/);return {error:true};}
      };
      const auto=await attempt(false),native=await attempt(true);
      assert.equal('error'in auto,'error'in native,'work='+maxWork);
      if('value'in auto&&'value'in native){
        assert.deepEqual(auto.value!.rows,native.value!.rows);
        assert.ok(native.value!.counters!.work<=BigInt(maxWork));
      }
    }
    const narrow=await store.query(program,{validAt:0n,maxFacts:7,forceNative:false});
    assert.equal(narrow.route,'native');assert.equal(narrow.reason,'edb_join_budget_unproved');
    assert.deepEqual(narrow.rows,[[{tag:'str',value:'c'}]]);
    await same(store,program);
    assert.equal((await store.query(program,{validAt:0n,maxRounds:1,forceNative:false})).route,'native');
  }finally{await store.close();}
});

test('unproved Cartesian joins gate SQL inputs before falling back to a failing native budget',{timeout:5000},async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);await store.putRecord(put('many','e','{'+Array.from({length:600},(_,n)=>'n='+n+';').join('')+'}'));
    const program="answer(?a) :- triple('e','n',?a),triple('e','n',?b),triple('e','n',?c),triple('e','n',?d).";
    await assert.rejects(store.query(program,{validAt:0n,maxWork:1,forceNative:false}),/max_work/);
    assert.equal((await store.putRecord(put('healthy','e','{n=7;}'))).position,2n);
    assert.deepEqual((await store.query("answer(?v) :- triple('e','n',?v).",{validAt:0n})).rows,[[{tag:'i64',value:7n}]]);
  }finally{await store.close();}
});

test('native cost preference refreshes after writes and cannot replace actual resource admission',async()=>{
  const port=await NativeDuckDBPort.open();
  try{
    const rows=await port.run({name:'cost_threshold',sql:'SELECT td_prefer_native_v1(n) FROM (VALUES (0::BIGINT),(16383),(16384)) t(n)',params:[]});
    assert.deepEqual(rows,[[true],[true],[false]]);
    await assert.rejects(port.run({name:'cost_invalid',sql:'SELECT td_prefer_native_v1(-1)',params:[]}),/TD_E_QUERY_INPUT/);
  }finally{await port.close();}
  const store=await NativeEntityStore.open();
  const program="answer(?e) :- triple(?e,'name',?name).";
  try{
    await store.defineSchema(schema);await store.putRecord(put('small','first','{name="first";}'));
    await store.putRecord(put('small-two','second','{name="second";}'));
    const small=await store.query(program,{validAt:0n});
    assert.equal(small.route,'native');assert.equal(small.reason,'preferred_native');
    assert.deepEqual((await store.query(program,{validAt:0n,forceNative:false})).rows,small.rows);
    assert.equal((await store.query(program,{validAt:0n,forceNative:true})).reason,'forced_native');
    await assert.rejects(store.query(program,{validAt:0n,maxWork:1}),/max_work/);
    const fields=Array.from({length:4095},(_,i)=>'n='+i+';').join('');
    for(let i=0;i<4;i++)await store.putRecord(put('large-'+i,'e'+i,'{name="large";'+fields+'}'));
    const large=await store.query(program,{validAt:0n});
    assert.equal(large.route,'sql');assert.equal(large.reason,'proved_single_atom');
    assert.deepEqual(large.rows,(await store.query(program,{validAt:0n,forceNative:true})).rows);
    await assert.rejects(store.query(program,{validAt:0n,maxWork:1}),/max_work/);
    assert.deepEqual((await store.query(program,{validAt:0n})).rows,large.rows);
  }finally{await store.close();}
});

test('prepared join queries refresh temporal cuts and original schema meaning after type evolution',async()=>{
  const store=await NativeEntityStore.open();
  const program="answer(?e,?name) :- triple(?e,'edge',?target),triple(?target,'name',?name).";
  try{
    await store.defineSchema(schema);
    await store.putRecord({...put('e','e','{edge="f";}'),validTo:5n});
    assert.deepEqual((await same(store,program,{validAt:3n})).rows,[]);
    await store.putRecord({...put('f','f','{name="old";}'),validFrom:3n,validTo:8n});
    assert.deepEqual((await same(store,program,{validAt:3n})).rows,[[{tag:'str',value:'e'},{tag:'str',value:'old'}]]);
    assert.deepEqual((await same(store,program,{validAt:5n})).rows,[]);
    await store.defineSchema('schema joins version 2 {entity Row {name:boolean;}}');
    await store.putRecord({...put('f2','f','{name=true;}'),version:2,validFrom:3n,validTo:8n});
    assert.deepEqual((await same(store,program,{validAt:3n})).rows,[[{tag:'str',value:'e'},{tag:'bool',value:true}]]);
    assert.deepEqual((await same(store,program,{validAt:3n,knownAt:2n})).rows,[[{tag:'str',value:'e'},{tag:'str',value:'old'}]]);
  }finally{await store.close();}
});
