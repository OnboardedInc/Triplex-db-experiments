import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {DuckDBInstance} from '@duckdb/node-api';
import {NativeEntityStore} from './native-entity.js';
import type {EntityBatchRecords,EntityReceipt} from './native-entity.js';

const root=fileURLToPath(new URL('../..',import.meta.url));
const schema='schema native version 1 {entity Row {s:text required;i:int64 many;}}';
const quote=(text:string)=>"'"+text.replaceAll("'","''")+"'";
const entities=['e','other'] as const;
const oldValues=[-1n,'Old'];
const phases=['inside_insert','before_commit','after_commit'] as const;
type Phase=typeof phases[number];

async function crashWriter(database:string,phase:Phase,request:EntityBatchRecords){
  const members=JSON.stringify(request.members.map(member=>({
    ...member,validFrom:String(member.validFrom),validTo:String(member.validTo),
  })));
  const worker=fork(join(root,'build/adapter/crash-native-command.mjs'),[database,phase,'batch',members],
    {stdio:['ignore','ignore','pipe','ipc']});
  let stderr='';
  worker.stderr?.on('data',chunk=>{stderr=(stderr+String(chunk)).slice(-8192);});
  const exited=new Promise<NodeJS.Signals|null>(resolve=>worker.once('close',(_code,signal)=>resolve(signal)));
  try{
    await new Promise<void>((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Batch crash phase timeout: '+stderr)),10000);
      worker.once('error',error=>{clearTimeout(timer);reject(error);});
      worker.once('exit',()=>{clearTimeout(timer);reject(new Error('Batch writer exited before phase: '+stderr));});
      worker.on('message',(message:unknown)=>{
        if(typeof message!=='object'||message===null||!('phase'in message)||message.phase!==phase)return;
        clearTimeout(timer);
        if(phase==='inside_insert'&&(!('pending'in message)||message.pending!==true)){
          reject(new Error('Batch INSERT was not observed pending'));return;
        }
        resolve();
      });
    });
    assert.equal(worker.kill('SIGKILL'),true);
    assert.equal(await exited,'SIGKILL');
    assert.equal(stderr,'');
  }finally{
    if(worker.exitCode===null&&worker.signalCode===null)worker.kill('SIGKILL');
    await exited;
  }
}

async function prepare(database:string,phase:Phase){
  if(phase==='inside_insert'){
    const catalog=await readFile(join(root,'native/catalog.sql'),'utf8');
    const begin=catalog.indexOf('CREATE TABLE IF NOT EXISTS main.assertions('),end=catalog.indexOf('\n);',begin);
    assert.ok(begin>=0&&end>begin);
    // nextval is visible to the enrolled observer while the writer's CHECK
    // continues. A kill after accidental commit is caught by the recovery oracle.
    const check=",CHECK(CASE WHEN e='e' AND a='i' AND v_i=0 THEN "+
      "CASE WHEN nextval('command_phase')>0 THEN "+
      "length(regexp_replace(repeat(payload,4194304),'[0-9]','','g'))>=0 ELSE FALSE END ELSE TRUE END))";
    const instance=await DuckDBInstance.create(database,{allow_unsigned_extensions:'true',threads:'1'});
    try{
      const connection=await instance.connect();
      try{
        await connection.run('LOAD '+quote(join(root,'build/temporal_datalog.duckdb_extension')));
        await connection.run('CREATE SEQUENCE command_phase');
        await connection.run(catalog.slice(begin,end)+check);
        await connection.run('PRAGMA td_initialize');
      }finally{connection.closeSync();}
    }finally{instance.closeSync();}
  }

  const store=await NativeEntityStore.open({database});
  try{
    await store.defineSchema(schema);
    const seed:EntityReceipt[]=[];
    for(const entityId of entities){
      seed.push(await store.putRecord({schema:'native',version:1,type:'Row',entityId,
        commandId:'seed-'+entityId,record:'{s="Old";i=-1;}',validFrom:0n,validTo:10n}));
    }
    assert.deepEqual(seed.map(receipt=>receipt.position),[1n,2n]);
    return seed;
  }finally{await store.close();}
}

async function catalogState(database:string){
  // Inspect recovered bytes before the managed opener can initialize views or
  // metadata. The sequence is intentionally excluded from transaction state.
  const instance=await DuckDBInstance.create(database,{threads:'1'});
  try{
    const connection=await instance.connect();
    const rows=async(sql:string)=>(await connection.runAndReadAll(sql)).getRows();
    try{
      const summary=await rows(
        'SELECT (SELECT version FROM main.store_meta),(SELECT revision FROM td_catalog_v1.catalog_revision),'+
        '(SELECT position FROM main.clock),(SELECT count(*) FROM td_catalog_v1.entity_batches),'+
        '(SELECT count(*) FROM td_catalog_v1.entity_batch_members),'+
        '(SELECT count(*) FROM td_catalog_v1.entity_assertion_sources),'+
        '(SELECT count(*) FROM main.assertions),retained_count,retained_bytes=('+
        'SELECT sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))+'+
        'coalesce(octet_length(encode(extra_json)),0)) FROM main.assertions) FROM main.storage_usage');
      const snapshot=[];
      for(const sql of [
        'SELECT * EXCLUDE(v_s),hex(v_s) FROM main.assertions ORDER BY assertion_id',
        'SELECT * FROM main.commands ORDER BY command_id',
        'SELECT * FROM td_catalog_v1.entity_owners ORDER BY entity_id',
        'SELECT * FROM td_catalog_v1.entity_commands ORDER BY command_id',
        'SELECT * FROM td_catalog_v1.entity_batches ORDER BY command_id',
        'SELECT * FROM td_catalog_v1.entity_batch_members ORDER BY ALL',
        'SELECT * FROM td_catalog_v1.entity_assertion_sources ORDER BY assertion_id',
        "SELECT table_name,constraint_text FROM system.main.duckdb_constraints() WHERE table_name IN('store_meta','catalog_revision') ORDER BY ALL",
      ])snapshot.push(await rows(sql));
      return {summary,snapshot};
    }finally{connection.closeSync();}
  }finally{instance.closeSync();}
}

for(const phase of phases){
  test('SIGKILL '+phase+' reconciles a first native batch and its migration',{timeout:60000},async()=>{
    const directory=await mkdtemp(join(root,'build','native-batch-crash-'));
    const database=join(directory,'store.duckdb');
    const seed=await prepare(database,phase);
    const before=await catalogState(database);
    assert.deepEqual(before.summary,[[5,2,2n,0n,0n,0n,4n,4n,true]]);
    const values=phase==='inside_insert'?Array.from({length:64},(_,index)=>index):[7];
    const first='{s="New";'+values.map(value=>'i='+value+';').join('')+'}';
    const request:EntityBatchRecords={schema:'native',version:1,commandId:'crash-command',members:[
      {operation:'patch',type:'Row',entityId:'e',record:first,validFrom:2n,validTo:8n},
      {operation:'patch',type:'Row',entityId:'other',record:'{s="Other New";i=8;}',validFrom:2n,validTo:8n},
    ]};
    await crashWriter(database,phase,request);
    const committed=phase==='after_commit';
    const recovered=await catalogState(database);
    if(committed)assert.deepEqual(recovered.summary,[[9,3,3n,1n,2n,8n,16n,16n,true]]);
    else assert.deepEqual(recovered,before);

    let reconciled:Awaited<ReturnType<NativeEntityStore['batchRecords']>>;
    const store=await NativeEntityStore.open(phase==='inside_insert'?{database,memoryLimit:'512MB'}:{database});
    const at=async(entityId:string,knownAt:bigint,validAt:bigint)=>
      (await store.at(entityId,{knownAt,validAt})).map(fact=>fact.value.value);
    try{
      const prior=await store.batchReceipt(request.commandId);
      assert.equal(prior!==null,committed);
      for(const [index,entityId] of entities.entries()){
        assert.deepEqual(await store.receipt('seed-'+entityId),seed[index]);
        assert.deepEqual(await at(entityId,2n,2n),oldValues);
        for(const tick of [0n,1n,8n,9n])assert.deepEqual(await at(entityId,committed?3n:2n,tick),oldValues);
      }

      reconciled=await store.batchRecords(request);
      assert.equal(reconciled.position,3n);
      assert.deepEqual(reconciled.members.map(member=>[member.entityId,member.asserted.length]),
        [['e',values.length+5],['other',6]]);
      for(const [index,member] of reconciled.members.entries()){
        assert.deepEqual(new Set(member.retracted),new Set(seed[index]?.asserted));
      }
      if(prior)assert.deepEqual(reconciled,prior);
      const expected=values.map(String).sort().map(value=>BigInt(value));
      assert.deepEqual(await at('e',3n,2n),[...expected,'New']);
      assert.deepEqual(await at('other',3n,2n),[8n,'Other New']);
      assert.deepEqual(await store.batchRecords({...request,members:[...request.members].reverse()}),reconciled);

      const healthy=await store.batchRecords({...request,commandId:'healthy',
        members:request.members.map(member=>({...member,record:'{s="Healthy";i=9;}'}))});
      assert.equal(healthy.position,4n);
      for(const entityId of entities){
        assert.deepEqual(await at(entityId,4n,2n),[9n,'Healthy']);
        assert.deepEqual(await at(entityId,4n,8n),oldValues);
        assert.deepEqual(await at(entityId,2n,2n),oldValues);
      }
    }finally{await store.close();}

    const reopened=await NativeEntityStore.open({database});
    try{
      assert.deepEqual(await reopened.batchReceipt(request.commandId),reconciled);
      assert.deepEqual((await reopened.at('other',{knownAt:3n,validAt:2n})).map(fact=>fact.value.value),[8n,'Other New']);
    }finally{await reopened.close();}
  });
}
