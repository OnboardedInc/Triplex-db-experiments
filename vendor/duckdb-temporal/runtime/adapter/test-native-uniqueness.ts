import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {DuckDBInstance} from '@duckdb/node-api';
import {NativeEntityStore} from './native-entity.js';
import {NativeSchemaCatalog} from './native-schema.js';
import {activateEngineOwner,openAuditedPort} from './native-test-fixture.js';

const base='schema unique_test version 1 {entity Row {alias:text;} }';
const unique='schema unique_test version 2 {entity Row {alias:text unique;} }';
const DUPLICATE=/TD_E_COMMAND_UNIQUE/;
const ACTIVATION=/TD_E_SCHEMA_UNIQUE:/;
const AUDIT=/TD_E_SCHEMA_UNIQUE_AUDIT/;
const record=(commandId:string,entityId:string,alias:string,version=1,validFrom=0n,validTo=10n)=>
  ({schema:'unique_test',type:'Row',version,commandId,entityId,record:'{alias='+JSON.stringify(alias)+';}',validFrom,validTo});
const path=async()=>join(await mkdtemp(fileURLToPath(new URL('../uniqueness-',import.meta.url))),'facts.duckdb');
const ownersProgram="answer(?e) :- triple(?e,'alias','x').";
async function owners(store:NativeEntityStore,knownAt:bigint,validAt:bigint,expected:readonly string[]){
  for(const result of [await store.queryScalable(ownersProgram,{knownAt,validAt}),
    await store.query(ownersProgram,{knownAt,validAt,forceNative:true})]){
    assert.equal(result.position,knownAt);
    assert.deepEqual(result.rows,expected.map(value=>[{tag:'str',value}]));
  }
}

test('unique activation commits once, leaves preactivation collisions readable, and enforces old versions',async()=>{
  const database=await path();
  const store=await NativeEntityStore.open({database,readers:2});
  const first=record('first','a','x'),second=record('second','b','x');
  let legacyHash='';
  try {
    legacyHash=(await store.defineSchema(base)).hash;
    await store.putRecord(first);
    const oldReceipt=await store.putRecord(second);
    await assert.rejects(store.defineSchema(unique),ACTIVATION);
    assert.equal((await store.queryScalable(ownersProgram,{validAt:0n})).position,2n);
    await owners(store,2n,0n,['a','b']);
    assert.equal((await store.putRecord(record('corrected','b','y'))).position,3n);
    const declaration=await store.defineSchema(unique);
    assert.deepEqual(await store.defineSchema(unique),declaration);
    assert.equal((await store.queryScalable(ownersProgram,{validAt:0n})).position,4n);
    assert.deepEqual(await store.putRecord(second),oldReceipt);
    await assert.rejects(store.putRecord(record('blocked','c','x',1,9n,12n)),DUPLICATE);
    assert.equal(await store.receipt('blocked'),null);
    assert.equal((await store.putRecord(record('adjacent','c','x',1,10n,12n))).position,5n);
    await owners(store,2n,9n,['a','b']);
    await owners(store,5n,9n,['a']);
    await owners(store,5n,10n,['c']);
    await store.revalidate();
  }finally{await store.close();}

  const catalog=await NativeSchemaCatalog.open({database});
  try {
    const legacy=await catalog.get('unique_test',1),declared=await catalog.get('unique_test',2);
    assert.equal(legacy?.hash,legacyHash);
    assert.equal(legacy?.ir,'{"format":"td.schema/1","name":"unique_test","version":1,"entities":[{"name":"Row","attributes":[{"key":"alias","tag":1,"required":false,"many":false}]}]}');
    assert.equal(declared?.ir,'{"format":"td.schema/3","name":"unique_test","version":2,"entities":[{"name":"Row","attributes":[{"key":"alias","tag":1,"required":false,"many":false,"unique":true}]}]}');
  }finally{await catalog.close();}

  const port=await openAuditedPort({database});
  try {
    const sql=(statement:string)=>port.runNative({name:'unique_receipt',sql:statement,params:[]});
    assert.deepEqual(await sql('SELECT version FROM main.store_meta'),[[10n]]);
    assert.deepEqual(await sql('SELECT revision FROM td_catalog_v1.catalog_revision'),[[2n]]);
    assert.deepEqual(await sql('SELECT enforced_from FROM td_catalog_v1.unique_domains'),[[4n]]);
    assert.deepEqual(await sql('SELECT position FROM main.commands ORDER BY position'),[[1n],[2n],[3n],[4n],[5n]]);
    assert.deepEqual(await sql('SELECT c.position,json_extract_string(c.receipt,\'$.kind\') FROM main.commands c '+
      'JOIN td_catalog_v1.schema_unique_activations u USING(command_id)'),[[4n,'td.schema.unique.activate/1']]);
  }finally{await port.close();}
});

test('unique domains separate exact typed carriers and persist across versions without the modifier',async()=>{
  const store=await NativeEntityStore.open();
  try {
    await store.defineSchema('schema unique_test version 1 {entity Row {alias:text many unique;} entity Other {alias:text;} }');
    assert.equal((await store.putRecord(record('text','a','7'))).position,2n);
    await store.defineSchema('schema unique_test version 2 {entity Row {alias:int64 unique;} }');
    const numeric={...record('number','b','unused',2),record:'{alias=7;}'};
    assert.equal((await store.putRecord(numeric)).position,4n);
    await assert.rejects(store.putRecord({...numeric,entityId:'c',commandId:'duplicate-number'}),DUPLICATE);
    await store.defineSchema('schema unique_test version 3 {entity Row {alias:text;} }');
    await assert.rejects(store.putRecord(record('duplicate-text','c','7',3)),DUPLICATE);
    assert.equal((await store.putRecord({...record('other-type','d','7'),type:'Other'})).position,5n);
    await store.defineSchema('schema elsewhere version 1 {entity Row {alias:text unique;} }');
    assert.equal((await store.putRecord({...record('other-schema','e','7'),schema:'elsewhere'})).position,7n);
    await store.revalidate();
    const result=await store.queryScalable("answer(?e,?v) :- triple(?e,'alias',?v).",{validAt:0n});
    assert.deepEqual(result.rows,[['a','7'],['b',7n],['d','7'],['e','7']].map(([e,v])=>
      [{tag:'str',value:e},{tag:typeof v==='bigint'?'i64':'str',value:v}]));
  }finally{await store.close();}
});

test('single patches reject conflicts and atomic batches swap valid-time ownership with carries',async()=>{
  const database=await path();
  const store=await NativeEntityStore.open({database});
  try {
    await store.defineSchema(unique);
    await store.putRecord(record('a','a','x',2));
    await store.putRecord(record('b','b','y',2));
    await assert.rejects(store.patchRecord(record('blocked','a','y',2,3n,7n)),DUPLICATE);
    const batch={schema:'unique_test',version:2,commandId:'swap',members:[
      {operation:'patch' as const,entityId:'a',type:'Row',record:'{alias="y";}',validFrom:3n,validTo:7n},
      {operation:'patch' as const,entityId:'b',type:'Row',record:'{alias="x";}',validFrom:3n,validTo:7n},
    ]};
    const swap=await store.batchRecords(batch);
    assert.equal(swap.position,4n);
    assert.deepEqual(swap.members.map(member=>[member.asserted.length,member.retracted.length]),[[3,1],[3,1]]);
    assert.deepEqual(await store.batchRecords({...batch,members:[...batch.members].reverse()}),swap);
    await assert.rejects(store.batchRecords({...batch,commandId:'collide',
      members:batch.members.map(member=>({...member,record:'{alias="z";}'}))}),DUPLICATE);
    assert.equal(await store.batchReceipt('collide'),null);
    assert.equal(await store.receipt('blocked'),null);
    for(const [known,valid,owner] of [[3n,3n,'a'],[4n,2n,'a'],[4n,3n,'b'],[4n,6n,'b'],[4n,7n,'a']] as const)
      await owners(store,known,valid,[owner]);
    await store.revalidate();
  }finally{await store.close();}
  const port=await openAuditedPort({database});
  try {
    assert.deepEqual(await port.runNative({name:'unique_batch_format',params:[],sql:
      'SELECT version,revision FROM main.store_meta,td_catalog_v1.catalog_revision'}),[[10n,3n]]);
  }finally{await port.close();}
});

test('owner re-audit rejects postactivation historical overlaps and altered activation receipts',async()=>{
  const database=await path();
  const store=await NativeEntityStore.open({database});
  try {
    await store.defineSchema(unique);
    await store.putRecord(record('a','a','x',2));
    await store.putRecord(record('old-b','b','x',2,10n,20n));
    await store.putRecord(record('correct-b','b','y',2,10n,20n));
  }finally{await store.close();}
  const port=await openAuditedPort({database});
  const raw=(sql:string)=>port.run({name:'unique_tamper_fixture',sql,params:[]});
  try {
    await raw("UPDATE main.assertions SET valid_from=9 WHERE command_id='old-b'");
    await assert.rejects(port.activateOwnership(),AUDIT);
    await raw("UPDATE main.assertions SET valid_from=10 WHERE command_id='old-b'");
    await port.activateOwnership();
    const receipt=(await raw('SELECT c.receipt FROM main.commands c JOIN td_catalog_v1.schema_unique_activations u USING(command_id)'))[0]?.[0];
    assert.equal(typeof receipt,'string');
    await raw("UPDATE main.commands SET receipt='{}' WHERE command_id IN(SELECT command_id FROM td_catalog_v1.schema_unique_activations)");
    await assert.rejects(port.activateOwnership(),AUDIT);
    await port.run({name:'restore_activation_receipt',params:[receipt],sql:
      'UPDATE main.commands SET receipt=? WHERE command_id IN(SELECT command_id FROM td_catalog_v1.schema_unique_activations)'});
    await port.activateOwnership();
  }finally{await port.close();}
});

test('a stale writer or stale activation cannot commit a uniqueness race',async()=>{
  const extension=fileURLToPath(new URL('../temporal_datalog.duckdb_extension',import.meta.url));
  const quote=(value:string)=>"'"+value.replaceAll("'","''")+"'";
  const define=(dsl:string)=>'PRAGMA td_define_schema_v2('+quote(dsl)+')';
  const put=(id:string)=>"PRAGMA td_put_entity_v2('unique_test',1,'Row',"+quote(id)+','+quote(id)+",'{alias=\"x\";}',0,10)";
  for(const stale of ['writer','activation']){
    const instance=await DuckDBInstance.create(':memory:',{allow_unsigned_extensions:'true'});
    const writer=await instance.connect(),activator=await instance.connect();
    try {
      await writer.run('LOAD '+quote(extension));
      await writer.run('PRAGMA td_initialize');
      await writer.run('PRAGMA td_migrate_native_catalog_v2');
      await activateEngineOwner(writer,activator);
      await writer.run(define(base));
      await writer.run(put('one'));
      const old=stale==='writer'?writer:activator;
      await old.run('BEGIN');
      assert.deepEqual((await old.runAndReadAll('SELECT position FROM main.clock')).getRows(),[[1n]]);
      try {
        if(stale==='writer'){
          await activator.run(define(unique));
          await assert.rejects(async()=>{
            await writer.run(put('late'));
            await writer.run('COMMIT');
          },/conflict|duplicate key.*position|TD_E_COMMAND_UNIQUE/i);
        }else{
          await writer.run(put('late'));
          await assert.rejects(async()=>{
            await activator.run(define(unique));
            await activator.run('COMMIT');
          },/conflict|duplicate key.*position|TD_E_SCHEMA_UNIQUE/i);
        }
      }finally{
        try{await old.run('ROLLBACK');}
        catch(error){assert.match(String(error),/no transaction active/i);}
      }
      const result=(await writer.runAndReadAll('SELECT position,version::BIGINT FROM main.clock,main.store_meta')).getRows();
      assert.deepEqual(result,[[2n,stale==='writer'?10n:5n]]);
      if(stale==='activation')await assert.rejects(activator.run(define(unique)),ACTIVATION);
      else await assert.rejects(writer.run(put('late')),DUPLICATE);
    }finally{activator.closeSync();writer.closeSync();instance.closeSync();}
  }
});
