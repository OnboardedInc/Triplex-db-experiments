import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {DuckDBInstance} from '@duckdb/node-api';

const runtime=resolve(process.env.TD_ALL_CUT_RUNTIME??'.');
const manifest=JSON.parse(await readFile(runtime+'/build/artifact.json','utf8'));
const allEnabled=manifest.experimental_all_cut_unique_fast_path===true;
const currentEnabled=manifest.experimental_current_unique_fast_path===true;
const bridge=createRequire(import.meta.url)(runtime+'/build/temporal_control.node');
bridge.initialize(runtime+'/build/temporal_datalog.duckdb_extension',manifest.extension_sha256);
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const sql=async(connection,statement)=>(await connection.runAndReadAll(statement)).getRows();
const activate=connection=>sql(connection,'SELECT td_owner_probe_activate(0)');
const reconcileUsage = connection => sql(connection,`UPDATE main.storage_usage
  SET retained_count=actual.n,retained_bytes=actual.b FROM (
    SELECT count(*) n,coalesce(sum(octet_length(encode(e))+octet_length(encode(a))+
      octet_length(encode(payload))+coalesce(octet_length(encode(extra_json)),0)),0) b
    FROM main.assertions) actual WHERE singleton`);
const capabilities=async connection=>(await sql(connection,'SELECT td_owner_probe_uniqueness_check()'))[0][0];
const count='answer(count()) :- triple(?e,?a,?v).';
const countValue=rows=>BigInt(JSON.parse(rows[0][6])[0].i);
const scan="answer(?v) :- triple('one','n',?v).";
const querySql=(known=-1,valid=0,program=count,owned=true)=>'PRAGMA td_query_store_'+(owned?'owned':'scalable')+'('+
  [quote(program),valid,known,1000,1000,1048576,1000,1048576,0].join(',')+')';
const query=(connection,known=-1,valid=0,program=count,owned=true)=>sql(connection,querySql(known,valid,program,owned));
const normalReason=known=>allEnabled?'owned_allcut_unique_scalable_count':
  known===-1&&currentEnabled?'owned_unique_scalable_count':'owned_scalable_count';

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
    await sql(connection,"PRAGMA td_define_schema('schema all_cuts version 1 {entity Row {n:int64 many;s:text many;b:boolean many;f:float64 many;}}')");
    await sql(connection,"PRAGMA td_put_entity('all_cuts',1,'Row','one','one','{n=1;}',0,10)");
    await work({connection,connect:async()=>{const other=await instance.connect();others.push(other);return other;}});
  } finally {
    for(const other of others)other.closeSync();
    connection.closeSync();instance.closeSync();
  }
}

test('all-cut capability requires audited activation and is captured once by current and historical queries',async()=>{
  await fixture(async({connection})=>{
    await sql(connection,'SELECT td_owner_probe_invalidate()');
    await assert.rejects(capabilities(connection),/TD_E_OWNER_PROBE_INVALID/);
    await sql(connection,'SELECT td_owner_probe_arm()');
    await assert.rejects(capabilities(connection),/TD_E_OWNER_PROBE_INVALID/);
    await activate(connection);
    await sql(connection,"PRAGMA td_put_entity('all_cuts',1,'Row','one','two','{n=1;}',0,10)");
    assert.equal(await capabilities(connection),BigInt((currentEnabled?1:0)+(allEnabled?2:0)));
    for(const known of [-1,1,2]){
      const result=await query(connection,known);
      assert.equal(result[0][2],normalReason(known));
      assert.equal(countValue(result),1n);
      const template=(await sql(connection,'SELECT td_query_store_owned_sql_v1('+
        [quote(count),0,known,1000,1000,1048576,1000,1048576].join(',')+')'))[0][0];
      assert.equal((template.match(/td_owner_probe_uniqueness_check\(\)/g)??[]).length,
        allEnabled||known===-1&&currentEnabled?1:0);
    }
    const snapshot=JSON.parse((await sql(connection,'SELECT td_owner_probe_status()'))[0][0]);
    assert.equal(snapshot.allCutUnique,allEnabled);
  });
});

test('closed and live duplicate carriers prevent all-cut certification while preserving set answers',async()=>{
  for(const closed of [false,true])await fixture(async({connection})=>{
    if(closed)await sql(connection,"PRAGMA td_put_entity('all_cuts',1,'Row','one','two','{n=2;}',0,10)");
    await sql(connection,"INSERT INTO main.assertions SELECT * REPLACE(assertion_id||'-duplicate' AS assertion_id) FROM main.assertions WHERE command_id='one'");
    await reconcileUsage(connection);
    await activate(connection);
    assert.equal(await capabilities(connection),BigInt(closed&&currentEnabled?1:0));
    const historical=await query(connection,1);
    assert.equal(historical[0][2],'owned_scalable_count');
    assert.equal(countValue(historical),1n);
    assert.deepEqual((await query(connection,-1)).map(row=>row[6]),(await query(connection,-1,0,count,false)).map(row=>row[6]));
  });
});

test('nonempty future starts and finite future ends cannot earn either capability',async()=>{
  for(const kind of ['start','end'])await fixture(async({connection})=>{
    if(kind==='start'){
      await sql(connection,"PRAGMA td_put_entity('all_cuts',1,'Row','future','future','{n=2;}',0,10)");
      await sql(connection,'UPDATE main.clock SET position=1');
    }else await sql(connection,'UPDATE main.assertions SET tx_to=10');
    await activate(connection);assert.equal(await capabilities(connection),0n);
    assert.equal((await query(connection,1))[0][2],'owned_scalable_count');
  });
});

test('rectangles empty in either dimension are excluded from the all-cut frontier and overlap proof',async()=>{
  for(const empty of ['valid','transaction'])await fixture(async({connection})=>{
    const bounds=empty==='valid'?'10::BIGINT AS valid_from,10::BIGINT AS valid_to,100::BIGINT AS tx_from,101::BIGINT AS tx_to':
      '100::BIGINT AS tx_from,100::BIGINT AS tx_to';
    await sql(connection,"INSERT INTO main.assertions SELECT * REPLACE(assertion_id||'-empty' AS assertion_id,"+
      "NULL::VARCHAR AS command_id,NULL::VARCHAR AS corrected_by,'legacy-empty' AS e,'triplex' AS origin,TRUE AS interop,"+bounds+') FROM main.assertions');
    await reconcileUsage(connection);
    await activate(connection);assert.equal(await capabilities(connection),allEnabled?2n:0n);
    assert.equal((await query(connection,1))[0][2],normalReason(1));
  });
});

test('adjacent valid segments in one transaction interval earn all-cut certification',async()=>{
  await fixture(async({connection})=>{
    await sql(connection,'SELECT td_owner_probe_invalidate()');
    await sql(connection,'UPDATE main.assertions SET valid_to=5');
    await sql(connection,"INSERT INTO main.assertions SELECT * REPLACE(assertion_id||'-adjacent' AS assertion_id,5::BIGINT AS valid_from,10::BIGINT AS valid_to) FROM main.assertions");
    await reconcileUsage(connection);
    await activate(connection);
    assert.equal(await capabilities(connection),BigInt((currentEnabled?1:0)+(allEnabled?2:0)));
    for(const valid of [-1,0,4,5,9,10])for(const known of [0,1,-1]){
      const result=await query(connection,known,valid);
      assert.equal(result[0][2],normalReason(known));
      assert.equal(countValue(result),known!==0&&valid>=0&&valid<10?1n:0n);
    }
  });
});

test('different overlapping transaction groups conservatively reject all-cut even with disjoint valid intervals',async()=>{
  await fixture(async({connection})=>{
    await sql(connection,"PRAGMA td_put_entity('all_cuts',1,'Row','advance','advance','{}',0,10)");
    await sql(connection,'SELECT td_owner_probe_invalidate()');
    for(const [tx,from,to] of [[1,0,5],[2,5,10]])await sql(connection,
      `INSERT INTO main.assertions SELECT * REPLACE(
        'legacy-${tx}' AS assertion_id,'legacy' AS e,NULL::VARCHAR AS command_id,
        'triplex' AS origin,TRUE AS interop,${tx}::BIGINT AS tx_from,${from}::BIGINT AS valid_from,${to}::BIGINT AS valid_to
      ) FROM main.assertions WHERE command_id='one'`);
    await reconcileUsage(connection);
    await activate(connection);
    assert.equal(await capabilities(connection),currentEnabled?1n:0n);
    const legacy="answer(?v) :- triple('legacy','n',?v).";
    for(const known of [1,2])for(const valid of [-1,0,4,5,9,10]){
      const result=await query(connection,known,valid,legacy);
      assert.equal(result[0][2],'owned_scalable_single_atom');
      const values=result.flatMap(row=>row[6]===null?[]:JSON.parse(row[6]).map(cell=>cell.i));
      assert.deepEqual(values,valid>=0&&valid<(known===1?5:10)?['1']:[]);
    }
  });
});

test('cached historical plans follow revalidated capability loss and unknown connections invalidate execution',async()=>{
  await fixture(async({connection,connect})=>{
    await activate(connection);
    const template=(await sql(connection,'SELECT td_query_store_owned_sql_v1('+
      [quote(count),0,1,1000,1000,1048576,1000,1048576].join(',')+')'))[0][0];
    const prepared=await connection.prepare(template),token=bridge.create(5000);
    prepared.bindBigInt(1,token);
    try {
      assert.equal((await prepared.runAndReadAll()).getRows()[0][2],normalReason(1));
      await sql(connection,'SELECT td_owner_probe_invalidate()');
      await sql(connection,'UPDATE main.assertions SET valid_to=5');
      await sql(connection,"INSERT INTO main.assertions SELECT * REPLACE(assertion_id||'-overlap' AS assertion_id,4::BIGINT AS valid_from,10::BIGINT AS valid_to) FROM main.assertions");
      await reconcileUsage(connection);
      await activate(connection);
      assert.equal(await capabilities(connection),0n);
      const result=(await prepared.runAndReadAll()).getRows();
      assert.equal(result[0][2],'owned_scalable_count');
      assert.equal(countValue(result),1n);
      assert.equal(countValue(await query(connection,1,4)),1n);
      await connect();
      await assert.rejects(prepared.runAndReadAll(),/TD_E_OWNER_PROBE_INVALID/);
    }finally{bridge.release(token);prepared.destroySync();}
  });
});

test('all-cut typed answers preserve integer endpoints Unicode and exact floating payloads',async()=>{
  await fixture(async({connection})=>{
    const record='{n=-9223372036854775808;n=9223372036854775807;s="é🙂";b=true;f=f64("0000000000000001");f=f64("8000000000000000");}';
    await sql(connection,"PRAGMA td_put_entity('all_cuts',1,'Row','one','typed',"+quote(record)+',0,10)');
    await activate(connection);
    for(const known of [-1,1,2])for(const program of ['answer(?a,?v) :- triple(?e,?a,?v).',count]){
      const actual=await query(connection,known,0,program);
      const strict=await query(connection,known,0,program,false);
      assert.deepEqual(actual.map(row=>row[6]),strict.map(row=>row[6]));
      assert.equal(actual[0][0],strict[0][0]);
    }
  });
});
