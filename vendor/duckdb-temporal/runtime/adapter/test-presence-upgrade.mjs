// SPDX-License-Identifier: MIT
// Standalone gate against an exact verified Mac ARM64 predecessor pair.
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
const profiles={
  '028':{version:'0.28.0',archive:'accepted-028-runtime',
    core:'0e5c2a02c15f146d9040c7f41ea21f8d6bb8080b98468cdb1d5667f24c404fa5',
    owner:'fe13a80efe5202d73e34f6a69e1452a8abee35f4e6c4b1b5459bc925e50b37e2'},
  '031':{version:'0.31.0',archive:'accepted-031-runtime',
    core:'5191449b92d71209f9739771c8e5d03c6a5525b5e800ffdde91e28db83b4b946',
    owner:'4b872cb97f4c95536f1139e215351c717c03e557476e18fb580ffb21a1f183f4'},
  '030':{version:'0.30.0',archive:'accepted-030-runtime',
    core:'cf4d2a3563527214df8ffefb6c0a10611ddcf86e41e48c651b1a7f688a2dce57',
    owner:'4b872cb97f4c95536f1139e215351c717c03e557476e18fb580ffb21a1f183f4'},
};
const selected=process.env.TD_TEST_PRESENCE_PREDECESSOR??'028';
assert.ok(Object.hasOwn(profiles,selected),'Select predecessor 028, 030 or 031');
const profile=profiles[selected];
const prior=resolve(process.env['TD_TEST_LEGACY_'+selected+'_BUILD']??
  join(build,'retained-diagnostics-20261105',profile.archive,'build'));
const core=join(prior,'temporal_datalog.duckdb_extension'),owner=join(prior,'owner_probe','temporal_owner_probe.duckdb_extension');
const coreHash=profile.core,ownerHash=profile.owner;
const sha=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const marker='SELECT version::BIGINT,revision::BIGINT FROM main.store_meta,td_catalog_v1.catalog_revision';
const members=[{entityId:'old',operation:'put',type:'Row',validFrom:0n,validTo:10n,record:'{label="shared";}'}];
const batch={schema:'old_presence',version:1,commandId:'old-batch',members};
const encoded=JSON.stringify(members,(_,value)=>typeof value==='bigint'?String(value):value);
const batchSql=`PRAGMA td_batch_entities_initial('old_presence',1,'old-batch',${quote(encoded)})`;
const schemaSql="PRAGMA td_define_schema_v2('schema old_presence version 1 {entity Row {label:text unique;}}')";

async function oldEngine(database,work){
  const instance=await DuckDBInstance.create(database,{allow_unsigned_extensions:'true',threads:'1'});
  const connection=await instance.connect();
  const sql=async statement=>(await connection.runAndReadAll(statement)).getRows()
    .map(row=>row.map(value=>typeof value==='number'&&Number.isInteger(value)?BigInt(value):value));
  try{
    await sql('LOAD '+quote(core));
    await sql('LOAD '+quote(owner));
    await sql('SELECT system.main.td_owner_probe_enroll()');
    return await work(sql);
  }finally{connection.closeSync();instance.closeSync();}
}

const oldState=async sql=>({
  definition:await sql("SELECT ir,content_hash FROM td_catalog_v1.schemas WHERE name='old_presence'"),
  receipt:await sql("PRAGMA td_batch_receipt('old-batch')"),
  history:await sql("PRAGMA td_entity_history_v2('old')"),
  unique:await sql("SELECT * FROM td_catalog_v1.unique_domains WHERE schema_name='old_presence'"),
});
async function fenceState(sql){
  const result=[];
  for(const statement of [
    marker,'SELECT * FROM main.clock','SELECT * FROM main.commands ORDER BY position',
    'SELECT * FROM td_catalog_v1.entity_presence_edits ORDER BY command_id',
    "SELECT view_name,sql FROM system.main.duckdb_views() WHERE schema_name='td_catalog_v1' ORDER BY view_name",
  ])result.push(await sql(statement));
  return result;
}

test('archived '+profile.version+' format ten upgrades to eleven, preserves its data, and rejects eleven',async t=>{
  const priorCore=JSON.parse(await readFile(join(prior,'artifact.json'),'utf8'));
  const priorOwner=JSON.parse(await readFile(join(prior,'owner_probe','artifact.json'),'utf8'));
  assert.equal(priorCore.extension_version,profile.version);
  assert.equal(priorCore.extension_sha256,coreHash);
  assert.equal(priorOwner.core_extension_sha256,coreHash);
  assert.equal(priorOwner.extension_sha256,ownerHash);
  assert.equal(await sha(core),coreHash);
  assert.equal(await sha(owner),ownerHash);
  const dir=await mkdtemp(join(build,'presence-old-fence-')),database=join(dir,'data.duckdb');
  const baseline=await oldEngine(database,async sql=>{
    await sql('PRAGMA td_initialize');
    await sql('PRAGMA td_migrate_native_catalog_v2');
    await sql('SELECT system.main.td_owner_probe_activate(0)');
    await sql(schemaSql);
    await sql(batchSql);
    assert.deepEqual(await sql(marker),[[10n,3n]]);
    return await oldState(sql);
  });
  const store=await NativeEntityStore.open({database});
  try{
    assert.equal((await store.batchRecords(batch)).requestHash,baseline.receipt[0][5]);
    const definition='schema new_presence version 1 {entity Person live {label:text;}}';
    const declaration=await store.defineSchema(definition);
    assert.deepEqual(await store.defineSchema(definition),declaration);
    const tracked={schema:'new_presence',version:1,type:'Person',entityId:'live',commandId:'live',
      validFrom:-10n,validTo:0n,record:'{}'};
    assert.equal((await store.putRecord(tracked)).position,4n);
    assert.equal(await store.presenceAt('live',{knownAt:4n,validAt:-1n}),true);
    assert.equal(await store.presenceAt('old',{knownAt:4n,validAt:-1n}),null);
    await assert.rejects(store.putRecord({...tracked,schema:'old_presence',type:'Row',entityId:'dup',
      commandId:'dup',record:'{label="shared";}',validFrom:0n,validTo:10n}),/TD_E_COMMAND_UNIQUE/);
  }finally{await store.close();}
  const port=await NativeDuckDBPort.openWithOwner({database});
  try{
    await port.activateOwnership();
    const sql=statement=>port.runNative({name:'presence_upgrade',sql:statement,params:[]});
    assert.deepEqual(await sql(marker),[[11n,3n]]);
    assert.deepEqual(await oldState(sql),baseline);
  }finally{await port.close();}
  await assert.rejects(lstat(database+'.wal'),{code:'ENOENT'});
  const clone=join(dir,'prior-writer.duckdb'),sourceHash=await sha(database);
  await copyFile(database,clone,constants.COPYFILE_EXCL);
  assert.equal(await sha(clone),sourceHash);
  await oldEngine(clone,async sql=>{
    const before=await fenceState(sql);
    await assert.rejects(sql('PRAGMA td_initialize'),/TD_E_COMMAND_FORMAT/);
    await assert.rejects(sql('SELECT system.main.td_owner_probe_activate(0)'),/TD_E_COMMAND_FORMAT|TD_E_OWNER_AUDIT_CATALOG/);
    await assert.rejects(sql("PRAGMA td_batch_receipt('old-batch')"),/TD_E_COMMAND_FORMAT|TD_E_OWNER_PROBE_INVALID/);
    // History binds its old schema compiler before reaching the execution guard.
    await assert.rejects(sql("PRAGMA td_entity_history_v2('old')"),/TD_E_SCHEMA_SYNTAX: expected '\{' at byte 45/);
    await assert.rejects(sql(batchSql.replace('old-batch','prior-fenced-batch')),/TD_E_COMMAND_FORMAT|TD_E_OWNER_PROBE_INVALID/);
    assert.deepEqual(await fenceState(sql),before);
  });
  assert.equal(await sha(database),sourceHash);
  t.diagnostic('Verified prior core '+coreHash+' and owner '+ownerHash);
});
