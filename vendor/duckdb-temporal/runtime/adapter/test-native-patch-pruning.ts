import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {NativeEntityStore} from './native-entity.js';
import type {EntityAssertion} from './native-entity.js';
import {openAuditedPort} from './native-test-fixture.js';

const schema='schema anti_probe version 1 {entity Probe {probe_member:int64 required;i:int64 required;}}';
const quote=(text:string)=>"'"+text.replaceAll("'","''")+"'";
const fields=(rows:readonly EntityAssertion[])=>rows.map(row=>[row.attribute,row.value.tag,row.value.value]);
const expected=(value:bigint)=>[['i','i64',value],['probe_member','i64',0n]];
const request=(entityId:string,commandId:string,record='{probe_member=0;i=1;}',validFrom=0n,validTo=10n)=>({
  schema:'anti_probe',version:1,type:'Probe',entityId,commandId,record,validFrom,validTo,
});
const database=async()=>join(await mkdtemp(fileURLToPath(new URL('../patch-pruning-',import.meta.url))),'facts.duckdb');

test('literal patch scope preserves binary-distinct identifiers, carries, replay and old cuts',{timeout:60000},async()=>{
  const path=await database(),entities=["probe-'é","probe-'e\u0301","probe-'É"];
  let store=await NativeEntityStore.open({database:path,readers:4});
  const check=async(target:NativeEntityStore)=>{
    for(const entityId of entities){
      assert.deepEqual(fields(await target.at(entityId,{knownAt:3n,validAt:5n})),expected(1n));
      for(const [validAt,value] of [[0n,1n],[2n,0n],[3n,2n],[6n,2n],[7n,0n],[8n,1n],[9n,1n]]as const)
        assert.deepEqual(fields(await target.at(entityId,{knownAt:5n,validAt})),expected(entityId===entities[0]?value:1n));
    }
    assert.deepEqual(await target.at(entities[0]!,{knownAt:5n,validAt:10n}),[]);
  };
  try{
    await store.defineSchema(schema);
    for(const [index,entityId] of entities.entries())await store.putRecord(request(entityId,'seed-'+index));
    const adjacent=await store.history(entities[1]!);
    const middle=request(entities[0]!,'middle-\'é','{i=0;probe_member=0;}',2n,8n);
    const receipt=await store.patchRecord(middle);
    assert.equal(receipt.position,4n);assert.equal(receipt.asserted.length,6);assert.equal(receipt.retracted.length,2);
    const later=await store.patchRecord(request(entities[0]!,'later','{i=2;probe_member=0;}',3n,7n));
    assert.equal(later.position,5n);
    const history=await store.history(entities[0]!);
    assert.deepEqual(await store.patchRecord({...middle,record:'{probe_member=0;i=0;i=0;}'}),receipt);
    assert.deepEqual(await store.history(entities[0]!),history);
    assert.deepEqual(await store.history(entities[1]!),adjacent);
    await assert.rejects(store.patchRecord({...middle,record:'{i=9;probe_member=0;}'}),/TD_E_COMMAND_IDEMPOTENCY/);
    await check(store);await store.revalidate();
  }finally{await store.close();}
  store=await NativeEntityStore.open({database:path,readers:4});
  try{await check(store);}finally{await store.close();}
});

test('batch-created target history and explicit rollback retain exact patch receipts',{timeout:60000},async()=>{
  const path=await database(),entityId="probe-'batch",other='other';
  const store=await NativeEntityStore.open({database:path});
  try{
    await store.defineSchema(schema);
    const seed=await store.batchRecords({schema:'anti_probe',version:1,commandId:'batch-seed',members:[entityId,other].map(id=>({
      operation:'put' as const,type:'Probe',entityId:id,record:'{i=1;probe_member=0;}',validFrom:0n,validTo:10n,
    }))});
    assert.equal(seed.position,1n);
  }finally{await store.close();}
  const port=await openAuditedPort({database:path});
  const run=(sql:string)=>port.runNative({name:'patch_pruning_test',sql,params:[]});
  const patch='PRAGMA td_patch_entity_v2('+[quote('anti_probe'),'1',quote('Probe'),quote(entityId),quote("patch-'batch"),
    quote('{i=0;probe_member=0;}'),'0','10'].join(',')+')';
  try{
    const before=await run('SELECT position,retained_count,retained_bytes FROM main.clock,main.storage_usage');
    await run('BEGIN');const rolledBack=await run(patch);assert.equal(rolledBack[0]?.[1],2n);await run('ROLLBACK');
    assert.deepEqual(await run('SELECT position,retained_count,retained_bytes FROM main.clock,main.storage_usage'),before);
    assert.deepEqual(await run('PRAGMA td_entity_receipt('+quote("patch-'batch")+')'),[]);
    assert.deepEqual(await run(patch),rolledBack);
    assert.deepEqual(await run(patch),rolledBack);
  }finally{await port.close();}
  const reopened=await NativeEntityStore.open({database:path,readers:4});
  try{
    assert.deepEqual(fields(await reopened.at(entityId,{knownAt:1n,validAt:0n})),expected(1n));
    assert.deepEqual(fields(await reopened.at(entityId,{knownAt:2n,validAt:0n})),expected(0n));
    assert.deepEqual(fields(await reopened.at(other,{knownAt:2n,validAt:0n})),expected(1n));
    const missing=await reopened.patchRecord(request('new-empty-history','new-target','{i=4;probe_member=0;}'));
    assert.equal(missing.position,3n);assert.equal(missing.retracted.length,0);assert.equal(missing.asserted.length,2);
    await assert.rejects(reopened.patchRecord(request('bad-empty-history','bad-target','{i=4;}')),/TD_E_SCHEMA_REQUIRED/);
    assert.equal(await reopened.receipt('bad-target'),null);
    await reopened.revalidate();
  }finally{await reopened.close();}
});
