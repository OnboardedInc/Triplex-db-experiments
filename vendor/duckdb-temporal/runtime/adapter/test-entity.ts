import {openAuditedPort,activateEngineOwner} from './native-test-fixture.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile,fork } from 'node:child_process';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { DuckDBInstance } from '@duckdb/node-api';
import { NativeEntityStore,NativeCommandError } from './native-entity.js';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';

const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const binary=resolve(root,'build/temporal_datalog.duckdb_extension');
const INF=9223372036854775807n;
const schema='schema native version 1 { entity Row { s:text required; b:boolean; i:int64 many; f:float64 many; } entity Other { s:text; } }';
const quote=(value:string)=>"'"+value.replaceAll("'","''")+"'";
const request=(commandId:string,record='{s="A";}',entityId='e')=>({schema:'native',version:1,type:'Row',entityId,commandId,record,validFrom:0n,validTo:INF});
const sqlPut=(commandId:string,record='{s="A";}',entityId='e')=>`PRAGMA td_put_entity('native',1,'Row',${quote(entityId)},${quote(commandId)},${quote(record)},0,9223372036854775807)`;
const matches=(expected:string)=>(error:unknown)=>error instanceof NativeCommandError&&error.code===expected;

test('native commands retain exact scalar sets, receipts and half-open temporal history',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    const first=await store.put({...request('one'),validFrom:-5n,validTo:10n,fields:[
      {attribute:'s',value:{tag:'str',value:'é🙂\n"\\'}},{attribute:'b',value:{tag:'bool',value:false}},
      {attribute:'i',value:{tag:'i64',value:-9223372036854775808n}},{attribute:'i',value:{tag:'i64',value:INF}},
      {attribute:'f',value:{tag:'f64',value:Number.MIN_VALUE}},{attribute:'f',value:{tag:'f64',value:-0}},
      {attribute:'f',value:{tag:'f64',value:0}},
    ]});
    assert.equal(first.position,1n);assert.equal(first.asserted.length,6);
    const before=await store.at('e',{knownAt:1n,validAt:0n});
    assert.deepEqual(before.filter(a=>a.value.tag==='i64').map(a=>a.value.value),[-9223372036854775808n,INF]);
    assert.deepEqual(new Set(before.filter(a=>a.value.tag==='f64').map(a=>a.value.value)),new Set([0,Number.MIN_VALUE]));
    assert.equal(before.find(a=>a.attribute==='s')?.value.value,'é🙂\n"\\');
    assert.deepEqual(await store.at('e',{knownAt:1n,validAt:10n}),[]);
    const second=await store.putRecord({...request('two','{s="B";}'),validFrom:2n,validTo:8n});
    assert.deepEqual(new Set(second.retracted),new Set(first.asserted));assert.equal(second.position,2n);
    assert.equal((await store.at('e',{knownAt:1n,validAt:2n})).length,6);
    assert.deepEqual((await store.at('e',{knownAt:2n,validAt:2n})).map(a=>a.value.value),['B']);
    // Full-record replacement supersedes old knowledge even outside the new valid interval.
    assert.deepEqual(await store.at('e',{knownAt:2n,validAt:0n}),[]);
    const history=await store.history('e');assert.equal(history.length,7);
    assert.ok(history.filter(a=>a.commandId==='one').every(a=>a.txTo===2n&&a.correctedBy==='two'));
    assert.deepEqual(await store.receipt('one'),first);assert.equal(await store.receipt('missing'),null);
  }finally{await store.close();}
});

test('runtime schema versions and new entity types persist with the same binary and reference Datalog parity',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'native-entity-version-'));const database=resolve(directory,'data.duckdb');
  const hash=async()=>createHash('sha256').update(await readFile(binary)).digest('hex');const original=await hash();
  try{
    let store=await NativeEntityStore.open({database});const v1=await store.defineSchema(schema);
    await store.putRecord(request('v1','{s="A";i=7;}'));await store.close();
    store=await NativeEntityStore.open({database});
    const v2=await store.defineSchema('schema native version 2 { entity Row { s:text required; i:text; } entity Event { active:boolean required; } }');
    await store.putRecord({...request('v2','{s="B";i="seven";}'),version:2});
    await store.putRecord({...request('new-type','{active=true;}','event'),version:2,type:'Event'});
    const history=await store.history('e');
    assert.equal(history.find(a=>a.commandId==='v1')?.schemaHash,v1.hash);
    assert.equal(history.find(a=>a.commandId==='v2')?.schemaHash,v2.hash);
    assert.equal(history.find(a=>a.commandId==='v1'&&a.attribute==='i')?.value.tag,'i64');
    assert.equal(history.find(a=>a.commandId==='v2'&&a.attribute==='i')?.value.tag,'str');
    await store.close();assert.equal(await hash(),original);
    const python=process.env.TRIPLESTORE_PYTHON??resolve(root,'../../../../.venv/bin/python');
    const program=`import sys\nfrom temporal_store import Store,Value\nwith Store(sys.argv[1]) as s:\n for native in (False,True):\n  assert s.query("answer(?v) :- triple('e','i',?v).",known_at=1,valid_at=0,force_native=native).rows==((Value('i64','7'),),)\n  assert s.query("answer(?v) :- triple('e','i',?v).",known_at=2,valid_at=0,force_native=native).rows==((Value('str','seven'),),)\n assert s._conn.execute('SELECT retained_count FROM main.storage_usage').fetchone()[0]==5\nprint('PASS')\n`;
    const result=await promisify(execFile)(python,['-c',program,database],{cwd:root,timeout:15000});assert.equal(result.stdout.trim(),'PASS');
    store=await NativeEntityStore.open({database});try{assert.equal((await store.history('event')).length,1);}finally{await store.close();}
  }finally{await rm(directory,{recursive:true});}
});

test('SQL and TypeScript commands share semantics, literal quoting and caller-owned transactions',async()=>{
  const port=await openAuditedPort();const run=(sql:string)=>port.runNative({name:'native_entity_sql',sql,params:[]});
  try{
    await run('PRAGMA td_define_schema('+quote(schema)+')');
    const id="e'); DROP TABLE main.assertions;--";
    await run('BEGIN');await run(sqlPut('rolled-back','{s="temp";}',id));await run('ROLLBACK');
    assert.deepEqual(await run("PRAGMA td_entity_receipt('rolled-back')"),[]);
    const rows=await run(sqlPut('sql','{s="safe";i=21;}',id));assert.equal(rows[0]?.[1],1n);
    assert.deepEqual(await run('PRAGMA td_entity_receipt(\'sql\')'),rows);
    const history=await run('PRAGMA td_entity_history('+quote(id)+')');assert.equal(history.length,2);
    assert.equal(history[0]?.[1],id);
    assert.equal((await run('PRAGMA td_entity_at('+quote(id)+',1,0)')).length,2);
    assert.deepEqual(await run('SELECT retained_count,retained_bytes=(SELECT sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))) FROM main.assertions) FROM main.storage_usage'),[[2n,true]]);
  }finally{await port.close();}
});

test('native schema and command admission reject before changing facts, receipts or clocks',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);const first=await store.putRecord(request('good'));
    for(const [record,code]of [['{}','TD_E_SCHEMA_REQUIRED'],['{s=2;}','TD_E_SCHEMA_TYPE'],
      ['{s="A";other=1;}','TD_E_SCHEMA_ATTRIBUTE'],['{s="A";s="B";}','TD_E_SCHEMA_CARDINALITY'],
      ['{s="A";f=f64("7ff0000000000000");}','TD_E_VALUE_PAYLOAD'],
      ['{s="A";i=9223372036854775808;}','TD_E_SCHEMA_VALUE']]){
      await assert.rejects(store.putRecord(request('bad',record)),matches(code!));
      assert.equal(await store.receipt('bad'),null);
    }
    await assert.rejects(store.putRecord({...request('bad'),version:3}),matches('TD_E_SCHEMA_CATALOG'));
    await assert.rejects(store.putRecord({...request('bad'),validFrom:5n,validTo:5n}),matches('TD_E_COMMAND_INTERVAL'));
    await assert.rejects(store.at('e',{knownAt:-1n,validAt:0n}),matches('TD_E_COMMAND_INTERVAL'));
    await assert.rejects(store.at('e',{knownAt:1n,validAt:INF}),matches('TD_E_COMMAND_INTERVAL'));
    assert.deepEqual(await store.receipt('good'),first);assert.equal((await store.history('e')).length,1);
    assert.equal((await store.putRecord(request('next','{s="healthy";}'))).position,2n);
  }finally{await store.close();}
});

test('4096-value native replacements and quote-expanded records fit the fixed 128MiB runtime',async()=>{
  const store=await NativeEntityStore.open();
  try{
    await store.defineSchema(schema);
    const record='{s="A";'+Array.from({length:4095},(_,i)=>'i='+i+';').join('')+'}';
    const first=await store.putRecord(request('max',record));assert.equal(first.asserted.length,4096);
    const second=await store.putRecord(request('replace-max',record));
    assert.equal(second.asserted.length,4096);assert.deepEqual(new Set(second.retracted),new Set(first.asserted));
    assert.equal((await store.at('e',{knownAt:2n,validAt:0n})).length,4096);
    assert.equal((await store.history('e')).length,8192);
    await assert.rejects(store.putRecord(request('over-max',record.slice(0,-1)+'i=4095;}')),matches('TD_E_SCHEMA_LIMIT'));
    assert.equal(await store.receipt('over-max'),null);
    await store.defineSchema('schema quoted version 1 { entity Row { q:text many; } }');
    const fields=Array.from({length:4},(_,i)=>({attribute:'q',value:{tag:'str' as const,value:String(i)+"'".repeat(16000)}}));
    assert.equal((await store.put({...request('quoted',undefined,'quoted'),schema:'quoted',fields})).asserted.length,4);
    assert.deepEqual(new Set((await store.history('quoted')).map(a=>a.value.value)),new Set(fields.map(f=>f.value.value)));
  }finally{await store.close();}
});

test('canonical replay preserves the original receipt while ownership, changed requests and legacy IDs reject',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'native-entity-replay-'));const database=resolve(directory,'data.duckdb');
  try{
    let store=await NativeEntityStore.open({database});await store.defineSchema(schema);
    const first=await store.putRecord(request('one','{s="A";i=7;i=8;}'));
    await store.putRecord(request('two','{s="B";}'));
    assert.deepEqual(await store.putRecord(request('one','{i=8;s="A";i=7;i=7;}')),first);
    await assert.rejects(store.putRecord(request('one','{s="changed";}')),matches('TD_E_COMMAND_IDEMPOTENCY'));
    await assert.rejects(store.putRecord({...request('wrong-type'),type:'Other'}),matches('TD_E_COMMAND_OWNERSHIP'));
    await store.close();
    const port=await openAuditedPort({database});const run=(sql:string)=>port.runNative({name:'replay_admission',sql,params:[]});
    try{
      await run('UPDATE main.storage_usage SET retained_count=1000000');
      assert.equal((await run(sqlPut('one','{i=8;i=7;s="A";}')))[0]?.[1],1n);
      await assert.rejects(run(sqlPut('over-cap','{s="C";}')),/TD_E_COMMAND_LIMIT/);
      assert.deepEqual(await run("PRAGMA td_entity_receipt('over-cap')"),[]);
      await run('UPDATE main.storage_usage SET retained_count=(SELECT count(*) FROM main.assertions)');
      await run("INSERT INTO main.commands VALUES ('legacy',NULL,NULL,NULL,'legacy',0,'triplex')");
      await assert.rejects(run("PRAGMA td_entity_receipt('legacy')"),/TD_E_COMMAND_KIND/);
      await assert.rejects(run(sqlPut('legacy')),/TD_E_COMMAND_IDEMPOTENCY/);
      await run('BEGIN');
      await run("UPDATE main.assertions SET command_id='legacy' WHERE tx_to=9223372036854775807");
      await assert.rejects(run(sqlPut('foreign-data')),/TD_E_COMMAND_OWNERSHIP/);
      await run('ROLLBACK');
      await run("DELETE FROM main.commands WHERE command_id='legacy'");
      assert.deepEqual(await run('SELECT position FROM main.clock'),[[2n]]);
    }finally{await port.close();}
    store=await NativeEntityStore.open({database});try{assert.deepEqual(await store.receipt('one'),first);}finally{await store.close();}
  }finally{await rm(directory,{recursive:true});}
});

test('late assertion failure atomically rolls back expanded native commands in run and stream paths',async()=>{
  for(const mode of ['run','stream']as const){
    const instance=await DuckDBInstance.create(':memory:',{allow_unsigned_extensions:'true',threads:'1'});const connection=await instance.connect();
    const run=async(sql:string)=>{
      if(mode==='run')return (await connection.runAndReadAll(sql)).getRows();
      const result=await connection.stream(sql);const rows:unknown[][]=[];
      try{for(;;){const chunk=await result.fetchChunk();if(!chunk||!chunk.rowCount)break;for(let i=0;i<chunk.rowCount;i++)rows.push(chunk.getRowValues(i));}}
      finally{result.closeSync();}return rows;
    };
    try{
      await run('LOAD '+quote(binary));await run('PRAGMA td_initialize');await activateEngineOwner(connection);await run('PRAGMA td_define_schema('+quote(schema)+')');
      await run(sqlPut('one'));await run('CREATE UNIQUE INDEX injected_failure ON main.assertions(payload)');
      const before=await run('SELECT * EXCLUDE(v_s),decode(v_s) FROM main.assertions');
      const usage=await run('SELECT * FROM main.storage_usage');
      // Header insertion and old-fact retraction precede the failing new assertion INSERT.
      await assert.rejects(run(sqlPut('failed')),/duplicate key/i);
      assert.deepEqual(await run('SELECT * EXCLUDE(v_s),decode(v_s) FROM main.assertions'),before);
      assert.deepEqual(await run('SELECT * FROM main.storage_usage'),usage);
      assert.deepEqual(await run("PRAGMA td_entity_receipt('failed')"),[]);
      assert.deepEqual(await run('SELECT position FROM main.clock'),[[1n]]);
      assert.deepEqual(await run('SELECT count(*) FROM td_catalog_v1.entity_commands'),[[1n]]);
      assert.deepEqual(await run("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '__td_native_%'"),[]);
      await run('DROP INDEX injected_failure');assert.equal((await run(sqlPut('failed')))[0]?.[1],2n);
    }finally{connection.closeSync();instance.closeSync();}
  }
});

test('retained audit rejects descriptor, schema binding and payload carrier corruption',async()=>{
  for(const mutation of ["UPDATE main.assertions SET v_i=8 WHERE a='i'",
    "UPDATE td_catalog_v1.entity_commands SET schema_hash=repeat('0',64)",
    "UPDATE td_catalog_v1.schemas SET dsl=replace(dsl,'i:int64','i:text')"]){
    const port=await openAuditedPort();const run=(sql:string)=>port.runNative({name:'history_integrity',sql,params:[]});
    try{
      await run('PRAGMA td_define_schema('+quote(schema)+')');await run(sqlPut('one','{s="A";i=7;}'));
      assert.equal((await run("PRAGMA td_entity_history('e')")).length,2);
      await port.run({name:'inject_history_corruption',sql:mutation,params:[]});
      await assert.rejects(port.activateOwnership(),/TD_E_(QUERY_CARRIER|COMMAND_HISTORY|SCHEMA_CATALOG)/);
      await assert.rejects(run("PRAGMA td_entity_receipt('missing')"),/TD_E_OWNER_PROBE_INVALID/);
      // A corrupt history row can fail its own validation before the owner
      // guard's independent SQL branch runs. Neither branch may return rows.
      await assert.rejects(run("PRAGMA td_entity_history('e')"),/TD_E_(OWNER_PROBE_INVALID|COMMAND_HISTORY|SCHEMA_CATALOG)/);
    }finally{await port.close();}
  }
});

test('concurrent native writers conflict atomically and reconcile before a whole-command retry',async()=>{
  const instance=await DuckDBInstance.create(':memory:',{allow_unsigned_extensions:'true',threads:'1'});
  const a=await instance.connect(),b=await instance.connect();
  const run=async(connection:typeof a,sql:string)=>(await connection.runAndReadAll(sql)).getRows();
  try{
    await run(a,'LOAD '+quote(binary));await run(a,'PRAGMA td_initialize');await activateEngineOwner(a,b);await run(a,'PRAGMA td_define_schema('+quote(schema)+')');
    await run(a,'BEGIN');await run(a,sqlPut('a','{s="A";}','entity-a'));
    await assert.rejects(run(b,sqlPut('b','{s="B";}','entity-b')),/conflict|duplicate key/i);
    await run(a,'COMMIT');assert.deepEqual(await run(b,"PRAGMA td_entity_receipt('b')"),[]);
    assert.deepEqual(await run(b,"SELECT count(*) FROM main.assertions WHERE e='entity-b'"),[[0n]]);
    assert.equal((await run(b,sqlPut('b','{s="B";}','entity-b')))[0]?.[1],2n);
    assert.deepEqual(await run(a,'SELECT position FROM main.clock'),[[2n]]);
    assert.deepEqual(await run(a,'SELECT retained_count FROM main.storage_usage'),[[2n]]);
  }finally{a.closeSync();b.closeSync();instance.closeSync();}
});

test('SIGKILL during native command INSERT, before commit and after commit preserves complete recovery',{timeout:30000},async()=>{
  for(const phase of ['inside_insert','before_commit','after_commit']){
    const directory=await mkdtemp(resolve(tmpdir(),'native-command-crash-')),database=resolve(directory,'data.duckdb');
    try{
      // Test-only CHECK: a sequence publishes entry into the assertion INSERT,
      // then bounded built-in regex work leaves time for an observed mid-query kill.
      // Native header insertion and old-fact retraction precede this CHECK.
      const catalog=await readFile(resolve(root,'native/catalog.sql'),'utf8');
      const begin=catalog.indexOf('CREATE TABLE IF NOT EXISTS main.assertions('),end=catalog.indexOf('\n);',begin);
      assert.ok(begin>=0&&end>begin);
      const table=catalog.slice(begin,end)+`,CHECK(CASE WHEN e='e' AND a='i' AND v_i=0 THEN
        CASE WHEN nextval('command_phase')>0 THEN
        length(regexp_replace(repeat(payload,4194304),'[0-9]','','g'))>=0 ELSE FALSE END ELSE TRUE END))`;
      const instance=await DuckDBInstance.create(database,{allow_unsigned_extensions:'true',threads:'1',memory_limit:'128MB'});
      const connection=await instance.connect();
      try{
        await connection.run('LOAD '+quote(binary));await connection.run('CREATE SEQUENCE command_phase');
        await connection.run(table);await connection.run('PRAGMA td_initialize');
      }finally{connection.closeSync();instance.closeSync();}
      let store=await NativeEntityStore.open({database});await store.defineSchema(schema);
      const seed=await store.putRecord(request('seed','{s="Old";i=-1;}'));await store.close();
      const worker=fork(resolve(root,'build/adapter/crash-native-command.mjs'),[database,phase],{stdio:['ignore','ignore','pipe','ipc']});
      let stderr='';worker.stderr?.on('data',chunk=>{stderr=(stderr+String(chunk)).slice(-8192);});
      const exit=new Promise<{code:number|null;signal:NodeJS.Signals|null}>(resolveExit=>worker.once('exit',(code,signal)=>resolveExit({code,signal})));
      try{
        await new Promise<void>((resolvePhase,reject)=>{
          const timer=setTimeout(()=>reject(new Error('Native crash phase timeout: '+stderr)),10000);
          worker.once('error',error=>{clearTimeout(timer);reject(error);});
          worker.once('exit',()=>{clearTimeout(timer);reject(new Error('Native writer exited before phase: '+stderr));});
          worker.on('message',(message:unknown)=>{
            if(typeof message==='object'&&message!==null&&'phase'in message&&message.phase===phase){
              clearTimeout(timer);
              if(phase==='inside_insert'&&(!('pending'in message)||message.pending!==true)){
                reject(new Error('Native INSERT was not observed pending'));return;
              }
              resolvePhase();
            }
          });
        });
        assert.equal(worker.kill('SIGKILL'),true);assert.equal((await exit).signal,'SIGKILL');assert.equal(stderr,'');
      }finally{
        if(worker.exitCode===null&&worker.signalCode===null)worker.kill('SIGKILL');await exit;
      }
      store=await NativeEntityStore.open({database});
      const committed=phase==='after_commit';
      try{
        // Reconcile durable outcome before any new write/retry.
        const receipt=await store.receipt('crash-command');assert.equal(receipt!==null,committed,phase);
        if(receipt){assert.equal(receipt.position,2n);assert.equal(receipt.asserted.length,2);assert.deepEqual(new Set(receipt.retracted),new Set(seed.asserted));}
        assert.deepEqual(await store.receipt('seed'),seed);
        const history=await store.history('e');assert.equal(history.length,committed?4:2);
        const current=await store.at('e',{validAt:0n,knownAt:committed?2n:1n});
        assert.deepEqual(current.map(a=>a.value.value),committed?[7n,'New']:[-1n,'Old']);
        assert.ok(history.filter(a=>a.commandId==='seed').every(a=>a.txTo===(committed?2n:INF)));
        assert.equal((await store.putRecord(request('healthy','{s="Healthy";i=9;}'))).position,committed?3n:2n);
      }finally{await store.close();}
      const port=await NativeDuckDBPort.open({database});
      try{
        assert.deepEqual(await port.run({name:'recovered_usage',sql:'SELECT retained_count,retained_bytes=(SELECT sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))) FROM main.assertions) FROM main.storage_usage',params:[]}),[[committed?6n:4n,true]]);
        assert.deepEqual(await port.run({name:'recovered_temps',sql:"SELECT table_name FROM information_schema.tables WHERE table_name LIKE '__td_native_%'",params:[]}),[]);
      }finally{await port.close();}
    }finally{await rm(directory,{recursive:true});}
  }
});
