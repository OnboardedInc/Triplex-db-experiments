// SPDX-License-Identifier: MIT
// Run against the built runtime with --old-runtime <accepted-023 build> --output <new receipt>.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {copyFile,lstat,mkdtemp,open,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {DuckDBInstance,version} from '@duckdb/node-api';

const root=fileURLToPath(new URL('../',import.meta.url));
const options=new Map();
for(let index=2;index<process.argv.length;index+=2){
  const [key,value]=process.argv.slice(index,index+2);
  assert.ok(['--old-runtime','--output'].includes(key)&&value&&!options.has(key),
    'Usage: --old-runtime <accepted-023 build directory> --output <new receipt>');
  options.set(key,resolve(value));
}
assert.equal(options.size,2,'Both --old-runtime and --output are required');
const output=options.get('--output');
const oldBuild=options.get('--old-runtime');
const currentBuild=join(root,'build');
const oldBinary=join(oldBuild,'temporal_datalog.duckdb_extension');
const oldIdentity='611590c36ed742648845fa5cb853368a5eb8bbf305120dc6cf1b80d08de0e87c';
const json=value=>JSON.stringify(value,(_,item)=>typeof item==='bigint'?String(item):item);
const sha=value=>createHash('sha256').update(value).digest('hex');
const hash=async path=>sha(await readFile(path));
const manifest=async path=>JSON.parse(await readFile(path,'utf8'));
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const numericRows=rows=>rows.map(row=>row.map(value=>typeof value==='number'&&Number.isInteger(value)?BigInt(value):value));
const legacySchema='schema upgrade version 1 {entity Actor {name:text required;} entity Event {score:int64;flag:boolean;note:text;sample:float64;}}';
const expandedSchema='schema upgrade version 2 {entity Actor {name:text required;} entity Event {stamp:datetime required;actor:ref_value(Actor) required;}}';
const legacyRecord='{score=9223372036854775807;flag=false;note="é🙂";sample=f64("0000000000000001");}';
const oldRead=(program,known)=>`PRAGMA td_query_store_native(${quote(program)},2,${known},100,100,10000,1000)`;
const oldPut=(entity,command,record,op='put',from=0,to=10)=>
  `PRAGMA td_${op}_entity('upgrade',1,'Event',${quote(entity)},${quote(command)},${quote(record)},${from},${to})`;
const oldScan="answer(?v) :- triple('legacy',?a,?v).";
const dateScan="answer(?v) :- triple('expanded','stamp',?v).";
const referenceJoin="answer(?n) :- triple('expanded','actor',?r),triple(?e,'name',?n),[ref_id(?r)=?e].";
const actor={tag:'ref',value:'actor-é🙂'};
const stamp=value=>({tag:'datetime',value});

async function oldConnection(database,work){
  const instance=await DuckDBInstance.create(database,{allow_unsigned_extensions:'true',threads:'1'});
  try{
    const connection=await instance.connect();
    try{
      await connection.run('LOAD '+quote(oldBinary));
      return await work(async statement=>numericRows((await connection.runAndReadAll(statement)).getRows()));
    }finally{connection.closeSync();}
  }finally{instance.closeSync();}
}

async function legacySnapshot(sql,knownAt,commands){
  const receipts=[];
  for(const command of commands)receipts.push(await sql(`PRAGMA td_entity_receipt(${quote(command)})`));
  return {
    definition:await sql("SELECT name,version,content_hash,dsl,ir FROM td_catalog_v1.schemas WHERE name='upgrade' AND version=1"),
    compiled:await sql('SELECT system.main.td_schema_ir_v1('+quote(legacySchema)+')'),
    history:await sql("PRAGMA td_entity_history('legacy')"),
    point:await sql(`PRAGMA td_entity_at('legacy',${knownAt},2)`),
    receipts,
    bounded:await sql(oldRead(oldScan,knownAt)),
  };
}

function publicReceipt(rows){
  assert.equal(rows.length,1);
  const [commandId,position,asserted,retracted,schema,version,type,entityId,schemaHash,requestHash]=rows[0];
  return {commandId,position,asserted:JSON.parse(asserted),retracted:JSON.parse(retracted),
    schema,version:Number(version),type,entityId,schemaHash,requestHash};
}

async function snapshot(store,legacyPosition,first,patched,commands){
  const dates=[];
  for(const [knownAt,validAt,expected] of [
    [legacyPosition,2n,[]],[first,2n,[[stamp(-1.25)]]],[patched,0n,[[stamp(-1.25)]]],
    [patched,2n,[[stamp(0.5)]]],[patched,4n,[[stamp(-1.25)]]],[patched,10n,[]],
  ]){
    const cut={knownAt,validAt};
    const sql=await store.queryScalable(dateScan,cut);
    const native=await store.query(dateScan,{...cut,forceNative:true});
    assert.equal(sql.position,knownAt);
    assert.equal(native.position,knownAt);
    assert.equal(sql.route,'sql');
    assert.equal(native.route,'native');
    assert.deepEqual(sql.rows,expected);
    assert.deepEqual(native.rows,expected);
    dates.push([cut,sql.rows]);
  }
  const refs=await store.queryScalable(referenceJoin,{knownAt:patched,validAt:2n});
  assert.deepEqual(refs.rows,[[{tag:'str',value:'Original Actor'}]]);
  return {dates,refs:refs.rows,history:await store.history('expanded'),
    historicalPoint:await store.at('expanded',{knownAt:first,validAt:2n}),
    correctedPoint:await store.at('expanded',{knownAt:patched,validAt:2n}),
    receipts:await Promise.all(commands.map(command=>store.receipt(command)))};
}

async function noWal(database){
  await assert.rejects(lstat(database+'.wal'),{code:'ENOENT'},'A closed backup must have no outstanding WAL');
}

async function logicalFormatEight(sql){
  const statements=[
    'SELECT * FROM main.store_meta ORDER BY version',
    'SELECT * FROM main.clock ORDER BY singleton',
    'SELECT * FROM main.storage_usage ORDER BY singleton',
    'SELECT * FROM main.commands ORDER BY command_id',
    'SELECT * EXCLUDE(v_s),hex(v_s) FROM main.assertions ORDER BY assertion_id',
    'SELECT * FROM td_catalog_v1.schemas ORDER BY name,version',
    'SELECT * FROM td_catalog_v1.entity_commands ORDER BY command_id',
    'SELECT * FROM td_catalog_v1.entity_owners ORDER BY entity_id',
    'SELECT * FROM td_catalog_v1.entity_patch_commands ORDER BY command_id',
    'SELECT * FROM td_catalog_v1.entity_assertion_sources ORDER BY assertion_id',
    'SELECT * FROM td_catalog_v1.catalog_revision ORDER BY singleton',
    "SELECT schema_name,view_name,sql FROM system.main.duckdb_views() WHERE schema_name='td_catalog_v1' ORDER BY view_name",
  ];
  const rows=[];
  for(const statement of statements)rows.push(await sql(statement));
  assert.deepEqual(rows[0],[[8n]]);
  return sha(json(rows));
}

async function oldFence(database){
  return oldConnection(database,async sql=>{
    const before=await logicalFormatEight(sql);
    const rejected={};
    for(const [name,statement,errorPattern] of [
      ['initialize','PRAGMA td_initialize',/TD_E_COMMAND_FORMAT/],
      ['receipt',"PRAGMA td_entity_receipt('legacy-write')",/TD_E_COMMAND_FORMAT/],
      ['put',oldPut('denied','denied-legacy-write',legacyRecord),/TD_E_COMMAND_FORMAT/],
      ['bounded_query',oldRead(oldScan,-1n),/TD_E_COMMAND_FORMAT|Catalog Error:[^\n]*td_(?:schema_check|schema_references|validate_schema_fact)_v2/],
    ]){
      await assert.rejects(sql(statement),error=>{
        assert.match(error.message,errorPattern);
        rejected[name]=error.message;
        return true;
      });
    }
    assert.equal(await logicalFormatEight(sql),before);
    return {rejected,unchanged_logical_sha256:before};
  });
}

async function verifyCase(directory,format,Store,Port){
  const database=join(directory,`format-${format}.duckdb`);
  const backup=join(directory,`format-${format}.backup.duckdb`);
  const restored=join(directory,`format-${format}.restored.duckdb`);
  const fence=join(directory,`format-${format}.old-binary-probe.duckdb`);
  const commands=['actor-write','legacy-write',...(format===6n?['legacy-patch']:[])];
  const oldPosition=BigInt(commands.length);
  const baseline=await oldConnection(database,async sql=>{
    await sql('PRAGMA td_initialize');
    await sql('PRAGMA td_migrate_native_catalog_v2');
    await sql('PRAGMA td_define_schema('+quote(legacySchema)+')');
    await sql(`PRAGMA td_put_entity('upgrade',1,'Actor',${quote(actor.value)},'actor-write','{name="Original Actor";}',0,10)`);
    await sql(oldPut('legacy','legacy-write',legacyRecord));
    if(format===6n)await sql(oldPut('legacy','legacy-patch',legacyRecord,'patch',1,3));
    assert.deepEqual(await sql('SELECT version FROM main.store_meta'),[[format]]);
    const result=await legacySnapshot(sql,oldPosition,commands);
    assert.equal(result.definition[0][4],result.compiled[0][0]);
    assert.equal(result.bounded.length,4);
    assert.equal(result.history.length,format===6n?16:4);
    await sql('CHECKPOINT');
    return result;
  });

  const request={schema:'upgrade',version:2,type:'Event',entityId:'expanded',commandId:'expanded-write',
    validFrom:0n,validTo:10n,fields:[{attribute:'stamp',value:stamp(-1.25)},{attribute:'actor',value:actor}]};
  const correction={...request,commandId:'expanded-patch',validFrom:2n,validTo:4n,
    fields:[{attribute:'stamp',value:stamp(0.5)},{attribute:'actor',value:actor}]};
  const allCommands=[...commands,request.commandId,correction.commandId];
  let expected;
  const store=await Store.open({database,readers:2});
  try{
    await store.defineSchema(expandedSchema);
    assert.deepEqual(await store.putRecord({schema:'upgrade',version:1,type:'Event',entityId:'legacy',
      commandId:'legacy-write',validFrom:0n,validTo:10n,record:legacyRecord}),publicReceipt(baseline.receipts[1]));
    if(format===6n)assert.deepEqual(await store.patchRecord({schema:'upgrade',version:1,type:'Event',entityId:'legacy',
      commandId:'legacy-patch',validFrom:1n,validTo:3n,record:legacyRecord}),publicReceipt(baseline.receipts[2]));
    const first=await store.put(request);
    const patched=await store.patch(correction);
    assert.equal(first.position,oldPosition+1n);
    assert.equal(patched.position,oldPosition+2n);
    assert.deepEqual([...patched.retracted].sort(),[...first.asserted].sort());
    expected=await snapshot(store,oldPosition,first.position,patched.position,allCommands);
    assert.deepEqual(expected.receipts.slice(0,commands.length),baseline.receipts.map(publicReceipt));
  }finally{await store.close();}

  const port=await Port.openWithOwner({database});
  try{
    await port.activateOwnership();
    // These read-only statements are serialized on one connection.
    const sql=statement=>port.runNative({name:'upgrade_recovery_check',sql:statement,params:[]});
    assert.deepEqual(await sql('SELECT version FROM main.store_meta'),[[8n]]);
    assert.deepEqual(await legacySnapshot(sql,oldPosition,commands),baseline);
    await port.run({name:'quiesced_checkpoint',sql:'CHECKPOINT',params:[]});
  }finally{await port.close();}
  await noWal(database);
  const original=await hash(database);
  await copyFile(database,backup,constants.COPYFILE_EXCL);
  assert.equal(await hash(backup),original);
  await copyFile(backup,restored,constants.COPYFILE_EXCL);
  await copyFile(backup,fence,constants.COPYFILE_EXCL);
  assert.equal(await hash(restored),original);
  assert.equal(await hash(fence),original);

  const reopened=await Store.open({database:restored,readers:2});
  let next;
  try{
    assert.deepEqual(await snapshot(reopened,oldPosition,oldPosition+1n,oldPosition+2n,allCommands),expected);
    assert.deepEqual(await reopened.put(request),expected.receipts.at(-2));
    assert.deepEqual(await reopened.patch(correction),expected.receipts.at(-1));
    next=await reopened.put({...request,entityId:'healthy',commandId:'after-restore'});
    assert.equal(next.position,oldPosition+3n);
    assert.deepEqual(await reopened.receipt(next.commandId),next);
  }finally{await reopened.close();}
  const oldProbe=await oldFence(fence);
  assert.equal(await hash(backup),original);
  assert.equal(await hash(database),original);
  await noWal(backup);
  return {prior_format:Number(format),upgraded_format:8,legacy_position:oldPosition,
    legacy_snapshot_sha256:sha(json(baseline)),restored_snapshot_sha256:sha(json(expected)),
    backup_sha256:original,backup_preserved:true,healthy_next_position:next.position,old_binary_fence:oldProbe};
}

const report={schema:'temporal-datalog/expanded-upgrade-recovery/1',result:'FAIL',cases:[]};
const receipt=await open(output,'wx');
try{
  assert.equal(version(),'v2.0.0');
  const old=await manifest(join(oldBuild,'artifact.json'));
  const current=await manifest(join(currentBuild,'artifact.json'));
  const owner=await manifest(join(currentBuild,'owner_probe/artifact.json'));
  assert.equal(old.extension_version,'0.23.0');
  assert.equal(old.extension_sha256,oldIdentity);
  assert.equal(await hash(oldBinary),oldIdentity);
  assert.equal(current.extension_version,'0.25.0');
  assert.equal(await hash(join(currentBuild,'temporal_datalog.duckdb_extension')),current.extension_sha256);
  assert.equal(await hash(join(currentBuild,'owner_probe/temporal_owner_probe.duckdb_extension')),owner.extension_sha256);
  assert.equal(owner.core_extension_sha256,current.extension_sha256);
  const require=createRequire(import.meta.url);
  const api=createRequire(require.resolve('@duckdb/node-api'));
  const bindings=createRequire(api.resolve('@duckdb/node-bindings'));
  const engine=join(dirname(bindings.resolve('@duckdb/node-bindings-darwin-arm64/duckdb.node')),'libduckdb.dylib');
  assert.equal(await hash(engine),owner.engine_library_sha256);
  report.artifacts={legacy_core_sha256:oldIdentity,current_core_sha256:current.extension_sha256,
    current_owner_sha256:owner.extension_sha256,sdk_engine_sha256:owner.engine_library_sha256,
    current_control_sha256:current.control_bridge_sha256,
    gate_source_sha256:await hash(fileURLToPath(import.meta.url))};
  const {NativeEntityStore}=await import(pathToFileURL(join(currentBuild,'adapter/native-entity.js')).href);
  const {NativeDuckDBPort}=await import(pathToFileURL(join(currentBuild,'adapter/native-duckdb-port.mjs')).href);
  const directory=await mkdtemp(join(dirname(output),'expanded-upgrade-'));
  for(const format of [5n,6n])report.cases.push(await verifyCase(directory,format,NativeEntityStore,NativeDuckDBPort));
  report.result='PASS';
}catch(error){
  report.error={name:error.name,message:error.message};
  throw error;
}finally{
  try{await receipt.writeFile(json(report)+'\n');}
  finally{await receipt.close();}
}
