// Full native schema-bound command timing; all returned records are verified.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { NativeEntityStore } from './native-entity.js';

const root=fileURLToPath(new URL('../..',import.meta.url));
const samples=[];
for(const count of [1,64,4096])for(let attempt=0;attempt<7;attempt++){
  const store=await NativeEntityStore.open({});
  try{
    await store.defineSchema('schema measured version 1 { entity Row { s:text required; i:int64 many; } }');
    let previous=[];
    for(const phase of ['insert','replace']){
      const fields=[{attribute:'s',value:{tag:'str',value:phase}},
        ...Array.from({length:count-1},(_,i)=>({attribute:'i',value:{tag:'i64',value:BigInt(i)}}))];
      const start=performance.now();
      const receipt=await store.put({schema:'measured',version:1,type:'Row',entityId:'e',commandId:phase,
        validFrom:0n,validTo:9223372036854775807n,fields});
      const elapsed=performance.now()-start;
      assert.equal(receipt.position,phase==='insert'?1n:2n);assert.equal(receipt.asserted.length,count);
      assert.deepEqual(new Set(receipt.retracted),new Set(previous));previous=receipt.asserted;
      const rows=await store.at('e',{knownAt:receipt.position,validAt:0n});assert.equal(rows.length,count);
      assert.equal(rows.find(row=>row.attribute==='s')?.value.value,phase);
      assert.deepEqual(rows.filter(row=>row.attribute==='i').map(row=>row.value.value).sort((a,b)=>a<b?-1:a>b?1:0),
        Array.from({length:count-1},(_,i)=>BigInt(i)));
      assert.deepEqual(await store.receipt(phase),receipt);
      if(attempt>=2)samples.push({count,phase,attempt:attempt-2,elapsed_ms:elapsed});
    }
    const history=await store.history('e');assert.equal(history.length,count*2);
    assert.ok(history.filter(row=>row.commandId==='insert').every(row=>row.txTo===2n&&row.correctedBy==='replace'));
  }finally{await store.close();}
}
const summary=[];
for(const count of [1,64,4096])for(const phase of ['insert','replace']){
  const values=samples.filter(row=>row.count===count&&row.phase===phase).map(row=>row.elapsed_ms).sort((a,b)=>a-b);
  summary.push({count,phase,median_ms:values[2]});
}
const paths=['adapter/benchmark-entity.mjs','adapter/native-entity.ts','adapter/native-schema.ts','adapter/native-duckdb-port.mjs',
  'native/catalog.sql','native/src/temporal_command.cpp','native/src/temporal_command.hpp','native/src/temporal_sql.hpp',
  'native/src/temporal_schema.cpp','native/src/temporal_datalog.cpp'];
const source_sha256=Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(root+'/'+path)).digest('hex')])));
await writeFile(root+'/evidence/native-entity-benchmark.json',JSON.stringify({schema:'native-entity-command-timing/1',timestamp_utc:new Date().toISOString(),
  warmups:2,measured:5,scope:'Full thin TypeScript put: serialization, native validation/expansion, DuckDB command transaction and owned receipt; open/schema registration excluded; complete at/history/receipt verification outside timing. No before/after speedup claim.',
  native_build:JSON.parse(await readFile(root+'/build/artifact.json','utf8')),source_sha256,summary,samples},null,2)+'\n');
console.log(JSON.stringify(summary));
