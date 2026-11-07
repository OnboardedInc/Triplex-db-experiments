import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {DuckDBInstance} from '@duckdb/node-api';
import type {DuckDBConnection} from '@duckdb/node-api';

const core=fileURLToPath(new URL('../temporal_datalog.duckdb_extension',import.meta.url));
const companion=fileURLToPath(new URL('../owner_probe/temporal_owner_probe.duckdb_extension',import.meta.url));
const quote=(value:string)=>"'"+value.replaceAll("'","''")+"'";
const limits=[10000000,10000000,536870912,100000,16777216];
const scan="answer(?v) :- triple(?e,'n',?v).";
const empty="answer(?v) :- triple(?e,'missing',?v).";
const sum="source(?e,?v) :- triple(?e,'n',?v). answer(sum_i64(?v)) :- source(?e,?v).";
const sql=async (connection:DuckDBConnection,statement:string)=>(await connection.runAndReadAll(statement)).getRows();
type Rows=Awaited<ReturnType<typeof sql>>;

function tuples(rows:Rows){
  return rows.flatMap(row=>{
    const wire=row[6];
    if(wire===null)return [];
    assert.ok(typeof wire==='string');
    const tuple=JSON.parse(wire) as {tag:number;s:string|null;b:boolean|null;i:string|null;f:string|null}[];
    return [tuple.map(value=>[value.tag,value.s??value.b??value.i??value.f])];
  });
}

const integer=(value:bigint|number)=>[3,String(value)];
const text=(value:string)=>[1,value];

async function fixture(work:(context:{instance:DuckDBInstance;connection:DuckDBConnection;
  put:(entity:string,command:string,record:string,extended?:boolean)=>Promise<Rows>;
  query:(program:string,options?:{known?:number;scalable?:boolean;budgets?:number[]})=>Promise<Rows>})=>Promise<void>){
  const instance=await DuckDBInstance.create(':memory:',{allow_unsigned_extensions:'true'});
  const connection=await instance.connect();
  const run=(statement:string)=>sql(connection,statement);
  const put=(entity:string,command:string,record:string,extended=false)=>{
    const args=[quote('scale'),1,quote('Row'),quote(entity),quote(command),quote(record),0,'9223372036854775807'];
    if(extended)args.push(10000000,1073741824);
    return run('PRAGMA '+(extended?'td_put_entity_with_limits':'td_put_entity')+'('+args.join(',')+')');
  };
  const query=(program:string,{known=-1,scalable=true,budgets=limits}={})=>{
    const args=[quote(program),0,known,...(scalable?[...budgets,0]:[100000,1000,5000000,1000])];
    return run('PRAGMA '+(scalable?'td_query_store_scalable':'td_query_store_native')+'('+args.join(',')+')');
  };
  try{
    await run('LOAD '+quote(core));
    await run('PRAGMA td_initialize');
    await run('PRAGMA td_migrate_native_catalog_v2');
    await run('LOAD '+quote(companion));
    assert.deepEqual(await run('SELECT td_owner_probe_enroll()'),[[true]]);
    assert.deepEqual(await run('SELECT td_owner_probe_activate(0)'),[[true]]);
    await run("PRAGMA td_define_schema('schema scale version 1 {entity Row {n:int64 many;s:text;b:boolean;f:float64;}}')");
    await put('a','one','{n=1;n=2;s="alpha";b=false;f=f64("0000000000000001");}');
    await put('b','two','{n=3;s="beta";b=true;f=f64("3ff0000000000000");}');
    await work({instance,connection,put,query});
  }finally{connection.closeSync();instance.closeSync();}
}

test('owned scalable SQL matches bounded native and independent typed scan, join and aggregate answers',async()=>{
  await fixture(async({query})=>{
    const counts=['b','f','n','s'].map((attribute,index)=>[text(attribute),integer(index===2?3:2)]);
    const cases=[
      [scan,[[integer(1)],[integer(2)],[integer(3)]]],
      ["answer(?n,?s) :- triple(?e,'n',?n),triple(?e,'s',?s).",
        [[integer(1),text('alpha')],[integer(2),text('alpha')],[integer(3),text('beta')]]],
      ['answer(count()) :- triple(?e,?a,?v).',[[integer(9)]]],
      ['answer(?a,count()) :- triple(?e,?a,?v).',counts],
      [sum,[[integer(6)]]],
      ["source(?e,?v) :- triple(?e,'n',?v). answer(min(?v)) :- source(?e,?v).",[[integer(1)]]],
      ["source(?e,?v) :- triple(?e,'f',?v). answer(max(?v)) :- source(?e,?v).",[[[4,'3ff0000000000000']]]],
      ["source(?e,?v) :- triple(?e,'s',?v). answer(min(?v)) :- source(?e,?v).",[[text('alpha')]]],
      ['source(?a,?v) :- triple(?e,?a,?v). answer(?a,count()) :- source(?a,?v).',counts],
    ] as const;
    for(const [program,expected] of cases){
      const actual=await query(program),native=await query(program,{scalable:false});
      assert.deepEqual(actual.map(row=>row[6]),native.map(row=>row[6]),program);
      assert.deepEqual(tuples(actual),expected,program);
      assert.equal(actual[0]?.[0],native[0]?.[0],program);
      assert.equal(actual[0]?.[0],2n,program);
      assert.equal(actual[0]?.[1],'sql',program);
      assert.match(String(actual[0]?.[2]),/^owned_(?:(?:allcut_)?unique_)?scalable_/,program);
      assert.deepEqual(actual[0]?.slice(3,6),[null,null,null],program);
    }
  });
});

test('owned scalable corrections preserve historical cuts and empty result carriers',async()=>{
  await fixture(async({put,query})=>{
    const before=await query(sum);
    assert.deepEqual(tuples(before),[[integer(6)]]);
    await put('a','three','{n=9;}');
    assert.equal((await query(sum,{known:2}))[0]?.[6],before[0]?.[6]);
    assert.deepEqual(tuples(await query(sum)),[[integer(12)]]);
    assert.equal((await query(empty))[0]?.[6],null);
    const count="source(?e) :- triple(?e,'missing',?v). answer(count()) :- source(?e).";
    assert.deepEqual(tuples(await query(count)),[[integer(0)]]);
  });
});

test('owned scalable limits reject the same budgets and unsupported programs without fallback',async()=>{
  await fixture(async({query})=>{
    for(const budgets of [[1,100,100000,100,100000],[100,100,1,100,100000],
      [100,100,100000,1,100000],[100,100,100000,100,1]])
      await assert.rejects(query(scan,{budgets}),/TD_E_QUERY_SCALE_LIMIT/,JSON.stringify(budgets));
    await assert.rejects(query("path(?a,?b) :- triple(?a,'s',?b). "+
      'path(?a,?c) :- path(?a,?b),path(?b,?c). answer(?a,?b) :- path(?a,?b).'),/TD_E_QUERY_SCALE_UNSUPPORTED/);
    await assert.rejects(query("answer(?x,?y) :- triple(?a,'n',?x),triple(?b,'n',?y).",
      {budgets:[100,3,100000,100,100000]}),/TD_E_QUERY_SCALE_LIMIT/);
    const wide="source(?v,'"+'x'.repeat(16384)+"') :- triple(?e,'n',?v). answer(count()) :- source(?v,?text).";
    await assert.rejects(query(wide,{budgets:[100,100,1024,100,100000]}),/TD_E_QUERY_SCALE_LIMIT/);
    assert.equal((await query(scan))[0]?.[1],'sql');
  });
});

test('inactive carrier corruption prevents a real owner audit and an empty projection',async()=>{
  await fixture(async({instance,connection,put,query})=>{
    await put('a','three','{n=9;}');
    const raw=await instance.connect();
    try{await sql(raw,"UPDATE main.assertions SET payload_hash='corrupt' WHERE command_id='one'");}
    finally{raw.closeSync();}
    await assert.rejects(sql(connection,'SELECT td_owner_probe_activate(0)'),/TD_E_QUERY_CARRIER|TD_E_COMMAND_HISTORY/);
    await assert.rejects(query(empty),/TD_E_OWNER_PROBE_INVALID/);
  });
});

test('owned aggregates preserve tag-before-range error priority and heterogeneous groups',async()=>{
  await fixture(async({connection,put,query})=>{
    await assert.rejects(query("source(?e,?v) :- triple(?e,'b',?v). answer(sum_i64(?v)) :- source(?e,?v)."),/TD_E_AGG_MEASURE_TAG/);
    await put('overflow','overflow','{n=9223372036854775807;}');
    await assert.rejects(query(sum),/TD_E_AGG_SUM_RANGE/);
    await assert.rejects(query('source(?e,?v) :- triple(?e,?a,?v). answer(sum_i64(?v)) :- source(?e,?v).'),/TD_E_AGG_MEASURE_TAG/);
    await assert.rejects(query("source(?e,?v) :- triple(?e,'b',?v). answer(min(?v)) :- source(?e,?v)."),/TD_E_AGG_MEASURE_TAG/);
    await assert.rejects(query('source(?e,?v) :- triple(?e,?a,?v). answer(min(?v)) :- source(?e,?v).'),/TD_E_AGG_MEASURE_TAG/);
    await sql(connection,"PRAGMA td_define_schema('schema scale version 2 {entity Row {n:text;}}')");
    await sql(connection,`PRAGMA td_put_entity('scale',2,'Row','mixed','mixed','{n="text";}',0,9223372036854775807)`);
    await assert.rejects(query("source(?e,?v) :- triple(?e,'n',?v). answer(min(?v)) :- source(?e,?v)."),/TD_E_AGG_MIXED_TAGS/);
    const grouped="source(?e,?v) :- triple(?e,'n',?v). answer(?e,min(?v)) :- source(?e,?v).";
    const actual=await query(grouped),native=await query(grouped,{scalable:false});
    assert.deepEqual(actual.map(row=>row[6]),native.map(row=>row[6]));
    assert.deepEqual(tuples(actual),[[text('a'),integer(1)],[text('b'),integer(3)],
      [text('mixed'),text('text')],[text('overflow'),integer(9223372036854775807n)]]);
  });
});

test('one million native-ingested facts retain exact owned answers and exceed the bounded path',async()=>{
  await fixture(async({put,query})=>{
    const batches=245,batchSize=4096;
    for(let batch=0;batch<batches;batch++){
      const start=batch*batchSize;
      const record='{'+Array.from({length:batchSize},(_,index)=>'n='+(start+index)+';').join('')+'}';
      await put('batch-'+batch,'batch-'+batch,record,true);
    }
    const generated=BigInt(batches*batchSize);
    const expected=generated*(generated-1n)/2n+6n;
    const result=await query(sum);
    assert.deepEqual(tuples(result),[[integer(expected)]]);
    assert.match(String(result[0]?.[2]),/^owned_(?:(?:allcut_)?unique_)?scalable_aggregate$/);
    const selective=await query("answer(?e) :- triple(?e,'n',"+(generated-1n)+').');
    assert.deepEqual(tuples(selective),[[text('batch-244')]]);
    await assert.rejects(query(sum,{scalable:false}),/active snapshot exceeds 100000/);
  });
});
