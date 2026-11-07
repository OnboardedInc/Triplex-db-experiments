import {openAuditedPort} from './native-test-fixture.js';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { NativeEntityStore } from './native-entity.js';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';

const INF=9223372036854775807n,MIN=-9223372036854775808n;
const schema='schema graph version 1 { entity Row { i:int64 many; f:float64 many; s:text many; b:boolean; edge:text many; blocked:boolean; } }';
const put=(commandId:string,record:string,entityId='e')=>({schema:'graph',version:1,type:'Row',entityId,commandId,record,validFrom:MIN,validTo:INF});
const quote=(s:string)=>"'"+s.replaceAll("'","''")+"'";
const count="source(?e,?v) :- triple(?e,'i',?v). answer(count()) :- source(?e,?v).";

test('persisted native queries preserve all four tags, int64 endpoints, float bits and temporal cuts',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    await store.putRecord(put('one','{i=-9223372036854775808;i=9223372036854775807;f=f64("0000000000000001");f=f64("8000000000000000");s="é🙂";b=false;}'));
    const result=await store.query("answer(?a,?v) :- triple('e',?a,?v).",{validAt:MIN,forceNative:true});
    assert.equal(result.position,1n);assert.equal(result.route,'native');assert.equal(result.reason,'forced_native');
    assert.equal(result.rows.length,6);
    assert.deepEqual(result.rows.filter(r=>r[1]?.tag==='i64').map(r=>r[1]!.value),[MIN,INF]);
    assert.deepEqual(new Set(result.rows.filter(r=>r[1]?.tag==='f64').map(r=>r[1]!.value)),new Set([0,Number.MIN_VALUE]));
    assert.ok(result.rows.some(r=>r[1]?.tag==='bool'&&r[1].value===false));
    assert.ok(result.rows.some(r=>r[1]?.tag==='str'&&r[1].value==='é🙂'));
    assert.ok(result.counters!.work>0n);
    await store.putRecord({...put('two','{i=7;}'),validFrom:3n,validTo:8n});
    assert.equal((await store.query(count,{knownAt:1n,validAt:MIN})).rows[0]?.[0]?.value,2n);
    assert.equal((await store.query(count,{validAt:3n})).rows[0]?.[0]?.value,1n);
    assert.equal((await store.query(count,{validAt:8n})).rows[0]?.[0]?.value,0n);
    assert.deepEqual((await store.query("answer(?v) :- triple('e','i',?v).",{knownAt:0n,validAt:3n})).rows,[]);
    assert.deepEqual((await store.query('answer(1).',{validAt:0n})).rows,[[{tag:'i64',value:1n}]]);
  }finally{await store.close();}
});

test('native persisted recursion, stratified negation and complete-tuple aggregates share one cut',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    await store.putRecord(put('a','{i=2;i=2;edge="b";}','a'));
    await store.putRecord(put('b','{i=2;edge="c";}','b'));
    await store.putRecord(put('c','{blocked=true;}','c'));
    const recursive="r(?a,?b) :- triple(?a,'edge',?b). r(?a,?c) :- r(?a,?b),triple(?b,'edge',?c). answer(?a,?b) :- r(?a,?b), !triple(?b,'blocked',true).";
    assert.deepEqual((await store.query(recursive,{validAt:0n})).rows,[[{tag:'str',value:'a'},{tag:'str',value:'b'}]]);
    for(const [op,expected]of [['count()',2n],['sum_i64(?v)',4n],['min(?v)',2n],['max(?v)',2n]]as const){
      const p="source(?e,?v) :- triple(?e,'i',?v). answer("+op+") :- source(?e,?v).";
      assert.deepEqual((await store.query(p,{validAt:0n})).rows,[[{tag:'i64',value:expected}]]);
    }
    assert.equal((await store.query("answer(?e) :- triple(?e,'i',?v),[?v*2+1 = 5].",{validAt:0n})).rows.length,2);
    await assert.rejects(store.query("answer('x') :- [false = true],[1/0 = 0].",{validAt:0n}),/TD_E_EXPR_DIV_ZERO/);
    await store.putRecord(put('unblock','{}','c'));
    assert.equal((await store.query(recursive,{validAt:0n})).rows.length,3);
    assert.equal((await store.query(recursive,{knownAt:3n,validAt:0n})).rows.length,1);
  }finally{await store.close();}
});

test('native query budgets, deadlines and static rejection publish no partial answer and preserve reuse',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    await store.putRecord(put('many','{'+Array.from({length:4096},(_,n)=>'i='+n+';').join('')+'}'));
    const cross="answer(?a,?b) :- triple('e','i',?a),triple('e','i',?b).";
    await assert.rejects(store.query(cross,{validAt:0n,maxWork:1}),/max_work/);
    await assert.rejects(store.query(cross,{validAt:0n,deadlineMs:1}),/TD_E_DEADLINE/);
    for(const program of ["answer(?x) :- !triple(?x,'i',?v).","a(?x) :- !b(?x). b(?x) :- !a(?x). answer(1).",'ATTACH anything'])
      await assert.rejects(store.query(program,{validAt:0n}));
    await assert.rejects(store.query(count,{validAt:0n,maxFacts:0}),/TD_E_QUERY_LIMIT/);
    await assert.rejects(store.query(count,{validAt:INF}),/TD_E_QUERY_INPUT/);
    await assert.rejects(store.query(count,{validAt:0n,knownAt:2n}),/TD_E_QUERY_INPUT/);
    await assert.rejects(store.at('missing',{validAt:0n,knownAt:2n}),/TD_E_COMMAND_INTERVAL/);
    await assert.rejects(store.putRecord({...put('bad-unicode','{}'),entityId:'\ud800'}),TypeError);
    await assert.rejects(store.query("answer('\ud800').",{validAt:0n}),TypeError);
    assert.equal(await store.receipt('bad-unicode'),null);
    assert.deepEqual((await store.query(count,{validAt:0n})).rows,[[{tag:'i64',value:4096n}]]);
    assert.equal((await store.putRecord(put('healthy','{i=7;}'))).position,2n);
  }finally{await store.close();}
});

test('startup audit rejects inactive retained carriers and original schema bindings',async()=>{
  const query='PRAGMA td_query_store('+quote(count)+',20,-1,100000,1000,5000000,1000)';
  for(const mutation of ["UPDATE main.assertions SET v_i=2", "UPDATE td_catalog_v1.entity_commands SET schema_hash=repeat('0',64)"]){
    const port=await openAuditedPort();
    const run=(sql:string)=>port.runNative({name:'query_integrity',sql,params:[]});
    try{
      await run('PRAGMA td_define_schema('+quote(schema)+')');
      await run("PRAGMA td_put_entity('graph',1,'Row','e','one','{i=1;}',0,1)");
      assert.equal((await run(query))[0]?.[6],'[{"tag":3,"s":null,"b":null,"i":"0","f":null}]');
      await port.run({name:'inject_retained_corruption',sql:mutation,params:[]});
      await assert.rejects(port.activateOwnership(),/TD_E_(QUERY_CARRIER|COMMAND_HISTORY)/);
      await assert.rejects(run(query),/TD_E_OWNER_PROBE_INVALID/);
    }finally{await port.close();}
  }
});

test('persisted Datalog rejects relevant wide strings while unrelated supported attributes remain queryable',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);await store.putRecord(put('one','{i=7;s="'+'x'.repeat(513)+'";}'));
    assert.deepEqual((await store.query(count,{validAt:0n})).rows,[[{tag:'i64',value:1n}]]);
    await assert.rejects(store.query("answer(?v) :- triple('e','s',?v).",{validAt:0n}),/TD_E_QUERY_PROFILE/);
  }finally{await store.close();}
});

test('thin TypeScript and SQL persisted queries agree after close/reopen without a host fact list',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'native-store-query-'));const database=resolve(directory,'data.duckdb');
  try{
    const store=await NativeEntityStore.open({database});await store.defineSchema(schema);await store.putRecord(put('one','{i=7;}'));
    const result=await store.query(count,{validAt:MIN,forceNative:false});await store.close();
    const port=await openAuditedPort({database});
    try{
      const raw=await port.runNative({name:'query_sql_parity',sql:'PRAGMA td_query_store('+quote(count)+','+MIN+',-1,100000,1000,5000000,1000)',params:[]});
      assert.equal(raw[0]?.[0],result.position);assert.equal(raw[0]?.[1],result.route);
      assert.equal(raw[0]?.[6],'[{"tag":3,"s":null,"b":null,"i":"1","f":null}]');
    }finally{await port.close();}
  }finally{await rm(directory,{recursive:true});}
});

test('proved single-atom SQL agrees with native typed equality, constants, repeated variables and projections',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    await store.putRecord(put('one','{i=-9223372036854775808;i=0;i=9223372036854775807;f=f64("0000000000000001");f=f64("8000000000000000");s="";s="é🙂";s="e";b=false;}'));
    await store.putRecord(put('two','{i=0;s="i";b=true;}','i'));
    const bodies=["triple(?e,'i',?v)","triple('e',?a,?v)","triple(?e,?a,?v)","triple(?v,'s',?v)",
      "triple(?e,?e,?v)","triple(?e,'i',0.0)","triple(?e,'f',0.0)","triple(?e,3,?v)","triple('absent','i',?v)"];
    for(const body of bodies){
      const variable=body.includes('?v')?'?v':'?e';
      for(const head of [variable,"'constant'",`false,1.0,${variable}`,`${variable},${variable}`,"-9223372036854775808"]){
        const program=`answer(${head}) :- ${body}.`;
        const sql=await store.query(program,{validAt:MIN,forceNative:false});
        const native=await store.query(program,{validAt:MIN,forceNative:true});
        assert.equal(sql.route,'sql',program);assert.equal(sql.reason,'proved_single_atom');assert.equal(sql.counters,null);
        assert.equal(native.route,'native');assert.equal(native.reason,'forced_native');assert.ok(native.counters);
        assert.deepEqual(sql.rows,native.rows,program);assert.equal(sql.position,native.position);
      }
    }
  }finally{await store.close();}
});

test('single-atom proof uses fresh statistics and falls back without widening native budgets',async()=>{
  const store=await NativeEntityStore.open();const program="answer(?v) :- triple('e','i',?v).";
  try{
    await store.defineSchema(schema);await store.putRecord(put('one','{i=1;i=2;i=3;}'));
    for(const options of [{maxRounds:1},{maxWork:3}]){
      const result=await store.query(program,{validAt:0n,...options,forceNative:false});
      assert.equal(result.route,'native');assert.equal(result.reason,'single_atom_budget_unproved');
      assert.deepEqual(result.rows,(await store.query(program,{validAt:0n,...options,forceNative:true})).rows);
    }
    await assert.rejects(store.query(program,{validAt:0n,maxFacts:5}),/max_facts/);
    assert.equal((await store.query(program,{validAt:0n,maxFacts:6,forceNative:false})).route,'sql');
    await store.putRecord(put('two','{i=4;}'));
    const updated=await store.query(program,{validAt:0n,maxWork:3,forceNative:false});
    assert.equal(updated.route,'sql');assert.deepEqual(updated.rows,[[{tag:'i64',value:4n}]]);
    assert.equal((await store.query(program,{validAt:0n,knownAt:1n,maxWork:3})).route,'native');
    const automatic=await store.query(program,{validAt:0n,forceNative:false});
    assert.equal(automatic.route,'sql');assert.deepEqual(automatic.rows,updated.rows);
  }finally{await store.close();}
});

test('empty cached SQL rejects an invalidated owner and resumes after a fresh audit',async()=>{
  const port=await openAuditedPort();const run=(sql:string)=>port.runNative({name:'scan_integrity',sql,params:[]});
  const program="answer(?v) :- triple('missing','i',?v).";
  const query='PRAGMA td_query_store('+quote(program)+',20,-1,100000,1000,5000000,1000)';
  try{
    assert.equal((await run(query))[0]?.[1],'sql');
    await port.run({name:'invalidate_owner',sql:'SELECT 1',params:[]});
    await assert.rejects(run(query),/TD_E_OWNER_PROBE_INVALID/);
    await port.activateOwnership();
    assert.equal((await run(query))[0]?.[1],'sql');
  }finally{await port.close();}
});

test('prepared query reuse refreshes data, rollback and schema versions, checks every fact and remains bounded',async()=>{
  const port=await openAuditedPort();const run=(sql:string)=>port.runNative({name:'prepared_native_query',sql,params:[]});
  const program="answer(?v) :- triple('e','i',?v).";
  const query='PRAGMA td_query_store('+quote(program)+',0,-1,100000,1000,5000000,1000)';
  try{
    await run('PRAGMA td_define_schema('+quote(schema)+')');await run("PRAGMA td_put_entity('graph',1,'Row','e','one','{i=1;}',0,9223372036854775807)");
    const first=await run(query);const hits=port.cacheStats().hits;assert.deepEqual(await run(query),first);
    assert.ok(port.cacheStats().hits>hits);
    await run('BEGIN');await run("PRAGMA td_put_entity('graph',1,'Row','e','tentative','{i=2;}',0,9223372036854775807)");
    assert.equal((await run(query))[0]?.[6],'[{"tag":3,"s":null,"b":null,"i":"2","f":null}]');
    await run('ROLLBACK');assert.deepEqual(await run(query),first);
    await run('PRAGMA td_define_schema(\'schema graph version 2 {entity Row {i:text;}}\')');
    await run("PRAGMA td_put_entity('graph',2,'Row','e','new-schema','{i=\"new\";}',0,9223372036854775807)");
    assert.equal((await run(query))[0]?.[6],'[{"tag":1,"s":"new","b":null,"i":null,"f":null}]');
    await assert.rejects(run("SELECT td_validate_schema_fact_v1(s.dsl,s.ir,'Row','i',CASE WHEN range=0 THEN 3::UTINYINT ELSE 1::UTINYINT END) FROM td_catalog_v1.schemas s CROSS JOIN range(2) WHERE version=1"),/TD_E_SCHEMA_TYPE/);
    for(let i=0;i<40;i++)await run('PRAGMA td_query_store('+quote('answer('+i+').')+',0,-1,100000,1000,5000000,1000)');
    assert.ok(port.cacheStats().entries<=32);assert.ok(port.cacheStats().sqlBytes<=262144);
    assert.equal((await run(query))[0]?.[6],'[{"tag":1,"s":"new","b":null,"i":null,"f":null}]');
  }finally{await port.close();}
});
