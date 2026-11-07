// Full public transaction/read cost; every returned row is checked.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import { PublicDuckDBBackend } from './public-backend.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const schema=await readFile(root+'/adapter/public-schema.sql','utf8');
const samples=[];
for(const size of [32,512,4096])for(let attempt=0;attempt<7;attempt++)for(const mode of attempt%2?['append','sql']:['sql','append']){
  const port=await NativeDuckDBPort.open();
  // Exercise both implementations with identical current source and engine.
  Object.defineProperty(port,'supportsAppend',{value:()=>mode==='append'});
  const backend=new PublicDuckDBBackend(port,'native-write-benchmark');
  await backend.initialize(schema);
  const inputs=Array.from({length:size},(_,n)=>({entityId:'u-'+n,attribute:'age',value:{type:'number',value:n%100}}));
  const ids=inputs.map((_,n)=>'a-'+n);
  try{
    let start=performance.now();
    await backend.withTransaction(async session=>{
      await session.claimCommand('batch','tx',10);
      const position=await session.nextCommitPosition();
      await session.batchInsert(inputs,'tx',10,ids,position);
    });
    const writeMs=performance.now()-start;
    start=performance.now();
    const rows=await backend.read(session=>session.query({attribute:'age'}));
    const readMs=performance.now()-start;
    assert.equal(rows.length,size);
    const byId=new Map(rows.map(row=>[row.id,row]));
    for(let n=0;n<size;n++){
      const row=byId.get(ids[n]);
      assert.deepEqual(row,{id:ids[n],entity_id:'u-'+n,attribute:'age',value_type:'number',
        value_string:null,value_number:n%100,value_boolean:null,value_datetime:null,value_json:null,
        recorded_at:10,recorded_position:1,valid_from:10,valid_to:null,created_by:null,
        retracted_at:null,retracted_position:null,retract_tx_id:null,entity_type:null,schema_version:1,tx_id:'tx'});
    }
    if(attempt>=2)samples.push({size,mode,attempt:attempt-2,write_ms:writeMs,read_ms:readMs,
      trace_complete:port.trace().length<256,
      insert_operations_in_trace:port.trace().filter(entry=>entry.name==='public_insert_chunk'||entry.op==='append').length});
  }finally{await backend.close();}
}
const median=values=>{values.sort((a,b)=>a-b);return values[Math.floor(values.length/2)];};
const summary=[32,512,4096].map(size=>{
  const result={size};
  for(const mode of ['sql','append'])result[mode]=Object.fromEntries(['write_ms','read_ms'].map(key=>
    [key,median(samples.filter(row=>row.size===size&&row.mode===mode).map(row=>row[key]))]));
  result.write_speedup=result.sql.write_ms/result.append.write_ms;
  return result;
});
const paths=['adapter/benchmark-write.mjs','adapter/native-duckdb-port.mjs','adapter/public-backend.mjs','adapter/transaction-owner.mjs'];
const source_sha256=Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(root+'/'+path)).digest('hex')])));
const report={schema:'native-write-comparison/2',timestamp_utc:new Date().toISOString(),warmup_pairs:2,measured_pairs:5,
  scope:'complete public command, claim, clock, retained-usage accounting and commit; full follow-up read separately charged and verified',
  source_sha256,summary,samples};
const output=process.argv[2]??root+'/evidence/native-write-benchmark.json';
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(summary));
