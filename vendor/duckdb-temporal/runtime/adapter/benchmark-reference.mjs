// Native declared-reference writes, reopen and complete persisted graph queries.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {NativeEntityStore} from './native-entity.js';
const root=fileURLToPath(new URL('../..',import.meta.url)),INF=9223372036854775807n;
const schema='schema graph version 1 {entity Person {name:text required;manager:ref(Person);}}';
const id=n=>'p'+String(n).padStart(6,'0');
const request=(entityId,commandId,record)=>({schema:'graph',version:1,type:'Person',entityId,commandId,record,validFrom:0n,validTo:INF});
const samples=[],ingestion=[];
for(const entities of [64,512]){
  const directory=await mkdtemp(resolve(tmpdir(),'native-reference-benchmark-')),database=resolve(directory,'data.duckdb');
  try{
    let store=await NativeEntityStore.open({database});
    try{
      await store.defineSchema(schema);await store.putRecord(request('root','root','{name="Root";}'));
      const start=performance.now();
      for(let n=0;n<entities;n++){
        const receipt=await store.putRecord(request(id(n),'put-'+n,'{name="'+id(n)+'";manager="root";}'));
        assert.equal(receipt.position,BigInt(n+2));assert.equal(receipt.asserted.length,2);
      }
      ingestion.push({entities,elapsed_ms:performance.now()-start,scope:'Complete sequential native reference commands, durable receipt decoding/checks; schema/root/open excluded.'});
    }finally{await store.close();}
    store=await NativeEntityStore.open({database});
    try{
      const program="answer(?source,?name) :- triple(?source,'manager',?target),triple(?target,'name',?name).";
      for(let round=0;round<7;round++)for(const mode of round%2?['sql','native']:['native','sql']){
        const start=performance.now();
        const result=await store.query(program,{validAt:0n,forceNative:mode==='native',deadlineMs:5000});
        const elapsed_ms=performance.now()-start;
        assert.equal(result.route,mode);assert.equal(result.position,BigInt(entities+1));
        assert.deepEqual(result.rows,Array.from({length:entities},(_,n)=>[{tag:'str',value:id(n)},{tag:'str',value:'Root'}]));
        if(round>=2)samples.push({entities,mode,round:round-2,elapsed_ms,rows:entities});
      }
      assert.equal((await store.history(id(entities-1))).find(a=>a.attribute==='manager').value.value,'root');
    }finally{await store.close();}
  }finally{await rm(directory,{recursive:true});}
}
const summary=[64,512].map(entities=>({entities,...Object.fromEntries(['native','sql'].map(mode=>[mode+'_ms',
 samples.filter(s=>s.entities===entities&&s.mode===mode).map(s=>s.elapsed_ms).sort((a,b)=>a-b)[2]]))}));
const paths=['adapter/benchmark-reference.mjs','adapter/native-entity.ts','adapter/native-duckdb-port.mjs',
 'native/catalog.sql','native/src/temporal_schema.hpp','native/src/temporal_schema.cpp','native/src/temporal_datalog.cpp',
 'native/src/temporal_command.cpp','native/src/temporal_store_query.cpp','native/src/temporal_join_plan.hpp','native/src/temporal_scan_plan.hpp'];
const source_sha256=Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(root+'/'+p)).digest('hex')])));
await writeFile(root+'/evidence/native-reference-benchmark.json',JSON.stringify({schema:'native-reference-end-to-end/1',timestamp_utc:new Date().toISOString(),
 scope:'Native C++ declared-reference commands, closed/reopened same-binary catalog, then complete persisted two-atom graph queries. Query timing includes audited ownership generation validation, fresh proof/statistics or bounded native evaluation and exact output conversion. Query fixture/open/ingestion excluded. Every returned value checked. Two alternating warmup pairs and five measured pairs. Current-path measurements, no cross-version speedup claim.',
 native_build:JSON.parse(await readFile(root+'/build/artifact.json','utf8')),source_sha256,ingestion,summary,samples},null,2)+'\n');
console.log(JSON.stringify({ingestion,summary}));
