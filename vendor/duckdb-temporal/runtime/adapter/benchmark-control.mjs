// Complete query comparisons with/without owned cancellation, same program/data/binary.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {getEventListeners} from 'node:events';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {NativeEntityStore} from './native-entity.js';
const root=fileURLToPath(new URL('../..',import.meta.url)),INF=9223372036854775807n;
const output=process.argv[2]??'native-control-benchmark.json';
if(!/^[a-z0-9-]+\.json$/.test(output))throw new Error('Expected an evidence JSON filename');
const samples=[];
for(const size of [512,4096,20000]){
  const directory=await mkdtemp(resolve(tmpdir(),'native-control-benchmark-')),database=resolve(directory,'data.duckdb');
  try{
    let store=await NativeEntityStore.open({database});
    try{
      await store.defineSchema('schema bench version 1 {entity Row {n:int64 many;}}');
      for(let start=0;start<size;start+=4096)await store.putRecord({schema:'bench',version:1,type:'Row',entityId:'e'+start,commandId:'put-'+start,
        record:'{'+Array.from({length:Math.min(4096,size-start)},(_,i)=>'n='+(start+i)+';').join('')+'}',validFrom:0n,validTo:INF});
    }finally{await store.close();}
    store=await NativeEntityStore.open({database});
    try{
      const modes=['native_plain','native_controlled','sql_plain','sql_controlled'],controller=new AbortController();
      const program="answer(?v) :- triple(?e,'n',?v).";
      for(let round=0;round<7;round++)for(const mode of [...modes.slice(round%4),...modes.slice(0,round%4)]){
        const start=performance.now(),controlled=mode.endsWith('controlled'),route=mode.startsWith('native')?'native':'sql';
        const result=await store.query(program,{validAt:0n,forceNative:route==='native',deadlineMs:5000,
          ...(controlled?{timeoutMs:5000,signal:controller.signal}:{})});
        const elapsed_ms=performance.now()-start;
        assert.equal(result.route,route);assert.equal(result.position,BigInt(Math.ceil(size/4096)));
        assert.deepEqual(result.rows,Array.from({length:size},(_,i)=>[{tag:'i64',value:BigInt(i)}]));
        assert.equal(getEventListeners(controller.signal,'abort').length,0);
        if(round>=2)samples.push({size,mode,round:round-2,elapsed_ms,rows:size});
      }
    }finally{await store.close();}
  }finally{await rm(directory,{recursive:true});}
}
const summary=[];
for(const size of [512,4096,20000])for(const route of ['native','sql']){
  const row={size,route};for(const mode of ['plain','controlled'])row[mode+'_ms']=samples.filter(s=>s.size===size&&s.mode===route+'_'+mode).map(s=>s.elapsed_ms).sort((a,b)=>a-b)[2];
  row.ratio=row.controlled_ms/row.plain_ms;summary.push(row);
}
const paths=['adapter/benchmark-control.mjs','adapter/native-entity.ts','adapter/native-duckdb-port.mjs','build_native.py',
 'native/src/node_control.cpp','native/src/temporal_control.hpp','native/src/temporal_datalog.cpp','native/src/temporal_store_query.cpp','native/catalog.sql'];
const source_sha256=Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(root+'/'+p)).digest('hex')])));
await writeFile(root+'/evidence/'+output,JSON.stringify({schema:'native-controlled-query-comparison/1',timestamp_utc:new Date().toISOString(),warmup_rounds:2,measured_rounds:5,
 scope:'Same program/data/binary; rotating plain/controlled forced-native and proved-SQL full NativeEntityStore projections, including native audited ownership generation validation and exact output. Canonical fixtures written through native schema-bound commands, closed/reopened; ingestion/open excluded. Controlled mode has a 5000ms whole-query timeout and live AbortSignal; both modes retain 5000ms evaluator deadline. Every value and listener release checked. Selected overhead measurements, not a cross-version speedup claim.',
 native_build:JSON.parse(await readFile(root+'/build/artifact.json','utf8')),source_sha256,summary,samples},null,2)+'\n');
console.log(JSON.stringify(summary));
