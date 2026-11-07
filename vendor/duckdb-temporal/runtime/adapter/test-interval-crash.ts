import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {DuckDBInstance} from '@duckdb/node-api';
import {NativeEntityStore} from './native-entity.js';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const schema='schema native version 1 {entity Row {s:text required;i:int64 many;}}';
const quote=(text:string)=>"'"+text.replaceAll("'","''")+"'";
const request=(commandId:string,record:string)=>({schema:'native',version:1,type:'Row',entityId:'e',commandId,
  record,validFrom:2n,validTo:8n});

test('SIGKILL at patch INSERT, before commit and after commit preserves exact interval and format recovery',{timeout:60000},async()=>{
  for(const phase of ['inside_insert','before_commit','after_commit']){
    const directory=await mkdtemp(join(tmpdir(),'native-interval-crash-')),database=join(directory,'data.duckdb');
    try{
      const catalog=await readFile(join(root,'native/catalog.sql'),'utf8');
      const begin=catalog.indexOf('CREATE TABLE IF NOT EXISTS main.assertions('),end=catalog.indexOf('\n);',begin);
      assert.ok(begin>=0&&end>begin);
      const table=catalog.slice(begin,end)+`,CHECK(CASE WHEN e='e' AND a='i' AND v_i=0 THEN
        CASE WHEN nextval('command_phase')>0 THEN
        length(regexp_replace(repeat(payload,4194304),'[0-9]','','g'))>=0 ELSE FALSE END ELSE TRUE END))`;
      const instance=await DuckDBInstance.create(database,{allow_unsigned_extensions:'true',threads:'1',memory_limit:'128MB'});
      const connection=await instance.connect();
      try{
        await connection.run('LOAD '+quote(join(root,'build/temporal_datalog.duckdb_extension')));
        await connection.run('CREATE SEQUENCE command_phase');await connection.run(table);await connection.run('PRAGMA td_initialize');
      }finally{connection.closeSync();instance.closeSync();}
      let store=await NativeEntityStore.open({database});await store.defineSchema(schema);
      const seed=await store.putRecord({...request('seed','{s="Old";i=-1;}'),validFrom:0n,validTo:10n});
      await store.close();
      const worker=fork(join(root,'build/adapter/crash-native-command.mjs'),[database,phase,'patch'],{stdio:['ignore','ignore','pipe','ipc']});
      let stderr='';worker.stderr?.on('data',chunk=>{stderr=(stderr+String(chunk)).slice(-8192);});
      const exit=new Promise<{code:number|null;signal:NodeJS.Signals|null}>(done=>worker.once('exit',(code,signal)=>done({code,signal})));
      try{
        await new Promise<void>((resolvePhase,reject)=>{
          const timer=setTimeout(()=>reject(new Error('Patch crash phase timeout: '+stderr)),10000);
          worker.once('error',error=>{clearTimeout(timer);reject(error);});
          worker.once('exit',()=>{clearTimeout(timer);reject(new Error('Patch writer exited before phase: '+stderr));});
          worker.on('message',(message:unknown)=>{
            if(typeof message==='object'&&message!==null&&'phase'in message&&message.phase===phase){
              clearTimeout(timer);
              if(phase==='inside_insert'&&(!('pending'in message)||message.pending!==true)){
                reject(new Error('Patch INSERT was not observed pending'));return;
              }
              resolvePhase();
            }
          });
        });
        assert.equal(worker.kill('SIGKILL'),true);assert.equal((await exit).signal,'SIGKILL');assert.equal(stderr,'');
      }finally{
        if(worker.exitCode===null&&worker.signalCode===null)worker.kill('SIGKILL');await exit;
      }
      const committed=phase==='after_commit';
      const before=await NativeDuckDBPort.open({database});
      const sql=(statement:string)=>before.runNative({name:'patch_crash_recovery',sql:statement,params:[]});
      try{
        assert.deepEqual(await sql('SELECT version FROM main.store_meta'),[[committed?6n:5n]],phase);
        assert.deepEqual(await sql('SELECT count(*) FROM td_catalog_v1.entity_patch_commands'),[[committed?1n:0n]],phase);
        assert.deepEqual(await sql('SELECT count(*) FROM td_catalog_v1.entity_assertion_sources'),[[committed?4n:0n]],phase);
        assert.deepEqual(await sql('SELECT count(*) FROM main.assertions'),[[committed?8n:2n]],phase);
        assert.deepEqual(await sql('SELECT position FROM main.clock'),[[committed?2n:1n]],phase);
        assert.deepEqual(await sql('SELECT retained_count,retained_bytes=(SELECT sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))) FROM main.assertions) FROM main.storage_usage'),[[committed?8n:2n,true]],phase);
      }finally{await before.close();}
      store=await NativeEntityStore.open({database});
      try{
        // The observed INSERT uses 4092 replacements plus four fragments. Other
        // phases use two replacements plus four fragments. Retry exactly that request.
        const record=phase==='inside_insert'?'{s="New";'+Array.from({length:4091},(_,i)=>'i='+i+';').join('')+'}':'{s="New";i=7;}';
        const replacementCount=phase==='inside_insert'?4092:2;
        const prior=await store.receipt('crash-command');assert.equal(prior!==null,committed,phase);
        if(prior){assert.equal(prior.position,2n);assert.equal(prior.asserted.length,6);assert.deepEqual(new Set(prior.retracted),new Set(seed.asserted));}
        assert.deepEqual(await store.receipt('seed'),seed);
        for(const tick of [0n,1n,8n,9n]){
          assert.deepEqual((await store.at('e',{knownAt:committed?2n:1n,validAt:tick})).map(row=>row.value.value),[-1n,'Old'],phase);
        }
        const retry=await store.patchRecord(request('crash-command',record));
        assert.equal(retry.position,2n);assert.equal(retry.asserted.length,replacementCount+4);
        if(prior)assert.deepEqual(retry,prior);
        assert.deepEqual(new Set(retry.retracted),new Set(seed.asserted));
        const inside=await store.at('e',{knownAt:2n,validAt:2n});
        assert.equal(inside.length,replacementCount);
        assert.deepEqual(inside.filter(row=>row.attribute==='i').map(row=>row.value.value),
          phase==='inside_insert'?Array.from({length:4091},(_,i)=>String(i)).sort().map(value=>BigInt(value)):[7n]);
        assert.deepEqual(inside.filter(row=>row.attribute==='s').map(row=>row.value.value),['New']);
        assert.deepEqual(await store.patchRecord(request('crash-command',record)),retry);
        const healthy=await store.patchRecord(request('healthy','{s="Healthy";i=9;}'));assert.equal(healthy.position,3n);
        for(const tick of [0n,1n,8n,9n])assert.deepEqual((await store.at('e',{knownAt:3n,validAt:tick})).map(row=>row.value.value),[-1n,'Old']);
        assert.deepEqual((await store.at('e',{knownAt:3n,validAt:2n})).map(row=>row.value.value),[9n,'Healthy']);
        assert.deepEqual((await store.at('e',{knownAt:1n,validAt:2n})).map(row=>row.value.value),[-1n,'Old']);
      }finally{await store.close();}
      const after=await NativeDuckDBPort.open({database});
      try{
        assert.deepEqual(await after.runNative({name:'patch_crash_final',sql:'SELECT version FROM main.store_meta',params:[]}),[[6n]]);
        assert.deepEqual(await after.runNative({name:'patch_crash_temps',sql:"SELECT table_name FROM information_schema.tables WHERE table_name LIKE '__td_native_%'",params:[]}),[]);
      }finally{await after.close();}
    }finally{await rm(directory,{recursive:true,force:true});}
  }
});
