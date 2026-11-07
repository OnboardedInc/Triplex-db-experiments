import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFile,mkdtemp,mkdir,readFile,rm,symlink,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {test} from 'node:test';
import {promisify} from 'node:util';
import {DuckDBConnection,DuckDBInstance,DuckDBPreparedStatement,DuckDBResult} from '@duckdb/node-api';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';
import {NativeEntityStore,NativeCommandError} from './native-entity.js';
import {NativeSchemaCatalog,NativeSchemaError} from './native-schema.js';
import {nativeWriterRunFault} from './native-writer-test-fault.js';

const root=fileURLToPath(new URL('../..',import.meta.url));
const manifest=JSON.parse(await readFile(join(root,'build/artifact.json'),'utf8'));
const currentUnique=manifest.experimental_current_unique_fast_path===true;
const allCutUnique=manifest.experimental_all_cut_unique_fast_path===true;
const ownedScanReason=allCutUnique?'owned_allcut_unique_scalable_single_atom':currentUnique?'owned_unique_scalable_single_atom':'owned_scalable_single_atom';
const ownedCountReason=allCutUnique?'owned_allcut_unique_scalable_count':currentUnique?'owned_unique_scalable_count':'owned_scalable_count';
const schema='schema owned_host version 1 {entity Row {n:int64 many;}}';
const query="answer(?n) :- triple('e','n',?n).";
const request=(commandId:string,n:number)=>({schema:'owned_host',version:1,type:'Row',entityId:'e',commandId,
  record:'{n='+n+';}',validFrom:0n,validTo:9223372036854775807n});
const sql=(port:NativeDuckDBPort,statement:string)=>port.runNative({name:'owned_test',sql:statement,params:[]});
const ownedQuery="PRAGMA td_query_store_scalable('answer(count()) :- triple(?e,?a,?v).',0,-1,1000000,1000000,536870912,100000,16777216,0)";

function deferred(){
  let resolve!:()=>void;
  const promise=new Promise<void>(done=>{resolve=done;});
  return {promise,resolve};
}

async function waitFor(promise:Promise<unknown>){
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Owned read condition missing')),2000);})]);
  }finally{clearTimeout(timer);}
}

async function activate(ports:NativeDuckDBPort[]){
  await sql(ports[0]!,'SELECT td_owner_probe_invalidate()');
  for(const port of ports)await sql(port,'SELECT td_owner_probe_enroll()');
  await sql(ports[0]!,'SELECT td_owner_probe_activate(0)');
  assert.deepEqual(await sql(ports[0]!,'SELECT td_owner_probe_validated_check()'),[[true]]);
}

test('raw compatibility transport only loads the portable core',async t=>{
  const run=DuckDBConnection.prototype.run,loads:string[]=[];
  t.mock.method(DuckDBConnection.prototype,'run',async function(this:DuckDBConnection,...args:Parameters<DuckDBConnection['run']>){
    if(args[0].startsWith('LOAD '))loads.push(args[0]);
    return run.apply(this,args);
  });
  await assert.rejects(NativeEntityStore.open({readers:0,integrity:'strict'} as {readers:number}),/integrity option was removed/);
  const port=await NativeDuckDBPort.open();
  try{
    assert.equal(loads.length,1);assert.equal(loads[0]?.includes('owner_probe'),false);
  }finally{await port.close();}
});

test('default public store audits every connection and uses the verified owned route',async()=>{
  const store=await NativeEntityStore.open({readers:2});
  try{
    await store.defineSchema(schema);await store.putRecord(request('first',1));
    for(const options of [{validAt:0n},{validAt:0n,timeoutMs:5000}]){
      const answer=await store.queryScalable(query,options);
      assert.equal(answer.reason,ownedScanReason);assert.equal(answer.counters,null);
      assert.deepEqual(answer.rows,[[{tag:'i64',value:1n}]]);
    }
    await store.putRecord(request('second',2));
    assert.deepEqual((await store.queryScalable(query,{validAt:0n})).rows,[[{tag:'i64',value:2n}]]);
    const historical=await store.queryScalable(query,{validAt:0n,knownAt:1n});
    assert.deepEqual(historical.rows,[[{tag:'i64',value:1n}]]);
    assert.equal(historical.reason,allCutUnique?'owned_allcut_unique_scalable_single_atom':'owned_scalable_single_atom');
    assert.equal((await store.query(query,{validAt:0n,forceNative:false})).reason,'proved_single_atom');
    await store.revalidate();
    assert.equal((await store.queryScalable(query,{validAt:0n,timeoutMs:5000})).reason,ownedScanReason);
  }finally{await store.close();}
});

test('native validation failure and injected writer transport interruption preserve owned reads',async t=>{
  const interrupted=new Error('INTERRUPT Error: Interrupted!');
  const fault=nativeWriterRunFault(t,sql=>sql.startsWith("PRAGMA td_put_entity_v2('owned_host',1,'Row','e','interrupted',"),[interrupted]);
  const store=await NativeEntityStore.open({readers:1});
  try{
    await store.defineSchema(schema);const first=await store.putRecord(request('first',1));
    await assert.rejects(store.putRecord({...request('invalid',2),record:'{n="wrong";}'}),/TD_E_SCHEMA_TYPE/);
    assert.equal(await store.receipt('invalid'),null);
    assert.deepEqual((await store.queryScalable(query,{validAt:0n})).rows,[[{tag:'i64',value:1n}]]);
    await assert.rejects(store.putRecord(request('interrupted',2)),error=>error===interrupted);
    assert.equal(fault.consumed(),1,'The actual native writer bridge must consume the selected transport fault');
    assert.equal(await store.receipt('interrupted'),null);
    const after=await store.queryScalable(query,{validAt:0n});
    assert.equal(after.position,first.position);assert.equal(after.reason,ownedScanReason);
    assert.deepEqual(after.rows,[[{tag:'i64',value:1n}]]);
    assert.equal((await store.putRecord(request('healthy',2))).position,2n);
  }finally{await store.close();}
});

test('raw SQL and raw controlled SQL invalidate before dispatch while trusted native reads stay usable',async()=>{
  const writer=await NativeDuckDBPort.openWithOwner(),reader=await writer.forkReader();
  try{
    await activate([writer,reader]);assert.equal((await sql(reader,ownedQuery))[0]?.[2],ownedCountReason);
    await reader.run({name:'raw_select',sql:'SELECT 1',params:[]});
    await assert.rejects(sql(writer,ownedQuery),/TD_E_OWNER_PROBE_INVALID/);
    assert.deepEqual(reader.trace().slice(-2).map(row=>row.name),['owner_invalidate','raw_select']);
    await activate([writer,reader]);
    await reader.withQueryControl({timeoutMs:5000},control=>control.run({name:'raw_controlled',sql:'SELECT 1',params:[]}));
    await assert.rejects(sql(writer,ownedQuery),/TD_E_OWNER_PROBE_INVALID/);
    await activate([writer,reader]);
    await writer.run({name:'raw_update',sql:'UPDATE main.clock SET position=position',params:[]});
    assert.deepEqual(writer.trace().slice(-2).map(row=>row.name),['owner_invalidate','raw_update']);
    await assert.rejects(sql(reader,ownedQuery),/TD_E_OWNER_PROBE_INVALID/);
    await activate([writer,reader]);assert.equal((await sql(reader,ownedQuery))[0]?.[2],ownedCountReason);
  }finally{await reader.close();await writer.close();}
});

test('revalidation drains admitted reads, blocks new work and requires unknown connections to close',async t=>{
  let instance:DuckDBInstance|undefined;
  const create=DuckDBInstance.create;
  t.mock.method(DuckDBInstance,'create',async function(this:typeof DuckDBInstance,...args:Parameters<typeof DuckDBInstance.create>){
    instance=await create.apply(this,args);return instance;
  });
  const store=await NativeEntityStore.open({readers:2});
  await store.defineSchema(schema);await store.putRecord({...request('first',1),record:'{n=2;n=1;}'});
  const started=deferred(),released=deferred(),owned=new Set<DuckDBPreparedStatement>();
  const prepare=DuckDBConnection.prototype.prepare,stream=DuckDBPreparedStatement.prototype.stream;
  t.mock.method(DuckDBConnection.prototype,'prepare',async function(this:DuckDBConnection,statement:string){
    const result=await prepare.call(this,statement);
    if(statement.startsWith('PRAGMA td_query_store_scalable_v2('))owned.add(result);
    return result;
  });
  let held=false;
  t.mock.method(DuckDBPreparedStatement.prototype,'stream',async function(this:DuckDBPreparedStatement){
    const result=await stream.call(this);
    if(owned.has(this)&&!held){held=true;started.resolve();await released.promise;}
    return result;
  });
  const read=store.queryScalable(query,{validAt:0n});
  let revalidation:Promise<void>|undefined,intruder:DuckDBConnection|undefined;
  try{
    await waitFor(started.promise);revalidation=store.revalidate();
    await assert.rejects(store.queryScalable(query,{validAt:0n}),error=>error instanceof NativeCommandError&&error.code==='TD_E_QUERY_BUSY');
    await assert.rejects(store.putRecord(request('blocked',2)),/TD_E_QUERY_BUSY/);
    released.resolve();await read;await revalidation;
    assert.ok(instance);intruder=await instance.connect();
    await assert.rejects(intruder.run("SET GLOBAL default_collation='nocase'"),/configuration has been locked/);
    await assert.rejects(intruder.run("SET GLOBAL default_order='DESC'"),/configuration has been locked/);
    await assert.rejects(store.queryScalable(query,{validAt:0n}),/TD_E_OWNER_PROBE_INVALID/);
    await assert.rejects(store.revalidate(),/TD_E_OWNER_PROBE_ENROLLMENT/);
    intruder.closeSync();intruder=undefined;await store.revalidate();
    assert.deepEqual((await store.queryScalable(query,{validAt:0n})).rows,[[{tag:'i64',value:1n}],[{tag:'i64',value:2n}]]);
  }finally{released.resolve();await Promise.allSettled([read,...(revalidation?[revalidation]:[])]);intruder?.closeSync();await store.close();}
});

test('failed full audit leaves owned reads invalid and can be repaired through a fresh audit',async t=>{
  let instance:DuckDBInstance|undefined;
  const create=DuckDBInstance.create;
  t.mock.method(DuckDBInstance,'create',async function(this:typeof DuckDBInstance,...args:Parameters<typeof DuckDBInstance.create>){
    instance=await create.apply(this,args);return instance;
  });
  const store=await NativeEntityStore.open({readers:1});
  try{
    await store.defineSchema(schema);await store.putRecord(request('first',1));await store.putRecord(request('second',2));
    assert.ok(instance);
    const corrupt=await instance.connect();
    try{await corrupt.run("UPDATE main.assertions SET payload_hash='bad' WHERE command_id='first'");}finally{corrupt.closeSync();}
    await assert.rejects(store.revalidate(),/TD_E_QUERY_CARRIER|TD_E_COMMAND_HISTORY/);
    await assert.rejects(store.queryScalable(query,{validAt:0n}),/TD_E_OWNER_PROBE_INVALID/);
    await assert.rejects(store.query(query,{validAt:0n}),/TD_E_OWNER_PROBE_INVALID/);
    const repair=await instance.connect();
    try{await repair.run('UPDATE main.assertions SET payload_hash=sha256(payload)');}finally{repair.closeSync();}
    await store.revalidate();assert.equal((await store.queryScalable(query,{validAt:0n})).rows.length,1);
  }finally{await store.close();}
});

test('uncertain activation cleanup keeps owned reads closed even if native invalidation cannot execute',async t=>{
  const connections:DuckDBConnection[]=[];
  const connect=DuckDBInstance.prototype.connect;
  t.mock.method(DuckDBInstance.prototype,'connect',async function(this:DuckDBInstance){
    const connection=await connect.call(this);connections.push(connection);return connection;
  });
  const store=await NativeEntityStore.open({readers:1});
  await store.defineSchema(schema);await store.putRecord(request('first',1));
  const close=DuckDBResult.prototype.closeSync,run=NativeDuckDBPort.prototype.runNative;
  const failure=new Error('injected activation result close');
  let preventInvalidation=false;
  const closedMock=t.mock.method(DuckDBResult.prototype,'closeSync',function(this:DuckDBResult){
    const validation=this.columnNames().includes('owner_valid');
    close.call(this);
    if(validation){preventInvalidation=true;throw failure;}
  });
  const invalidationMock=t.mock.method(NativeDuckDBPort.prototype,'runNative',async function(this:NativeDuckDBPort,plan:Parameters<NativeDuckDBPort['runNative']>[0]){
    if(preventInvalidation&&'sql'in plan&&plan.sql.includes('td_owner_probe_invalidate()'))throw new Error('injected unavailable invalidation');
    return run.call(this,plan);
  });
  try{
    await assert.rejects(store.revalidate(),AggregateError);
    closedMock.mock.restore();invalidationMock.mock.restore();
    const survivingReader=connections[1];assert.ok(survivingReader);
    assert.deepEqual((await survivingReader.runAndReadAll('SELECT td_owner_probe_validated_check()')).getRows(),[[true]]);
    await assert.rejects(store.queryScalable(query,{validAt:0n}),error=>error instanceof NativeCommandError&&error.code==='TD_E_OWNER_PROBE_INVALID');
  }finally{
    closedMock.mock.restore();invalidationMock.mock.restore();
    await store.close();
  }
});

test('required ownership rejects stale, malformed and partial companions before LOAD',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'owned-pairing-'));
  const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
  try{
    await mkdir(join(directory,'build/adapter'),{recursive:true});await mkdir(join(directory,'build/owner_probe'));
    await symlink(join(root,'node_modules'),join(directory,'node_modules'));
    await writeFile(join(directory,'build/adapter/native-duckdb-port.mjs'),await readFile(join(root,'adapter/native-duckdb-port.mjs')));
    await writeFile(join(directory,'build/temporal_datalog.duckdb_extension'),'fixture-core');
    await writeFile(join(directory,'build/temporal_control.node'),'fixture-control');
    await writeFile(join(directory,'build/artifact.json'),JSON.stringify({extension_sha256:hash('fixture-core'),control_bridge_sha256:hash('fixture-control')}));
    await writeFile(join(directory,'build/owner_probe/temporal_owner_probe.duckdb_extension'),'fixture-owner');
    await writeFile(join(directory,'build/owner_probe/artifact.json'),JSON.stringify({engine:'2.0.0',abi:'CPP',core_extension_sha256:hash('stale-core'),extension_sha256:hash('fixture-owner'),engine_library_sha256:'0'.repeat(64)}));
    const module=await import(pathToFileURL(join(directory,'build/adapter/native-duckdb-port.mjs')).href);
    const artifactError=(error:unknown)=>error instanceof Error&&'code'in error&&error.code==='OWNER_ARTIFACT';
    await assert.rejects(module.NativeDuckDBPort.openWithOwner(),(error:unknown)=>
        artifactError(error)&&error instanceof Error&&error.cause instanceof Error&&/identities differ/.test(error.cause.message));
    await writeFile(join(directory,'build/owner_probe/artifact.json'),'invalid JSON');
    await assert.rejects(module.NativeDuckDBPort.openWithOwner(),artifactError);
    await rm(join(directory,'build/owner_probe/artifact.json'));
    await assert.rejects(module.NativeDuckDBPort.openWithOwner(),artifactError);
  }finally{await rm(directory,{recursive:true,force:true});}
});

test('required ownership verifies the engine resolved by the SDK with a shadow platform package',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'owned-sdk-resolution-'));
  const require=createRequire(import.meta.url);
  const packages=join(directory,'node_modules/@duckdb');
  const shadow=join(packages,'node-bindings-darwin-arm64');
  try{
    await mkdir(shadow,{recursive:true});
    await mkdir(join(directory,'build/adapter'),{recursive:true});
    await mkdir(join(directory,'build/owner_probe'));
    await writeFile(join(directory,'package.json'),'{"private":true,"type":"module"}\n');
    await symlink(dirname(require.resolve('@duckdb/node-api/package.json')),join(packages,'node-api'));
    await writeFile(join(shadow,'duckdb.node'),'shadow node binding');
    await writeFile(join(shadow,'libduckdb.dylib'),'shadow engine library');
    for(const file of ['artifact.json','temporal_control.node','temporal_datalog.duckdb_extension',
      'owner_probe/artifact.json','owner_probe/temporal_owner_probe.duckdb_extension','owner_probe/temporal_writer.node'])
      await symlink(join(root,'build',file),join(directory,'build',file));
    for(const file of ['native-duckdb-port.mjs','native-entity.js','native-schema.js'])
      await copyFile(join(root,'build/adapter',file),join(directory,'build/adapter',file));
    await promisify(execFile)(process.execPath,['--input-type=module','-e',`
      import assert from 'node:assert/strict';
      import {readFileSync} from 'node:fs';
      import {createRequire} from 'node:module';
      import {NativeEntityStore} from './build/adapter/native-entity.js';
      const require=createRequire(new URL('./build/adapter/native-duckdb-port.mjs',import.meta.url));
      const platform='@duckdb/node-bindings-darwin-arm64/duckdb.node';
      const apiRequire=createRequire(require.resolve('@duckdb/node-api'));
      const bindingsRequire=createRequire(apiRequire.resolve('@duckdb/node-bindings'));
      assert.equal(readFileSync(require.resolve(platform),'utf8'),'shadow node binding');
      assert.notEqual(bindingsRequire.resolve(platform),require.resolve(platform));
      const store=await NativeEntityStore.open();
      try{
            await store.defineSchema(${JSON.stringify(schema)});
        await store.putRecord({schema:'owned_host',version:1,type:'Row',entityId:'e',commandId:'first',
          record:'{n=7;}',validFrom:0n,validTo:10n});
        const answer=await store.queryScalable(${JSON.stringify(query)},{validAt:0n});
        assert.equal(answer.reason,${JSON.stringify(ownedScanReason)});
        assert.deepEqual(answer.rows,[[{tag:'i64',value:7n}]]);
      }finally{await store.close();}
    `],{cwd:directory,timeout:10000});
  }finally{await rm(directory,{recursive:true,force:true});}
});

test('schema catalog checks the live owner even for missing definitions',async t=>{
  let instance:DuckDBInstance|undefined;
  const create=DuckDBInstance.create;
  t.mock.method(DuckDBInstance,'create',async function(this:typeof DuckDBInstance,...args:Parameters<typeof DuckDBInstance.create>){
    instance=await create.apply(this,args);return instance;
  });
  const catalog=await NativeSchemaCatalog.open();
  try{
    const receipt=await catalog.define(schema);
    assert.equal((await catalog.get(receipt.name,receipt.version))?.hash,receipt.hash);
    assert.equal(await catalog.get('missing',1),null);
    assert.equal(await catalog.validateRecord(receipt.name,1,'Row','{n=1;}'),true);
    assert.ok(instance);
    const intruder=await instance.connect();
    try{
      const rejected=(error:unknown)=>error instanceof NativeSchemaError&&error.code==='TD_E_OWNER_PROBE_INVALID';
      await assert.rejects(catalog.get('missing',1),rejected);
      await assert.rejects(catalog.get(receipt.name,1),rejected);
      await assert.rejects(catalog.validateRecord(receipt.name,1,'Row','{n=1;}'),rejected);
      await assert.rejects(catalog.define(schema),rejected);
    }finally{intruder.closeSync();}
  }finally{await catalog.close();}
});


test('an intruder cannot shadow the controlled query template compiler',async t=>{
  let instance:DuckDBInstance|undefined;
  const create=DuckDBInstance.create;
  t.mock.method(DuckDBInstance,'create',async function(this:typeof DuckDBInstance,...args:Parameters<typeof DuckDBInstance.create>){
    instance=await create.apply(this,args);return instance;
  });
  const store=await NativeEntityStore.open({readers:1});
  try{
    await store.defineSchema(schema);
    const first=await store.putRecord(request('first',1));
    assert.ok(instance);
    const intruder=await instance.connect();
    try{
      for(const compiler of ['td_query_store_values_sql_v2','td_query_store_scalable_sql_v2']){
        await intruder.run("CREATE MACRO "+compiler+"(a,b,c,d,e,f,g,h) AS 'UPDATE main.clock SET position=999 WHERE CAST($1 AS BIGINT)>0'");
      }
      await assert.rejects(store.query(query,{validAt:0n,timeoutMs:5000}),/TD_E_OWNER_PROBE_INVALID/);
      await assert.rejects(store.queryScalable(query,{validAt:0n,timeoutMs:5000}),/TD_E_OWNER_PROBE_INVALID/);
      assert.deepEqual((await intruder.runAndReadAll('SELECT position FROM main.clock')).getRows(),[[first.position]]);
    }finally{intruder.closeSync();}
  }finally{await store.close();}
});
