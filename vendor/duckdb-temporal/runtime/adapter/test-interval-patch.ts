import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {test} from 'node:test';
import {DuckDBInstance} from '@duckdb/node-api';
import {openAuditedPort} from './native-test-fixture.js';
import {NativeEntityStore} from './native-entity.js';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const manifest=JSON.parse(await readFile(join(root,'build/artifact.json'),'utf8'));
const currentUnique=manifest.experimental_current_unique_fast_path===true;
const allCutUnique=manifest.experimental_all_cut_unique_fast_path===true;
const ownedScanReason=allCutUnique?'owned_allcut_unique_scalable_single_atom':currentUnique?'owned_unique_scalable_single_atom':'owned_scalable_single_atom';
const schema='schema patches version 1 {entity Row {n:int64 many;}}';
const query="answer(?n) :- triple('e','n',?n).";
const request=(commandId:string,record='{n=1;}',validFrom=0n,validTo=10n)=>({
  schema:'patches',version:1,type:'Row',entityId:'e',commandId,record,validFrom,validTo,
});
const quote=(text:string)=>"'"+text.replaceAll("'","''")+"'";
const sql=(port:NativeDuckDBPort,statement:string)=>port.runNative({name:'interval_patch_test',sql:statement,params:[]});
const patchSql=(command:string,record='{n=2;}',from=2,to=8)=>
  `PRAGMA td_patch_entity('patches',1,'Row','e',${quote(command)},${quote(record)},${from},${to})`;
const values=async(store:NativeEntityStore,knownAt:bigint,validAt:bigint)=>
  (await store.at('e',{knownAt,validAt})).map(row=>row.value.value);

test('interval patches preserve old cuts and outside answers with deterministic fragment identities',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);const first=await store.putRecord(request('first'));
    const patch=await store.patch({...request('middle'),fields:[{attribute:'n',value:{tag:'i64',value:2n}}],validFrom:2n,validTo:8n});
    assert.equal(patch.position,2n);assert.deepEqual(patch.retracted,first.asserted);assert.equal(patch.asserted.length,3);
    const id=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
    assert.deepEqual(patch.asserted,[
      id({kind:'td.entity.patch.value/1',command_id:'middle',ordinal:0}),
      id({kind:'td.entity.patch.fragment/1',command_id:'middle',source_assertion_id:first.asserted[0],side:'left'}),
      id({kind:'td.entity.patch.fragment/1',command_id:'middle',source_assertion_id:first.asserted[0],side:'right'}),
    ]);
    for(const tick of [0n,2n,7n,8n,9n])assert.deepEqual(await values(store,1n,tick),[1n]);
    for(const [tick,expected] of [[-1n,[]],[0n,[1n]],[1n,[1n]],[2n,[2n]],[7n,[2n]],[8n,[1n]],[9n,[1n]],[10n,[]]]as const)
      assert.deepEqual(await values(store,2n,tick),expected);
    const history=await store.history('e');
    assert.deepEqual(history.filter(row=>row.commandId==='middle').map(row=>[row.validFrom,row.validTo,row.txFrom]).sort(),
      [[0n,2n,2n],[2n,8n,2n],[8n,10n,2n]].sort());
    assert.equal(history.find(row=>row.commandId==='first')?.correctedBy,'middle');
    const later=await store.patchRecord(request('later','{n=3;}',3n,5n));assert.equal(later.position,3n);
    assert.deepEqual(await store.patchRecord(request('middle','{n=2;n=2;}',2n,8n)),patch);
    await assert.rejects(store.putRecord(request('middle','{n=2;}',2n,8n)),/TD_E_COMMAND_IDEMPOTENCY/);
    await assert.rejects(store.patchRecord(request('first')),/TD_E_COMMAND_IDEMPOTENCY/);
    await assert.rejects(store.patchRecord(request('middle','{n=9;}',2n,8n)),/TD_E_COMMAND_IDEMPOTENCY/);
    const replacement=await store.putRecord(request('whole-record','{n=4;}',4n,6n));
    assert.equal(replacement.position,4n);
    assert.deepEqual(await values(store,4n,0n),[]);assert.deepEqual(await values(store,4n,4n),[4n]);
    assert.deepEqual(await values(store,3n,0n),[1n]);
  }finally{await store.close();}
});

test('patches span multiple prior intervals, fill gaps, retain disjoint IDs and allow schema-valid empty records',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    await store.patchRecord(request('left','{n=1;}',0n,4n));
    await store.patchRecord(request('right','{n=2;}',6n,10n));
    const distant=await store.patchRecord(request('distant','{n=9;}',20n,30n));
    const fill=await store.patchRecord(request('fill','{n=3;}',2n,8n));
    assert.equal(fill.retracted.length,2);assert.equal(fill.asserted.length,3);
    for(const tick of [2n,4n,5n,7n])assert.deepEqual(await values(store,4n,tick),[3n]);
    assert.deepEqual(await values(store,3n,5n),[]);
    assert.deepEqual((await store.at('e',{knownAt:4n,validAt:25n})).map(row=>row.assertionId),distant.asserted);
    const clear=await store.patchRecord(request('clear','{}',3n,7n));assert.equal(clear.asserted.length,2);
    assert.deepEqual(await values(store,5n,3n),[]);assert.deepEqual(await values(store,5n,7n),[3n]);
    await assert.rejects(store.patchRecord(request('empty-interval','{}',3n,3n)),/TD_E_COMMAND_INTERVAL/);
    await store.defineSchema('schema patches version 2 {entity Row {n:int64 required;}}');
    await assert.rejects(store.patchRecord({...request('required','{}'),version:2}),/TD_E_SCHEMA_REQUIRED/);
  }finally{await store.close();}
});

test('repeated fragments preserve their original schema and reference validation meaning',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);const firstSchema=(await store.putRecord(request('v1'))).schemaHash;
    await store.defineSchema('schema patches version 2 {entity Row {n:text many;}}');
    await store.patchRecord({...request('v2','{n="new";}',2n,8n),version:2});
    await store.patchRecord({...request('v2-again','{n="newer";}',1n,3n),version:2});
    const old=(await store.at('e',{knownAt:3n,validAt:0n}))[0]!;
    assert.equal(old.commandId,'v2-again');assert.equal(old.version,1);assert.equal(old.schemaHash,firstSchema);assert.equal(old.value.value,1n);
    assert.deepEqual(await values(store,3n,1n),['newer']);assert.deepEqual(await values(store,3n,7n),['new']);
    await store.defineSchema('schema refs version 1 {entity Person {name:text;} entity Row {target:ref(Person) required;}}');
    const base={schema:'refs',version:1,type:'Person',entityId:'target',validFrom:0n,validTo:10n};
    await store.putRecord({...base,commandId:'target',record:'{name="T";}'});
    await store.putRecord({...base,type:'Row',entityId:'source',commandId:'source',record:'{target="target";}'});
    await store.defineSchema('schema refs version 2 {entity Person {name:text;} entity Team {name:text;} entity Row {target:ref(Team) required;}}');
    await store.putRecord({...base,version:2,type:'Team',entityId:'team',commandId:'team',record:'{name="Team";}'});
    const correction=await store.patchRecord({...base,version:2,type:'Row',entityId:'source',commandId:'source-patch',record:'{target="team";}',validFrom:2n,validTo:8n});
    assert.equal((await store.history('source')).length,4);
    const oldReference=(await store.at('source',{knownAt:correction.position,validAt:0n}))[0]!;
    assert.equal(oldReference.version,1);assert.equal(oldReference.value.value,'target');
    const newReference=(await store.at('source',{knownAt:correction.position,validAt:2n}))[0]!;
    assert.equal(newReference.version,2);assert.equal(newReference.value.value,'team');
  }finally{await store.close();}
});

test('retained row and byte admission include every new fragment at exact limits',async()=>{
  for(const [limits,passes]of [
    [{maxFacts:3,maxBytes:1000},false],[{maxFacts:4,maxBytes:1000},true],[{maxFacts:5,maxBytes:1000},true],
    [{maxFacts:10,maxBytes:19},false],[{maxFacts:10,maxBytes:20},true],[{maxFacts:10,maxBytes:21},true],
  ]as const){
    const store=await NativeEntityStore.open({retainedLimits:limits});
    try{
      await store.defineSchema(schema);await store.putRecord(request('first'));
      if(passes)assert.equal((await store.patchRecord(request('middle','{n=2;}',2n,8n))).asserted.length,3);
      else{
        await assert.rejects(store.patchRecord(request('middle','{n=2;}',2n,8n)),/TD_E_COMMAND_LIMIT/);
        assert.equal(await store.receipt('middle'),null);assert.equal((await store.history('e')).length,1);
        assert.deepEqual(await values(store,1n,3n),[1n]);
      }
    }finally{await store.close();}
  }
  for(const extra of [1,2,3]){
    const store=await NativeEntityStore.open();
    try{
      await store.defineSchema(schema);
      await store.putRecord(request('first','{'+Array.from({length:2047},(_,n)=>'n='+n+';').join('')+'}'));
      const record='{'+Array.from({length:extra},(_,n)=>'n='+(10000+n)+';').join('')+'}';
      if(extra<3)assert.equal((await store.patchRecord(request('middle',record,2n,8n))).asserted.length,4094+extra);
      else{await assert.rejects(store.patchRecord(request('middle',record,2n,8n)),/TD_E_COMMAND_LIMIT/);assert.equal(await store.receipt('middle'),null);}
    }finally{await store.close();}
  }
});

test('audited pooled queries keep prepared latest and historical patch cuts coherent',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  try{
    await store.defineSchema(schema);await store.putRecord(request('first'));
    await store.queryScalable(query,{validAt:3n,timeoutMs:5000});
    await store.patchRecord(request('middle','{n=2;}',2n,8n));
    const results=await Promise.all([store.queryScalable(query,{validAt:3n,timeoutMs:5000}),
      store.queryScalable(query,{validAt:3n,knownAt:1n,timeoutMs:5000}),store.query(query,{validAt:8n})]);
    assert.equal(results[0]!.reason,ownedScanReason);
    assert.equal(results[1]!.reason,allCutUnique?'owned_allcut_unique_scalable_single_atom':'owned_scalable_single_atom');
    assert.deepEqual(results.map(result=>result.rows),[[[{tag:'i64',value:2n}]],[[{tag:'i64',value:1n}]],[[{tag:'i64',value:1n}]]]);
    await store.revalidate();
    assert.equal((await store.queryScalable(query,{validAt:3n})).reason,ownedScanReason);
  }finally{await store.close();}
});

test('legacy format five migrates once and format six explicitly rejects old initializers and Python openers',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'native-interval-format-')),database=join(directory,'store.duckdb');
  const legacy=(await promisify(execFile)('git',['show','6782e7bd:projects/temporal-datalog/runtime/native/catalog.sql'],{cwd:root})).stdout;
  try{
    const failedMigration=await DuckDBInstance.create(':memory:',{allow_unsigned_extensions:'true'});
    const failing=await failedMigration.connect();
    try{
      await failing.run('LOAD '+quote(join(root,'build/temporal_datalog.duckdb_extension')));
      await failing.run(legacy);
      await failing.run('CREATE TABLE td_catalog_v1.catalog_revision(singleton BOOLEAN PRIMARY KEY,revision INTEGER CHECK(revision=3))');
      await failing.run('PRAGMA td_initialize');
      const constraints="SELECT constraint_text FROM duckdb_constraints() WHERE schema_name='main' AND table_name='store_meta' ORDER BY constraint_text";
      const before=(await failing.runAndReadAll(constraints)).getRows();
      await failing.run('BEGIN');
      await assert.rejects(failing.run('PRAGMA td_migrate_native_catalog_v2'),/CHECK|constraint/i);
      await failing.run('ROLLBACK');
      assert.deepEqual((await failing.runAndReadAll(constraints)).getRows(),before);
      assert.deepEqual((await failing.runAndReadAll('SELECT version FROM main.store_meta')).getRows(),[[5]]);
      assert.deepEqual((await failing.runAndReadAll('SELECT count(*) FROM td_catalog_v1.catalog_revision')).getRows(),[[0n]]);
      await assert.rejects(failing.run('PRAGMA td_migrate_native_catalog_v2'),/CHECK|constraint/i);
      assert.deepEqual((await failing.runAndReadAll(constraints)).getRows(),before);
      assert.deepEqual((await failing.runAndReadAll('SELECT version FROM main.store_meta')).getRows(),[[5]]);
      assert.deepEqual((await failing.runAndReadAll('SELECT count(*) FROM td_catalog_v1.catalog_revision')).getRows(),[[0n]]);
    }finally{failing.closeSync();failedMigration.closeSync();}
    const instance=await DuckDBInstance.create(database,{allow_unsigned_extensions:'true'}),connection=await instance.connect();
    try{await connection.run('LOAD '+quote(join(root,'build/temporal_datalog.duckdb_extension')));await connection.run(legacy);}
    finally{connection.closeSync();instance.closeSync();}
    let store=await NativeEntityStore.open({database});await store.defineSchema(schema);await store.putRecord(request('first'));await store.close();
    let port=await openAuditedPort({database});
    assert.deepEqual(await sql(port,'SELECT version FROM main.store_meta'),[[5n]]);
    await assert.rejects(sql(port,'PRAGMA td_migrate_native_catalog_v2'),/TD_E_COMMAND_FORMAT/);await port.close();
    store=await NativeEntityStore.open({database});await store.patchRecord(request('middle','{n=2;}',2n,8n));await store.close();
    port=await openAuditedPort({database});
    try{
      assert.deepEqual(await sql(port,'SELECT version FROM main.store_meta'),[[6n]]);
      await sql(port,'BEGIN');await assert.rejects(sql(port,legacy),/unsupported temporal catalog version/);await sql(port,'ROLLBACK');
      assert.equal((await sql(port,"PRAGMA td_entity_history('e')")).length,4);
    }finally{await port.close();}
    const python=process.env.TRIPLESTORE_PYTHON??join(root,'../../../../.venv/bin/python');
    const script="import sys\nfrom temporal_store import Store\ntry:\n Store(sys.argv[1])\nexcept ValueError as e:\n assert 'unsupported temporal-store schema version' in str(e),str(e)\nelse:\n raise AssertionError('legacy Python accepted format six')\n";
    await promisify(execFile)(python,['-c',script,database],{cwd:root,timeout:15000});
  }finally{await rm(directory,{recursive:true,force:true});}
});

test('late fragment insertion failure and concurrent writers retain atomic metadata, receipts and clock',async()=>{
  const writer=await NativeDuckDBPort.openWithOwner(),peer=await writer.forkReader();
  try{
    await writer.activateOwnership([peer]);
    await sql(writer,'PRAGMA td_define_schema('+quote(schema)+')');
    await sql(writer,"PRAGMA td_put_entity('patches',1,'Row','e','first','{n=1;}',0,10)");
    await sql(writer,'CREATE UNIQUE INDEX injected_patch_failure ON main.assertions(payload)');
    const before=await sql(writer,'SELECT * FROM main.storage_usage');
    await assert.rejects(sql(writer,patchSql('failed')),/duplicate key/i);
    assert.deepEqual(await sql(writer,'SELECT * FROM main.storage_usage'),before);
    assert.deepEqual(await sql(writer,'SELECT version FROM main.store_meta'),[[5n]]);
    for(const table of ['entity_patch_commands','entity_assertion_sources'])assert.deepEqual(await sql(writer,'SELECT count(*) FROM td_catalog_v1.'+table),[[0n]]);
    assert.deepEqual(await sql(writer,"PRAGMA td_entity_receipt('failed')"),[]);
    await sql(writer,'DROP INDEX injected_patch_failure');
    await sql(writer,'BEGIN');await sql(writer,patchSql('first-patch','{n=2;}',0,5));
    await assert.rejects(sql(peer,patchSql('conflict','{n=3;}',5,10)),/conflict|duplicate key/i);
    await sql(writer,'COMMIT');assert.deepEqual(await sql(peer,"PRAGMA td_entity_receipt('conflict')"),[]);
    assert.equal((await sql(peer,patchSql('conflict','{n=3;}',5,10)))[0]?.[1],3n);
    assert.deepEqual(await sql(peer,'SELECT position FROM main.clock'),[[3n]]);
    const replay=await sql(peer,patchSql('conflict','{n=3;}',5,10));
    await sql(writer,'BEGIN');
    await sql(writer,"INSERT INTO main.assertions SELECT a.* REPLACE ('extra-'||i::VARCHAR AS assertion_id) FROM main.assertions a,range(4097) r(i) WHERE a.command_id='conflict' AND a.tx_to=9223372036854775807");
    await sql(writer,'UPDATE main.storage_usage SET retained_count=(SELECT count(*) FROM main.assertions),retained_bytes=(SELECT sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))) FROM main.assertions)');
    assert.deepEqual(await sql(writer,patchSql('conflict','{n=3;}',5,10)),replay);
    const boundedReplay=patchSql('conflict','{n=3;}',5,10).replace('td_patch_entity(','td_patch_entity_with_limits(').replace(/\)$/,',1,1)');
    assert.deepEqual(await sql(writer,boundedReplay),replay);
    await sql(writer,'ROLLBACK');
  }finally{await peer.close();await writer.close();}
});

test('full retained audit rejects orphan, cyclic, forward and schema-forged fragment provenance',async()=>{
    const mutations=[
      "INSERT INTO td_catalog_v1.entity_assertion_sources VALUES('orphan','missing','first','left')",
      "UPDATE td_catalog_v1.entity_assertion_sources SET source_assertion_id='missing'",
      // If provenance disappeared through an inner join, these bounds could
      // incorrectly make the surviving child look like an ordinary replacement.
      "UPDATE main.assertions SET valid_from=2,valid_to=8,external_valid_from=2,external_valid_to=8 WHERE assertion_id IN(SELECT assertion_id FROM td_catalog_v1.entity_assertion_sources); UPDATE td_catalog_v1.entity_assertion_sources SET source_assertion_id='missing'",
      "UPDATE td_catalog_v1.entity_assertion_sources SET source_assertion_id=(SELECT max(assertion_id) FROM td_catalog_v1.entity_assertion_sources) WHERE assertion_id<>(SELECT max(assertion_id) FROM td_catalog_v1.entity_assertion_sources)",
      "UPDATE td_catalog_v1.entity_assertion_sources SET validation_command_id='middle'",
      "UPDATE td_catalog_v1.entity_assertion_sources SET side='right' WHERE side='left'",
      "UPDATE td_catalog_v1.entity_patch_commands SET valid_from=1",
      "UPDATE main.store_meta SET version=5",
    ];
    for(const mutation of mutations){
      const port=await openAuditedPort();
      try{
        await sql(port,'PRAGMA td_define_schema('+quote(schema)+')');
        await sql(port,"PRAGMA td_put_entity('patches',1,'Row','e','first','{n=1;}',0,10)");
        await sql(port,patchSql('middle'));
        await port.run({name:'inject_patch_corruption',sql:mutation,params:[]});
        await assert.rejects(port.activateOwnership(),/TD_E_COMMAND_(?:HISTORY|FORMAT)/);
        await assert.rejects(sql(port,"PRAGMA td_entity_history('missing')"),/TD_E_OWNER_PROBE_INVALID/);
        await assert.rejects(sql(port,"PRAGMA td_entity_at('missing',1,0)"),/TD_E_OWNER_PROBE_INVALID/);
      }finally{await port.close();}
    }
});
