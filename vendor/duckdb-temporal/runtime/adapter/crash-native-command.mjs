// Test process only. The parent kills this owned writer after an observed phase.
import {DuckDBInstance} from '@duckdb/node-api';
import {fileURLToPath} from 'node:url';
const [database,phase,operation='put',batchMembers]=process.argv.slice(2);
const binary=fileURLToPath(new URL('../temporal_datalog.duckdb_extension',import.meta.url));
const quote=s=>"'"+s.replaceAll("'","''")+"'";
// The batch INSERT marker is an intentionally expensive CHECK on one row.
const memoryLimit=operation==='batch'&&phase==='inside_insert'?'512MB':'128MB';
const instance=await DuckDBInstance.create(database,{allow_unsigned_extensions:'true',threads:'1',memory_limit:memoryLimit,max_temp_directory_size:'64MB'});
const connection=await instance.connect();
const observer=phase==='inside_insert'?await instance.connect():undefined;
try{
  await connection.run('LOAD '+quote(binary));await connection.run('PRAGMA td_initialize');
  const companion=fileURLToPath(new URL('../owner_probe/temporal_owner_probe.duckdb_extension',import.meta.url));
  await connection.run('LOAD '+quote(companion));
  await connection.run('SELECT system.main.td_owner_probe_enroll()');
  if(observer)await observer.run('SELECT system.main.td_owner_probe_enroll()');
  await connection.run('SELECT system.main.td_owner_probe_activate(0)');
  await connection.run('SET enable_external_access=false');
  let sql;
  if(operation==='batch'){
    if(!batchMembers)throw new Error('Missing crash batch fixture');
    sql="PRAGMA td_batch_entities_initial('native',1,'crash-command',"+quote(batchMembers)+')';
  }else{
    if(operation!=='put'&&operation!=='patch')throw new Error('Unknown crash operation');
    const insideValues=operation==='patch'?4091:4095;
    const record=phase==='inside_insert'?'{s="New";'+Array.from({length:insideValues},(_,i)=>'i='+i+';').join('')+'}':'{s="New";i=7;}';
    const entry=operation==='patch'?'td_patch_entity':'td_put_entity';
    const interval=operation==='patch'?',2,8)':',0,9223372036854775807)';
    sql='PRAGMA '+entry+'(\'native\',1,\'Row\',\'e\',\'crash-command\','+quote(record)+interval;
  }
  if(phase==='before_commit'){
    await connection.run('BEGIN');await connection.run(sql);process.send({phase});
  }else if(phase==='after_commit'){
    await connection.run(sql);process.send({phase});
  }else if(phase==='inside_insert'){
    let finished=false,failure;
    const baseline=(await observer.runAndReadAll("SELECT last_value FROM duckdb_sequences() WHERE schema_name='main' AND sequence_name='command_phase'")).getRows();
    if(baseline.length!==1||baseline[0][0]!==null)throw new Error('INSERT phase sequence was already consumed');
    const pending=connection.run(sql).then(()=>{finished=true;},error=>{finished=true;failure=error;});
    const start=performance.now();
    try{
      for(;;){
        const rows=(await observer.runAndReadAll("SELECT last_value FROM duckdb_sequences() WHERE schema_name='main' AND sequence_name='command_phase'")).getRows();
        if(finished)throw failure??new Error('Native command completed before observing its INSERT');
        if(typeof rows[0]?.[0]==='bigint'&&rows[0][0]>0n){process.send({phase,pending:true});break;}
        if(performance.now()-start>8000)throw new Error('Native INSERT phase was not observed');
        await new Promise(resolve=>setTimeout(resolve,1));
      }
      await pending;if(failure)throw failure;
      process.send({phase:'completed'});
    }finally{observer.closeSync();}
  }else throw new Error('Unknown crash phase');
  setInterval(()=>{},1000); // Await the parent's SIGKILL without closing/committing.
}catch(error){console.error(error);process.exit(1);}
