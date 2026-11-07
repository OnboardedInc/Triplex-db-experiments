// Run separately with the preserved, verified 0.25 artifact pair.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFile,mkdtemp,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {DuckDBInstance} from '@duckdb/node-api';
import {NativeDuckDBPort} from '../build/adapter/native-duckdb-port.mjs';
import {NativeEntityStore} from '../build/adapter/native-entity.js';

const build=fileURLToPath(new URL('../build/',import.meta.url));
const prior=resolve(process.env.TD_TEST_LEGACY_025_BUILD??join(build,'retained-diagnostics-20261105','accepted-025'));
const oldCore=join(prior,'temporal_datalog.duckdb_extension');
const oldOwner=join(prior,'owner_probe','temporal_owner_probe.duckdb_extension');
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const expectedCore='652a864ec192fb2ae14ba50414ca1b477d04c3bf57d3985c19f0bd1e072cc3a3';
const expectedOwner='526f7aa483d8e90445941501f8b52f433cc0c3cbcdaf9f8bf6a32af963360c13';
const priorDSL='schema upgrade_document version 1 {entity Document {label:text;enabled:boolean;size:int64;ratio:float64;when:datetime;link:ref_value(Document);}}';
const priorRecord='{label="é🙂";enabled=false;size=9223372036854775807;ratio=f64("0000000000000001");when=datetime("bfd0000000000000");link=ref("legacy");}';
const expandedDSL='schema upgrade_document version 2 {entity Document {source:json;asset:blob;}}';
const legacy={schema:'upgrade_document',version:1,type:'Document',entityId:'legacy',record:priorRecord,validFrom:0n,validTo:10n};
const oldPut=(operation,command,from,to)=>
  `PRAGMA td_${operation}_entity_v2('upgrade_document',1,'Document','legacy',${quote(command)},${quote(priorRecord)},${from},${to})`;
const oldQuery=`PRAGMA td_query_store_values_v2(${quote("answer(?v) :- triple('legacy',?a,?v).")},2,2,100,100,100000,1000,0,1)`;
const marker='SELECT version::BIGINT FROM main.store_meta';
const numericRows=rows=>rows.map(row=>row.map(value=>typeof value==='number'&&Number.isInteger(value)?BigInt(value):value));

async function previousBinary(database,work){
  const instance=await DuckDBInstance.create(database,{allow_unsigned_extensions:'true',threads:'1'});
  try{
    const connection=await instance.connect();
    try{
      await connection.run('LOAD '+quote(oldCore));
      await connection.run('LOAD '+quote(oldOwner));
      const sql=async statement=>numericRows((await connection.runAndReadAll(statement)).getRows());
      await sql('SELECT system.main.td_owner_probe_enroll()');
      return await work(sql);
    }finally{connection.closeSync();}
  }finally{instance.closeSync();}
}

async function legacySnapshot(sql){
  const receipts=[];
  for(const command of ['legacy-put','legacy-patch'])receipts.push(await sql('PRAGMA td_entity_receipt('+quote(command)+')'));
  return {
    schema:await sql("SELECT dsl,ir,content_hash FROM td_catalog_v1.schemas WHERE name='upgrade_document' AND version=1"),
    history:await sql("PRAGMA td_entity_history_v2('legacy')"),
    point:await sql("PRAGMA td_entity_at_v2('legacy',2,2)"),
    answers:await sql(oldQuery),receipts,
  };
}

function publicReceipt(rows){
  assert.equal(rows.length,1);
  const [commandId,position,asserted,retracted,schema,version,type,entityId,schemaHash,requestHash]=rows[0];
  return {commandId,position,asserted:JSON.parse(asserted),retracted:JSON.parse(retracted),
    schema,version:Number(version),type,entityId,schemaHash,requestHash};
}

async function physicalSnapshot(sql){
  const result=[];
  for(const statement of [marker,'SELECT * FROM main.clock','SELECT * FROM main.storage_usage',
    'SELECT * FROM main.commands ORDER BY command_id',
    'SELECT * EXCLUDE(v_s),hex(v_s) FROM main.assertions ORDER BY assertion_id',
    'SELECT * FROM td_catalog_v1.schemas ORDER BY name,version',
    'SELECT * FROM td_catalog_v1.entity_owners ORDER BY entity_id',
    'SELECT * FROM td_catalog_v1.entity_commands ORDER BY command_id',
    'SELECT * FROM td_catalog_v1.entity_patch_commands ORDER BY command_id',
    'SELECT * FROM td_catalog_v1.entity_assertion_sources ORDER BY assertion_id',
    'SELECT * FROM td_catalog_v1.catalog_revision',
    "SELECT view_name,sql FROM system.main.duckdb_views() WHERE schema_name='td_catalog_v1' ORDER BY view_name"]){
    result.push(await sql(statement));
  }
  return result;
}

test('verified 0.25 format eight preserves six-tag identity through upgrade and rejects the resulting format nine',async t=>{
  assert.equal(await hash(oldCore),expectedCore);
  assert.equal(await hash(oldOwner),expectedOwner);
  const directory=await mkdtemp(join(build,'json-blob-previous-binary-'));
  const database=join(directory,'legacy.duckdb');
  const baseline=await previousBinary(database,async sql=>{
    await sql('PRAGMA td_initialize');
    await sql('PRAGMA td_migrate_native_catalog_v2');
    await sql('SELECT system.main.td_owner_probe_activate(0)');
    await sql('PRAGMA td_define_schema_v2('+quote(priorDSL)+')');
    await sql(oldPut('put','legacy-put',0,10));
    await sql(oldPut('patch','legacy-patch',1,4));
    assert.deepEqual(await sql(marker),[[8n]]);
    const baseline=await legacySnapshot(sql);
    assert.equal(baseline.history.length,24);
    assert.deepEqual(baseline.answers.map(row=>JSON.parse(row[6])),[
      [{tag:1,s:'é🙂',b:null,i:null,f:null}],
      [{tag:2,s:null,b:false,i:null,f:null}],
      [{tag:3,s:null,b:null,i:'9223372036854775807',f:null}],
      [{tag:4,s:null,b:null,i:null,f:'0000000000000001'}],
      [{tag:5,s:'legacy',b:null,i:null,f:null}],
      [{tag:6,s:null,b:null,i:null,f:'bfd0000000000000'}],
    ]);
    return baseline;
  });

  const store=await NativeEntityStore.open({database,readers:2});
  try{
    await store.defineSchema(expandedDSL);
    assert.deepEqual(await store.putRecord({...legacy,commandId:'legacy-put'}),publicReceipt(baseline.receipts[0]));
    assert.deepEqual(await store.patchRecord({...legacy,commandId:'legacy-patch',validFrom:1n,validTo:4n}),publicReceipt(baseline.receipts[1]));
    const value={tag:'json',value:' {"a":1} '};
    const asset={tag:'blob',value:'opaque-id',mimeType:'text/plain',size:3,filename:'é🙂.txt'};
    const receipt=await store.put({...legacy,version:2,commandId:'expanded',entityId:'expanded',
      fields:[{attribute:'source',value},{attribute:'asset',value:asset}]});
    assert.equal(receipt.position,3n);
    assert.deepEqual((await store.at('expanded',{knownAt:3n,validAt:2n})).map(fact=>fact.value),[asset,value]);
  }finally{await store.close();}

  const port=await NativeDuckDBPort.openWithOwner({database});
  try{
    await port.activateOwnership();
    const sql=statement=>port.runNative({name:'read_prior_binary_snapshot',sql:statement,params:[]});
    assert.deepEqual(await sql(marker),[[9n]]);
    assert.deepEqual(await legacySnapshot(sql),baseline);
  }finally{await port.close();}

  const fence=join(directory,'old-fence.duckdb');
  await copyFile(database,fence);
  const sourceHash=await hash(database);
  assert.equal(await hash(fence),sourceHash);
  await previousBinary(fence,async sql=>{
    const before=await physicalSnapshot(sql);
    assert.deepEqual(before[0],[[9n]]);
    await assert.rejects(sql('PRAGMA td_initialize'),/TD_E_COMMAND_FORMAT/);
    await assert.rejects(sql('SELECT system.main.td_owner_probe_activate(0)'),/TD_E_COMMAND_FORMAT|TD_E_OWNER_AUDIT_CATALOG/);
    await assert.rejects(sql(oldPut('put','blocked',0,10)),/TD_E_COMMAND_FORMAT|TD_E_OWNER_PROBE_INVALID/);
    assert.deepEqual(await physicalSnapshot(sql),before);
  });
  assert.equal(await hash(database),sourceHash);
  t.diagnostic('Pinned 0.25 core '+expectedCore+' and companion '+expectedOwner);
});
