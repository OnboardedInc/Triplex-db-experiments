// Paired real DuckDB/native callback measurements; every result is checked.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { DuckDBInstance,VARCHAR,version } from '@duckdb/node-api';

const root=fileURLToPath(new URL('../..',import.meta.url));
assert.equal(version(),'v2.0.0');
const variants={};
for(const name of ['before','after']){
  const base=root+'/build'+(name==='before'?'/schema-before':'');
  const artifact=base+'/temporal_datalog.duckdb_extension';
  const manifest=JSON.parse(await readFile(base+'/artifact.json','utf8'));
  assert.equal(createHash('sha256').update(await readFile(artifact)).digest('hex'),manifest.extension_sha256);
  variants[name]={artifact,manifest};
}
assert.equal(variants.before.manifest.schema_template_reuse,false);
assert.equal(variants.after.manifest.schema_template_reuse,true);
assert.deepEqual(variants.before.manifest.source_sha256,variants.after.manifest.source_sha256);
const samples=[];
for(const width of [2,64]){
  const dsl='schema measured version 1 { entity Wide {'+
    Array.from({length:width},(_,n)=>'a'+n+':int64 required;').join('')+'} }';
  const prefix='{a0=i64(',suffix=');'+Array.from({length:width-1},(_,n)=>'a'+(n+1)+'=i64('+(n+1)+');').join('')+'}';
  for(let attempt=0;attempt<7;attempt++)for(const name of attempt%2?['after','before']:['before','after']){
    const instance=await DuckDBInstance.create(':memory:',{allow_unsigned_extensions:'true',threads:'1',memory_limit:'128MB'});
    let connection;
    try{
      connection=await instance.connect();
      const load=await connection.run("LOAD '"+variants[name].artifact.replaceAll("'","''")+"'");load.closeSync();
      const read=async(sql,params=[])=>{
        const result=await connection.run(sql,params,params.map(()=>VARCHAR));
        try{return await result.getRows();}finally{result.closeSync();}
      };
      const ir=(await read('SELECT td_schema_ir_v1(?)',[dsl]))[0][0];
      const sql="SELECT td_validate_entity_v1(?,?,'Wide',?||range::VARCHAR||?) FROM range(512)";
      const start=performance.now();
      const rows=await read(sql,[dsl,ir,prefix,suffix]);
      const elapsed=performance.now()-start;
      assert.equal(rows.length,512);for(const row of rows)assert.deepEqual(row,[true]);
      await assert.rejects(read("SELECT td_validate_entity_v1(?,?,'Wide',CASE WHEN range=511 THEN '{}' ELSE ?||range::VARCHAR||? END) FROM range(512)",
        [dsl,ir,prefix,suffix]),/TD_E_SCHEMA_REQUIRED/);
      if(attempt>=2)samples.push({width,variant:name,attempt:attempt-2,rows:512,elapsed_ms:elapsed});
    }finally{connection?.closeSync();instance.closeSync();}
  }
}
const median=values=>{values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)];};
const summary=[2,64].map(width=>{
  const result={width};
  for(const name of ['before','after'])result[name+'_ms']=median(samples.filter(row=>row.width===width&&row.variant===name).map(row=>row.elapsed_ms));
  result.speedup=result.before_ms/result.after_ms;return result;
});
const paths=['native/src/temporal_datalog.cpp','native/src/temporal_schema.cpp','native/src/temporal_schema.hpp','adapter/benchmark-schema.mjs'];
const source_sha256=Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(root+'/'+path)).digest('hex')])));
await writeFile(root+'/evidence/native-schema-benchmark.json',JSON.stringify({schema:'native-schema-comparison/1',
  timestamp_utc:new Date().toISOString(),warmup_pairs:2,measured_pairs:5,
  scope:'512-row real DuckDB/native validation callback plus complete owned Boolean output; connection open excluded; last-row fault checked on every attempt',
  before_build:variants.before.manifest,after_build:variants.after.manifest,source_sha256,summary,samples},null,2)+'\n');
console.log(JSON.stringify(summary));
