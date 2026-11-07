import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NativeEntityStore} from './native-entity.js';

const i64=(value:bigint)=>({tag:'i64',value});
const str=(value:string)=>({tag:'str',value});
const sale=(entityId:string,amount:bigint,kind:'gross'|'refund',validFrom=0n,validTo=10n)=>({
  schema:'computed',version:1,type:'Entry',entityId,commandId:entityId,validFrom,validTo,
  record:"{kind="+JSON.stringify(kind)+";amount="+amount+";}",
});
const net=[
  "net(?id,?amount) :- triple(?id,'kind','gross'),triple(?id,'amount',?amount).",
  "net(?id,[0-?amount]) :- triple(?id,'kind','refund'),triple(?id,'amount',?amount).",
  "answer(sum_i64(?signed)) :- net(?id,?signed).",
].join(' ');

test('computed signed refund heads feed an exact sum at historical and corrected cuts',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  try{
    await store.defineSchema('schema computed version 1 {entity Entry {amount:int64 required;kind:text required;}}');
    assert.equal((await store.putRecord(sale('gross-1',100n,'gross'))).position,1n);
    assert.equal((await store.putRecord(sale('refund-1',30n,'refund',2n,7n))).position,2n);
    assert.equal((await store.putRecord(sale('gross-2',80n,'gross',4n,10n))).position,3n);
    assert.equal((await store.patchRecord({...sale('refund-1',50n,'refund',3n,5n),commandId:'correction'})).position,4n);
    for(const [knownAt,validAt,expected] of [
      [2n,1n,100n],[2n,2n,70n],[3n,4n,150n],[4n,3n,50n],[4n,4n,130n],[4n,5n,150n],[4n,7n,180n],
    ] as const){
      const result=await store.query(net,{knownAt,validAt,timeoutMs:5000});
      assert.equal(result.position,knownAt);
      assert.equal(result.route,'native');
      assert.deepEqual(result.rows,[[i64(expected)]]);
      assert.ok(result.counters&&result.counters.work>0n);
    }
    const latest=await store.query(net,{validAt:4n});
    assert.equal(latest.position,4n);
    assert.equal(latest.route,'native');
    assert.deepEqual(latest.rows,[[i64(130n)]]);
  }finally{await store.close();}
});

test('computed scan, join and aggregate source stay on the bounded native route',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema('schema computed version 1 {entity Entry {amount:int64 required;kind:text required;}}');
    await store.putRecord(sale('event',5n,'gross'));
    for(const [program,expected] of [
      ["answer([0-?n]) :- triple('event','amount',?n).",[[i64(-5n)]]],
      ["answer(?id,[0-?n]) :- triple(?id,'amount',?n),triple(?id,'kind','gross').",[[str('event'),i64(-5n)]]],
      ["source(?id,[0-?n]) :- triple(?id,'amount',?n). answer(sum_i64(?v)) :- source(?id,?v).",[[i64(-5n)]]],
    ] as const){
      const result=await store.query(program,{validAt:0n,forceNative:false});
      assert.equal(result.route,'native');
      assert.equal(result.reason,'bounded_native_store');
      assert.deepEqual(result.rows,expected);
      await assert.rejects(store.queryScalable(program,{validAt:0n}),/TD_E_QUERY_SCALE_UNSUPPORTED/);
      await assert.rejects(store.queryScalable(program,{validAt:0n,timeoutMs:5000}),/TD_E_QUERY_SCALE_UNSUPPORTED/);
    }
  }finally{await store.close();}
});

test('computed heads require relational safety and reject value-generating recursion',async()=>{
  const store=await NativeEntityStore.open();
  try{
    const query=(program:string)=>store.query(program,{validAt:0n});
    for(const [program,error] of [
      ['input(1). answer([0-?other]) :- input(?n).',/TD_E_EXPR_UNBOUND/],
      ['answer([1+2]).',/TD_E_EXPR_UNBOUND/],
      ['input(1). answer(?signed) :- input(?n),[?signed=0-?n].',/TD_E_STRAT_UNSAFE/],
      ['input(1). answer([?n=1]) :- input(?n).',/TD_E_PROGRAM_SYNTAX/],
      ['input(1). answer([0-?n],count()) :- input(?n).',/TD_E_AGG_DESCRIPTOR/],
      ['path(1). path([?n+1]) :- path(?n). answer(?n) :- path(?n).',/TD_E_EXPR_RECURSIVE/],
      ['left(1). right([?n+1]) :- left(?n). left(?n) :- right(?n). answer(?n) :- left(?n).',/TD_E_EXPR_RECURSIVE/],
    ] as const)await assert.rejects(query(program),error);
    const independent='edge(1,2). edge(2,3). path(?a,?b) :- edge(?a,?b). '+
      'path(?a,?c) :- path(?a,?b),edge(?b,?c). answer([?b-?a]) :- path(?a,?b).';
    assert.deepEqual((await query(independent)).rows,[[i64(1n)],[i64(2n)]]);
  }finally{await store.close();}
});

test('computed heads reuse checked arithmetic, work limits and eager body filters',async()=>{
  const store=await NativeEntityStore.open();
  try{
    const query=(program:string,maxWork?:number)=>store.query(program,{validAt:0n,...(maxWork===undefined?{}:{maxWork})});
    for(const [program,error] of [
      ["input('text'). answer([0-?n]) :- input(?n).",/TD_E_EXPR_TYPE/],
      ['input(-9223372036854775808). answer([0-?n]) :- input(?n).',/TD_E_EXPR_OVERFLOW/],
      ['input(1). answer([?n/0]) :- input(?n).',/TD_E_EXPR_DIV_ZERO/],
      ['input(1). answer([?n+1]) :- input(?n),[1=2],[?n/0=1].',/TD_E_EXPR_DIV_ZERO/],
      ['input(1). answer(['+ '1+'.repeat(32)+'?n]) :- input(?n).',/TD_E_EXPR_LIMIT/],
    ] as const)await assert.rejects(query(program),error);
    await assert.rejects(query('input(1). answer([0-?n]) :- input(?n).',2),/TD_E_EXPR_LIMIT.*computed head/);
    assert.deepEqual((await query('input(1). answer([?n/0]) :- input(?n),[1=2].')).rows,[]);
    assert.deepEqual((await query('input(1). blocked(1). answer([?n/0]) :- input(?n),!blocked(?n).')).rows,[]);
    assert.deepEqual((await query('input(1.5). answer([?n*2.0],[?n+0.5]) :- input(?n).')).rows,
      [[{tag:'f64',value:3},{tag:'f64',value:2}]]);
  }finally{await store.close();}
});
