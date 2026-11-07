import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {constants,copyFile,mkdtemp,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {DuckDBInstance} from '@duckdb/node-api';
import {NativeEntityStore} from './native-entity.js';
import type {EntityBatch,EntityBatchRecords,EntityBatchReceipt} from './native-entity.js';
import type {SchemaField} from './native-schema.js';
import {activateEngineOwner,openAuditedPort} from './native-test-fixture.js';

const schema='schema records version 1 {entity Row {n:int64 required;}}';
const first={schema:'records',version:1,type:'Row',entityId:'a',commandId:'seed',
  record:'{n=1;}',validFrom:0n,validTo:10n};
const count="source(?e,?n) :- triple(?e,'n',?n). answer(count()) :- source(?e,?n).";
const quote=(value:string)=>"'"+value.replaceAll("'","''")+"'";
const metadata='SELECT version,revision FROM main.store_meta CROSS JOIN td_catalog_v1.catalog_revision WHERE singleton';
const record=(entityId:string,n:bigint,operation:'put'|'patch'='put',validFrom=0n,validTo=10n)=>
  ({entityId,type:'Row',record:'{n='+n+';}',operation,validFrom,validTo});
const batch=(commandId:string,members:EntityBatchRecords['members']):EntityBatchRecords=>
  ({schema:'records',version:1,commandId,members});
const pragma=(request:EntityBatchRecords,initial=true)=>'PRAGMA td_batch_entities'+(initial?'_initial':'')+'('+
  [quote(request.schema),request.version,quote(request.commandId),quote(JSON.stringify(request.members.map(member=>({
    ...member,validFrom:String(member.validFrom),validTo:String(member.validTo),
  }))))].join(',')+')';
const buildPath=fileURLToPath(new URL('../',import.meta.url));
const fixture=async()=>join(await mkdtemp(join(buildPath,'native-batch-')),'store.duckdb');

async function batchState(sql:(sql:string)=>Promise<unknown>){
  return {
    metadata:await sql(metadata),
    clock:await sql('SELECT position FROM main.clock'),
    usage:await sql('SELECT retained_count,retained_bytes FROM main.storage_usage'),
    rows:await sql('SELECT assertion_id,command_id,tx_from,tx_to FROM main.assertions ORDER BY assertion_id'),
    commands:await sql('SELECT command_id,position FROM main.commands ORDER BY command_id'),
    owners:await sql('SELECT entity_id FROM td_catalog_v1.entity_owners ORDER BY entity_id'),
    batches:await sql('SELECT command_id,member_count FROM td_catalog_v1.entity_batches ORDER BY command_id'),
    members:await sql('SELECT command_id,entity_id FROM td_catalog_v1.entity_batch_members ORDER BY ALL'),
  };
}

async function checkPreviousBinary(database:string,build:string){
  const oldCore=join(build,'temporal_datalog.duckdb_extension');
  const oldOwner=join(build,'owner_probe','temporal_owner_probe.duckdb_extension');
  const sha=async(path:string)=>createHash('sha256').update(await readFile(path)).digest('hex');
  const core=JSON.parse(await readFile(join(build,'artifact.json'),'utf8'));
  const owner=JSON.parse(await readFile(join(build,'owner_probe','artifact.json'),'utf8'));
  assert.equal(core.extension_version,'0.26.0');
  assert.equal(await sha(oldCore),core.extension_sha256);
  assert.equal(await sha(oldOwner),owner.extension_sha256);
  assert.equal(owner.core_extension_sha256,core.extension_sha256);
  const sourceSha=await sha(database),copy=await fixture();
  await copyFile(database,copy,constants.COPYFILE_EXCL);
  assert.equal(await sha(copy),sourceSha);

  const instance=await DuckDBInstance.create(copy,{allow_unsigned_extensions:'true',threads:'1'});
  const connection=await instance.connect();
  const sql=async(statement:string)=>(await connection.runAndReadAll(statement)).getRows();
  const state=async()=>({
    batch:await batchState(sql),
    values:await sql('SELECT assertion_id,payload,extra_json FROM main.assertions ORDER BY assertion_id'),
    receipts:await sql('SELECT command_id,request_hash,receipt FROM main.commands ORDER BY command_id'),
    views:await sql("SELECT view_name,sql FROM system.main.duckdb_views() WHERE schema_name='td_catalog_v1' ORDER BY view_name"),
  });
  try{
    await sql('LOAD '+quote(oldCore));
    await sql('LOAD '+quote(oldOwner));
    await sql('SELECT system.main.td_owner_probe_enroll()');
    const before=await state();
    assert.deepEqual(before.batch.metadata,[[9,3]]);
    await assert.rejects(sql('PRAGMA td_initialize'),/unsupported native catalog revision/);
    await assert.rejects(sql('SELECT system.main.td_owner_probe_activate(0)'),/TD_E_COMMAND_FORMAT|TD_E_OWNER_AUDIT_CATALOG/);
    await assert.rejects(sql("PRAGMA td_entity_receipt('old-9-2')"),/TD_E_OWNER_PROBE_INVALID|TD_E_COMMAND_FORMAT/);
    await assert.rejects(sql("PRAGMA td_put_entity_v2('docs',1,'Document','a','blocked','{}',0,10)"),
      /TD_E_OWNER_PROBE_INVALID|TD_E_COMMAND_FORMAT/);
    assert.deepEqual(await state(),before);
  }finally{connection.closeSync();instance.closeSync();}
  assert.equal(await sha(database),sourceSha);
  return {core:core.extension_sha256,owner:owner.extension_sha256,source:sourceSha};
}

for(const legacyVersion of [5n,6n]){
  test('first one-K patch and put preserve format '+legacyVersion+' history and replay at default memory',async()=>{
    const database=await fixture();
    const setup=await openAuditedPort({database});
    const sql=(sql:string)=>setup.runNative({name:'batch_seed',sql,params:[]});
    let seedPosition=1n;
    try{
      await sql('PRAGMA td_define_schema('+quote(schema)+')');
      await sql("PRAGMA td_put_entity('records',1,'Row','a','seed','{n=1;}',0,10)");
      if(legacyVersion===6n){
        await sql("PRAGMA td_patch_entity('records',1,'Row','a','old-patch','{n=3;}',2,8)");
        seedPosition++;
      }
      assert.deepEqual(await sql(metadata),[[legacyVersion,2n]]);
    }finally{await setup.close();}

    const request=batch('first-batch',[record('b',4n),record('a',2n,'patch',3n,7n)]);
    const options={database,readers:2};
    let receipt!:EntityBatchReceipt;
    let seed!:Awaited<ReturnType<NativeEntityStore['receipt']>>;
    let before!:Awaited<ReturnType<NativeEntityStore['at']>>;
    const store=await NativeEntityStore.open(options);
    try{
      seed=await store.receipt('seed');
      before=await store.at('a',{knownAt:seedPosition,validAt:4n});
      assert.equal(before[0]?.value.value,legacyVersion===5n?1n:3n);
      assert.equal(await store.batchReceipt('first-batch'),null);
      assert.deepEqual((await store.queryScalable(count,{validAt:4n})).rows,[[{tag:'i64',value:1n}]]);
      await assert.rejects(store.batchRecords(batch('first-batch',[record('a',2n),record('a',3n)])),/TD_E_COMMAND_INPUT/);
      assert.equal(await store.batchReceipt('first-batch'),null);
      receipt=await store.batchRecords(request);
      assert.equal(receipt.position,seedPosition+1n);
      assert.deepEqual(receipt.members.map(member=>member.entityId),['a','b']);
      assert.equal(receipt.members[0]?.asserted.length,3);
      assert.equal(receipt.members[0]?.retracted.length,1);
      assert.equal(receipt.members[1]?.asserted.length,1);
      assert.deepEqual((await store.queryScalable(count,{validAt:4n})).rows,[[{tag:'i64',value:2n}]]);
      assert.deepEqual((await store.queryScalable(count,{validAt:4n,knownAt:seedPosition})).rows,
        [[{tag:'i64',value:1n}]]);
      for(const [validAt,value] of [[0n,1n],[3n,2n],[7n,legacyVersion===5n?1n:3n]] as const){
        const facts=await store.at('a',{knownAt:receipt.position,validAt});
        assert.deepEqual(facts.map(fact=>fact.value.value),[value]);
      }
      before=before.map(fact=>({...fact,txTo:receipt.position,correctedBy:'first-batch'}));
      assert.deepEqual(await store.at('a',{knownAt:seedPosition,validAt:4n}),before);
      assert.deepEqual(await store.batchRecords({...request,members:[...request.members].reverse()}),receipt);
      await assert.rejects(store.receipt('first-batch'),/TD_E_COMMAND_KIND/);
      await assert.rejects(store.batchReceipt('seed'),/TD_E_COMMAND_KIND/);

      const next=await store.patchRecord({...first,commandId:'single-after-batch',record:'{n=8;}',validFrom:4n,validTo:5n});
      assert.equal(next.position,receipt.position+1n);
      assert.deepEqual(await store.batchRecords(request),receipt);
      await store.revalidate();
    }finally{await store.close();}

    const reopened=await NativeEntityStore.open(options);
    try{
      assert.deepEqual(await reopened.receipt('seed'),seed);
      assert.deepEqual(await reopened.batchReceipt('first-batch'),receipt);
      assert.deepEqual(await reopened.at('a',{knownAt:seedPosition,validAt:4n}),before);
      assert.deepEqual((await reopened.at('a',{knownAt:receipt.position+1n,validAt:4n})).map(fact=>fact.value.value),[8n]);
    }finally{await reopened.close();}

    const inspect=await openAuditedPort({database});
    try{
      assert.deepEqual(await inspect.runNative({name:'batch_format',sql:metadata,params:[]}),[[9n,3n]]);
    }finally{await inspect.close();}
  });
}

test('first batch metadata, members and receipt share the caller transaction',async()=>{
  const port=await openAuditedPort();
  const sql=(sql:string)=>port.runNative({name:'batch_atomicity',sql,params:[]});
  const request=batch('first',[record('a',1n),record('b',2n)]);
  const state=()=>batchState(sql);
  try{
    await sql('PRAGMA td_define_schema('+quote(schema)+')');
    const before=await state();
    await assert.rejects(sql(pragma(request,false)),/TD_E_COMMAND_FORMAT/);
    await assert.rejects(sql(pragma(batch('first',[record('a',1n),{...record('b',2n),record:'{wrong=2;}'}]))),
      /TD_E_SCHEMA/);
    assert.deepEqual(await state(),before);

    await sql('BEGIN TRANSACTION');
    const uncommitted=await sql(pragma(request));
    assert.deepEqual(await sql(metadata),[[9n,3n]]);
    assert.equal(uncommitted[0]?.[1],1n);
    await sql('ROLLBACK');
    assert.deepEqual(await state(),before);
    assert.deepEqual(await sql("PRAGMA td_batch_receipt('first')"),[]);

    const committed=await sql(pragma(request));
    const after=await state();
    assert.deepEqual(committed,uncommitted);
    assert.deepEqual(after.metadata,[[9n,3n]]);
    assert.deepEqual(after.clock,[[1n]]);
    assert.deepEqual(await sql('SELECT count(*) FROM main.assertions'),[[2n]]);
    assert.deepEqual(await sql(pragma({...request,members:[...request.members].reverse()})),committed);
    assert.deepEqual(await state(),after);
  }finally{await port.close();}
});

test('late batch usage constraint rolls back migration and both members',async()=>{
  const instance=await DuckDBInstance.create(':memory:',{
    allow_unsigned_extensions:'true',threads:'1',memory_limit:'128MB',
  });
  const connection=await instance.connect();
  const sql=async(statement:string)=>(await connection.runAndReadAll(statement)).getRows();
  const request=batch('late-fault',[record('a',1n),record('b',2n)]);
  try{
    await sql('LOAD '+quote(join(buildPath,'temporal_datalog.duckdb_extension')));
    await sql('CREATE TABLE main.storage_usage(singleton BOOLEAN PRIMARY KEY CHECK(singleton),'+
      'retained_count BIGINT NOT NULL CHECK(retained_count BETWEEN 0 AND 1),'+
      'retained_bytes BIGINT NOT NULL CHECK(retained_bytes>=0))');
    await sql('PRAGMA td_initialize');
    await sql('PRAGMA td_migrate_native_catalog_v2');
    await activateEngineOwner(connection);
    await sql('PRAGMA td_define_schema('+quote(schema)+')');
    const before=await batchState(sql);

    await assert.rejects(sql(pragma(request)),/constraint|CHECK/i);
    assert.deepEqual(await batchState(sql),before);
    await sql('BEGIN TRANSACTION');
    await assert.rejects(sql(pragma(request)),/constraint|CHECK/i);
    await sql('COMMIT');
    assert.deepEqual(await batchState(sql),before);
    assert.deepEqual(await sql("PRAGMA td_batch_receipt('late-fault')"),[]);

    const receipt=await sql(pragma(batch('late-fault',[record('a',1n)])));
    assert.equal(receipt[0]?.[1],1n);
    assert.deepEqual(await sql(metadata),[[9,3]]);
    assert.deepEqual(await sql('SELECT retained_count FROM main.storage_usage'),[[1n]]);
  }finally{connection.closeSync();instance.closeSync();}
});

test('batch from format eight preserves typed forward references and a cyclic declaration',async()=>{
  const database=await fixture();
  const setup=await openAuditedPort({database});
  const sql=(sql:string)=>setup.runNative({name:'batch_typed_seed',sql,params:[]});
  const typed='schema typed version 1 {entity Row {next:ref_value(Row) required;stamp:datetime required;}}';
  try{
    await sql('PRAGMA td_define_schema_v2('+quote(typed)+')');
    assert.deepEqual(await sql(metadata),[[8n,2n]]);
  }finally{await setup.close();}

  const store=await NativeEntityStore.open({database,readers:2});
  try{
    const member=(entityId:string,target:string,value:number):EntityBatch['members'][number]=>({
      operation:'put',type:'Row',entityId,validFrom:0n,validTo:10n,
      fields:[{attribute:'next',value:{tag:'ref',value:target}},{attribute:'stamp',value:{tag:'datetime',value}}],
    });
    const request:EntityBatch={schema:'typed',version:1,commandId:'cycle',members:[member('a','b',-1.25),member('b','a',0.5)]};
    await assert.rejects(store.batch({...request,members:[member('a','missing',-1.25),request.members[1]!]}),
      /TD_E_COMMAND_REFERENCE/);
    assert.equal(await store.batchReceipt('cycle'),null);
    const receipt=await store.batch(request);
    assert.equal(receipt.position,1n);
    const program="answer(?r) :- triple('a','next',?r).";
    assert.deepEqual((await store.queryScalable(program,{validAt:4n})).rows,[[{tag:'ref',value:'b'}]]);
    assert.deepEqual((await store.query(program,{validAt:4n,forceNative:true})).rows,[[{tag:'ref',value:'b'}]]);
    assert.deepEqual((await store.at('b',{knownAt:1n,validAt:4n})).map(fact=>fact.value),
      [{tag:'ref',value:'a'},{tag:'datetime',value:0.5}]);
    await store.defineSchema(typed.replace('version 1','version 2'));
    await store.revalidate();
    assert.deepEqual(await store.batch({...request,members:[...request.members].reverse()}),receipt);
  }finally{await store.close();}

  const inspect=await openAuditedPort({database});
  try{
    assert.deepEqual(await inspect.runNative({name:'batch_typed_format',sql:metadata,params:[]}),[[9n,3n]]);
  }finally{await inspect.close();}
});

test('format nine revision two upgrades atomically and preserves blob descriptors through batch patch',async t=>{
  const database=await fixture();
  const options={database,readers:2};
  const docs='schema docs version 1 {entity Document {asset:blob required;source:json required;}}';
  const fields=(mimeType:string,size:number,source:string):readonly SchemaField[]=>[
    {attribute:'asset',value:{tag:'blob',value:'asset-é🙂',mimeType,size,filename:'file-é.txt'}},
    {attribute:'source',value:{tag:'json',value:source}},
  ];
  const original=fields('text/plain',0,'{"a":1}');
  const corrected=fields('application/octet-stream',9,' {"a":1} ');
  const put={schema:'docs',version:1,type:'Document',entityId:'a',commandId:'old-9-2',
    validFrom:0n,validTo:10n,fields:original};
  const setup=await NativeEntityStore.open(options);
  try{
    await setup.defineSchema(docs);
    assert.equal((await setup.put(put)).position,1n);
  }finally{await setup.close();}

  const format=async()=>{
    const port=await openAuditedPort({database});
    try{return await port.runNative({name:'batch_doc_format',sql:metadata,params:[]});}
    finally{await port.close();}
  };
  assert.deepEqual(await format(),[[9n,2n]]);

  const request:EntityBatch={schema:'docs',version:1,commandId:'first-9-3',members:[
    {operation:'put',type:'Document',entityId:'b',validFrom:0n,validTo:10n,fields:original},
    {operation:'patch',type:'Document',entityId:'a',validFrom:3n,validTo:7n,fields:corrected},
  ]};
  const check=async(store:NativeEntityStore)=>{
    for(const [knownAt,validAt,expected] of [[1n,4n,original],[2n,2n,original],
      [2n,3n,corrected],[2n,7n,original]] as const){
      const rows=await store.at('a',{knownAt,validAt});
      assert.deepEqual(rows.map(({attribute,value})=>({attribute,value})),expected);
    }
    const source="answer(?v) :- triple('a','source',?v).";
    assert.deepEqual((await store.queryScalable(source,{knownAt:2n,validAt:4n})).rows,[[corrected[1]!.value]]);
  };
  let receipt!:EntityBatchReceipt;
  const store=await NativeEntityStore.open(options);
  try{
    receipt=await store.batch(request);
    assert.equal(receipt.position,2n);
    assert.deepEqual(receipt.members.map(member=>[member.entityId,member.asserted.length,member.retracted.length]),
      [['a',6,2],['b',2,0]]);
    await check(store);
    await store.revalidate();
    assert.deepEqual(await store.batch({...request,members:[...request.members].reverse()}),receipt);
  }finally{await store.close();}

  assert.deepEqual(await format(),[[9n,3n]]);
  const reopened=await NativeEntityStore.open(options);
  try{
    await check(reopened);
    assert.deepEqual(await reopened.batchReceipt('first-9-3'),receipt);
  }finally{await reopened.close();}
  if(process.env.TD_TEST_PRE_BATCH_BUILD){
    const fence=await checkPreviousBinary(database,process.env.TD_TEST_PRE_BATCH_BUILD);
    t.diagnostic('Verified previous binary revision fence '+JSON.stringify(fence));
  }
});
