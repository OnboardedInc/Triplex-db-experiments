import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {DuckDBInstance} from '@duckdb/node-api';

const build=new URL(import.meta.url.includes('/build/adapter/')?'../':'../build/',import.meta.url);
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const schema="PRAGMA td_define_schema('schema guard version 1 {entity Row {n:int64;}}')";
const put="PRAGMA td_put_entity('guard',1,'Row','one','seed','{n=1;}',0,10)";
const patch="PRAGMA td_patch_entity('guard',1,'Row','one','edit','{n=2;}',2,8)";
const program=quote("answer(?n) :- triple('one','n',?n).");
const bounded=name=>`PRAGMA ${name}(${program},0,-1,100,100,10000,1000)`;
const scalable=name=>`PRAGMA ${name}(${program},0,-1,100,100,100000,100,100000,0)`;
const invalid=/TD_E_OWNER_PROBE_INVALID/;
const rows=async(connection,sql)=>(await connection.runAndReadAll(sql)).getRows();
const activate=connection=>rows(connection,'SELECT system.main.td_owner_probe_activate(0)');
const invalidate=connection=>rows(connection,'SELECT system.main.td_owner_probe_invalidate()');
const status=async connection=>JSON.parse((await rows(connection,'SELECT system.main.td_owner_probe_status()'))[0][0]);

async function fixture(work,beforeLoad,database=':memory:'){
  const instance=await DuckDBInstance.create(database,{allow_unsigned_extensions:'true',threads:'1'});
  const connection=await instance.connect();
  try {
    await beforeLoad?.(connection);
    for(const file of ['temporal_datalog','owner_probe/temporal_owner_probe'])
      await connection.run('LOAD '+quote(fileURLToPath(new URL(file+'.duckdb_extension',build))));
    await connection.run('PRAGMA td_initialize');
    await connection.run('PRAGMA td_migrate_native_catalog_v2');
    await rows(connection,'SELECT system.main.td_owner_probe_enroll()');
    await work(connection,instance);
  } finally {connection.closeSync();instance.closeSync();}
}

test('disk checkpoints preserve audited ownership and concurrent reads; an unknown user connection fences',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'td-owner-checkpoint-'));
  try {
    await fixture(async(connection,instance)=>{
      const reader=await instance.connect();
      try {
        await rows(reader,'SELECT system.main.td_owner_probe_enroll()');
        await connection.run("SET checkpoint_threshold='1 GB'");
        await connection.run('SET debug_checkpoint_sleep_ms=500');
        await activate(connection);
        await rows(connection,schema);
        await rows(connection,put);
        const expected=await rows(reader,scalable('td_query_store_scalable'));
        const before=await status(reader);
        const checkpoint=connection.run('CHECKPOINT');
        try {
          const deadline=Date.now()+3000;
          let during=await status(reader);
          while(!during.checkpointActive && Date.now()<deadline){
            await delay(2);
            during=await status(reader);
          }
          assert.equal(during.checkpointActive,true,'observed DuckDB checkpoint transaction while open');
          assert.deepEqual(await rows(reader,scalable('td_query_store_scalable')),expected);
          assert.equal((await status(reader)).checkpointActive,true,'reader completed during the checkpoint');
        } finally {await checkpoint;}
        const after=await status(reader);
        assert.equal(after.generation,before.generation);
        assert.equal(after.audited,true);
        assert.ok(after.events.some(event=>event.kind==='checkpoint_close'&&event.generation===before.generation));

        await connection.run('SET debug_checkpoint_sleep_ms=0');
        await connection.run("SET checkpoint_threshold='1 KB'");
        const sequence=after.events.at(-1).sequence;
        for(let i=0;i<8;i++){
          const command=put.replace("'one','seed'",`'row-${i}','auto-${i}'`);
          assert.equal((await rows(connection,command))[0][1],BigInt(i+2));
        }
        const automatic=await status(reader);
        assert.equal(automatic.generation,before.generation);
        assert.equal(automatic.audited,true);
        assert.ok(automatic.events.some(event=>event.kind==='checkpoint_close'&&event.sequence>sequence),
          'native write triggered an automatic checkpoint');
        assert.deepEqual((await rows(reader,scalable('td_query_store_scalable'))).map(row=>row[6]),expected.map(row=>row[6]));

        const unknown=await instance.connect();
        try {
          await assert.rejects(rows(reader,scalable('td_query_store_scalable')),invalid);
        } finally {unknown.closeSync();}
        await assert.rejects(rows(reader,scalable('td_query_store_scalable')),invalid);
        await activate(connection);
        assert.deepEqual((await rows(reader,scalable('td_query_store_scalable'))).map(row=>row[6]),expected.map(row=>row[6]));
      } finally {reader.closeSync();}
    },undefined,join(directory,'checkpoint.duckdb'));
  } finally {await rm(directory,{recursive:true,force:true});}
});

test('persisted aliases, empty reads and writes require audited ownership',()=>fixture(async (connection,instance)=>{
  const reads=[
    "PRAGMA td_entity_receipt('missing')",
    "PRAGMA td_entity_history('missing')",
    "PRAGMA td_entity_at('missing',0,0)",
    ...['td_query_store','td_query_store_native','td_query_store_preferred_native'].map(bounded),
    ...['td_query_store_scalable','td_query_store_owned'].map(scalable),
  ];
  const limited=sql=>sql.replace(/^(PRAGMA \w+)\((.*)\)$/,'$1_with_limits($2,100,100000)');
  const writes=[schema,put,patch,limited(put),limited(patch)];
  await rows(connection,'SELECT td_owner_probe_arm()');
  for(const sql of [...reads,...writes])await assert.rejects(rows(connection,sql),invalid,sql);
  assert.deepEqual(await rows(connection,'SELECT position FROM main.clock'),[[0n]]);
  assert.deepEqual(await rows(connection,'SELECT count(*) FROM td_catalog_v1.schemas'),[[0n]]);

  await activate(connection);
  for(const sql of reads.slice(0,3))assert.deepEqual(await rows(connection,sql),[],sql);
  await rows(connection,schema);
  await rows(connection,put);
  assert.deepEqual(await rows(connection,scalable('td_query_store_scalable')),
    await rows(connection,scalable('td_query_store_owned')));
  const prepared=await connection.prepare(bounded('td_query_store_native'));
  try{
    const result=(await prepared.runAndReadAll()).getRows();
    assert.equal(JSON.parse(result[0][6])[0].i,'1');
    await invalidate(connection);
    await assert.rejects(prepared.runAndReadAll(),invalid);
    await assert.rejects(rows(connection,"PRAGMA td_entity_history('one')"),invalid);
    await assert.rejects(rows(connection,"PRAGMA td_entity_receipt('seed')"),invalid);
    await connection.run("UPDATE main.assertions SET payload_hash='bad'");
    await assert.rejects(rows(connection,put),invalid,'idempotent replay requires current ownership');
    assert.deepEqual(await rows(connection,'SELECT position FROM main.clock'),[[1n]]);
    await connection.run('UPDATE main.assertions SET payload_hash=sha256(payload)');
    await activate(connection);
    assert.deepEqual((await prepared.runAndReadAll()).getRows(),result);
    const unknown=await instance.connect();
    try{
      await assert.rejects(prepared.runAndReadAll(),invalid);
      await assert.rejects(activate(connection),/TD_E_OWNER_PROBE_ENROLLMENT/);
    } finally {unknown.closeSync();}
    await activate(connection);
    assert.deepEqual((await prepared.runAndReadAll()).getRows(),result);
  } finally {prepared.destroySync();}
  await rows(connection,patch);
  assert.equal((await rows(connection,"PRAGMA td_entity_receipt('edit')"))[0][1],2n);
}));

test('the activation audit still checks global catalog, retained carriers and history',()=>fixture(async connection=>{
  await activate(connection);
  await rows(connection,schema);
  await rows(connection,put);
  await invalidate(connection);
  await connection.run(`INSERT INTO main.assertions SELECT * REPLACE (
    'legacy' AS assertion_id, 'legacy' AS e, NULL::VARCHAR AS command_id, 'python' AS origin, 'bad' AS payload_hash
  ) FROM main.assertions WHERE e='one'`);
  await assert.rejects(activate(connection),/TD_E_QUERY_CARRIER/);
  await assert.rejects(rows(connection,bounded('td_query_store')),invalid);
  await connection.run("DELETE FROM main.assertions WHERE assertion_id='legacy'");
  await connection.run("UPDATE td_catalog_v1.entity_owners SET entity_type='Other'");
  await assert.rejects(activate(connection),/TD_E_COMMAND_HISTORY/);
  await connection.run("UPDATE td_catalog_v1.entity_owners SET entity_type='Row'");
  await connection.run("INSERT INTO td_catalog_v1.entity_assertion_sources VALUES ('missing','parent','seed','left')");
  await assert.rejects(activate(connection),/TD_E_COMMAND_HISTORY/);
  await connection.run("DELETE FROM td_catalog_v1.entity_assertion_sources WHERE assertion_id='missing'");
  await connection.run('DELETE FROM main.clock');
  await assert.rejects(activate(connection),/TD_E_COMMAND_FORMAT/);
  await assert.rejects(rows(connection,scalable('td_query_store_scalable')),invalid);
  await connection.run('INSERT INTO main.clock VALUES (TRUE,1)');
  await connection.run('UPDATE main.storage_usage SET retained_bytes=retained_bytes-1');
  await assert.rejects(activate(connection),/TD_E_OWNER_AUDIT_USAGE/);
  await assert.rejects(rows(connection,bounded('td_query_store')),invalid);
  await connection.run('UPDATE main.storage_usage SET retained_bytes=retained_bytes+1');
  await activate(connection);
  assert.equal(JSON.parse((await rows(connection,bounded('td_query_store_native')))[0][6])[0].i,'1');
}));


test('stored and temporary macros cannot supply a native owner certificate',()=>fixture(async connection=>{
  assert.deepEqual(await rows(connection,'SELECT td_owner_probe_validated_check(),td_owner_probe_uniqueness_check()'),[[true,3]]);
  await assert.rejects(rows(connection,schema),invalid);
  await assert.rejects(rows(connection,scalable('td_query_store_scalable')),invalid);
  await assert.rejects(activate(connection),/TD_E_OWNER_AUDIT_HELPERS/);
  assert.deepEqual(await rows(connection,'SELECT count(*) FROM td_catalog_v1.schemas'),[[0n]]);
  for(const name of ['validated_check','uniqueness_check','activate'])
    await connection.run('DROP MACRO td_owner_probe_'+name);
  await activate(connection);
  await rows(connection,schema);
  await rows(connection,put);
  await connection.run('CREATE TEMP MACRO td_owner_probe_validated_check() AS false');
  assert.equal(JSON.parse((await rows(connection,bounded('td_query_store_native')))[0][6])[0].i,'1');
  await invalidate(connection);
  await connection.run('CREATE OR REPLACE TEMP MACRO td_owner_probe_validated_check() AS true');
  await assert.rejects(rows(connection,bounded('td_query_store_native')),invalid);
},async connection=>{
  await connection.run('CREATE MACRO td_owner_probe_validated_check() AS true');
  await connection.run('CREATE MACRO td_owner_probe_uniqueness_check() AS 3');
  await connection.run('CREATE MACRO td_owner_probe_activate(x) AS true');
}));

test('activation rejects replaced or missing views before it trusts their proof',()=>fixture(async connection=>{
  await activate(connection);
  await rows(connection,schema);
  await rows(connection,put);
  const [[historyView]]=await rows(connection,`SELECT sql FROM system.main.duckdb_views()
    WHERE schema_name='td_catalog_v1' AND view_name='entity_history'`);
  const historyAliases=/\ba\.e AS "?entity_id"?, a\.a AS "?attribute"?/i;
  assert.match(historyView,historyAliases);
  const swapped=historyView.replace(/^CREATE VIEW /i,'CREATE OR REPLACE VIEW ')
    .replace(historyAliases,'a.e AS attribute, a.a AS entity_id');
  for(const tamper of [
    swapped,
    'CREATE OR REPLACE VIEW td_catalog_v1.native_catalog_integrity AS SELECT true ok',
    'CREATE OR REPLACE VIEW td_catalog_v1.schema_references AS SELECT NULL schema_name WHERE false',
    'DROP VIEW td_catalog_v1.entity_history',
    'CREATE OR REPLACE VIEW td_catalog_v1.entities AS SELECT NULL schema_name WHERE false',
  ]){
    await invalidate(connection);
    await connection.run(tamper);
    await assert.rejects(activate(connection),/TD_E_OWNER_AUDIT_CATALOG/,tamper);
    await assert.rejects(rows(connection,"PRAGMA td_entity_receipt('seed')"),invalid);
    await connection.run('PRAGMA td_initialize');
    await activate(connection);
    assert.equal((await rows(connection,"PRAGMA td_entity_receipt('seed')"))[0][1],1n);
  }
}));


test('owner activation, new plans and cached plans require canonical comparison settings',()=>fixture(async connection=>{
  await activate(connection);
  await rows(connection,schema);
  await rows(connection,put);
  const sql=bounded('td_query_store_native');
  const cached=await connection.prepare(sql);
  const incompatible=/TD_E_OWNER_CONFIG/;
  try{
    const expected=(await cached.runAndReadAll()).getRows();
    for(const [setting,value] of [
      ['default_collation','nocase'],['default_order','DESC'],['default_null_order','NULLS_FIRST'],
    ]){
      await connection.run(`SET GLOBAL ${setting}=${quote(value)}`);
      await assert.rejects(cached.runAndReadAll(),incompatible);
      await assert.rejects(connection.prepare(sql),incompatible);
      await assert.rejects(activate(connection),incompatible);
      await connection.run(`RESET GLOBAL ${setting}`);
      await assert.rejects(cached.runAndReadAll(),invalid);
      await activate(connection);
      assert.deepEqual((await cached.runAndReadAll()).getRows(),expected);
    }
  } finally {cached.destroySync();}
}));
