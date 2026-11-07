import {openAuditedPort} from './native-test-fixture.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';

const schema='schema capacity version 1 { entity Row { value:int64 required; } }';
const quote=(value:string)=>"'"+value.replaceAll("'","''")+"'";
const put=(command:string,facts=2,bytes=1048576)=>
  `PRAGMA td_put_entity_with_limits('capacity',1,'Row',${quote(command)},${quote(command)},'{value=7;}',0,9223372036854775807,${facts},${bytes})`;

async function fixture(work:(run:(sql:string)=>ReturnType<NativeDuckDBPort['run']>)=>Promise<void>){
  const port=await openAuditedPort();
  const run=(sql:string)=>port.runNative({name:'capacity_test',sql,params:[]});
  try{
    await run(`PRAGMA td_define_schema(${quote(schema)})`);
    await work(run);
  }finally{await port.close();}
}

test('explicit retained budgets reject atomically and preserve replay at capacity',async()=>{
  await fixture(async run=>{
    const first=await run(put('one'));
    await run(put('two'));
    await assert.rejects(run(put('three')),/TD_E_COMMAND_LIMIT/);
    assert.deepEqual(await run('SELECT position FROM main.clock'),[[2n]]);
    assert.deepEqual(await run('SELECT count(*) FROM main.commands'),[[2n]]);
    assert.deepEqual(await run('SELECT retained_count FROM main.storage_usage'),[[2n]]);
    assert.deepEqual(await run(put('one',1)),first);
    await run(put('three',3));
    assert.deepEqual(await run('SELECT position FROM main.clock'),[[3n]]);
  });
});

test('retained byte admission rolls back headers and permits healthy reuse',async()=>{
  await fixture(async run=>{
    await assert.rejects(run(put('bytes',2,1)),/TD_E_COMMAND_LIMIT/);
    assert.deepEqual(await run('SELECT count(*) FROM main.commands'),[[0n]]);
    assert.deepEqual(await run('SELECT position FROM main.clock'),[[0n]]);
    await run(put('bytes'));
    assert.deepEqual(await run('SELECT retained_count FROM main.storage_usage'),[[1n]]);
  });
});

test('legacy retained gate stays fixed while the explicit profile accepts a higher ledger',async()=>{
  await fixture(async run=>{
    // Inject only the admission ledger to exercise its boundary cheaply.
    // The scale benchmark separately checks real million-row persisted data.
    await run('UPDATE main.storage_usage SET retained_count=1000000');
    await assert.rejects(run("PRAGMA td_put_entity('capacity',1,'Row','legacy','legacy','{value=7;}',0,9223372036854775807)"),/TD_E_COMMAND_LIMIT/);
    await run(put('extended',1000001));
    assert.deepEqual(await run('SELECT retained_count FROM main.storage_usage'),[[1000001n]]);
    assert.deepEqual(await run('SELECT position FROM main.clock'),[[1n]]);
  });
});

test('invalid retained profiles reject before mutation',async()=>{
  await fixture(async run=>{
    for(const [facts,bytes] of [[0,1024],[-1,1024],[1000000001,1024],[2,0],[2,1099511627777]]){
      await assert.rejects(run(put('invalid',facts,bytes)),/TD_E_COMMAND_LIMIT/);
    }
    assert.deepEqual(await run('SELECT count(*) FROM main.commands'),[[0n]]);
    await run(put('valid',1000000000,1099511627776));
  });
});
