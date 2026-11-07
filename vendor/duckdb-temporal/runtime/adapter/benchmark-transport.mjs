// Reference transport comparison, outside the production import graph.
import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import { OwnedDuckDBPort } from './owned-duckdb-port.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const python=process.env.TRIPLESTORE_PYTHON;
if(!python)throw new Error('Reference comparison requires TRIPLESTORE_PYTHON');
const samples=[];
const sql="SELECT range::BIGINT id,'entity-'||range::VARCHAR name,range::DOUBLE amount FROM range(?) ORDER BY range";
for(let attempt=0;attempt<7;attempt++){
  for(const variant of attempt%2?['native','reference']:['reference','native']){
    let start=performance.now();
    const port=variant==='native'?await NativeDuckDBPort.open():await OwnedDuckDBPort.open({python,
      worker:root+'/adapter/worker.py',actionHash:'mac-triplex-v1',cwd:root});
    const openMs=performance.now()-start;
    try{
      start=performance.now();
      const rows=await port.run({name:'read_20000',sql,params:[20000n]});
      const readMs=performance.now()-start;
      assert.equal(rows.length,20000);
      for(let i=0;i<rows.length;i++)assert.deepEqual(rows[i],[BigInt(i),'entity-'+i,i]);
      start=performance.now();
      for(let i=0;i<100;i++){
        const result=await port.run({name:'bound_scalar',sql:'SELECT ?::BIGINT i,?::DOUBLE f',params:[BigInt(i),i+0.5]});
        assert.deepEqual(result,[[BigInt(i),i+0.5]]);
      }
      const repeatedMs=performance.now()-start;
      if(attempt>=2)samples.push({variant,attempt:attempt-2,open_ms:openMs,read_20000_ms:readMs,repeated_100_ms:repeatedMs});
    }finally{await port.close();}
  }
}
const median=values=>{values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)];};
const summary={};
for(const variant of ['reference','native']){
  const rows=samples.filter(row=>row.variant===variant);
  summary[variant]=Object.fromEntries(['open_ms','read_20000_ms','repeated_100_ms'].map(key=>[key,median(rows.map(row=>row[key]))]));
}
const paths=['adapter/benchmark-transport.mjs','adapter/native-duckdb-port.mjs','adapter/owned-duckdb-port.mjs','adapter/worker.py',
  'adapter/build-deps/package-lock.json'];
const hashes=Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(root+'/'+path)).digest('hex')])));
const report={schema:'transport-comparison/1',timestamp_utc:new Date().toISOString(),warmup_pairs:2,measured_pairs:5,
  scope:'complete typed result conversion and round trips; identical SQL; every cell checked; open separately charged',
  source_sha256:hashes,summary,samples};
await writeFile(root+'/evidence/native-transport-benchmark.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(summary));
