import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {constants,copyFile,lstat,mkdtemp,readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {DuckDBInstance} from '@duckdb/node-api';
import {NativeEntityStore} from './native-entity.js';
import type {EntityBatch,EntityBatchMember,EntityBatchReceipt} from './native-entity.js';
import {encodeSchemaRecord} from './native-schema.js';
import type {SchemaField} from './native-schema.js';
import {activateEngineOwner,openAuditedPort} from './native-test-fixture.js';

const build=fileURLToPath(new URL('../',import.meta.url));
const quote=(value:string)=>"'"+value.replaceAll("'","''")+"'";
const sha=async(path:string)=>createHash('sha256').update(await readFile(path)).digest('hex');
const entities=['a','b'] as const;
const definition=(version:number)=>
  'schema batch_recovery version '+version+' {entity Item {asset:blob required;link:ref_value(Item) required;n:int64 required;note:json required;}}';
const fields=(n:bigint,link:string):readonly SchemaField[]=>[
  {attribute:'asset',value:{tag:'blob',value:'asset:'+link,mimeType:'text/plain',size:Number(n),filename:'é🙂.txt'}},
  {attribute:'link',value:{tag:'ref',value:link}},
  {attribute:'n',value:{tag:'i64',value:n}},
  {attribute:'note',value:{tag:'json',value:' {"n":'+n+'} '}},
];
const member=(entityId:string,n:bigint,link:string,operation:'put'|'patch'='put',validFrom=0n,validTo=10n):EntityBatchMember=>
  ({type:'Item',entityId,operation,validFrom,validTo,fields:fields(n,link)});
const first:EntityBatch={schema:'batch_recovery',version:1,commandId:'initial',members:[
  member('b',2n,'a'),member('a',1n,'b'),
]};
const patch:EntityBatch={schema:'batch_recovery',version:2,commandId:'correction',members:[
  member('a',3n,'b','patch',2n,6n),member('b',4n,'a','patch',4n,8n),
]};
const next:EntityBatch={schema:'batch_recovery',version:2,commandId:'healthy',members:[
  member('c',5n,'a'),member('a',6n,'b','patch',3n,5n),
]};

async function checkPoint(store:NativeEntityStore,entityId:string,knownAt:bigint,validAt:bigint){
  const original=first.members.find(item=>item.entityId===entityId)!;
  const corrected=patch.members.find(item=>item.entityId===entityId)!;
  const inPatch=knownAt===2n&&corrected.validFrom<=validAt&&validAt<corrected.validTo;
  const expected=knownAt===0n||validAt<0n||validAt>=10n?[]:(inPatch?corrected.fields:original.fields);
  const result=await store.at(entityId,{knownAt,validAt});
  assert.deepEqual(result.map(({attribute,value})=>({attribute,value})),expected);
  assert.deepEqual(result.map(({version})=>version),expected.map(()=>inPatch?2:1));
  return result;
}

async function snapshot(store:NativeEntityStore){
  const cuts=[];
  for(const entityId of entities)for(const knownAt of [0n,1n,2n])for(const validAt of [0n,2n,4n,6n,8n,10n])
    cuts.push({entityId,knownAt,validAt,rows:await checkPoint(store,entityId,knownAt,validAt)});
  const history=await Promise.all(entities.map(entity=>store.history(entity)));
  assert.deepEqual(history.map(rows=>rows.length),[16,16]);
  const receipts=await Promise.all([first,patch].map(request=>store.batchReceipt(request.commandId)));
  assert.deepEqual(receipts.map(receipt=>receipt?.position),[1n,2n]);
  const query="answer(?e,?n) :- triple(?e,'n',?n).";
  for(const [knownAt,values] of [[1n,[1n,2n]],[2n,[3n,4n]]] as const){
    const cut={knownAt,validAt:4n};
    const expected=entities.map((value,index)=>[{tag:'str',value},{tag:'i64',value:values[index]}]);
    for(const result of await Promise.all([store.queryScalable(query,cut),store.query(query,{...cut,forceNative:true})])){
      assert.equal(result.position,knownAt);
      assert.deepEqual(result.rows,expected);
    }
  }
  return {cuts,history,receipts};
}

async function seed(database:string){
  const store=await NativeEntityStore.open({database,readers:2});
  try{
    await store.defineSchema(definition(1));
    const initial=await store.batch(first);
    assert.equal(initial.position,1n);
    assert.deepEqual(initial.members.map(item=>item.asserted.length),[4,4]);
    await store.defineSchema(definition(2));
    const correction=await store.batch(patch);
    assert.equal(correction.position,2n);
    for(const [index,part] of correction.members.entries()){
      assert.equal(part.asserted.length,12);
      assert.deepEqual(part.retracted,[...initial.members[index]!.asserted].sort());
    }
    return await snapshot(store);
  }finally{await store.close();}
}

async function closedCheckpoint(database:string){
  const port=await openAuditedPort({database});
  try{
    const counts=await port.runNative({name:'batch_backup_cut',params:[],sql:
      'SELECT version,revision,position,retained_count,'+
      '(SELECT count(*) FROM td_catalog_v1.entity_assertion_sources) FROM main.store_meta,'+
      'td_catalog_v1.catalog_revision,main.clock,main.storage_usage'});
    assert.deepEqual(counts,[[9n,3n,2n,32n,16n]]);
    await port.run({name:'batch_backup_checkpoint',sql:'CHECKPOINT',params:[]});
  }finally{await port.close();}
  await assert.rejects(lstat(database+'.wal'),{code:'ENOENT'});
}

async function checkHealthy(store:NativeEntityStore,expected?:EntityBatchReceipt){
  const healthy=await store.batch(next);
  assert.equal(healthy.position,3n);
  if(expected)assert.deepEqual(healthy,expected);
  assert.deepEqual(await store.batchReceipt(next.commandId),healthy);
  const active=await store.at('c',{knownAt:3n,validAt:4n});
  assert.deepEqual(active.map(({attribute,value})=>({attribute,value})),fields(5n,'a'));
  assert.deepEqual(await store.at('c',{knownAt:2n,validAt:4n}),[]);
  return healthy;
}

test('quiesced revision-three backup restores exact batch history, replay and next write',{timeout:30000},async t=>{
  const directory=await mkdtemp(join(build,'batch-backup-'));
  const source=join(directory,'source.duckdb'),backup=join(directory,'backup.duckdb'),restored=join(directory,'restored.duckdb');
  const expected=await seed(source);
  await closedCheckpoint(source);
  const frozen=await sha(source);
  await copyFile(source,backup,constants.COPYFILE_EXCL);
  await copyFile(backup,restored,constants.COPYFILE_EXCL);
  assert.equal(await sha(backup),frozen);
  assert.equal(await sha(restored),frozen);

  const store=await NativeEntityStore.open({database:restored,readers:2});
  let healthy:EntityBatchReceipt;
  try{
    assert.deepEqual(await snapshot(store),expected);
    for(const [index,request] of [first,patch].entries())
      assert.deepEqual(await store.batch({...request,members:[...request.members].reverse()}),expected.receipts[index]);
    healthy=await checkHealthy(store);
  }finally{await store.close();}

  const reopened=await NativeEntityStore.open({database:restored});
  try{
    assert.deepEqual(await reopened.batchReceipt(healthy.commandId),healthy);
    assert.deepEqual(await reopened.batchReceipt(first.commandId),expected.receipts[0]);
    assert.deepEqual(await reopened.batchReceipt(patch.commandId),expected.receipts[1]);
    const historical=expected.cuts.find(({entityId,knownAt,validAt})=>entityId==='a'&&knownAt===1n&&validAt===4n);
    assert.ok(historical);
    assert.deepEqual(await checkPoint(reopened,'a',1n,4n),historical.rows);
  }finally{await reopened.close();}
  await assert.rejects(lstat(backup+'.wal'),{code:'ENOENT'});
  assert.equal(await sha(backup),frozen);
  assert.equal(await sha(source),frozen);
  t.diagnostic('Preserved quiesced source and backup SHA-256 '+frozen);
});

async function interruptWalCommit(database:string){
  const instance=await DuckDBInstance.create(database,{
    allow_unsigned_extensions:'true',threads:'1',memory_limit:'128MB',
  });
  try{
    const connection=await instance.connect();
    const sql=async(statement:string)=>(await connection.runAndReadAll(statement)).getRows();
    try{
      await sql('LOAD '+quote(join(build,'temporal_datalog.duckdb_extension')));
      await sql('PRAGMA disable_checkpoint_on_shutdown');
      await sql("PRAGMA wal_autocheckpoint='1TB'");
      await activateEngineOwner(connection);
      await sql('CHECKPOINT');
      await sql("PRAGMA debug_checkpoint_abort='before_wal_flush'");
      const members=JSON.stringify(next.members.map(({fields,...item})=>({
        ...item,record:encodeSchemaRecord(fields),validFrom:String(item.validFrom),validTo:String(item.validTo),
      })));
      const statement='PRAGMA td_batch_entities('+[quote(next.schema),next.version,quote(next.commandId),quote(members)].join(',')+')';
      await sql('BEGIN');
      const staged=await sql(statement);
      assert.equal(staged.length,1);
      const [commandId,position,schema,version,schemaHash,requestHash,receiptMembers]=staged[0]!;
      assert.equal(commandId,next.commandId);
      assert.equal(position,3n);
      assert.equal(schema,next.schema);
      assert.equal(version,next.version);
      assert.equal(typeof schemaHash,'string');
      assert.equal(typeof requestHash,'string');
      assert.equal(typeof receiptMembers,'string');
      assert.deepEqual(await sql("PRAGMA td_batch_receipt('healthy')"),staged);
      await assert.rejects(sql('COMMIT'),/Simulated crash before WAL_FLUSH write/);
      await assert.rejects(sql('SELECT 1'),/invalidat|Simulated crash before WAL_FLUSH/i);
      return {commandId:next.commandId,position:3n,schema:next.schema,version:next.version,
        schemaHash:schemaHash as string,requestHash:requestHash as string,members:JSON.parse(receiptMembers as string)} satisfies EntityBatchReceipt;
    }finally{connection.closeSync();}
  }finally{instance.closeSync();}
}

test('a pinned-engine torn WAL commit recovers the previous batch state and permits exact retry',{timeout:30000},async t=>{
  const directory=await mkdtemp(join(build,'batch-torn-wal-'));
  const database=join(directory,'store.duckdb');
  const expected=await seed(database);
  await closedCheckpoint(database);
  const attempted=await interruptWalCommit(database);
  const wal=database+'.wal';
  const bytes=(await stat(wal)).size;
  assert.ok(bytes>0,'unflushed WAL survived the faulted engine shutdown');
  t.diagnostic('Observed torn WAL with '+bytes+' bytes and SHA-256 '+await sha(wal));

  const store=await NativeEntityStore.open({database,readers:2});
  try{
    assert.deepEqual(await snapshot(store),expected);
    assert.equal(await store.batchReceipt(next.commandId),null);
    await checkHealthy(store,attempted);
  }finally{await store.close();}
});
