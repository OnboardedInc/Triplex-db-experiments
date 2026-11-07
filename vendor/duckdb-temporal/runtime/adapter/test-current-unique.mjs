// Isolated native capability tests. Run against a staged enabled/disabled build.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {DuckDBInstance} from '@duckdb/node-api';

const runtime = resolve(process.env.TD_CURRENT_UNIQUE_RUNTIME ?? '.');
const manifest = JSON.parse(await readFile(runtime + '/build/artifact.json','utf8'));
const enabled = manifest.experimental_current_unique_fast_path === true;
const allCutEnabled = manifest.experimental_all_cut_unique_fast_path === true;
const bridge = createRequire(import.meta.url)(runtime + '/build/temporal_control.node');
bridge.initialize(runtime + '/build/temporal_datalog.duckdb_extension',manifest.extension_sha256);
const quote = value => "'" + value.replaceAll("'","''") + "'";
const sql = async (connection,statement) => (await connection.runAndReadAll(statement)).getRows();
const reconcileUsage = connection => sql(connection,`UPDATE main.storage_usage
  SET retained_count=actual.n,retained_bytes=actual.b FROM (
    SELECT count(*) n,coalesce(sum(octet_length(encode(e))+octet_length(encode(a))+
      octet_length(encode(payload))+coalesce(octet_length(encode(extra_json)),0)),0) b
    FROM main.assertions) actual WHERE singleton`);
const activate = connection => sql(connection,'SELECT td_owner_probe_activate(0)');
const capability = async connection => (await sql(connection,'SELECT td_owner_probe_current_unique_check()'))[0][0];
const count = 'answer(count()) :- triple(?e,?a,?v).';
const query = (connection,known=-1,valid=0) => sql(connection,'PRAGMA td_query_store_owned(' +
  [quote(count),valid,known,1000,1000,1048576,1000,1048576,0].join(',') + ')');
const value = rows => BigInt(JSON.parse(rows[0][6])[0].i);

async function fixture(work) {
  const instance=await DuckDBInstance.create(':memory:',{allow_unsigned_extensions:'true',threads:'1'});
  const connection=await instance.connect(),others=[];
  try {
    await sql(connection,'LOAD ' + quote(runtime + '/build/temporal_datalog.duckdb_extension'));
    await sql(connection,'PRAGMA td_initialize');
    await sql(connection,'LOAD ' + quote(runtime + '/build/owner_probe/temporal_owner_probe.duckdb_extension'));
    await sql(connection,'SELECT td_owner_probe_enroll()');
    await sql(connection,'SELECT td_owner_probe_activate(0)');
    await sql(connection,"PRAGMA td_define_schema('schema current_unique version 1 {entity Row {n:int64 many;}}')");
    await sql(connection,"PRAGMA td_put_entity('current_unique',1,'Row','one','one','{n=1;}',0,10)");
    await work({connection,connect:async()=>{const other=await instance.connect();others.push(other);return other;}});
  } finally {
    for(const other of others)other.closeSync();
    connection.closeSync();instance.closeSync();
  }
}

test('current uniqueness is earned by audit, preserves native put induction and leaves explicit cuts on DISTINCT',async()=>{
  await fixture(async({connection})=>{
    await sql(connection,'SELECT td_owner_probe_invalidate()');
    await assert.rejects(capability(connection),/TD_E_OWNER_PROBE_INVALID/);
    await activate(connection);assert.equal(await capability(connection),enabled);
    await sql(connection,"PRAGMA td_put_entity('current_unique',1,'Row','one','two','{n=2;n=3;}',0,10)");
    assert.equal(await capability(connection),enabled);
    const latest=await query(connection),historical=await query(connection,1);
    assert.equal(value(latest),2n);
    assert.equal(latest[0][2],allCutEnabled?'owned_allcut_unique_scalable_count':enabled?'owned_unique_scalable_count':'owned_scalable_count');
    assert.equal(value(historical),1n);
    assert.equal(historical[0][2],allCutEnabled?'owned_allcut_unique_scalable_count':'owned_scalable_count');
    const compile=async known=>(await sql(connection,'SELECT td_query_store_owned_sql_v1(' +
      [quote(count),0,known,1000,1000,1048576,1000,1048576].join(',') + ')'))[0][0];
    assert.equal((await compile(-1)).includes('owner_cap AS MATERIALIZED'),enabled);
    assert.equal((await compile(1)).includes('owner_cap AS MATERIALIZED'),allCutEnabled);
    const snapshot=JSON.parse((await sql(connection,'SELECT td_owner_probe_status()'))[0][0]);
    assert.equal(snapshot.currentUnique,enabled);
  });
});

test('duplicate and overlapping current EAVs retain base ownership and safe DISTINCT answers',async()=>{
  await fixture(async({connection})=>{
    await sql(connection,"INSERT INTO main.assertions SELECT * REPLACE (assertion_id || '-duplicate' AS assertion_id) FROM main.assertions");
    await reconcileUsage(connection);
    await activate(connection);assert.equal(await capability(connection),false);
    assert.deepEqual(await sql(connection,'SELECT td_owner_probe_validated_check()'),[[true]]);
    const result=await query(connection);
    assert.equal(value(result),1n);assert.equal(result[0][2],'owned_scalable_count');
  });
});

test('adjacent disjoint equal-value intervals may earn current uniqueness',async()=>{
  await fixture(async({connection})=>{
    await sql(connection,'UPDATE main.assertions SET valid_to=5');
    await sql(connection,"INSERT INTO main.assertions SELECT * REPLACE (assertion_id || '-adjacent' AS assertion_id,5::BIGINT AS valid_from,10::BIGINT AS valid_to) FROM main.assertions");
    await reconcileUsage(connection);
    await activate(connection);assert.equal(await capability(connection),enabled);
    for(const valid of [0,4,5,9])assert.equal(value(await query(connection,-1,valid)),1n);
    assert.equal(value(await query(connection,-1,10)),0n);
  });
});

test('future-start and finite-future-end retained rows cannot earn the current capability',async()=>{
  await fixture(async({connection})=>{
    await sql(connection,"PRAGMA td_put_entity('current_unique',1,'Row','future','future','{n=1;}',0,10)");
    await sql(connection,'UPDATE main.clock SET position=1');
    await activate(connection);assert.equal(await capability(connection),false);
    assert.equal(value(await query(connection)),1n);
  });
  await fixture(async({connection})=>{
    await sql(connection,'UPDATE main.assertions SET tx_to=10');
    await activate(connection);assert.equal(await capability(connection),false);
    assert.equal(value(await query(connection)),1n);
    await sql(connection,"PRAGMA td_put_entity('current_unique',1,'Row','one','same-value','{n=1;}',0,10)");
    assert.equal(await capability(connection),false);
    assert.equal(value(await query(connection)),1n);
  });
});

test('cached latest plans adapt from a true capability to false and unknown connections invalidate it',async()=>{
  await fixture(async({connection,connect})=>{
    await activate(connection);
    const template=(await sql(connection,'SELECT td_query_store_owned_sql_v1(' +
      [quote(count),0,-1,1000,1000,1048576,1000,1048576].join(',') + ')'))[0][0];
    const prepared=await connection.prepare(template),token=bridge.create(5000);
    try {
      prepared.bindBigInt(1,token);
      const first=(await prepared.runAndReadAll()).getRows();
      assert.equal(value(first),1n);
      assert.equal(first[0][2],allCutEnabled?'owned_allcut_unique_scalable_count':enabled?'owned_unique_scalable_count':'owned_scalable_count');
      const unknown=await connect();
      await assert.rejects(prepared.runAndReadAll(),/TD_E_OWNER_PROBE_INVALID/);
      await sql(unknown,'SELECT td_owner_probe_enroll()');
      await sql(connection,"INSERT INTO main.assertions SELECT * REPLACE (assertion_id || '-duplicate' AS assertion_id) FROM main.assertions");
      await reconcileUsage(connection);
      await activate(connection);assert.equal(await capability(connection),false);
      const fallback=(await prepared.runAndReadAll()).getRows();
      assert.equal(value(fallback),1n);assert.equal(fallback[0][2],'owned_scalable_count');
    } finally {bridge.release(token);prepared.destroySync();}
  });
});
