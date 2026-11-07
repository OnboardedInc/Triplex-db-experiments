// Complete count/grouped-count comparisons over native schema-bound data.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {NativeEntityStore} from './native-entity.js';
const root=fileURLToPath(new URL('../..',import.meta.url)),INF=9223372036854775807n,samples=[];
const id=n=>'e'+String(n).padStart(6,'0');
for(const size of [512,4096,20000,40000]){
  const directory=await mkdtemp(resolve(tmpdir(),'native-count-benchmark-')),database=resolve(directory,'data.duckdb');
  try{
    let store=await NativeEntityStore.open({database});
    try{
      await store.defineSchema('schema bench version 1 {entity Row {n:int64 many;}}');
      for(let offset=0;offset<size;offset+=4096)await store.putRecord({schema:'bench',version:1,type:'Row',entityId:id(offset),commandId:'put-'+offset,
        record:'{'+Array.from({length:Math.min(4096,size-offset)},(_,i)=>'n='+(offset+i)+';').join('')+'}',validFrom:0n,validTo:INF});
    }finally{await store.close();}
    store=await NativeEntityStore.open({database});
    try{
      const programs={direct:'answer(count()) :- triple(?e,?a,?v).',
        count:"source(?e,?v) :- triple(?e,'n',?v). answer(count()) :- source(?e,?v).",
        grouped:"source(?e,?v) :- triple(?e,'n',?v). answer(?e,count()) :- source(?e,?v)."};
      for(const [kind,program]of Object.entries(programs))for(let round=0;round<7;round++)for(const mode of round%2?['sql','native']:['native','sql']){
        const start=performance.now(),result=await store.query(program,{validAt:0n,forceNative:mode==='native',deadlineMs:5000});
        const elapsed_ms=performance.now()-start;
        assert.equal(result.route,mode);assert.equal(result.position,BigInt(Math.ceil(size/4096)));
        const expected=kind==='grouped'?Array.from({length:Math.ceil(size/4096)},(_,i)=>[{tag:'str',value:id(i*4096)},{tag:'i64',value:BigInt(Math.min(4096,size-i*4096))}]):[[{tag:'i64',value:BigInt(size)}]];
        assert.deepEqual(result.rows,expected);if(round>=2)samples.push({size,kind,mode,round:round-2,elapsed_ms,rows:result.rows.length});
      }
    }finally{await store.close();}
  }finally{await rm(directory,{recursive:true});}
}
const summary=[];for(const size of [512,4096,20000,40000])for(const kind of ['direct','count','grouped']){
  const row={size,kind};for(const mode of ['native','sql'])row[mode+'_ms']=samples.filter(s=>s.size===size&&s.kind===kind&&s.mode===mode).map(s=>s.elapsed_ms).sort((a,b)=>a-b)[2];
  row.speedup=row.native_ms/row.sql_ms;summary.push(row);
}
const paths=['adapter/benchmark-count.mjs','adapter/native-entity.ts','adapter/native-duckdb-port.mjs','native/src/temporal_count_plan.hpp',
 'native/src/temporal_scan_plan.hpp','native/src/temporal_store_query.cpp','native/src/temporal_core.cpp','native/catalog.sql'];
const source_sha256=Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(root+'/'+p)).digest('hex')])));
await writeFile(root+'/evidence/native-count-benchmark.json',JSON.stringify({schema:'native-count-comparison/1',timestamp_utc:new Date().toISOString(),warmup_pairs:2,measured_pairs:5,
 scope:'Same program/data/binary; alternating proved SQL and forced-native complete count/grouped-count API calls after native schema-bound fixtures close/reopen. Timing includes audited ownership generation validation, fresh proof/source statistics, execution and exact owned output. Ingestion/open excluded. Every answer checked. Native input-list construction is gated off when SQL proof succeeds. Selected comparisons, no universal speedup claim.',
 native_build:JSON.parse(await readFile(root+'/build/artifact.json','utf8')),source_sha256,summary,samples},null,2)+'\n');console.log(JSON.stringify(summary));
