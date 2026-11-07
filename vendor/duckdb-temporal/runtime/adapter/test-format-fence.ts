import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {activateEngineOwner} from './native-test-fixture.js';
import {DuckDBConnection,DuckDBInstance} from '@duckdb/node-api';

const binary=fileURLToPath(new URL('../temporal_datalog.duckdb_extension',import.meta.url));
const schema='schema format_fence version 1 {entity Row {n:int64;}}';
const quote=(text:string)=>"'"+text.replaceAll("'","''")+"'";
const put=(entry:string,entity:string,command:string)=>'PRAGMA '+entry+"('format_fence',1,'Row',"+
  quote(entity)+','+quote(command)+",'{n=1;}',0,10"+(entry.endsWith('_with_limits')?',100,100000':'')+')';
const mutators=[
  'PRAGMA td_define_schema('+quote('schema new_format_schema version 1 {entity Row {n:int64;}}')+')',
  'PRAGMA td_define_schema('+quote(schema)+')',
  put('td_put_entity','new-entity','new-put'),put('td_put_entity','seed','seed'),
  put('td_put_entity_with_limits','new-entity','new-limited-put'),
  put('td_patch_entity','new-entity','new-patch'),put('td_patch_entity_with_limits','new-entity','new-limited-patch'),
  'PRAGMA td_initialize','PRAGMA td_migrate_native_catalog_v2',
];
const readers=[
  "PRAGMA td_entity_receipt('seed')","PRAGMA td_entity_receipt('missing')",
  "PRAGMA td_entity_history('missing')","PRAGMA td_entity_at('missing',1,0)",
  'PRAGMA td_query_store('+quote("answer(?n) :- triple('seed','n',?n).")+',0,-1,100,100,1000,1000)',
  'PRAGMA td_query_store_native('+quote("answer(?n) :- triple('seed','n',?n).")+',0,-1,100,100,1000,1000)',
  'PRAGMA td_query_store_scalable('+quote("answer(?n) :- triple('seed','n',?n).")+',0,-1,100,100,100000,100,100000,0)',
];
const run=async(connection:DuckDBConnection,sql:string)=>(await connection.runAndReadAll(sql)).getRows();

async function fixture(work:(connection:DuckDBConnection)=>Promise<void>){
  const instance=await DuckDBInstance.create(':memory:',{allow_unsigned_extensions:'true',threads:'1'});
  const connection=await instance.connect();
  try{
    await connection.run('LOAD '+quote(binary));await connection.run('PRAGMA td_initialize');await activateEngineOwner(connection);
    await connection.run('PRAGMA td_define_schema('+quote(schema)+')');
    await connection.run(put('td_put_entity','seed','seed'));
    await work(connection);
  }finally{connection.closeSync();instance.closeSync();}
}

async function snapshot(connection:DuckDBConnection){
  const tables=['main.assertions','main.commands','main.clock','main.storage_usage','main.store_meta',
    'td_catalog_v1.schemas','td_catalog_v1.entity_owners','td_catalog_v1.entity_commands',
    'td_catalog_v1.entity_patch_commands','td_catalog_v1.entity_assertion_sources','td_catalog_v1.catalog_revision'];
  const rows=[];
  for(const table of tables)rows.push(await run(connection,'SELECT * FROM '+table));
  rows.push(await run(connection,"SELECT sql FROM duckdb_views() WHERE schema_name='td_catalog_v1' AND view_name='native_catalog_integrity'"));
  return rows;
}

async function replaceMeta(connection:DuckDBConnection,values:string){
  await connection.run('DROP TABLE main.store_meta');await connection.run('CREATE TABLE main.store_meta(version INTEGER)');
  if(values)await connection.run('INSERT INTO main.store_meta VALUES '+values);
}

async function replaceRevision(connection:DuckDBConnection,values:string){
  await connection.run('DROP TABLE td_catalog_v1.catalog_revision');
  await connection.run('CREATE TABLE td_catalog_v1.catalog_revision(singleton BOOLEAN,revision INTEGER)');
  if(values)await connection.run('INSERT INTO td_catalog_v1.catalog_revision VALUES '+values);
}

test('current native code rejects future format and revision despite a permissive persisted view',async()=>{
  for(const future of ['format','revision'])await fixture(async connection=>{
    if(future==='format')await replaceMeta(connection,'(7)');else await replaceRevision(connection,'(TRUE,3)');
    await connection.run('CREATE OR REPLACE VIEW td_catalog_v1.native_catalog_integrity AS SELECT TRUE ok');
    const before=await snapshot(connection);
    for(const statement of [...mutators,...readers]){
      await assert.rejects(connection.run(statement),/TD_E_COMMAND_FORMAT|unsupported temporal catalog version/,future+' '+statement);
      assert.deepEqual(await snapshot(connection),before,statement);
    }
  });
});

test('empty, multiple and null metadata reject every native mutation atomically',async()=>{
  const cases=[
    {meta:''},{meta:'(5),(5)'},{meta:'(NULL)'},{revision:'(TRUE,2),(TRUE,2)'},
    {revision:'(FALSE,2)'},{revision:'(NULL,2)'},{revision:'(TRUE,NULL)'},{meta:'(6)',revision:''},
  ];
  for(const invalid of cases)await fixture(async connection=>{
    if(invalid.meta!==undefined)await replaceMeta(connection,invalid.meta);
    if(invalid.revision!==undefined)await replaceRevision(connection,invalid.revision);
    await connection.run('CREATE OR REPLACE VIEW td_catalog_v1.native_catalog_integrity AS SELECT TRUE ok');
    const before=await snapshot(connection);
    for(const statement of mutators){
      await assert.rejects(connection.run(statement),/TD_E_COMMAND_FORMAT|unsupported temporal catalog version/,JSON.stringify(invalid)+' '+statement);
      assert.deepEqual(await snapshot(connection),before,statement);
    }
  });
});

test('fresh bootstrap, raw format five revision zero and migrated formats retain supported commands',async()=>{
  await fixture(async connection=>{
    assert.deepEqual(await run(connection,'SELECT version FROM main.store_meta'),[[5]]);
    assert.deepEqual(await run(connection,'SELECT * FROM td_catalog_v1.catalog_revision'),[]);
    await connection.run(put('td_put_entity','another','raw-five'));
    await assert.rejects(connection.run(put('td_patch_entity','another','unmigrated')),/TD_E_COMMAND_FORMAT/);
    await connection.run('PRAGMA td_migrate_native_catalog_v2');
    assert.deepEqual(await run(connection,'SELECT version FROM main.store_meta'),[[5]]);
    await connection.run(put('td_patch_entity','another','migrated'));
    assert.deepEqual(await run(connection,'SELECT version FROM main.store_meta'),[[6]]);
    await connection.run('PRAGMA td_initialize');
    await connection.run('PRAGMA td_define_schema('+quote('schema another_schema version 1 {entity Row {n:int64;}}')+')');
    await connection.run(put('td_put_entity_with_limits','third','format-six'));
    await connection.run(put('td_patch_entity_with_limits','third','format-six-patch'));
    assert.equal((await run(connection,"PRAGMA td_entity_receipt('seed')"))[0]?.[1],1n);
    for(const statement of readers)await connection.run(statement);
    await assert.rejects(connection.run('PRAGMA td_migrate_native_catalog_v2'),/TD_E_COMMAND_FORMAT/);
  });
});
