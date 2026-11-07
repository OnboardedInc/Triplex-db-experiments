// Full persisted query comparison; fixture ingestion/open are outside timing.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp,readFile,rm,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NativeEntityStore } from './native-entity.js';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import { PublicDuckDBBackend } from './public-backend.mjs';
const root=fileURLToPath(new URL('../..',import.meta.url));
const schema=await readFile(root+'/adapter/public-schema.sql','utf8');const samples=[];
const id=n=>'p'+String(n).padStart(6,'0'),name=n=>'Person_'+String(n).padStart(6,'0');
for(const size of [500,2000,10000]){
  const directory=await mkdtemp(resolve(tmpdir(),'native-join-benchmark-')),database=resolve(directory,'data.duckdb');
  try{
    const backend=new PublicDuckDBBackend(await NativeDuckDBPort.open({database}),'join-benchmark');
    try{
      await backend.initialize(schema);
      await backend.withTransaction(async s=>{
        await s.claimCommand('fixture','tx',10);const position=await s.nextCommitPosition();
        for(let offset=0;offset<size;offset+=1000){
          const inputs=[];const ids=[];
          for(let n=offset;n<Math.min(size,offset+1000);n++)for(const [attribute,value]of [
            ['age',{type:'number',value:n%100}],['name',{type:'string',value:name(n)}],['department',{type:'string',value:'D'+n%10}]]){
            inputs.push({entityId:id(n),attribute,value});ids.push(attribute+'-'+n);
          }
          await s.batchInsert(inputs,'tx',10,ids,position);
        }
      });
    }finally{await backend.close();}
    const store=await NativeEntityStore.open({database});
    try{
      for(const atoms of [2,3]){
        const program="answer(?e,?name) :- triple(?e,'age',?age),triple(?e,'name',?name)"+
          (atoms===3?",triple(?e,'department',?department)":"")+'.';
        const modes=['native','sql','auto'];
        for(let attempt=0;attempt<7;attempt++)for(const mode of [...modes.slice(attempt%3),...modes.slice(0,attempt%3)]){
          const start=performance.now();const result=await store.query(program,{validAt:10n,deadlineMs:5000,...(mode==='auto'?{}:{forceNative:mode==='native'})});
          const elapsed=performance.now()-start;
          const route=mode==='auto'?(size*3<16384?'native':'sql'):mode;
          assert.equal(result.route,route);assert.equal(result.position,1n);assert.equal(result.rows.length,size);
          assert.deepEqual(result.rows,Array.from({length:size},(_,n)=>[{tag:'str',value:id(n)},{tag:'str',value:name(n)}]));
          assert.equal(result.counters===null,route==='sql');
          if(attempt>=2)samples.push({size,atoms,mode,attempt:attempt-2,elapsed_ms:elapsed,rows:size});
        }
      }
    }finally{await store.close();}
  }finally{await rm(directory,{recursive:true});}
}
const summary=[];
for(const size of [500,2000,10000])for(const atoms of [2,3]){
  const row={size,atoms};for(const mode of ['native','sql','auto'])row[mode+'_ms']=samples.filter(s=>s.size===size&&s.atoms===atoms&&s.mode===mode).map(s=>s.elapsed_ms).sort((a,b)=>a-b)[2];
  row.speedup=row.native_ms/row.sql_ms;summary.push(row);
}
const paths=['adapter/benchmark-join.mjs','adapter/native-entity.ts','adapter/native-duckdb-port.mjs','adapter/public-backend.mjs',
 'native/src/temporal_join_plan.hpp','native/src/temporal_scan_plan.hpp','native/src/temporal_store_query.cpp','native/src/temporal_store_query.hpp','native/src/temporal_datalog.cpp','native/catalog.sql'];
const source_sha256=Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(root+'/'+path)).digest('hex')])));
await writeFile(root+'/evidence/native-join-benchmark.json',JSON.stringify({schema:'native-edb-join-comparison/1',timestamp_utc:new Date().toISOString(),warmup_rounds:2,measured_rounds:5,
 scope:'Same program/data/binary; rotating proved SQL, forced native and automatic C++ cost preference via complete NativeEntityStore query, including audited ownership generation validation, fresh proof statistics and exact owned output. Canonical fixture ingested through public native appender, closed/reopened before queries; ingestion/open excluded. Every row checked. Cost uses total retained rows (three per fixture entity), not result size; preference never substitutes for query admission.',
 native_build:JSON.parse(await readFile(root+'/build/artifact.json','utf8')),source_sha256,summary,samples},null,2)+'\n');console.log(JSON.stringify(summary));
