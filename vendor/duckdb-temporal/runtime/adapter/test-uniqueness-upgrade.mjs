// SPDX-License-Identifier: MIT
// Standalone gate against the exact verified 0.27 engine pair.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {constants,copyFile,lstat,mkdtemp,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {DuckDBInstance} from '@duckdb/node-api';
import {NativeDuckDBPort} from '../build/adapter/native-duckdb-port.mjs';
import {NativeEntityStore} from '../build/adapter/native-entity.js';

const build=fileURLToPath(new URL('../build/',import.meta.url));
const prior=resolve(process.env.TD_TEST_LEGACY_027_BUILD??join(build,'retained-diagnostics-20261105','accepted-027'));
const coreHash='47f2775c53267dc4ad4645ed03324e22d5121304f8cbd4a091dc7307814c9340';
const ownerHash='fbb59eec7a76290a99b3fc1d48e91f9f02a86519c36361c30a7dd74372b9d10f';
const oldCore=join(prior,'temporal_datalog.duckdb_extension');
const oldOwner=join(prior,'owner_probe','temporal_owner_probe.duckdb_extension');
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const sha=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const marker='SELECT version::BIGINT,revision::BIGINT FROM main.store_meta,td_catalog_v1.catalog_revision';
const legacy='schema upgrade_unique version 1 {entity Row {alias:text;when:datetime;}}';
const expanded='schema upgrade_unique version 2 {entity Row {alias:text unique;when:datetime;}}';
const members=['a','b'].map(entityId=>({entityId,operation:'put',type:'Row',validFrom:0n,validTo:10n,
  record:`{alias="${entityId}";when=datetime("bfd0000000000000");}`}));
const batch={schema:'upgrade_unique',version:1,commandId:'legacy-batch',members};
const encoded=JSON.stringify(members,(_,value)=>typeof value==='bigint'?String(value):value);
const legacyPragma=`PRAGMA td_batch_entities_initial('upgrade_unique',1,'legacy-batch',${quote(encoded)})`;
const legacyReceipt="PRAGMA td_batch_receipt('legacy-batch')";

async function oldConnection(database,work){
  const instance=await DuckDBInstance.create(database,{allow_unsigned_extensions:'true',threads:'1'});
  const connection=await instance.connect();
  const sql=async statement=>(await connection.runAndReadAll(statement)).getRows()
    .map(row=>row.map(value=>typeof value==='number'&&Number.isInteger(value)?BigInt(value):value));
  try{
    await sql('LOAD '+quote(oldCore));
    await sql('LOAD '+quote(oldOwner));
    await sql('SELECT system.main.td_owner_probe_enroll()');
    return await work(sql);
  }finally{connection.closeSync();instance.closeSync();}
}

const legacyState=async sql=>({
  definition:await sql("SELECT dsl,ir,content_hash FROM td_catalog_v1.schemas WHERE name='upgrade_unique' AND version=1"),
  history:await sql("PRAGMA td_entity_history_v2('a')"),
  receipt:await sql(legacyReceipt),
});

async function durableState(sql){
  const result=[];
  for(const statement of [marker,'SELECT * FROM main.clock','SELECT * FROM main.storage_usage',
    'SELECT * FROM main.commands ORDER BY position','SELECT * EXCLUDE(v_s),hex(v_s) FROM main.assertions ORDER BY assertion_id',
    'SELECT * FROM td_catalog_v1.schemas ORDER BY name,version','SELECT * FROM td_catalog_v1.schema_unique_activations ORDER BY ALL',
    "SELECT view_name,sql FROM system.main.duckdb_views() WHERE schema_name='td_catalog_v1' ORDER BY view_name"])
    result.push(await sql(statement));
  return result;
}

test('verified 0.27 format nine upgrades to ten without altering batch history and rejects the upgraded store',async t=>{
  const oldManifest=JSON.parse(await readFile(join(prior,'artifact.json'),'utf8'));
  const oldOwnerManifest=JSON.parse(await readFile(join(prior,'owner_probe','artifact.json'),'utf8'));
  assert.equal(oldManifest.extension_version,'0.27.0');
  assert.equal(oldManifest.extension_sha256,coreHash);
  assert.equal(oldOwnerManifest.core_extension_sha256,coreHash);
  assert.equal(oldOwnerManifest.extension_sha256,ownerHash);
  assert.equal(await sha(oldCore),coreHash);
  assert.equal(await sha(oldOwner),ownerHash);
  const directory=await mkdtemp(join(build,'uniqueness-old-fence-'));
  const database=join(directory,'legacy.duckdb');
  const baseline=await oldConnection(database,async sql=>{
    await sql('PRAGMA td_initialize');
    await sql('PRAGMA td_migrate_native_catalog_v2');
    await sql('SELECT system.main.td_owner_probe_activate(0)');
    await sql('PRAGMA td_define_schema_v2('+quote(legacy)+')');
    await sql(legacyPragma);
    assert.deepEqual(await sql(marker),[[9n,3n]]);
    return legacyState(sql);
  });
  assert.equal(baseline.receipt[0][1],1n);
  assert.equal(JSON.parse(baseline.definition[0][1]).format,'td.schema/2');
  const store=await NativeEntityStore.open({database});
  try{
    const declaration=await store.defineSchema(expanded);
    assert.deepEqual(await store.defineSchema(expanded),declaration);
    const replay=await store.batchRecords({...batch,members:[...members].reverse()});
    assert.equal(replay.position,1n);
    assert.equal(replay.requestHash,baseline.receipt[0][5]);
    assert.deepEqual(replay.members,JSON.parse(baseline.receipt[0][6]));
    assert.equal((await store.queryScalable("answer(?e) :- triple(?e,'alias','a').",{validAt:0n})).position,2n);
  }finally{await store.close();}
  const port=await NativeDuckDBPort.openWithOwner({database});
  try{
    await port.activateOwnership();
    const sql=statement=>port.runNative({name:'verify_legacy_uniqueness_upgrade',sql:statement,params:[]});
    assert.deepEqual(await sql(marker),[[10n,3n]]);
    assert.deepEqual(await legacyState(sql),baseline);
  }finally{await port.close();}
  await assert.rejects(lstat(database+'.wal'),{code:'ENOENT'});
  const fence=join(directory,'older-writer.duckdb'),sourceHash=await sha(database);
  await copyFile(database,fence,constants.COPYFILE_EXCL);
  assert.equal(await sha(fence),sourceHash);
  await oldConnection(fence,async sql=>{
    // The old extension may attempt catalog initialization before reaching
    // the literal format fence. Compare all relevant state after its failure.
    const before=await durableState(sql);
    assert.deepEqual(before[0],[[10n,3n]]);
    await assert.rejects(sql('PRAGMA td_initialize'),/TD_E_COMMAND_FORMAT/);
    await assert.rejects(sql('SELECT system.main.td_owner_probe_activate(0)'),/TD_E_COMMAND_FORMAT|TD_E_OWNER_AUDIT_CATALOG/);
    await assert.rejects(sql(legacyReceipt),/TD_E_COMMAND_FORMAT|TD_E_OWNER_PROBE_INVALID/);
    await assert.rejects(sql(legacyPragma),/TD_E_COMMAND_FORMAT|TD_E_OWNER_PROBE_INVALID/);
    assert.deepEqual(await durableState(sql),before);
  });
  assert.equal(await sha(database),sourceHash);
  t.diagnostic('Verified prior core '+coreHash+' and owner '+ownerHash);
});
