import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {DuckDBInstance} from '@duckdb/node-api';

const runtime=resolve(process.env.TD_STREAMING_RUNTIME??'.');
const manifest=JSON.parse(await readFile(runtime+'/build/artifact.json','utf8'));
const enabled=manifest.experimental_streaming_source_fast_path===true;
const allCutEnabled=manifest.experimental_all_cut_unique_fast_path===true;
const currentEnabled=manifest.experimental_current_unique_fast_path===true;
const bridge=createRequire(import.meta.url)(runtime+'/build/temporal_control.node');
bridge.initialize(runtime+'/build/temporal_datalog.duckdb_extension',manifest.extension_sha256);
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const sql=async(connection,statement)=>(await connection.runAndReadAll(statement)).getRows();
const reconcileUsage = connection => sql(connection,`UPDATE main.storage_usage
  SET retained_count=actual.n,retained_bytes=actual.b FROM (
    SELECT count(*) n,coalesce(sum(octet_length(encode(e))+octet_length(encode(a))+
      octet_length(encode(payload))+coalesce(octet_length(encode(extra_json)),0)),0) b
    FROM main.assertions) actual WHERE singleton`);
const prefix="source(?e,?v) :- triple(?e,'n',?v). ";
const sum=prefix+'answer(sum_i64(?v)) :- source(?e,?v).';
const budgets=[1000,1000,1048576,1000,1048576];
const query=(connection,program,{owned=true,known=-1,valid=0,limits=budgets}={})=>sql(connection,
  'PRAGMA td_query_store_'+(owned?'owned':'scalable')+'('+[quote(program),valid,known,...limits,0].join(',')+')');
const compile=async(connection,program,owned=true,known=-1,valid=0)=>(await sql(connection,
  'SELECT td_query_store_'+(owned?'owned':'scalable')+'_sql_v1('+[quote(program),valid,known,...budgets].join(',')+')'))[0][0];
const native=(connection,program,known=-1,valid=0)=>sql(connection,
  'PRAGMA td_query_store_native('+[quote(program),valid,known,100000,1000,5000000,1000].join(',')+')');
const value=rows=>BigInt(JSON.parse(rows[0][6])[0].i);

async function fixture(work) {
  const instance=await DuckDBInstance.create(':memory:',{allow_unsigned_extensions:'true',threads:'1'});
  const connection=await instance.connect();
  const others=[];
  try {
    await sql(connection,'LOAD '+quote(runtime+'/build/temporal_datalog.duckdb_extension'));
    await sql(connection,'PRAGMA td_initialize');
    await sql(connection,'BEGIN; PRAGMA td_migrate_native_catalog_v2; COMMIT');
    await sql(connection,'LOAD '+quote(runtime+'/build/owner_probe/temporal_owner_probe.duckdb_extension'));
    await sql(connection,'SELECT td_owner_probe_enroll()');
    await sql(connection,'SELECT td_owner_probe_activate(0)');
    await sql(connection,"PRAGMA td_define_schema('schema streaming version 1 {entity Row {n:int64 many;s:text;b:boolean;f:float64;}}')");
    await sql(connection,`PRAGMA td_put_entity('streaming',1,'Row','one','one','{n=1;n=2;s="same";b=false;f=f64("0000000000000001");}',0,10)`);
    await sql(connection,`PRAGMA td_put_entity('streaming',1,'Row','two','two','{n=1;s="same";}',0,10)`);
    await work({connection,connect:async()=>{const next=await instance.connect();others.push(next);return next;}});
  }finally{
    for(const other of others)other.closeSync();
    connection.closeSync();instance.closeSync();
  }
}

test('only eligible owned injective aggregates inline active and projection relations',async()=>{
  await fixture(async({connection})=>{
    for(const aggregate of ['count()','sum_i64(?v)','min(?v)','max(?v)']){
      const program=prefix+'answer('+aggregate+') :- source(?e,?v).';
      const plan=await compile(connection,program);
      assert.equal(plan.includes('active AS NOT MATERIALIZED'),enabled);
      assert.equal(plan.includes('count_source AS NOT MATERIALIZED'),enabled);
      assert.equal(plan.includes('active_dedup AS MATERIALIZED'),enabled);
      assert.equal((plan.match(/td_owner_probe_uniqueness_check\(\)/g)??[]).length,1);
      assert.ok(plan.includes('source_gate AS MATERIALIZED'));
      assert.ok(plan.includes('count_groups AS MATERIALIZED'));
      for(const known of [-1,1,2]){
        const actual=await query(connection,program,{known});
        const oracle=await native(connection,program,known);
        assert.deepEqual(actual.map(row=>row[6]),oracle.map(row=>row[6]));
      }
      assert.equal(await compile(connection,program,false),plan);
    }
    for(const program of ["answer(?v) :- triple(?e,'n',?v).",
      "source(?v) :- triple(?e,'n',?v). answer(sum_i64(?v)) :- source(?v)."])
      assert.equal((await compile(connection,program)).includes('NOT MATERIALIZED'),false);
  });
});

test('cached streaming plans retain materialized set fallback after duplicate-carrier revalidation',async()=>{
  await fixture(async({connection})=>{
    const prepared=await connection.prepare(await compile(connection,sum)),token=bridge.create(5000);
    prepared.bindBigInt(1,token);
    try {
      assert.equal(value((await prepared.runAndReadAll()).getRows()),4n);
      await assert.rejects(query(connection,prefix+'answer(?e,sum_i64(?v)) :- source(?e,?v).',
        {limits:[1000,1000,1048576,1,1048576]}),/TD_E_QUERY_SCALE_LIMIT/);
      await sql(connection,'SELECT td_owner_probe_invalidate()');
      await sql(connection,"INSERT INTO main.assertions SELECT * REPLACE(assertion_id||'-duplicate' AS assertion_id) FROM main.assertions WHERE command_id='one' AND a='n' AND v_i=1");
      await reconcileUsage(connection);
      await sql(connection,'SELECT td_owner_probe_activate(0)');
      assert.deepEqual(await sql(connection,'SELECT td_owner_probe_uniqueness_check()'),[[0n]]);
      const rows=(await prepared.runAndReadAll()).getRows();
      assert.equal(value(rows),4n);
      assert.equal(rows[0][2],'owned_scalable_aggregate');
      assert.equal(value(await query(connection,sum,{known:1})),3n);
      await assert.rejects(query(connection,prefix+'answer(?e,sum_i64(?v)) :- source(?e,?v).',
        {limits:[1000,1000,1048576,1,1048576]}),/TD_E_QUERY_SCALE_LIMIT/);
    }finally{bridge.release(token);prepared.destroySync();}
  });
});

test('streaming keeps input intermediate and output admission and wide-constant guards',async()=>{
  await fixture(async({connection})=>{
    for(const limits of [[1,1000,1048576,1000,1048576],[1000,1,1048576,1000,1048576],
      [1000,1000,1,1000,1048576],[1000,1000,1048576,1000,1]])
      await assert.rejects(query(connection,sum,{limits}),/TD_E_QUERY_SCALE_LIMIT/);
    const wide="source(?e,?v,'"+'x'.repeat(8192)+"') :- triple(?e,'n',?v). answer(count()) :- source(?e,?v,?c).";
    assert.equal((await compile(connection,wide)).includes('NOT MATERIALIZED'),false);
    await assert.rejects(query(connection,wide,{limits:[1000,1000,16384,1000,1048576]}),/TD_E_QUERY_SCALE_LIMIT/);
    await sql(connection,"PRAGMA td_put_entity('streaming',1,'Row','wide','wide',"+quote('{s="'+'x'.repeat(513)+'";}')+',0,10)');
    await assert.rejects(query(connection,"source(?e,?v) :- triple(?e,'s',?v). answer(count()) :- source(?e,?v).",
      {limits:[1,1000,1048576,1000,1048576]}),/TD_E_QUERY_PROFILE/);
  });
});

test('streamed aggregate domains ranges empty inputs and grouped results match the bounded native evaluator',async()=>{
  await fixture(async({connection})=>{
    const grouped=prefix+'answer(?e,sum_i64(?v)) :- source(?e,?v).';
    for(const program of [grouped,"source(?e,?v) :- triple(?e,'f',?v). answer(max(?v)) :- source(?e,?v).",
      "source(?e,?v) :- triple(?e,'absent',?v). answer(count()) :- source(?e,?v)."])
      assert.deepEqual((await query(connection,program)).map(row=>row[6]),(await native(connection,program)).map(row=>row[6]));
    await assert.rejects(query(connection,"source(?e,?v) :- triple(?e,'s',?v). answer(sum_i64(?v)) :- source(?e,?v)."),/TD_E_AGG_MEASURE_TAG/);
    await assert.rejects(query(connection,"source(?e,?v) :- triple(?e,'b',?v). answer(min(?v)) :- source(?e,?v)."),/TD_E_AGG_MEASURE_TAG/);
    await sql(connection,"PRAGMA td_put_entity('streaming',1,'Row','large','large','{n=9223372036854775807;}',0,10)");
    await sql(connection,"PRAGMA td_put_entity('streaming',1,'Row','negative','negative','{n=-9223372036854775807;}',0,10)");
    assert.equal(value(await query(connection,sum)),4n);
    await sql(connection,"PRAGMA td_put_entity('streaming',1,'Row','overflow','overflow','{n=9223372036854775807;}',0,10)");
    await assert.rejects(query(connection,sum),/TD_E_AGG_SUM_RANGE/);
    await sql(connection,"PRAGMA td_put_entity('streaming',1,'Row','one','remove-boolean','{n=1;n=2;s=\"same\";}',0,10)");
    await assert.rejects(query(connection,'source(?e,?a,?v) :- triple(?e,?a,?v). answer(?e,min(?v)) :- source(?e,?a,?v).'),/TD_E_AGG_MIXED_TAGS/);
  });
});

test('empty streaming inputs still enforce ownership and controlled-query cancellation',async()=>{
  await fixture(async({connection,connect})=>{
    const empty="source(?e,?v) :- triple(?e,'absent',?v). answer(count()) :- source(?e,?v).";
    const prepared=await connection.prepare(await compile(connection,empty)),token=bridge.create(5000);
    prepared.bindBigInt(1,token);
    try {
      assert.equal(value((await prepared.runAndReadAll()).getRows()),0n);
      bridge.cancel(token);
      await assert.rejects(prepared.runAndReadAll(),/TD_E_CANCELED/);
      assert.equal(value(await query(connection,empty)),0n);
      await connect();
      await assert.rejects(query(connection,empty),/TD_E_OWNER_PROBE_INVALID/);
    }finally{bridge.release(token);prepared.destroySync();}
  });
});

test('cached latest and historical streaming plans retain patch endpoints and certification after revalidation',async()=>{
  await fixture(async({connection})=>{
    const latest=await connection.prepare(await compile(connection,sum,true,-1,3));
    const historical=await connection.prepare(await compile(connection,sum,true,2,3));
    const token=bridge.create(10000);
    latest.bindBigInt(1,token);historical.bindBigInt(1,token);
    try {
      assert.equal(value((await latest.runAndReadAll()).getRows()),4n);
      assert.equal(value((await historical.runAndReadAll()).getRows()),4n);
      await sql(connection,"PRAGMA td_patch_entity('streaming',1,'Row','one','middle','{n=9;}',2,8)");
      assert.equal(value((await latest.runAndReadAll()).getRows()),10n);
      assert.equal(value((await historical.runAndReadAll()).getRows()),4n);
      await sql(connection,'SELECT td_owner_probe_invalidate()');
      await sql(connection,'SELECT td_owner_probe_activate(0)');
      const currentRows=(await latest.runAndReadAll()).getRows();
      const oldRows=(await historical.runAndReadAll()).getRows();
      assert.equal(currentRows[0][2],allCutEnabled?'owned_allcut_unique_scalable_aggregate':
        currentEnabled?'owned_unique_scalable_aggregate':'owned_scalable_aggregate');
      assert.equal(oldRows[0][2],allCutEnabled?'owned_allcut_unique_scalable_aggregate':'owned_scalable_aggregate');
      assert.equal(value(currentRows),10n);assert.equal(value(oldRows),4n);
      for(const known of [1,2,3])for(const valid of [0,2,7,8,10])
        assert.deepEqual((await query(connection,sum,{known,valid})).map(row=>row[6]),
          (await native(connection,sum,known,valid)).map(row=>row[6]));
    }finally{bridge.release(token);latest.destroySync();historical.destroySync();}
  });
});
