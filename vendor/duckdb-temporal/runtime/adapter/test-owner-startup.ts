import assert from 'node:assert/strict';
import {DuckDBInstance} from '@duckdb/node-api';
import {NativeEntityStore} from './native-entity.js';
import {NativeSchemaCatalog} from './native-schema.js';
import {execFile} from 'node:child_process';
import {copyFile,mkdir,mkdtemp,rm,symlink,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const root=fileURLToPath(new URL('../..',import.meta.url));

test('entity storage requires the owner companion while raw compatibility can load the core',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'native-core-only-'));
  try{
    await mkdir(join(directory,'build/adapter'),{recursive:true});
    await writeFile(join(directory,'package.json'),'{"private":true,"type":"module"}\n');
    await symlink(join(root,'node_modules'),join(directory,'node_modules'));
    for(const file of ['artifact.json','temporal_control.node','temporal_datalog.duckdb_extension'])
      await symlink(join(root,'build',file),join(directory,'build',file));
    for(const file of ['native-duckdb-port.mjs','native-entity.js','native-schema.js'])
      await copyFile(join(root,'build/adapter',file),join(directory,'build/adapter',file));
    // A fresh process binds the control bridge to this isolated loader path.
    await promisify(execFile)(process.execPath,['--input-type=module','-e',`
      import assert from 'node:assert/strict';
      import {NativeEntityStore} from './build/adapter/native-entity.js';
      import {NativeDuckDBPort} from './build/adapter/native-duckdb-port.mjs';
      await assert.rejects(NativeEntityStore.open({readers:1}),error=>error.code==='OWNER_ARTIFACT');
      const raw=await NativeDuckDBPort.open();
      try{
        assert.deepEqual(await raw.run({name:'raw_core',sql:'SELECT 1',params:[]}),[[1n]]);
      }finally{await raw.close();}
    `],{cwd:directory,timeout:10000});
  }finally{await rm(directory,{recursive:true,force:true});}
});


test('persisted macros reject native startup before initialization can run',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'native-macro-startup-'));
  const database=join(directory,'store.duckdb');
  const inspect=async(work:(connection:Awaited<ReturnType<DuckDBInstance['connect']>>)=>Promise<void>)=>{
    const instance=await DuckDBInstance.create(database);
    const connection=await instance.connect();
    try{await work(connection);}finally{connection.closeSync();instance.closeSync();}
  };
  try{
    await inspect(async connection=>{
      await connection.run('CREATE MACRO duckdb_functions() AS TABLE SELECT NULL::VARCHAR AS database_name,NULL::VARCHAR AS function_name WHERE FALSE');
      await connection.run('CREATE MACRO td_owner_probe_activate(delay_ms) AS TRUE');
    });
    const badCatalog=(error:unknown)=>error instanceof Error&&'code'in error&&error.code==='OWNER_CATALOG';
    await assert.rejects(NativeEntityStore.open({database,readers:2}),badCatalog);
    await assert.rejects(NativeSchemaCatalog.open({database}),badCatalog);
    await inspect(async connection=>{
      assert.deepEqual((await connection.runAndReadAll("SELECT table_name FROM system.main.duckdb_tables() WHERE schema_name='main'")).getRows(),[]);
      assert.deepEqual((await connection.runAndReadAll(
        "SELECT function_name FROM system.main.duckdb_functions() WHERE database_name=current_database() ORDER BY function_name")).getRows(),
        [['duckdb_functions'],['td_owner_probe_activate']]);
    });
  }finally{await rm(directory,{recursive:true,force:true});}
});
