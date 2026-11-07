// A/B real-engine schema metadata transport; same source, borrowed views off/on.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DuckDBInstance,VARCHAR,version} from '@duckdb/node-api';

const root=fileURLToPath(new URL('../..',import.meta.url)),samples=[],variants={},size=32768;
const literal=s=>"'"+s.replaceAll("'","''")+"'";
assert.equal(version(),'v2.0.0');
for(const variant of ['before','after']){
  const base=root+'/build'+(variant==='before'?'/schema-view-before':'');
  const artifact=base+'/temporal_datalog.duckdb_extension',manifest=JSON.parse(await readFile(base+'/artifact.json','utf8'));
  assert.equal(createHash('sha256').update(await readFile(artifact)).digest('hex'),manifest.extension_sha256);
  variants[variant]={artifact,manifest};
}
assert.equal(variants.before.manifest.schema_borrowed_input,false);
assert.equal(variants.after.manifest.schema_borrowed_input,true);
assert.equal(variants.before.manifest.schema_template_reuse,true);
assert.equal(variants.after.manifest.schema_template_reuse,true);
assert.deepEqual(variants.before.manifest.source_sha256,variants.after.manifest.source_sha256);
async function open(variant,database){
  const instance=await DuckDBInstance.create(database,{allow_unsigned_extensions:'true',threads:'1',memory_limit:'128MB',max_temp_directory_size:'64MB'});
  let connection;
  try{
    connection=await instance.connect();
    const read=async(sql,params=[])=>{
      const result=await connection.run(sql,params,params.map(()=>VARCHAR));
      try{return await result.getRows();}finally{result.closeSync();}
    };
    await read('LOAD '+literal(variants[variant].artifact));
    await read('PRAGMA td_initialize');await read('SET enable_external_access=false');
    return {read,close(){try{connection.closeSync();}finally{instance.closeSync();}}};
  }catch(error){try{connection?.closeSync();}finally{instance.closeSync();}throw error;}
}
for(const width of [2,64]){
  const directory=await mkdtemp(resolve(tmpdir(),'schema-view-benchmark-')),handles={};
  const dsl='schema measured version 1 {entity Row {'+Array.from({length:width},(_,i)=>'a'+i+':int64 many;').join('')+'}}';
  try{
    for(const variant of ['before','after']){
      const database=resolve(directory,variant+'.duckdb'),writer=await open(variant,database);
      try{
        await writer.read('PRAGMA td_define_schema('+literal(dsl)+')');
        for(let offset=0;offset<size;offset+=4096){
          const record='{'+Array.from({length:Math.min(4096,size-offset)},(_,i)=>'a'+(i%width)+'='+(offset+i)+';').join('')+'}';
          await writer.read("PRAGMA td_put_entity('measured',1,'Row','e"+offset+"','c"+offset+"',"+literal(record)+',0,9223372036854775807)');
        }
      }finally{writer.close();}
      handles[variant]=await open(variant,database);
    }
    const ir=(await handles.after.read('SELECT td_schema_ir_v1(?)',[dsl]))[0][0];
    for(const kind of ['fact_callback','native_count','sql_count'])for(let round=0;round<7;round++)for(const variant of round%2?['after','before']:['before','after']){
      const start=performance.now();
      const rows=kind==='fact_callback'?
        await handles[variant].read("SELECT td_validate_schema_fact_v1(?,?,'Row','a'||(range%"+width+")::VARCHAR,3::UTINYINT) FROM range("+size+')',[dsl,ir]):
        await handles[variant].read('PRAGMA '+(kind==='native_count'?'td_query_store_native':'td_query_store')+"('answer(count()) :- triple(?e,?a,?v).',0,-1,100000,1000,5000000,5000)");
      const elapsed_ms=performance.now()-start;
      if(kind==='fact_callback'){assert.equal(rows.length,size);for(const row of rows)assert.deepEqual(row,[true]);}
      else{
        assert.equal(rows.length,1);assert.equal(rows[0][0],BigInt(size/4096));
        assert.equal(rows[0][1],kind==='native_count'?'native':'sql');
        assert.deepEqual(JSON.parse(rows[0][6]),[{tag:3,s:null,b:null,i:String(size),f:null}]);
      }
      if(round>=2)samples.push({width,kind,variant,round:round-2,facts:size,elapsed_ms});
    }
  }finally{for(const h of Object.values(handles))h.close();await rm(directory,{recursive:true});}
}
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)],summary=[];
for(const width of [2,64])for(const kind of ['fact_callback','native_count','sql_count']){
  const row={width,kind,facts:size};
  for(const variant of ['before','after'])row[variant+'_ms']=median(samples.filter(s=>s.width===width&&s.kind===kind&&s.variant===variant).map(s=>s.elapsed_ms));
  row.speedup=row.before_ms/row.after_ms;summary.push(row);
}
const paths=['native/src/temporal_datalog.cpp','native/src/temporal_schema.cpp','native/src/temporal_schema.hpp','native/src/temporal_store_query.cpp',
 'native/src/temporal_count_plan.hpp','native/catalog.sql','build_native.py','benchmark_schema_views.py','adapter/benchmark-schema-views.mjs','adapter/test-schema.ts'];
const source_sha256=Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(root+'/'+p)).digest('hex')])));
await writeFile(root+'/evidence/native-schema-view-benchmark.json',JSON.stringify({schema:'native-schema-view-comparison/1',timestamp_utc:new Date().toISOString(),warmup_pairs:2,measured_pairs:5,
 scope:'Same C++ source with schema borrowing disabled/enabled; both retain DSL compile reuse. Alternating calls; every Boolean/count/route/position checked. Callback timing includes complete owned Boolean output; persisted query timing includes retained schema/history validation, proof/execution and exact output after file close/reopen. Fixture writes/open excluded. No universal performance claim.',
 before_build:variants.before.manifest,after_build:variants.after.manifest,source_sha256,summary,samples},null,2)+'\n');
console.log(JSON.stringify(summary));
