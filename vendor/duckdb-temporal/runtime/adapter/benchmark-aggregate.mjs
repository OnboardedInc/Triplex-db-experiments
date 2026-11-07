// Complete persisted aggregate calls: same binary/data/program, native versus SQL.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {NativeEntityStore} from './native-entity.js';

const root=fileURLToPath(new URL('../..',import.meta.url)),INF=9223372036854775807n,samples=[];
const sizes=[512,4096,20000,40000],id=n=>'e'+String(n).padStart(6,'0');
const cases=[['min','min(?v)',false],['max','max(?v)',false],['sum','sum_i64(?v)',false],
 ['grouped_min','min(?v)',true],['grouped_max','max(?v)',true],['grouped_sum','sum_i64(?v)',true]];
const aggregate=(op,start,end)=>op.startsWith('min')?BigInt(start):op.startsWith('max')?BigInt(end-1):BigInt(end-start)*BigInt(start+end-1)/2n;
for(const size of sizes){
  const directory=await mkdtemp(resolve(tmpdir(),'native-aggregate-benchmark-')),database=resolve(directory,'data.duckdb');
  try{
    let store=await NativeEntityStore.open({database});
    try{
      await store.defineSchema('schema measured version 1 {entity Row {i:int64 many;}}');
      for(let offset=0;offset<size;offset+=4096)await store.putRecord({schema:'measured',version:1,type:'Row',entityId:id(offset),commandId:'put-'+offset,
        record:'{'+Array.from({length:Math.min(4096,size-offset)},(_,i)=>'i='+(offset+i)+';').join('')+'}',validFrom:0n,validTo:INF});
    }finally{await store.close();}
    store=await NativeEntityStore.open({database});
    try{
      for(const [kind,op,grouped]of cases){
        const program="source(?e,?v) :- triple(?e,'i',?v). answer("+(grouped?'?e,':'')+op+") :- source(?e,?v).";
        const expected=grouped?Array.from({length:Math.ceil(size/4096)},(_,i)=>[{tag:'str',value:id(i*4096)},
          {tag:'i64',value:aggregate(op,i*4096,Math.min(size,(i+1)*4096))}]):[[{tag:'i64',value:aggregate(op,0,size)}]];
        for(let round=0;round<7;round++)for(const mode of round%2?['sql','native']:['native','sql']){
          const start=performance.now(),result=await store.query(program,{validAt:0n,forceNative:mode==='native',deadlineMs:5000});
          const elapsed_ms=performance.now()-start;
          assert.equal(result.route,mode,kind);assert.equal(result.position,BigInt(Math.ceil(size/4096)));
          assert.deepEqual(result.rows,expected,kind);
          if(round>=2)samples.push({size,kind,mode,round:round-2,elapsed_ms,rows:result.rows.length});
        }
      }
    }finally{await store.close();}
  }finally{await rm(directory,{recursive:true});}
}
const summary=[];for(const size of sizes)for(const [kind]of cases){
  const row={size,kind};for(const mode of ['native','sql'])row[mode+'_ms']=samples.filter(s=>s.size===size&&s.kind===kind&&s.mode===mode).map(s=>s.elapsed_ms).sort((a,b)=>a-b)[2];
  row.speedup=row.native_ms/row.sql_ms;summary.push(row);
}
const manifest=JSON.parse(await readFile(root+'/build/artifact.json','utf8'));
const paths=['adapter/benchmark-aggregate.mjs','adapter/test-aggregate.ts','adapter/native-entity.ts','adapter/native-duckdb-port.mjs',
 ...Object.keys(manifest.source_sha256),'native/catalog.sql'];
const source_sha256=Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(root+'/'+p)).digest('hex')])));
await writeFile(root+'/evidence/native-aggregate-benchmark.json',JSON.stringify({schema:'native-aggregate-comparison/1',timestamp_utc:new Date().toISOString(),warmup_pairs:2,measured_pairs:5,
 scope:'Alternating forced native/proved SQL complete global/grouped min/max/sum_i64 calls over identical native schema-bound fixtures after file close/reopen. Every exact answer/route/position checked. Retained history/schema validation, fresh proof/statistics/execution and full owned output included; ingestion/open excluded. Selected comparisons, no universal speedup claim.',
 native_build:manifest,source_sha256,summary,samples},null,2)+'\n');console.log(JSON.stringify(summary));
