import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {DuckDBInstance} from '@duckdb/node-api';
import {NativeEntityStore} from './native-entity.js';
import type {EntityPut} from './native-entity.js';
import {activateEngineOwner,openAuditedPort} from './native-test-fixture.js';

const legacy='schema presence_test version 1 {entity Legacy {label:text;}}';
const live='schema presence_test version 2 {entity Legacy {label:text;} entity Live live {label:text;}}';
const upgraded=async()=>join(await mkdtemp(fileURLToPath(new URL('../presence-',import.meta.url))),'facts.duckdb');
const write=(commandId:string,validFrom:bigint,validTo:bigint,record='{}')=>({
  schema:'presence_test',version:2,type:'Live',entityId:'tracked',commandId,validFrom,validTo,record,
});
const PRESENT_AUDIT=/TD_E_OWNER_AUDIT_PRESENCE/;

test('authored empty puts and patches retain presence across both cuts and reopen',async()=>{
  const database=await upgraded();
  const store=await NativeEntityStore.open({database,readers:2});
  const cuts=[
    [2n,0n,null],[3n,-1n,false],[3n,0n,true],[3n,9n,true],[3n,10n,false],
    [4n,0n,true],[4n,10n,true],[4n,19n,true],[4n,20n,false],
    [5n,11n,true],[5n,12n,true],[5n,14n,true],[5n,19n,true],
    [6n,2n,false],[6n,3n,true],[6n,6n,true],[6n,7n,false],[6n,13n,false],
  ] as const;
  async function check(target:NativeEntityStore){
    for(const [knownAt,validAt,expected] of cuts)
      assert.equal(await target.presenceAt('tracked',{knownAt,validAt}),expected,`K=${knownAt} V=${validAt}`);
    assert.equal(await target.presenceAt('legacy',{knownAt:6n,validAt:0n}),null);
    assert.equal(await target.presenceAt('unknown',{knownAt:6n,validAt:0n}),null);
    await assert.rejects(target.presenceAt('unknown',{knownAt:7n,validAt:0n}),/knowledge cut exceeds committed clock/);
    assert.deepEqual(await target.at('tracked',{knownAt:5n,validAt:13n}),[]);
    assert.equal((await target.at('tracked',{knownAt:5n,validAt:14n})).length,1);
  }
  try{
    const oldSchema=await store.defineSchema(legacy);
    const oldWrite={...write('old',0n,10n),version:1,type:'Legacy',entityId:'legacy'};
    const oldReceipt=await store.putRecord(oldWrite);
    const registration=await store.defineSchema(live);
    assert.deepEqual(await store.defineSchema(live),registration);
    const empty=await store.putRecord(write('empty',0n,10n));
    assert.equal(empty.position,3n);
    assert.deepEqual(empty.asserted,[]);
    assert.equal((await store.patchRecord(write('fill',10n,20n,'{label="fill";}'))).position,4n);
    assert.equal((await store.patchRecord(write('clear',12n,14n))).position,5n);
    assert.equal((await store.putRecord(write('replace',3n,7n))).position,6n);
    assert.deepEqual(await store.putRecord(write('empty',0n,10n)),empty);
    assert.deepEqual(await store.putRecord(oldWrite),oldReceipt);
    assert.deepEqual(await store.defineSchema(legacy),oldSchema);
    await check(store);
    await store.revalidate();
  }finally{await store.close();}
  const reopened=await NativeEntityStore.open({database});
  try{await check(reopened);}finally{await reopened.close();}
});

test('live policy rejects legacy type conversion and later opt-out, while legacy batches stay writable',async()=>{
  const database=await upgraded();
  const store=await NativeEntityStore.open({database});
  try{
    await store.defineSchema(legacy);
    await assert.rejects(store.defineSchema('schema presence_test version 2 {entity Legacy live {label:text;}}'),/TD_E_SCHEMA_PRESENCE/);
    await store.defineSchema(live);
    await assert.rejects(store.defineSchema('schema presence_test version 3 {entity Live {label:text;}}'),/TD_E_SCHEMA_PRESENCE/);
    await store.defineSchema('schema presence_test version 3 {entity Live live {label:text;}}');
    const legacyBatch={schema:'presence_test',version:2,commandId:'batch',members:[{
      operation:'patch' as const,type:'Legacy',entityId:'legacy',record:'{}',validFrom:0n,validTo:10n,
    }]};
    const receipt=await store.batchRecords(legacyBatch);
    assert.equal(receipt.position,3n);
    assert.deepEqual(await store.batchRecords(legacyBatch),receipt);
    assert.equal((await store.putRecord({...write('managed',0n,10n),version:3})).position,4n);
    await store.revalidate();
  }finally{await store.close();}
  const port=await openAuditedPort({database});
  try{
    const sql=(statement:string)=>port.runNative({name:'presence_profile',sql:statement,params:[]});
    assert.deepEqual(await sql('SELECT version,revision FROM main.store_meta,td_catalog_v1.catalog_revision'),[[11n,3n]]);
    assert.deepEqual(await sql('SELECT schema_version FROM td_catalog_v1.schema_presence_activations ORDER BY schema_version'),[[2n],[3n]]);
    assert.deepEqual(await sql('SELECT command_id,operation,valid_from,valid_to FROM td_catalog_v1.entity_presence_events'),[['managed','put',0n,10n]]);
    assert.deepEqual(await sql("SELECT receipt FROM main.commands WHERE command_id='batch'"),
      [['{"command_id":"batch","position":3,"members":[{"operation":"patch","type":"Legacy","entityId":"legacy","asserted":[],"retracted":[]}]}']]);
  }finally{await port.close();}
});

test('format eleven enforces prior unique domains and combined activation uses one position',async()=>{
  const database=await upgraded();
  const store=await NativeEntityStore.open({database});
  try{
    const prior=await store.defineSchema('schema prior_unique version 1 {entity Row {label:text unique;}}');
    const original={...write('first',0n,10n,'{label="alias";}'),schema:'prior_unique',version:1,type:'Row',entityId:'a'};
    const first=await store.putRecord(original);
    assert.equal(first.position,2n);
    const combined='schema presence_test version 2 {entity Live live {label:text unique;}}';
    const activation=await store.defineSchema(combined);
    assert.deepEqual(await store.defineSchema(combined),activation);
    assert.deepEqual(await store.putRecord(original),first);
    assert.deepEqual(await store.defineSchema('schema prior_unique version 1 {entity Row {label:text unique;}}'),prior);
    await assert.rejects(store.putRecord({...original,commandId:'dup',entityId:'b'}),/TD_E_COMMAND_UNIQUE/);
    assert.equal((await store.putRecord(write('live-first',0n,10n,'{label="value";}'))).position,4n);
    await assert.rejects(store.putRecord({...write('live-dup',0n,10n,'{label="value";}'),entityId:'other'}),/TD_E_COMMAND_UNIQUE/);
    await store.revalidate();
  }finally{await store.close();}
  const port=await openAuditedPort({database});
  try{
    const sql=(statement:string)=>port.runNative({name:'presence_unique',sql:statement,params:[]});
    assert.deepEqual(await sql('SELECT schema_name,enforced_from FROM td_catalog_v1.unique_domains ORDER BY schema_name'),
      [['presence_test',3n],['prior_unique',1n]]);
    assert.deepEqual(await sql('SELECT p.command_id=u.command_id FROM td_catalog_v1.schema_presence_activations p '+
      'JOIN td_catalog_v1.schema_unique_activations u USING(schema_name,schema_version)'),[[true]]);
  }finally{await port.close();}
});

test('activation rolls back format, registry, and knowledge event together',async()=>{
  const port=await openAuditedPort();
  const sql=(statement:string)=>port.runNative({name:'presence_rollback',sql:statement,params:[]});
  try{
    const define="PRAGMA td_define_schema_v2('"+live+"')";
    await sql('BEGIN');
    await sql(define);
    assert.deepEqual(await sql('SELECT version,position FROM main.store_meta,main.clock'),[[11n,1n]]);
    await sql('ROLLBACK');
    assert.deepEqual(await sql('SELECT version,position FROM main.store_meta,main.clock'),[[5n,0n]]);
    for(const relation of ['schemas','schema_type_modes','schema_presence_activations'])
      assert.deepEqual(await sql('SELECT count(*) FROM td_catalog_v1.'+relation),[[0n]]);
    await sql(define);
    await port.activateOwnership();
    assert.deepEqual(await sql('SELECT version,position FROM main.store_meta,main.clock'),[[11n,1n]]);
  }finally{await port.close();}
});

test('owner re-audit rejects an altered empty edit and an assertion surviving a later put',async()=>{
  const database=await upgraded();
  const store=await NativeEntityStore.open({database});
  try{
    await store.defineSchema(live);
    await store.putRecord(write('empty',0n,10n));
    await store.putRecord(write('valued',0n,10n,'{label="value";}'));
    await store.putRecord(write('narrow',1n,9n));
  }finally{await store.close();}
  const port=await openAuditedPort({database});
  const raw=(sql:string)=>port.run({name:'presence_tamper',sql,params:[]});
  try{
    await raw("UPDATE td_catalog_v1.entity_presence_edits SET valid_to=11 WHERE command_id='empty'");
    await assert.rejects(port.activateOwnership(),PRESENT_AUDIT);
    await raw("UPDATE td_catalog_v1.entity_presence_edits SET valid_to=10 WHERE command_id='empty'");
    await port.activateOwnership();
    await raw("UPDATE main.assertions SET tx_to=9223372036854775807,corrected_by=NULL,"+
      "retracted_at=NULL,retract_transaction_id=NULL WHERE command_id='valued'");
    await assert.rejects(port.activateOwnership(),/TD_E_OWNER_AUDIT_PRESENCE: assertion survived/);
  }finally{await port.close();}
});


test('stale first declarations cannot choose conflicting presence policies',async()=>{
  const artifact=fileURLToPath(new URL('../temporal_datalog.duckdb_extension',import.meta.url));
  const plain="PRAGMA td_define_schema_v2('schema race version 1 {entity Row {label:text;}}')";
  const tracked="PRAGMA td_define_schema_v2('schema race version 2 {entity Row live {label:text;}}')";
  for(const staleIsLive of [false,true]){
    const instance=await DuckDBInstance.create(':memory:',{allow_unsigned_extensions:'true'});
    const stale=await instance.connect(),winner=await instance.connect();
    try{
      await winner.run("LOAD '"+artifact.replaceAll("'","''")+"'");
      await winner.run('PRAGMA td_initialize');
      await winner.run('PRAGMA td_migrate_native_catalog_v2');
      await activateEngineOwner(winner,stale);
      await stale.run('BEGIN');
      assert.deepEqual((await stale.runAndReadAll('SELECT position FROM main.clock')).getRows(),[[0n]]);
      const fresh=staleIsLive?plain:tracked,loser=staleIsLive?tracked:plain;
      await winner.run(fresh);
      try{
        await assert.rejects(async()=>{
          await stale.run(loser);
          await stale.run('COMMIT');
        },/TD_E_SCHEMA_PRESENCE|conflict|duplicate key|catalog version/i);
      }finally{
        try{await stale.run('ROLLBACK');}
        catch(error){assert.match(String(error),/no transaction active/i);}
      }
      assert.deepEqual((await winner.runAndReadAll('SELECT version::BIGINT,position FROM main.store_meta,main.clock')).getRows(),
        [[staleIsLive?5n:11n,staleIsLive?0n:1n]]);
      await assert.rejects(winner.run(loser),/TD_E_SCHEMA_PRESENCE/);
      assert.deepEqual((await winner.runAndReadAll('SELECT version::BIGINT FROM td_catalog_v1.schemas')).getRows(),
        [[staleIsLive?1n:2n]]);
    }finally{winner.closeSync();stale.closeSync();instance.closeSync();}
  }
});


const batchMember=(operation:'put'|'patch',entityId:string,validFrom:bigint,validTo:bigint,type='Live',record='{}')=>
  ({operation,entityId,type,record,validFrom,validTo});

test('mixed managed batch edits share one cut, preserve carries, and replay exactly after later writes',async()=>{
  const database=await upgraded();
  const store=await NativeEntityStore.open({database,readers:2});
  const mixed={schema:'presence_test',version:2,commandId:'mixed',members:[
    batchMember('patch','tracked',3n,7n),batchMember('put','empty',10n,20n),
    batchMember('put','legacy',0n,100n,'Legacy'),
  ]};
  const cuts=[
    ['tracked',2n,4n,true],['empty',2n,10n,null],['legacy',3n,2n,null],
    ['tracked',3n,0n,true],['tracked',3n,6n,true],['tracked',3n,7n,true],['tracked',3n,10n,false],
    ['empty',3n,9n,false],['empty',3n,10n,true],['empty',3n,19n,true],['empty',3n,20n,false],
    ['tracked',4n,4n,false],['tracked',4n,5n,true],['tracked',4n,6n,false],
    ['empty',5n,19n,true],['empty',5n,20n,true],['empty',5n,24n,true],['empty',5n,25n,false],
  ] as const;
  async function check(target:NativeEntityStore){
    for(const [id,knownAt,validAt,value] of cuts)
      assert.equal(await target.presenceAt(id,{knownAt,validAt}),value,`${id} K=${knownAt} V=${validAt}`);
    assert.deepEqual(await target.at('tracked',{knownAt:3n,validAt:4n}),[]);
    for(const validAt of [2n,7n])
      assert.deepEqual((await target.at('tracked',{knownAt:3n,validAt})).map(row=>row.value),[{tag:'str',value:'old'}]);
  }
  try{
    await store.defineSchema(live);
    const first=await store.putRecord(write('base',0n,10n,'{label="old";}'));
    assert.equal(first.position,2n);
    const receipt=await store.batchRecords(mixed);
    assert.equal(receipt.position,3n);
    assert.deepEqual(receipt.members.map(m=>[m.entityId,m.asserted.length,m.retracted]),
      [['empty',0,[]],['legacy',0,[]],['tracked',2,first.asserted]]);
    const narrowing=await store.putRecord(write('narrow',5n,6n));
    assert.equal(narrowing.position,4n);
    assert.deepEqual([...narrowing.retracted].sort(),[...receipt.members[2]!.asserted].sort());
    assert.equal((await store.batchRecords({...mixed,commandId:'extension',members:[
      batchMember('patch','empty',20n,25n),
    ]})).position,5n);
    assert.deepEqual(await store.batchRecords({...mixed,members:[...mixed.members].reverse()}),receipt);
    await assert.rejects(store.batchRecords({...mixed,members:mixed.members.map(m=>
      m.entityId==='empty'?{...m,validTo:21n}:m)}),/TD_E_COMMAND_IDEMPOTENCY/);
    await check(store);
    await store.revalidate();
  }finally{await store.close();}
  const reopened=await NativeEntityStore.open({database});
  try{await check(reopened);}finally{await reopened.close();}
  const port=await openAuditedPort({database});
  try{
    const sql=(statement:string)=>port.runNative({name:'presence_batch_binding',sql:statement,params:[]});
    assert.deepEqual(await sql('SELECT command_id,entity_id,position,operation,valid_from,valid_to '+
      'FROM td_catalog_v1.entity_presence_events ORDER BY position,entity_id'),[
      ['base','tracked',2n,'put',0n,10n],['mixed','empty',3n,'put',10n,20n],['mixed','tracked',3n,'patch',3n,7n],
      ['narrow','tracked',4n,'put',5n,6n],['extension','empty',5n,'patch',20n,25n],
    ]);
    assert.deepEqual(await sql("SELECT CAST(json_extract(receipt,'$.presence') AS VARCHAR) FROM main.commands WHERE command_id='mixed'"),
      [['[{"entity_id":"empty","entity_type":"Live","operation":"put","valid_from":10,"valid_to":20},'+
        '{"entity_id":"tracked","entity_type":"Live","operation":"patch","valid_from":3,"valid_to":7}]']]);
  }finally{await port.close();}
});

test('first managed batch presence and revision roll back with the caller transaction',async()=>{
  const port=await openAuditedPort();
  const sql=(statement:string)=>port.runNative({name:'presence_batch_rollback',sql:statement,params:[]});
  const members=JSON.stringify([batchMember('put','tracked',-1n,1n),batchMember('patch','legacy',0n,10n,'Legacy')],
    (_,value)=>typeof value==='bigint'?String(value):value);
  const batch=`PRAGMA td_batch_entities_initial('presence_test',2,'managed-batch','${members}')`;
  const meta='SELECT version,revision,position FROM main.store_meta,td_catalog_v1.catalog_revision,main.clock';
  try{
    await sql("PRAGMA td_define_schema_v2('"+live+"')");
    await sql('BEGIN');
    await sql(batch);
    assert.deepEqual(await sql(meta),[[11n,3n,2n]]);
    assert.deepEqual(await sql("PRAGMA td_entity_presence_at('tracked',2,-1)"),[[true]]);
    await sql('ROLLBACK');
    assert.deepEqual(await sql(meta),[[11n,2n,1n]]);
    assert.deepEqual(await sql("PRAGMA td_entity_presence_at('tracked',1,-1)"),[[null]]);
    assert.deepEqual(await sql("PRAGMA td_batch_receipt('managed-batch')"),[]);
    assert.deepEqual(await sql('SELECT count(*) FROM td_catalog_v1.entity_presence_events'),[[0n]]);
    await sql(batch);
    await port.activateOwnership();
    assert.deepEqual(await sql("PRAGMA td_entity_presence_at('tracked',2,1)"),[[false]]);
  }finally{await port.close();}
});

test('owner re-audit binds empty managed batch intervals and their exact receipt marker',async()=>{
  const database=await upgraded();
  const store=await NativeEntityStore.open({database});
  try{
    await store.defineSchema(live);
    await store.batchRecords({schema:'presence_test',version:2,commandId:'managed-batch',
      members:[batchMember('put','tracked',0n,10n),batchMember('put','legacy',0n,10n,'Legacy')]});
  }finally{await store.close();}
  const port=await openAuditedPort({database});
  const raw=(sql:string)=>port.run({name:'presence_batch_tamper',sql,params:[]});
  try{
    await raw("UPDATE td_catalog_v1.entity_batch_members SET valid_to=11 WHERE command_id='managed-batch' AND entity_id='tracked'");
    await assert.rejects(port.activateOwnership(),/TD_E_OWNER_AUDIT_PRESENCE: retained batch presence binding/);
    await raw("UPDATE td_catalog_v1.entity_batch_members SET valid_to=10 WHERE command_id='managed-batch' AND entity_id='tracked'");
    await port.activateOwnership();
    await raw("UPDATE main.commands SET receipt=CAST(json_merge_patch(receipt::JSON,'"+
      JSON.stringify({presence:null})+"'::JSON) AS VARCHAR) WHERE command_id='managed-batch'");
    await assert.rejects(port.activateOwnership(),/TD_E_OWNER_AUDIT_PRESENCE: retained batch presence binding/);
  }finally{await port.close();}
});

test('managed batch history retains eight carriers through current query APIs and reopen',async()=>{
  const database=await upgraded();
  const store=await NativeEntityStore.open({database,readers:2});
  const definition='schema presence_reads version 1 {entity Target {name:text;} '+
    'entity Live live {s:text;b:boolean;i:int64;f:float64;r:ref_value(Target);d:datetime;j:json;z:blob;} '+
    'entity Block {ban:int64;}}';
  const minimum=-9223372036854775808n;
  const fields:EntityPut['fields']=[
    {attribute:'s',value:{tag:'str',value:'é🙂'}},{attribute:'b',value:{tag:'bool',value:false}},
    {attribute:'i',value:{tag:'i64',value:minimum}},{attribute:'f',value:{tag:'f64',value:-Number.MIN_VALUE}},
    {attribute:'r',value:{tag:'ref',value:'target'}},{attribute:'d',value:{tag:'datetime',value:-1234.5}},
    {attribute:'j',value:{tag:'json',value:'{ "order":1,"emoji":"🙂" }'}},
    {attribute:'z',value:{tag:'blob',value:'opaque:é🙂',mimeType:'text/plain',size:10}},
  ];
  const typed="answer(?s,?b,?i,?f,?r,?d,?j,?z) :- triple('subject','s',?s),triple('subject','b',?b),"+
    "triple('subject','i',?i),triple('subject','f',?f),triple('subject','r',?r),triple('subject','d',?d),"+
    "triple('subject','j',?j),triple('subject','z',?z).";
  const values=fields.map(({value})=>value.tag==='blob'?{tag:'blob' as const,value:value.value}:value);
  const i64=(value:bigint)=>({tag:'i64' as const,value});
  const point="answer(?value) :- triple('subject','i',?value).";
  const anti="answer(?value) :- triple('subject','i',?value), !triple('deny','ban',?value).";
  async function check(target:NativeEntityStore){
    assert.equal(await target.presenceAt('subject',{knownAt:3n,validAt:4n}),true);
    assert.equal(await target.presenceAt('subject',{knownAt:4n,validAt:10n}),false);
    assert.deepEqual(await target.queryCuts(typed,{cuts:[
      {knownAt:3n,validAt:4n},{knownAt:4n,validAt:4n},{knownAt:4n,validAt:7n},
    ]}),[
      {position:3n,validAt:4n,rows:[values]},
      {position:4n,validAt:4n,rows:[]},
      {position:4n,validAt:7n,rows:[values]},
    ]);
    const projected="answer(?attribute,?value) :- triple('subject',?attribute,?value).";
    const expected=[...fields].sort((a,b)=>a.attribute<b.attribute?-1:a.attribute>b.attribute?1:0)
      .map(({attribute,value})=>[{tag:'str' as const,value:attribute},
        value.tag==='blob'?{tag:'blob' as const,value:value.value}:value]);
    for(const result of [
      await target.query(projected,{knownAt:3n,validAt:4n,forceNative:true}),
      await target.queryScalable(projected,{knownAt:3n,validAt:4n}),
    ])assert.deepEqual(result.rows,expected);
    assert.deepEqual(await target.queryIntervals(point,{knownAt:4n,validFrom:0n,validTo:10n}),{
      position:4n,intervals:[
        {values:[i64(minimum)],validFrom:0n,validTo:3n},
        {values:[i64(2n)],validFrom:3n,validTo:7n},
        {values:[i64(minimum)],validFrom:7n,validTo:10n},
      ],
    });
    const lookup=await target.queryLookupAt("answer('subject',4,3) :- triple('subject','i',?value).",
      {attribute:'i',knownAt:4n,validAt:4n});
    assert.equal(lookup.position,4n);
    assert.equal(lookup.reason,'owned_temporal_lookup');
    assert.deepEqual(lookup.rows,[[i64(minimum)]]);
    for(const knownAt of [3n,4n]){
      const expected=[[i64(knownAt===3n?minimum:2n)]];
      const native=await target.query(anti,{knownAt,validAt:4n,forceNative:true});
      const scalable=await target.queryScalable(anti,{knownAt,validAt:4n});
      assert.deepEqual(native.rows,expected);
      assert.deepEqual(scalable.rows,expected);
      assert.match(scalable.reason,/^owned_(?:allcut_unique_|unique_)?scalable_anti_join$/);
    }
  }
  try{
    await store.defineSchema(definition);
    const common={schema:'presence_reads',version:1,validFrom:0n,validTo:10n};
    assert.equal((await store.put({...common,type:'Target',entityId:'target',commandId:'target',
      fields:[{attribute:'name',value:{tag:'str',value:'target'}}]})).position,2n);
    const batch={schema:'presence_reads',version:1,commandId:'typed-batch',members:[{
      operation:'put' as const,type:'Live',entityId:'subject',validFrom:0n,validTo:10n,fields,
    }]};
    const receipt=await store.batch(batch);
    assert.equal(receipt.position,3n);
    assert.equal((await store.patch({...common,type:'Live',entityId:'subject',commandId:'typed-patch',
      validFrom:3n,validTo:7n,fields:[{attribute:'i',value:i64(2n)}]})).position,4n);
    assert.deepEqual(await store.batch(batch),receipt);
    await check(store);
    await store.revalidate();
  }finally{await store.close();}
  const reopened=await NativeEntityStore.open({database,readers:2});
  try{await check(reopened);}finally{await reopened.close();}
});
