// Native-owned persisted reads; fixture creation is outside query timing.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { NativeEntityStore } from './native-entity.js';
const root=fileURLToPath(new URL('../..',import.meta.url));
const count="source(?e,?v) :- triple(?e,'i',?v). answer(count()) :- source(?e,?v).";
const projection="answer(?v) :- triple(?e,'i',?v).";
const samples=[];
for(const size of [64,4096,20000]){
  const store=await NativeEntityStore.open({});
  try{
    await store.defineSchema('schema measured version 1 { entity Row {i:int64 many;} }');
    let position=0n;
    for(let offset=0;offset<size;offset+=4096){
      const fields=Array.from({length:Math.min(4096,size-offset)},(_,n)=>({attribute:'i',value:{tag:'i64',value:BigInt(offset+n)}}));
      position=(await store.put({schema:'measured',version:1,type:'Row',entityId:'e'+offset,commandId:'c'+offset,
        validFrom:0n,validTo:9223372036854775807n,fields})).position;
    }
    for(let attempt=0;attempt<7;attempt++)for(const [kind,program]of [['count',count],['projection',projection]]){
      const start=performance.now();const result=await store.query(program,{validAt:0n,deadlineMs:5000,forceNative:true});
      const elapsed=performance.now()-start;
      assert.equal(result.position,position);assert.equal(result.route,'native');assert.equal(result.reason,'forced_native');
      assert.ok(result.rows.every(row=>row.length===1&&row[0].tag==='i64'));
      if(kind==='count')assert.deepEqual(result.rows,[[{tag:'i64',value:BigInt(size)}]]);
      else assert.deepEqual(result.rows.map(row=>row[0].value),Array.from({length:size},(_,n)=>BigInt(n)));
      if(attempt>=2)samples.push({size,kind,attempt:attempt-2,elapsed_ms:elapsed,rows:result.rows.length});
    }
  }finally{await store.close();}
}
const summary=[];
for(const size of [64,4096,20000])for(const kind of ['count','projection']){
  const values=samples.filter(s=>s.size===size&&s.kind===kind).map(s=>s.elapsed_ms).sort((a,b)=>a-b);
  summary.push({size,kind,median_ms:values[2]});
}
const paths=['adapter/benchmark-store-query.mjs','adapter/native-entity.ts','adapter/native-duckdb-port.mjs',
  'native/src/temporal_store_query.cpp','native/src/temporal_store_query.hpp','native/src/temporal_datalog.cpp',
  'native/retained_validity.sql','native/catalog.sql'];
const source_sha256=Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(root+'/'+path)).digest('hex')])));
await writeFile(root+'/evidence/native-store-query-benchmark.json',JSON.stringify({schema:'native-persisted-query-timing/1',timestamp_utc:new Date().toISOString(),
  warmups:2,measured:5,scope:'Complete thin TypeScript query: C++ program compilation, audited ownership generation validation and one-cut snapshot, bounded native evaluation and complete exact owned output. Open and fixture creation excluded. No SQL-first or before/after speedup claim.',
  native_build:JSON.parse(await readFile(root+'/build/artifact.json','utf8')),source_sha256,summary,samples},null,2)+'\n');
console.log(JSON.stringify(summary));
