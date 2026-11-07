import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { Effect, Exit, Fiber } from 'effect';
import { EntityId } from '@triplex-build/triplex';
import { Capabilities, DatabaseScope, Runtime } from '@triplex-build/triplex/runtime';
import { PublicDuckDBBackend } from './public-backend.mjs';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import { makeEffectStorage } from './effect-storage.js';
import { makeAdapterLayers } from './query-executor-adapter.js';
import { DuckDBSqlStrategy } from './index.js';

const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const schema=await readFile(resolve(root,'adapter/public-schema.sql'),'utf8');
const scope=DatabaseScope.test('adapter-tests');
async function open(database=':memory:'){
  const port=await NativeDuckDBPort.open({database});
  return {port,backend:new PublicDuckDBBackend(port,scope)};
}
const input={entityId:EntityId.make('u'),attribute:'age',value:{type:'number' as const,value:21}};

test('persistent receipt, strict row, history, restart and scope rejection',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'triple-adapter-'));
  const database=resolve(directory,'fixture.duckdb');
  try{
    let {port,backend}=await open(database);await backend.initialize(schema);
    await backend.withTransaction(async s=>{
      const pos=await s.nextCommitPosition();
      assert.equal(await s.claimCommand('c','tx',10),null);
      await s.insert(input,'tx',10,'a',pos);
    });
    await backend.close();assert.equal(port.status(),'closed');
    ({port,backend}=await open(database));await backend.initialize(schema);
    await backend.read(async s=>{
      assert.equal(await s.claimCommand('c','ignored',11),'tx');
      assert.equal(await s.currentCommitPosition(),1);
      assert.equal((await s.getById('a'))?.value_number,21);
      assert.equal((await s.history('u')).length,1);
    });
    await backend.close();assert.equal(port.status(),'closed');
    ({port}=await open(database));backend=new PublicDuckDBBackend(port,'other-scope');
    await assert.rejects(backend.initialize(schema));await backend.close();
    assert.equal(port.status(),'closed');
  }finally{await rm(directory,{recursive:true});}
});

test('Effect nested failure poisons and rolls back the whole physical transaction',async()=>{
  const {port,backend}=await open();await backend.initialize(schema);
  const {storage}=makeEffectStorage(backend,schema);
  try{
    const work=storage.withTransaction(Effect.gen(function*(){
      const pos=yield*storage.nextCommitPosition();
      yield*storage.insert(input,'tx',10,'a',pos);
      yield*storage.withTransaction(Effect.fail('nested')).pipe(Effect.catch(()=>Effect.void));
    }));
    assert.ok(Exit.isFailure(await Effect.runPromise(Effect.exit(work))));
    assert.equal(await Effect.runPromise(storage.currentCommitPosition()),0);
    assert.equal(await Effect.runPromise(storage.getById('a')),null);
  }finally{await backend.close();}
  assert.equal(port.status(),'closed');
});

test('Effect interruption awaits actual rollback before healthy reuse',async()=>{
  const {port,backend}=await open();await backend.initialize(schema);
  const {storage}=makeEffectStorage(backend,schema);
  let notify:()=>void=()=>{};
  const entered=new Promise<void>(resolve=>{notify=resolve;});
  try{
    const work=storage.withTransaction(Effect.gen(function*(){
      const pos=yield*storage.nextCommitPosition();
      yield*storage.insert(input,'tx',10,'a',pos);
      yield*Effect.sync(notify);
      yield*Effect.sleep('10 seconds');
    }));
    const fiber=Effect.runFork(work);await entered;
    await Effect.runPromise(Fiber.interrupt(fiber));
    assert.equal(await Effect.runPromise(storage.currentCommitPosition()),0);
    assert.equal(await Effect.runPromise(storage.getById('a')),null);
  }finally{await backend.close();}
  assert.equal(port.status(),'closed');
});

test('shared layer opens once and closes on initialization failure',async()=>{
  let opens=0;let selected:NativeDuckDBPort|undefined;
  const opened=Effect.tryPromise({try:async()=>{opens++;const {port,backend}=await open();selected=port;return backend;},catch:cause=>cause});
  const adapters=makeAdapterLayers(opened,'CREATE TABLE invalid(',DuckDBSqlStrategy);
  const runtime=Runtime.define({name:'failure-cleanup',storage:adapters.storage,queries:adapters.queries});
  const result=await Effect.runPromise(Effect.exit(Effect.provide(Effect.void,runtime.layer({scope,capabilities:Capabilities.none}))));
  assert.ok(Exit.isFailure(result));assert.equal(opens,1);assert.equal(selected?.status(),'closed');
});

test('native values retain exact integer and floating point identities',async()=>{
  const port=await NativeDuckDBPort.open();
  try{
    const rows=await port.run({name:'types',sql:'SELECT ?::BIGINT i,?::INTEGER j,?::DOUBLE f,?::BOOLEAN b,?::VARCHAR s',
      params:[-9223372036854775808n,7n,Number.MIN_VALUE,true,'é🙂']});
    assert.deepEqual(rows,[[-9223372036854775808n,7n,Number.MIN_VALUE,true,'é🙂']]);
    assert.deepEqual(port.columnsFor(rows),['i','j','f','b','s']);
    assert.ok(Object.isFrozen(rows)&&Object.isFrozen(rows[0]));
    assert.deepEqual(await port.run({name:'parameter_types',sql:'SELECT typeof(?),typeof(?)',params:[7n,7]}),[['BIGINT','DOUBLE']]);
    assert.deepEqual(await port.run({name:'integer_overload',sql:'SELECT count(*) FROM range(?)',params:[7n]}),[[7n]]);
  }finally{await port.close();}
});

test('streaming result admission releases the result before healthy reuse',async()=>{
  const port=await NativeDuckDBPort.open();
  try{
    await assert.rejects(port.run({name:'too_many',sql:'SELECT range FROM range(100001)',params:[]}),
      (error:unknown)=>error instanceof Error&&'code' in error&&error.code==='RESULT_LIMIT');
    assert.deepEqual(await port.run({name:'healthy',sql:'SELECT 42::BIGINT',params:[]}),[[42n]]);
    for(let n=0;n<260;n++)await port.run({name:'bounded_trace',sql:'SELECT 1',params:[]});
    assert.equal(port.trace().length,256);
  }finally{await port.close();}
});

test('native SQL interrupt terminates execution and permits reuse',{timeout:5000},async()=>{
  const port=await NativeDuckDBPort.open();
  try{
    const pending=port.run({name:'interrupt',sql:'SELECT sum(sin(a.range*b.range)) FROM range(100000) a,range(100000) b',params:[]});
    const timer=setTimeout(()=>port.interrupt(),20);
    try{await assert.rejects(pending,/interrupt/i);}finally{clearTimeout(timer);}
    assert.deepEqual(await port.run({name:'healthy',sql:'SELECT 42::BIGINT',params:[]}),[[42n]]);
  }finally{await port.close();}
});

test('prepared SELECT reuse refreshes parameters, data and schema and evicts boundedly',async()=>{
  const port=await NativeDuckDBPort.open();
  const run=(sql:string,params:readonly unknown[]=[])=>port.run({name:'cache',sql,params});
  try{
    assert.deepEqual(await run('SELECT ?::BIGINT',[1n]),[[1n]]);
    assert.deepEqual(await run('SELECT ?::BIGINT',[2n]),[[2n]]);
    await run('CREATE TABLE cache_fixture(i BIGINT)');
    await port.begin();await run('INSERT INTO cache_fixture VALUES (3)');await port.commit();
    assert.deepEqual(await run('SELECT * FROM cache_fixture'),[[3n]]);
    await port.begin();await run('UPDATE cache_fixture SET i=4');await port.rollback();
    assert.deepEqual(await run('SELECT * FROM cache_fixture'),[[3n]]);
    await run('UPDATE cache_fixture SET i=5');
    assert.deepEqual(await run('SELECT * FROM cache_fixture'),[[5n]]);
    await run('ALTER TABLE cache_fixture ADD COLUMN s VARCHAR DEFAULT \'fresh\'');
    const changed=await run('SELECT * FROM cache_fixture');
    assert.deepEqual(changed,[[5n,'fresh']]);assert.deepEqual(port.columnsFor(changed),['i','s']);
    assert.ok(port.cacheStats().hits>=4);
    for(let n=0;n<40;n++)await run('SELECT '+n);
    assert.equal(port.cacheStats().entries,32);assert.ok(port.cacheStats().sqlBytes<=262144);
  }finally{await port.close();}
  assert.equal(port.cacheStats().entries,0);
});

test('second native append failure poisons a caught operation and rolls back all batches',async()=>{
  const {port,backend}=await open();await backend.initialize(schema);
  try{
    await backend.withTransaction(async session=>{
      const pos=await session.nextCommitPosition();
      await session.claimCommand('seed','tx-seed',10);
      await session.insert(input,'tx-seed',10,'seed-id',pos);
    });
    const inputs=Array.from({length:2050},(_,n)=>({...input,entityId:EntityId.make('u-'+n)}));
    const ids=inputs.map((_,n)=>'a-'+n);
    for(const mode of ['duplicate','admission']){
      const badInputs=inputs.map((row,n)=>mode==='admission'&&n===2049?
        {...row,entityId:EntityId.make('界'.repeat(400000))}:row);
      const badIds=ids.map((id,n)=>mode==='duplicate'&&n===2049?'seed-id':id);
      await assert.rejects(backend.withTransaction(async session=>{
        const pos=await session.nextCommitPosition();
        await session.claimCommand('failed-'+mode,'tx-failed',11);
        try{await session.batchInsert(badInputs,'tx-failed',11,badIds,pos);}catch{/* owner must still reject commit */}
      }));
    }
    await backend.read(async session=>{
      assert.equal(await session.currentCommitPosition(),1);
      assert.equal(await session.getById('a-0'),null);
      assert.deepEqual(await session.runRecords('SELECT retained_count FROM main.storage_usage'),[{retained_count:1}]);
      assert.deepEqual(await session.runRecords("SELECT count(*) n FROM main.commands WHERE command_id LIKE 'failed-%'"),[{n:0}]);
    });
    await backend.withTransaction(async session=>{
      const pos=await session.nextCommitPosition();
      await session.batchInsert(inputs.slice(0,2049),'tx-good',12,ids.slice(0,2049),pos);
    });
    await backend.read(async session=>assert.equal((await session.query({attribute:'age'})).length,2050));
    assert.ok(port.trace().some(entry=>entry.op==='append'&&!entry.ok));
  }finally{await backend.close();}
});

test('native append preserves all Triplex carriers and splits by payload bytes',async()=>{
  const {backend}=await open();await backend.initialize(schema);
  try{
    const inputs=[
      {entityId:EntityId.make('types'),attribute:'str',value:{type:'string' as const,value:'é🙂'}},
      {entityId:EntityId.make('types'),attribute:'bool',value:{type:'boolean' as const,value:false}},
      {entityId:EntityId.make('types'),attribute:'number',value:{type:'number' as const,value:Number.MIN_VALUE}},
      {entityId:EntityId.make('types'),attribute:'ref',value:{type:'ref' as const,value:EntityId.make('target')}},
      {entityId:EntityId.make('types'),attribute:'time',value:{type:'datetime' as const,value:123.25}},
      {entityId:EntityId.make('types'),attribute:'json',value:{type:'json' as const,value:{text:'é🙂',list:[1,false]}}},
      {entityId:EntityId.make('types'),attribute:'blob',value:{type:'blob' as const,value:'sha256:abc',mimeType:'text/plain',size:3}},
    ];
    await backend.withTransaction(async session=>{
      const pos=await session.nextCommitPosition();
      await session.batchInsert(inputs,'tx',10,inputs.map((_,n)=>'v-'+n),pos);
      const large='x'.repeat(64000);
      await session.batchInsert(Array.from({length:80},(_,n)=>({entityId:EntityId.make('large-'+n),attribute:'text',
        value:{type:'string' as const,value:large}})),'tx',10,Array.from({length:80},(_,n)=>'large-'+n),pos);
    });
    await backend.read(async session=>{
      const rows=await session.getByEntity(EntityId.make('types'));
      assert.equal(rows.length,7);
      const values=new Map(rows.map(row=>[row.attribute,row]));
      assert.equal(values.get('str')?.value_string,'é🙂');assert.equal(values.get('bool')?.value_boolean,0);
      assert.equal(values.get('number')?.value_number,Number.MIN_VALUE);assert.equal(values.get('ref')?.value_string,'target');
      assert.equal(values.get('time')?.value_datetime,123.25);
      assert.deepEqual(JSON.parse(values.get('json')?.value_json??''),{text:'é🙂',list:[1,false]});
      assert.deepEqual(JSON.parse(values.get('blob')?.value_json??''),{mimeType:'text/plain',size:3});
      assert.deepEqual(await session.runRecords('SELECT count(*) n FROM main.assertions'),[{n:87}]);
    });
  }finally{await backend.close();}
});

test('abrupt native writer exits recover whole command, usage and receipt',{timeout:15000},async()=>{
  for(const phase of ['first_chunk','before_commit','after_commit']){
    const directory=await mkdtemp(resolve(tmpdir(),'native-crash-'));
    const database=resolve(directory,'fixture.duckdb');
    try{
      let {backend}=await open(database);await backend.initialize(schema);
      await backend.withTransaction(async session=>{
        const pos=await session.nextCommitPosition();
        await session.claimCommand('seed','seed-tx',10);
        await session.insert(input,'seed-tx',10,'seed-id',pos);
      });
      await backend.close();
      const exit=await new Promise<{code:unknown;stdout:string;stderr:string}>(resolveRun=>{
        execFile(process.execPath,[resolve(root,'build/adapter/crash-fixture.mjs'),database,phase,scope],
          {encoding:'utf8',timeout:5000},(error,stdout,stderr)=>resolveRun({code:error?.code??0,stdout,stderr}));
      });
      assert.equal(exit.code,73);assert.equal(exit.stdout,'');assert.equal(exit.stderr,'');
      ({backend}=await open(database));await backend.initialize(schema);
      try{
        const committed=phase==='after_commit';
        await backend.read(async session=>{
          assert.equal(await session.currentCommitPosition(),committed?2:1);
          assert.equal((await session.getById('crash-0'))!==null,committed);
          assert.deepEqual(await session.runRecords('SELECT retained_count FROM main.storage_usage'),[{retained_count:committed?2050:1}]);
          assert.deepEqual(await session.runRecords("SELECT transaction_id FROM main.commands WHERE command_id='crash-command'"),committed?[{transaction_id:'crash-tx'}]:[]);
          assert.equal((await session.query({attribute:'age'})).length,committed?2050:1);
          if(committed)assert.equal(await session.claimCommand('crash-command','retry',30),'crash-tx');
        });
        await backend.withTransaction(async session=>{
          const pos=await session.nextCommitPosition();
          assert.equal(pos,committed?3:2);
          await session.insert(input,'healthy',30,'healthy-id',pos);
        });
      }finally{await backend.close();}
    }finally{await rm(directory,{recursive:true});}
  }
});
