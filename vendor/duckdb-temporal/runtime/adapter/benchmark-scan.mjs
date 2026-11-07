// Same engine/source/program/data; auto SQL versus explicitly forced native.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { NativeEntityStore } from './native-entity.js';
const root=fileURLToPath(new URL('../..',import.meta.url));
const program="answer(?v) :- triple(?e,'i',?v).";const samples=[];
for(const size of [64,4096,20000,40000]){
  const store=await NativeEntityStore.open({});
  try{
    await store.defineSchema('schema measured version 1 {entity Row {i:int64 many;}}');
    for(let offset=0;offset<size;offset+=4096)await store.put({schema:'measured',version:1,type:'Row',entityId:'e'+offset,commandId:'c'+offset,
      validFrom:0n,validTo:9223372036854775807n,fields:Array.from({length:Math.min(4096,size-offset)},(_,n)=>({attribute:'i',value:{tag:'i64',value:BigInt(offset+n)}}))});
    for(let attempt=0;attempt<7;attempt++)for(const mode of attempt%2?['sql','native']:['native','sql']){
      const start=performance.now();const result=await store.query(program,{validAt:0n,deadlineMs:5000,forceNative:mode==='native'});
      const elapsed=performance.now()-start;
      assert.equal(result.route,mode);assert.equal(result.rows.length,size);
      assert.deepEqual(result.rows,Array.from({length:size},(_,n)=>[{tag:'i64',value:BigInt(n)}]));
      assert.equal(result.counters===null,mode==='sql');
      if(attempt>=2)samples.push({size,mode,attempt:attempt-2,elapsed_ms:elapsed,rows:size});
    }
  }finally{await store.close();}
}
const summary=[64,4096,20000,40000].map(size=>{
  const result={size};for(const mode of ['native','sql'])result[mode+'_ms']=samples.filter(s=>s.size===size&&s.mode===mode).map(s=>s.elapsed_ms).sort((a,b)=>a-b)[2];
  result.speedup=result.native_ms/result.sql_ms;return result;
});
const paths=['adapter/benchmark-scan.mjs','adapter/native-entity.ts','adapter/native-duckdb-port.mjs','native/src/temporal_scan_plan.hpp',
  'native/src/temporal_store_query.cpp','native/src/temporal_store_query.hpp','native/src/temporal_datalog.cpp','native/retained_validity.sql','native/catalog.sql'];
const source_sha256=Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(root+'/'+path)).digest('hex')])));
await writeFile(root+'/evidence/native-scan-benchmark.json',JSON.stringify({schema:'native-single-atom-comparison/1',timestamp_utc:new Date().toISOString(),
  warmup_pairs:2,measured_pairs:5,scope:'Complete query API, audited ownership generation validation, DB-owned budget proof, snapshot selection and owned exact output; identical program/data/binary, alternating proved SQL and forced native. Open/fixture creation excluded; every value checked.',
  native_build:JSON.parse(await readFile(root+'/build/artifact.json','utf8')),source_sha256,summary,samples},null,2)+'\n');console.log(JSON.stringify(summary));
